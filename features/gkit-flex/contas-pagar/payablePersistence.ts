import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PayableImportIssue,
  PayableImportPreview,
  PayableImportRow,
  PayableItem,
  PayableMonthStatus,
  PayableSanitizationGroup,
  PayableSanitizationRow,
  PayableSanitizationSuggestion,
  PayableSanitizationSummary,
  PayableSummary,
} from './types';
import { getSupabaseAdmin, logEvent } from '../audit';
import { buildPayablesExportWorkbook } from './payableProcessor';
import { syncCicloRegularidadePagamentos } from '../regularidade-pagamentos';
import { getMonthlyForecast } from '../previsoes/forecastPersistence';
import { buildSlug, normalizeText, suggestCanonicalName } from '../cadastros/normalization';

function roundMoney(value: number): number {
  return Math.round((value || 0) * 100) / 100;
}

export function sanitizeCompetencia(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 10);
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export function nextCompetencia(value: string): string {
  const competencia = sanitizeCompetencia(value);
  const [year, month] = competencia.split('-').map(Number);
  const date = new Date(Date.UTC(year, month, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function itemBusinessKey(row: Pick<PayableImportRow, 'descricao' | 'vencimentoDia' | 'categoria'> | Pick<PayableItem, 'descricao' | 'vencimento_dia' | 'categoria'>): string {
  const descricao = 'descricao' in row ? row.descricao : '';
  const categoria = 'categoria' in row ? row.categoria : '';
  const vencimento = 'vencimentoDia' in row ? row.vencimentoDia : row.vencimento_dia;
  return [String(descricao || '').trim().toLowerCase(), String(vencimento || '').padStart(2, '0'), String(categoria || '').trim().toLowerCase()].join('|');
}

function reconciliationKey(row: Pick<PayableImportRow, 'descricao' | 'vencimentoDia' | 'valorPrevisto'> | Pick<PayableItem, 'descricao' | 'vencimento_dia' | 'valor_previsto'>): string {
  const descricao = String(row.descricao || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const vencimento = 'vencimentoDia' in row ? row.vencimentoDia : row.vencimento_dia;
  const valor = 'valorPrevisto' in row ? row.valorPrevisto : row.valor_previsto;
  return [descricao, String(vencimento || '').padStart(2, '0'), roundMoney(Number(valor || 0)).toFixed(2)].join('|');
}

function bucketCurrentRows(rows: PayableItem[]) {
  const buckets = new Map<string, PayableItem[]>();
  for (const row of rows) {
    const key = reconciliationKey(row);
    const list = buckets.get(key) ?? [];
    list.push(row);
    buckets.set(key, list);
  }
  for (const list of buckets.values()) {
    list.sort((a, b) => Number(b.pago) - Number(a.pago));
  }
  return buckets;
}

export function planPayablesImportReconciliation(currentRows: PayableItem[], importedRows: PayableImportRow[]) {
  const currentBuckets = bucketCurrentRows(currentRows);
  const matchedCurrentIds = new Set<string>();
  const rowsToInsert: PayableImportRow[] = [];
  const rowsToUpdate: Array<{ current: PayableItem; imported: PayableImportRow }> = [];

  for (const imported of importedRows) {
    const bucket = currentBuckets.get(reconciliationKey(imported)) ?? [];
    const current = bucket.find((row) => !matchedCurrentIds.has(row.id));

    if (!current) {
      rowsToInsert.push(imported);
      continue;
    }

    matchedCurrentIds.add(current.id);
    const changed =
      Boolean(current.pago) !== Boolean(imported.pago) ||
      String(current.categoria || '') !== String(imported.categoria || 'Sem categoria') ||
      String(current.centro || '') !== String(imported.centro || '') ||
      String(current.vencimento_texto || '') !== String(imported.vencimentoTexto || '');

    if (changed && !current.pago) rowsToUpdate.push({ current, imported });
  }

  const rowsToDelete = currentRows.filter((row) => !row.pago && !matchedCurrentIds.has(row.id));
  const preservedConfirmed = currentRows.filter((row) => row.pago);

  return {
    rowsToDelete,
    rowsToInsert,
    rowsToUpdate,
    preservedConfirmed,
    matchedCurrentIds,
  };
}

function validatePayableRows(rows: PayableImportRow[]): PayableImportIssue[] {
  const issues: PayableImportIssue[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (!row.descricao.trim()) {
      issues.push({ linha: row.linha, severidade: 'erro', campo: 'Descricao', mensagem: 'Descricao vazia.' });
    }
    if (!row.vencimentoDia) {
      issues.push({ linha: row.linha, severidade: 'aviso', campo: 'Vencimento', mensagem: 'Vencimento sem dia valido entre 1 e 31. O texto original sera preservado.' });
    }
    if (!Number.isFinite(Number(row.valorPrevisto)) || Number(row.valorPrevisto) < 0) {
      issues.push({ linha: row.linha, severidade: 'erro', campo: 'Valor', mensagem: 'Valor invalido ou negativo.' });
    }
    if (!row.categoria.trim()) {
      issues.push({ linha: row.linha, severidade: 'aviso', campo: 'Categoria', mensagem: 'Categoria vazia; sera gravada como Sem categoria.' });
    }

    const key = itemBusinessKey(row);
    if (seen.has(key)) {
      issues.push({ linha: row.linha, severidade: 'aviso', mensagem: 'Possivel despesa duplicada na planilha importada.' });
    }
    seen.add(key);
  }

  return issues;
}

async function createPayableSnapshot(supabase: SupabaseClient, competenciaId: string, motivo: string, detalhe: Record<string, unknown> = {}) {
  const { data: month } = await supabase
    .from('contas_pagar_competencias')
    .select('competencia, status')
    .eq('id', competenciaId)
    .maybeSingle();

  const { data: itens, error: itensError } = await supabase
    .from('contas_pagar_itens')
    .select('*')
    .eq('competencia_id', competenciaId)
    .order('created_at', { ascending: true });

  if (itensError) throw new Error(`Erro ao criar snapshot do pagamentos: ${itensError.message}`);

  const { data: snapshot, error } = await supabase.from('contas_pagar_snapshots').insert({
    competencia_id: competenciaId,
    competencia: month?.competencia || null,
    motivo,
    total_itens: itens?.length || 0,
    payload: { competencia: month?.competencia, status: month?.status, itens: itens || [], detalhe },
  }).select('id').single();

  if (error) throw new Error(`Erro ao gravar snapshot do pagamentos: ${error.message}`);

  await logEvent({
    supabase,
    modulo: 'contas_pagar',
    competencia: month?.competencia || null,
    action: 'snapshot',
    entidadeTipo: 'contas_pagar_snapshot',
    entidadeId: snapshot?.id as string | undefined,
    detalhe: { motivo, total_itens: itens?.length || 0, ...detalhe },
  });

  return snapshot?.id as string | undefined;
}

function summarize(rows: PayableItem[]): PayableSummary {
  const total = roundMoney(rows.reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0));
  const totalPago = roundMoney(rows.filter((row) => row.pago).reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0));
  return {
    total,
    totalPago,
    totalAberto: roundMoney(total - totalPago),
    quantidade: rows.length,
    quantidadePaga: rows.filter((row) => row.pago).length,
  };
}

function isUncategorized(value: unknown) {
  return !String(value || '').trim() || String(value || '').trim().toLowerCase() === 'sem categoria';
}

function isWithoutCenter(value: unknown) {
  return !String(value || '').trim() || String(value || '').trim().toLowerCase() === 'sem centro';
}

function normalizeGroupKey(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/cp\s*:\s*\d+\s*-/g, '')
    .replace(/\d{3,}/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 80) || 'sem_descricao';
}

function summarizeSanitization(rows: PayableSanitizationRow[]): PayableSanitizationSummary {
  return {
    pendentes: rows.length,
    semCategoria: rows.filter((row) => row.pendencias.includes('categoria')).length,
    semCentro: rows.filter((row) => row.pendencias.includes('centro')).length,
    totalPendente: roundMoney(rows.reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0)),
    grupos: new Set(rows.map((row) => normalizeGroupKey(row.descricao))).size,
  };
}

function buildSanitizationGroups(rows: PayableSanitizationRow[]): PayableSanitizationGroup[] {
  const map = new Map<string, PayableSanitizationGroup>();

  for (const row of rows) {
    const chave = normalizeGroupKey(row.descricao);
    const current = map.get(chave) || {
      chave,
      descricao: row.descricao,
      quantidade: 0,
      total: 0,
      ids: [],
      sugestao: null,
    };

    current.quantidade += 1;
    current.total = roundMoney(current.total + Number(row.valor_previsto || 0));
    current.ids.push(row.id);
    if (row.sugestao && (!current.sugestao || row.sugestao.pontuacao > current.sugestao.pontuacao)) {
      current.sugestao = row.sugestao;
    }
    map.set(chave, current);
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total || b.quantidade - a.quantidade);
}

type ForecastSuggestionSource = {
  descricao: string;
  categoria: string;
  valorPrevisto: number;
  vencimentoDia: number | null;
};

type CreatePayableItemInput = {
  competencia: string;
  descricao: string;
  vencimentoDia: number | null;
  vencimentoTexto?: string | null;
  valorPrevisto: number;
  categoria: string;
  centro?: string | null;
  pago: boolean;
};

function tokenSet(value: string) {
  return new Set(normalizeText(value).split(' ').filter((part) => part.length > 2));
}

function textSimilarity(a: string, b: string) {
  const aTokens = tokenSet(a);
  const bTokens = tokenSet(b);
  if (!aTokens.size || !bTokens.size) return 0;
  let intersection = 0;
  aTokens.forEach((token) => {
    if (bTokens.has(token)) intersection += 1;
  });
  const union = new Set([...Array.from(aTokens), ...Array.from(bTokens)]).size;
  const jaccard = union ? intersection / union : 0;
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  const substringBonus = normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA) ? 0.2 : 0;
  return Math.min(1, jaccard + substringBonus);
}

function valueSimilarity(actual: number, forecast: number) {
  if (!actual || !forecast) return 0;
  const diffRatio = Math.abs(actual - forecast) / Math.max(actual, forecast);
  return Math.max(0, 1 - Math.min(diffRatio, 1));
}

function daySimilarity(actual: number | null, forecast: number | null) {
  if (!actual || !forecast) return 0;
  const diff = Math.abs(actual - forecast);
  if (diff === 0) return 1;
  if (diff <= 3) return 0.7;
  if (diff <= 7) return 0.4;
  return 0;
}

function bestForecastSuggestion(row: PayableSanitizationRow, forecastRows: ForecastSuggestionSource[]): PayableSanitizationSuggestion | null {
  let best: PayableSanitizationSuggestion | null = null;

  for (const forecast of forecastRows) {
    if (isUncategorized(forecast.categoria)) continue;
    const textScore = textSimilarity(row.descricao, forecast.descricao);
    const amountScore = valueSimilarity(Number(row.valor_previsto || 0), Number(forecast.valorPrevisto || 0));
    const dateScore = daySimilarity(row.vencimento_dia, forecast.vencimentoDia);
    const score = roundMoney((textScore * 0.55 + amountScore * 0.3 + dateScore * 0.15) * 100);

    if (score < 45) continue;
    if (!best || score > best.pontuacao) {
      best = {
        categoria: forecast.categoria,
        descricaoPrevista: forecast.descricao,
        valorPrevisto: forecast.valorPrevisto,
        pontuacao: score,
        motivo: [
          textScore >= 0.5 ? 'descricao parecida' : null,
          amountScore >= 0.75 ? 'valor proximo' : null,
          dateScore >= 0.7 ? 'dia proximo' : null,
        ].filter(Boolean).join(', ') || 'melhor correspondencia da previsao',
      };
    }
  }

  return best;
}

async function listForecastSuggestionSources(supabase: SupabaseClient, competencia: string): Promise<ForecastSuggestionSource[]> {
  const { data, error } = await supabase
    .from('gkit_flex_previsao_pagamentos')
    .select('descricao, categoria, valor_previsto, vencimento_dia')
    .eq('competencia', competencia)
    .not('categoria', 'is', null)
    .neq('categoria', 'Sem categoria')
    .limit(500);

  if (error) {
    console.warn('[gkit_flex_previsao_pagamentos] falha ao ler previsao para sugestoes:', error.message);
    return [];
  }

  return (data || []).map((row) => ({
    descricao: String(row.descricao || ''),
    categoria: String(row.categoria || 'Sem categoria'),
    valorPrevisto: roundMoney(Number(row.valor_previsto || 0)),
    vencimentoDia: row.vencimento_dia === null || row.vencimento_dia === undefined ? null : Number(row.vencimento_dia),
  })).filter((row) => row.descricao && !isUncategorized(row.categoria));
}

async function listPayableCadastroValues(supabase: SupabaseClient, tipo: 'categoria' | 'centro', defaults: string[]) {
  const values = new Set(defaults);

  const { data: cadastroRows, error: cadastroError } = await supabase
    .from('gkit_cadastros')
    .select('nome')
    .eq('tipo', tipo)
    .eq('status', 'ativo')
    .order('nome', { ascending: true });

  if (cadastroError) console.warn(`[gkit_cadastros] falha ao ler ${tipo}s:`, cadastroError.message);
  for (const row of cadastroRows || []) {
    const nome = String(row.nome || '').trim();
    if (tipo === 'categoria' ? !isUncategorized(nome) : !isWithoutCenter(nome)) values.add(nome);
  }

  const { data: payableRows, error: payableError } = await supabase
    .from('contas_pagar_itens')
    .select(tipo)
    .not(tipo, 'is', null)
    .neq(tipo, tipo === 'categoria' ? 'Sem categoria' : 'Sem centro')
    .limit(1000);

  if (payableError) console.warn(`[contas_pagar_itens] falha ao ler ${tipo}s:`, payableError.message);
  for (const row of (payableRows || []) as Array<Record<string, unknown>>) {
    const value = String(row[tipo] || '').trim();
    if (tipo === 'categoria' ? !isUncategorized(value) : !isWithoutCenter(value)) values.add(value);
  }

  return Array.from(values).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

async function listPayableCategories(supabase: SupabaseClient) {
  return listPayableCadastroValues(supabase, 'categoria', ['Pessoal', 'Impostos', 'Operacional', 'Despesas do negocio', 'Comissoes']);
}

async function listPayableCenters(supabase: SupabaseClient) {
  return listPayableCadastroValues(supabase, 'centro', ['Pessoal', 'Equipe', 'Operacional', 'Estrutura']);
}

async function ensurePayableCadastro(supabase: SupabaseClient, tipo: 'categoria' | 'centro', value: string) {
  const normalized = String(value || '').trim();
  if (!normalized) return;
  if (tipo === 'categoria' && isUncategorized(normalized)) return;
  if (tipo === 'centro' && isWithoutCenter(normalized)) return;

  const slug = buildSlug(normalized);
  const nome = suggestCanonicalName(tipo, normalized);
  const { data: existing, error: existingError } = await supabase
    .from('gkit_cadastros')
    .select('id, usos')
    .eq('tipo', tipo)
    .eq('slug', slug)
    .maybeSingle();

  if (existingError) {
    console.warn(`[gkit_cadastros] falha ao consultar ${tipo}:`, existingError.message);
    return;
  }

  if (existing?.id) {
    await supabase
      .from('gkit_cadastros')
      .update({ status: 'ativo', updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    return;
  }

  const { data, error } = await supabase
    .from('gkit_cadastros')
    .insert({ tipo, nome, slug, status: 'ativo', origem: 'saneamento', usos: 0 })
    .select('id')
    .single();

  if (error) {
    console.warn(`[gkit_cadastros] falha ao criar ${tipo}:`, error.message);
    return;
  }

  await supabase.from('gkit_cadastro_aliases').upsert({
    cadastro_id: data.id,
    tipo,
    alias: normalized,
    alias_slug: slug,
    origem: 'saneamento',
  }, { onConflict: 'tipo,alias_slug' });
}

async function getMonthRow(supabase: SupabaseClient, competencia: string) {
  const { data, error } = await supabase
    .from('contas_pagar_competencias')
    .select('id, competencia, status, opened_at, closed_at, created_at')
    .eq('competencia', competencia)
    .maybeSingle();

  if (error) throw new Error(`Erro ao consultar competencia de pagamentos: ${error.message}`);
  return data;
}

export async function getPayableMonthStatus(competenciaInput: string) {
  const supabase = getSupabaseAdmin();
  const competencia = sanitizeCompetencia(competenciaInput);

  if (!supabase) {
    return { configured: false, competencia, status: 'nao_aberto' as PayableMonthStatus, canEdit: false, row: null };
  }

  const row = await getMonthRow(supabase, competencia);
  if (!row) return { configured: true, competencia, status: 'nao_aberto' as PayableMonthStatus, canEdit: false, row: null };

  return {
    configured: true,
    competencia,
    status: row.status as PayableMonthStatus,
    canEdit: row.status === 'aberto',
    row,
  };
}

export async function openPayableMonth(competenciaInput: string, mode: 'abrir' | 'reabrir' = 'abrir') {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase nao configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');

  const competencia = sanitizeCompetencia(competenciaInput);
  const current = await getPayableMonthStatus(competencia);

  if (current.status === 'aberto') return current;
  if (current.status === 'fechado' && mode !== 'reabrir') {
    throw new Error('Esta competencia esta fechada. Use reabrir mes para liberar alteracoes.');
  }

  if (current.status === 'nao_aberto') {
    const { error } = await supabase.from('contas_pagar_competencias').insert({
      competencia,
      status: 'aberto',
      opened_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Erro ao abrir pagamentos: ${error.message}`);
  } else {
    const { error } = await supabase
      .from('contas_pagar_competencias')
      .update({ status: 'aberto', closed_at: null, reopened_at: new Date().toISOString() })
      .eq('competencia', competencia);
    if (error) throw new Error(`Erro ao reabrir pagamentos: ${error.message}`);
  }

  await logEvent({ supabase, modulo: 'contas_pagar', competencia, action: mode === 'reabrir' ? 'reabrir_mes' : 'abrir_mes', detalhe: { mode } });
  return getPayableMonthStatus(competencia);
}

async function requireOpenPayableMonth(supabase: SupabaseClient, competencia: string): Promise<string> {
  const row = await getMonthRow(supabase, competencia);
  if (!row) throw new Error('Competencia ainda nao aberta. Abra o mes antes de importar ou editar pagamentos.');
  if (row.status !== 'aberto') throw new Error('Competencia fechada. Reabra o mes antes de alterar pagamentos.');
  return row.id as string;
}


export async function previewPayablesImport(competenciaInput: string, rows: PayableImportRow[], fileName: string): Promise<PayableImportPreview> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase nao configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');

  const competencia = sanitizeCompetencia(competenciaInput);
  const competenciaId = await requireOpenPayableMonth(supabase, competencia);

  const issues = validatePayableRows(rows);
  const fatalIssues = issues.filter((issue) => issue.severidade === 'erro');
  const validRows = fatalIssues.length ? rows.filter((row) => !issues.some((issue) => issue.linha === row.linha && issue.severidade === 'erro')) : rows;

  const { data: currentRows, error } = await supabase
    .from('contas_pagar_itens')
    .select('id, descricao, vencimento_dia, vencimento_texto, valor_previsto, categoria, centro, pago, origem_tipo')
    .eq('competencia_id', competenciaId);

  if (error) throw new Error(`Erro ao montar previa da importacao: ${error.message}`);

  const current = (currentRows || []) as PayableItem[];
  const reconciliation = planPayablesImportReconciliation(current, validRows);

  const valorAtualManual = roundMoney(current.reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0));
  const valorImportadoManual = roundMoney(validRows.reduce((acc, row) => acc + Number(row.valorPrevisto || 0), 0));

  const preview: PayableImportPreview = {
    competencia,
    arquivo: fileName,
    linhasLidas: rows.length,
    linhasValidas: validRows.length,
    linhasComErro: fatalIssues.length,
    itensAtuais: currentRows?.length || 0,
    itensAtuaisManuais: current.length,
    itensAtuaisComissao: 0,
    itensNovos: reconciliation.rowsToInsert.length,
    itensAlterados: reconciliation.rowsToUpdate.length,
    itensRemovidos: reconciliation.rowsToDelete.length,
    valorAtualManual,
    valorImportadoManual,
    diferencaValorManual: roundMoney(valorImportadoManual - valorAtualManual),
    issues,
    sample: validRows.slice(0, 20),
  };

  const { error: auditError } = await supabase.from('contas_pagar_importacoes').insert({
    competencia_id: competenciaId,
    competencia,
    arquivo_nome: fileName,
    modo: 'preview',
    linhas_lidas: preview.linhasLidas,
    linhas_validas: preview.linhasValidas,
    linhas_com_erro: preview.linhasComErro,
    itens_novos: preview.itensNovos,
    itens_alterados: preview.itensAlterados,
    itens_removidos: preview.itensRemovidos,
    valor_atual_manual: preview.valorAtualManual,
    valor_importado_manual: preview.valorImportadoManual,
    issues: preview.issues,
  });

  if (auditError) console.warn('[contas_pagar_importacoes] falha ao gravar preview:', auditError.message);

  await logEvent({
    supabase,
    modulo: 'contas_pagar',
    competencia,
    action: 'preview_importacao_contas_pagar',
    detalhe: preview,
  });

  return preview;
}

export async function importPayables(competenciaInput: string, rows: PayableImportRow[], fileName: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase nao configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');

  const competencia = sanitizeCompetencia(competenciaInput);
  const competenciaId = await requireOpenPayableMonth(supabase, competencia);
  const issues = validatePayableRows(rows);
  const fatalIssues = issues.filter((issue) => issue.severidade === 'erro');

  if (fatalIssues.length) {
    throw new Error(`Importacao bloqueada: ${fatalIssues.length} linha(s) com erro. Faca a previa para ver a auditoria antes de confirmar.`);
  }

  const snapshotId = await createPayableSnapshot(supabase, competenciaId, 'antes_importacao_contas_pagar', {
    arquivo: fileName,
    linhas_lidas: rows.length,
  });

  const preview = await previewPayablesImport(competencia, rows, fileName);
  const { data: currentRows, error: currentError } = await supabase
    .from('contas_pagar_itens')
    .select('id, competencia_id, competencia, descricao, vencimento_dia, vencimento_texto, valor_previsto, categoria, centro, pago, origem_tipo')
    .eq('competencia_id', competenciaId);

  if (currentError) throw new Error(`Erro ao consultar pagamentos atuais: ${currentError.message}`);

  const reconciliation = planPayablesImportReconciliation((currentRows || []) as PayableItem[], rows);

  if (reconciliation.rowsToDelete.length) {
    const { error: deleteError } = await supabase
      .from('contas_pagar_itens')
      .delete()
      .in('id', reconciliation.rowsToDelete.map((row) => row.id));

    if (deleteError) throw new Error(`Erro ao remover pagamentos ausentes do extrato: ${deleteError.message}`);
  }

  for (const { current, imported } of reconciliation.rowsToUpdate) {
    const { error: updateError } = await supabase
      .from('contas_pagar_itens')
      .update({
        descricao: imported.descricao,
        vencimento_dia: imported.vencimentoDia,
        vencimento_texto: imported.vencimentoTexto,
        valor_previsto: imported.valorPrevisto,
        categoria: imported.categoria || 'Sem categoria',
        centro: imported.centro,
        pago: Boolean(imported.pago),
        origem_tipo: 'importacao',
        origem_arquivo: fileName,
        raw: imported.raw,
      })
      .eq('id', current.id);

    if (updateError) throw new Error(`Erro ao atualizar pagamento importado: ${updateError.message}`);
  }

  if (reconciliation.rowsToInsert.length) {
    const { error: insertError } = await supabase.from('contas_pagar_itens').insert(reconciliation.rowsToInsert.map((row) => ({
      competencia_id: competenciaId,
      competencia,
      descricao: row.descricao,
      vencimento_dia: row.vencimentoDia,
      vencimento_texto: row.vencimentoTexto,
      valor_previsto: row.valorPrevisto,
      categoria: row.categoria || 'Sem categoria',
      centro: row.centro,
      pago: Boolean(row.pago),
      origem_tipo: 'importacao',
      origem_arquivo: fileName,
      raw: row.raw,
    })));

    if (insertError) throw new Error(`Erro ao importar pagamentos: ${insertError.message}`);
  }

  await supabase.from('contas_pagar_importacoes').insert({
    competencia_id: competenciaId,
    competencia,
    arquivo_nome: fileName,
    modo: 'confirmado',
    snapshot_id: snapshotId || null,
    linhas_lidas: preview.linhasLidas,
    linhas_validas: preview.linhasValidas,
    linhas_com_erro: preview.linhasComErro,
    itens_novos: preview.itensNovos,
    itens_alterados: preview.itensAlterados,
    itens_removidos: preview.itensRemovidos,
    valor_atual_manual: preview.valorAtualManual,
    valor_importado_manual: preview.valorImportadoManual,
    issues: preview.issues,
  });

  await logEvent({
    supabase,
    modulo: 'contas_pagar',
    competencia,
    action: 'importar_contas_pagar',
    detalhe: { ...preview, arquivo: fileName, snapshotId },
  });

  await syncCicloRegularidadePagamentos(supabase, competencia);
  return { ...(await listPayables(competencia)), preview, snapshotId };
}

export async function listPayables(competenciaInput: string) {
  const supabase = getSupabaseAdmin();
  const competencia = sanitizeCompetencia(competenciaInput);
  if (!supabase) return { configured: false, competencia, status: 'nao_aberto' as PayableMonthStatus, rows: [] as PayableItem[], summary: summarize([]) };

  const status = await getPayableMonthStatus(competencia);
  if (!status.row) return { configured: true, competencia, status: status.status, rows: [] as PayableItem[], summary: summarize([]) };

  if (status.status === 'aberto') await syncCicloRegularidadePagamentos(supabase, competencia);

  const { data, error } = await supabase
    .from('contas_pagar_itens')
    .select('id, competencia_id, competencia, descricao, vencimento_dia, vencimento_texto, valor_previsto, categoria, centro, pago, origem_tipo, origem_execucao_id, origem_resumo_id, created_at, updated_at')
    .eq('competencia_id', status.row.id)
    .order('vencimento_dia', { ascending: true, nullsFirst: false })
    .order('descricao', { ascending: true });

  if (error) throw new Error(`Erro ao listar pagamentos: ${error.message}`);
  const rows = (data || []) as PayableItem[];
  const forecast = await getMonthlyForecast(competencia);
  return {
    configured: true,
    competencia,
    status: status.status,
    rows,
    summary: summarize(rows),
    forecastSummary: forecast.summary,
  };
}

export async function listPayableSanitization(competenciaInput: string) {
  const supabase = getSupabaseAdmin();
  const competencia = sanitizeCompetencia(competenciaInput);
  if (!supabase) {
    return {
      configured: false,
      competencia,
      status: 'nao_aberto' as PayableMonthStatus,
      canEdit: false,
      rows: [] as PayableSanitizationRow[],
      groups: [] as PayableSanitizationGroup[],
      categories: [] as string[],
      centers: [] as string[],
      summary: summarizeSanitization([]),
    };
  }

  const status = await getPayableMonthStatus(competencia);
  const categories = await listPayableCategories(supabase);
  const centers = await listPayableCenters(supabase);
  const forecastSources = await listForecastSuggestionSources(supabase, competencia);
  for (const forecast of forecastSources) {
    if (!isUncategorized(forecast.categoria)) categories.push(forecast.categoria);
  }
  const uniqueCategories = Array.from(new Set(categories)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const uniqueCenters = Array.from(new Set(centers)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  if (!status.row) {
    return {
      configured: true,
      competencia,
      status: status.status,
      canEdit: false,
      rows: [] as PayableSanitizationRow[],
      groups: [] as PayableSanitizationGroup[],
      categories: uniqueCategories,
      centers: uniqueCenters,
      summary: summarizeSanitization([]),
    };
  }

  const { data, error } = await supabase
    .from('contas_pagar_itens')
    .select('id, descricao, vencimento_dia, vencimento_texto, valor_previsto, categoria, centro, origem_tipo, origem_arquivo, raw, created_at')
    .eq('competencia_id', status.row.id)
    .or('categoria.is.null,categoria.eq.Sem categoria,categoria.eq.,centro.is.null,centro.eq.Sem centro,centro.eq.')
    .order('vencimento_dia', { ascending: true, nullsFirst: false })
    .order('descricao', { ascending: true });

  if (error) throw new Error(`Erro ao listar saneamento de pagamentos: ${error.message}`);
  const rows = ((data || []) as PayableSanitizationRow[])
    .map((row) => {
      const pendencias: PayableSanitizationRow['pendencias'] = [];
      if (isUncategorized(row.categoria)) pendencias.push('categoria');
      if (isWithoutCenter(row.centro)) pendencias.push('centro');
      return {
        ...row,
        pendencias,
        sugestao: bestForecastSuggestion(row, forecastSources),
      };
    })
    .filter((row) => row.pendencias.length);

  return {
    configured: true,
    competencia,
    status: status.status,
    canEdit: status.status === 'aberto',
    rows,
    groups: buildSanitizationGroups(rows),
    categories: uniqueCategories,
    centers: uniqueCenters,
    summary: summarizeSanitization(rows),
  };
}

export async function classifyPayableSanitization(competenciaInput: string, ids: string[], fieldInput: 'categoria' | 'centro', valueInput: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase nao configurado.');

  const competencia = sanitizeCompetencia(competenciaInput);
  const competenciaId = await requireOpenPayableMonth(supabase, competencia);
  const field = fieldInput === 'centro' ? 'centro' : 'categoria';
  const value = String(valueInput || '').trim();
  if (!value) throw new Error(`Escolha um ${field === 'categoria' ? 'categoria' : 'centro'} de destino.`);
  if (field === 'categoria' && isUncategorized(value)) throw new Error('Escolha uma categoria de destino diferente de Sem categoria.');
  if (field === 'centro' && isWithoutCenter(value)) throw new Error('Escolha um centro de destino diferente de Sem centro.');

  const uniqueIds = Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
  if (!uniqueIds.length) throw new Error('Selecione ao menos um pagamento para classificar.');

  const { data: currentRows, error: readError } = await supabase
    .from('contas_pagar_itens')
    .select('id, descricao, valor_previsto, categoria, centro')
    .eq('competencia_id', competenciaId)
    .in('id', uniqueIds);

  if (readError) throw new Error(`Erro ao consultar pagamentos selecionados: ${readError.message}`);

  const rowsToUpdate = ((currentRows || []) as Array<{ id: string; categoria: string | null; centro: string | null; valor_previsto: number }>)
    .filter((row) => field === 'categoria' ? isUncategorized(row.categoria) : isWithoutCenter(row.centro));
  if (!rowsToUpdate.length) throw new Error(`Nenhum pagamento selecionado ainda esta sem ${field === 'categoria' ? 'categoria' : 'centro'}.`);

  const updateIds = rowsToUpdate.map((row) => row.id);
  const { error } = await supabase
    .from('contas_pagar_itens')
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq('competencia_id', competenciaId)
    .in('id', updateIds);

  if (error) throw new Error(`Erro ao classificar pagamentos: ${error.message}`);

  await ensurePayableCadastro(supabase, field, value);

  await logEvent({
    supabase,
    modulo: 'contas_pagar',
    competencia,
    action: 'saneamento_classificar_pagamentos',
    detalhe: {
      campo: field,
      valor: value,
      selecionados: uniqueIds.length,
      atualizados: updateIds.length,
      valor_total: roundMoney(rowsToUpdate.reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0)),
    },
  });

  return { ok: true, updated: updateIds.length, field, value, ...(await listPayableSanitization(competencia)) };
}

export async function updatePayableItem(id: string, patch: Partial<Pick<PayableItem, 'descricao' | 'valor_previsto' | 'categoria' | 'pago'>>) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase nao configurado.');

  const { data: item, error: readError } = await supabase
    .from('contas_pagar_itens')
    .select('id, competencia_id, competencia, origem_tipo')
    .eq('id', id)
    .single();

  if (readError) throw new Error(`Pagamento nao encontrado: ${readError.message}`);
  await requireOpenPayableMonth(supabase, item.competencia as string);
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.descricao !== undefined) payload.descricao = String(patch.descricao).trim();
  if (patch.valor_previsto !== undefined) payload.valor_previsto = roundMoney(Number(patch.valor_previsto));
  if (patch.categoria !== undefined) payload.categoria = String(patch.categoria).trim() || 'Sem categoria';
  if (patch.pago !== undefined) payload.pago = Boolean(patch.pago);

  const { error } = await supabase
    .from('contas_pagar_itens')
    .update(payload)
    .eq('id', id);

  if (error) throw new Error(`Erro ao atualizar pagamento: ${error.message}`);
  if (patch.pago !== undefined) await syncCicloRegularidadePagamentos(supabase, item.competencia as string);
  await logEvent({ supabase, modulo: 'contas_pagar', competencia: item.competencia as string, action: 'atualizar_conta_pagar', entidadeTipo: 'contas_pagar_item', entidadeId: id, detalhe: { patch: payload } });
  return { ok: true };
}

export async function createManualPayableItem(input: CreatePayableItemInput) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase nao configurado.');

  const competencia = sanitizeCompetencia(input.competencia);
  const competenciaId = await requireOpenPayableMonth(supabase, competencia);
  const descricao = String(input.descricao || '').trim();
  const valorPrevisto = roundMoney(Number(input.valorPrevisto || 0));
  const vencimentoDia = input.vencimentoDia === null || input.vencimentoDia === undefined ? null : Number(input.vencimentoDia);

  if (!descricao) throw new Error('Descricao do pagamento e obrigatoria.');
  if (!Number.isFinite(valorPrevisto) || valorPrevisto <= 0) throw new Error('Valor do pagamento deve ser maior que zero.');
  if (vencimentoDia !== null && (!Number.isInteger(vencimentoDia) || vencimentoDia < 1 || vencimentoDia > 31)) {
    throw new Error('Dia de vencimento deve ficar entre 1 e 31.');
  }

  const { data, error } = await supabase
    .from('contas_pagar_itens')
    .insert({
      competencia_id: competenciaId,
      competencia,
      descricao,
      vencimento_dia: vencimentoDia,
      vencimento_texto: input.vencimentoTexto || (vencimentoDia ? String(vencimentoDia).padStart(2, '0') : null),
      valor_previsto: valorPrevisto,
      categoria: String(input.categoria || '').trim() || 'Sem categoria',
      centro: String(input.centro || '').trim() || null,
      pago: Boolean(input.pago),
      origem_tipo: 'manual',
      raw: { origem: 'manual' },
    })
    .select('id')
    .single();

  if (error) throw new Error(`Erro ao criar pagamento manual: ${error.message}`);

  await logEvent({
    supabase,
    modulo: 'contas_pagar',
    competencia,
    action: 'criar_conta_pagar_manual',
    entidadeTipo: 'contas_pagar_item',
    entidadeId: data?.id as string | undefined,
    detalhe: { descricao, vencimentoDia, valorPrevisto, categoria: input.categoria, centro: input.centro, pago: Boolean(input.pago) },
  });

  return { ok: true, id: data?.id, ...(await listPayables(competencia)) };
}

export async function closePayableMonthAndCreateNext(competenciaInput: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase nao configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');

  const competencia = sanitizeCompetencia(competenciaInput);
  const current = await getPayableMonthStatus(competencia);
  if (!current.row) throw new Error('Esta competencia ainda nao foi aberta.');
  if (current.status !== 'aberto') throw new Error('Esta competencia ja esta fechada ou nao permite fechamento.');

  await syncCicloRegularidadePagamentos(supabase, competencia);

  const { data: currentItems, error: itemsError } = await supabase
    .from('contas_pagar_itens')
    .select('id, descricao, vencimento_dia, vencimento_texto, valor_previsto, categoria, centro, origem_tipo, origem_execucao_id, origem_resumo_id, raw')
    .eq('competencia_id', current.row.id)
    .order('vencimento_dia', { ascending: true, nullsFirst: false });

  if (itemsError) throw new Error(`Erro ao carregar pagamentos atuais para fechamento: ${itemsError.message}`);

  const next = nextCompetencia(competencia);
  let nextRow = await getMonthRow(supabase, next);

  if (!nextRow) {
    const { data, error } = await supabase
      .from('contas_pagar_competencias')
      .insert({
        competencia: next,
        status: 'aberto',
        opened_at: new Date().toISOString(),
        origem_competencia_id: current.row.id,
      })
      .select('id, competencia, status, opened_at, closed_at, created_at')
      .single();
    if (error) throw new Error(`Erro ao criar pagamentos do proximo mes: ${error.message}`);
    nextRow = data;
  } else if (nextRow.status === 'fechado') {
    throw new Error('O proximo mes ja existe e esta fechado. Nao vou sobrescrever historico fechado.');
  } else {
    const { error: deleteNextError } = await supabase
      .from('contas_pagar_itens')
      .delete()
      .eq('competencia_id', nextRow.id);
    if (deleteNextError) throw new Error(`Erro ao substituir pagamentos previstos do proximo mes: ${deleteNextError.message}`);
  }

  const itemsToCopy = currentItems || [];

  if (itemsToCopy.length) {
    const { error: copyError } = await supabase.from('contas_pagar_itens').insert(itemsToCopy.map((item) => ({
      competencia_id: nextRow.id,
      competencia: next,
      descricao: item.descricao,
      vencimento_dia: item.vencimento_dia,
      vencimento_texto: item.vencimento_texto,
      valor_previsto: item.valor_previsto,
      categoria: item.categoria,
      centro: item.centro,
      pago: false,
      origem_tipo: item.origem_tipo || 'recorrencia',
      origem_item_id: item.id,
      raw: item.raw || {},
    })));
    if (copyError) throw new Error(`Erro ao copiar pagamentos previstos para o proximo mes: ${copyError.message}`);
  }

  await createPayableSnapshot(supabase, current.row.id as string, 'antes_fechamento_contas_pagar', { proximo_mes: next, itens_copiados: itemsToCopy.length });

  const { error: closeError } = await supabase
    .from('contas_pagar_competencias')
    .update({ status: 'fechado', closed_at: new Date().toISOString() })
    .eq('id', current.row.id);

  if (closeError) throw new Error(`Erro ao fechar pagamentos: ${closeError.message}`);
  await logEvent({ supabase, modulo: 'contas_pagar', competencia, action: 'fechar_mes', detalhe: { nextCompetencia: next, copied: itemsToCopy.length } });

  return { closed: competencia, nextCompetencia: next, copied: itemsToCopy.length, skippedCommissions: 0 };
}


export async function exportPayablesWorkbook(competenciaInput: string) {
  const result = await listPayables(competenciaInput);
  if (!result.configured) throw new Error('Supabase nao configurado.');

  const buffer = buildPayablesExportWorkbook({
    competencia: result.competencia,
    rows: result.rows,
    summary: result.summary,
  });

  return {
    competencia: result.competencia,
    buffer,
    filename: `pagamentos-${result.competencia.slice(0, 7)}.xlsx`,
  };
}

