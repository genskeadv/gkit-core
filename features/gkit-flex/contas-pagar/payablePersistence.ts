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
import { applyAdvanceDiscounts, isAdvanceCategory, type AdvanceDiscountSource, type AdvanceDiscountTarget } from '../adiantamentos';

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

function importDuplicateKey(row: PayableImportRow): string {
  return [
    itemBusinessKey(row),
    roundMoney(Number(row.valorPrevisto || 0)).toFixed(2),
  ].join('|');
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
      issues.push({ linha: row.linha, severidade: 'erro', campo: 'Descricao', mensagem: 'Descrição vazia.' });
    }
    if (!row.vencimentoDia) {
      issues.push({ linha: row.linha, severidade: 'aviso', campo: 'Vencimento', mensagem: 'Vencimento sem dia válido entre 1 e 31. O texto original será preservado.' });
    }
    if (!Number.isFinite(Number(row.valorPrevisto)) || Number(row.valorPrevisto) < 0) {
      issues.push({ linha: row.linha, severidade: 'erro', campo: 'Valor', mensagem: 'Valor invalido ou negativo.' });
    }
    if (!row.categoria.trim()) {
      issues.push({ linha: row.linha, severidade: 'aviso', campo: 'Categoria', mensagem: 'Categoria vazia; será gravada como Sem categoria.' });
    }

    const key = importDuplicateKey(row);
    if (seen.has(key)) {
      issues.push({ linha: row.linha, severidade: 'aviso', mensagem: 'Possível despesa duplicada na planilha importada.' });
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

  if (itensError) throw new Error(`Erro ao criar snapshot dos pagamentos: ${itensError.message}`);

  const { data: snapshot, error } = await supabase.from('contas_pagar_snapshots').insert({
    competencia_id: competenciaId,
    competencia: month?.competencia || null,
    motivo,
    total_itens: itens?.length || 0,
    payload: { competencia: month?.competencia, status: month?.status, itens: itens || [], detalhe },
  }).select('id').single();

  if (error) throw new Error(`Erro ao gravar snapshot dos pagamentos: ${error.message}`);

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

function isMissingMoneyColumnsError(error: unknown) {
  const record = error as { code?: string; message?: string } | null;
  const message = String(record?.message || '').toLowerCase();
  return record?.code === '42703' || (message.includes('money_conta') && message.includes('column'));
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
  moneyContaId?: string | null;
  moneyContaDestinoId?: string | null;
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
          textScore >= 0.5 ? 'descrição parecida' : null,
          amountScore >= 0.75 ? 'valor próximo' : null,
          dateScore >= 0.7 ? 'dia próximo' : null,
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
    console.warn('[gkit_flex_previsao_pagamentos] falha ao ler previsão para sugestões:', error.message);
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function getAssociatedCenterForCategory(supabase: SupabaseClient, categoryName: string) {
  const slug = buildSlug(categoryName);
  if (!slug) return null;

  const { data: categoria, error: categoriaError } = await supabase
    .from('gkit_cadastros')
    .select('metadata')
    .eq('tipo', 'categoria')
    .eq('slug', slug)
    .maybeSingle();

  if (categoriaError) {
    console.warn('[gkit_cadastros] falha ao consultar centro associado da categoria:', categoriaError.message);
    return null;
  }

  const centroId = String(asRecord(asRecord(categoria?.metadata).gkit_flex).centro_id || '').trim();
  if (!centroId) return null;

  const { data: centro, error: centroError } = await supabase
    .from('gkit_cadastros')
    .select('nome,status')
    .eq('id', centroId)
    .eq('tipo', 'centro')
    .maybeSingle();

  if (centroError) {
    console.warn('[gkit_cadastros] falha ao resolver centro associado da categoria:', centroError.message);
    return null;
  }

  const nome = String(centro?.nome || '').trim();
  return nome && centro?.status !== 'inativo' ? nome : null;
}

async function getMonthRow(supabase: SupabaseClient, competencia: string) {
  const { data, error } = await supabase
    .from('contas_pagar_competencias')
    .select('id, competencia, status, opened_at, closed_at, created_at')
    .eq('competencia', competencia)
    .maybeSingle();

  if (error) throw new Error(`Erro ao consultar competência de pagamentos: ${error.message}`);
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
  if (!supabase) throw new Error('Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');

  const competencia = sanitizeCompetencia(competenciaInput);
  const current = await getPayableMonthStatus(competencia);

  if (current.status === 'aberto') return current;
  if (current.status === 'fechado' && mode !== 'reabrir') {
    throw new Error('Esta competência está fechada. Use reabrir mês para liberar alterações.');
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
  if (!row) throw new Error('Competência ainda não aberta. Abra o mês antes de importar ou editar pagamentos.');
  if (row.status !== 'aberto') throw new Error('Competência fechada. Reabra o mês antes de alterar pagamentos.');
  return row.id as string;
}


export async function previewPayablesImport(competenciaInput: string, rows: PayableImportRow[], fileName: string): Promise<PayableImportPreview> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');

  const competencia = sanitizeCompetencia(competenciaInput);
  const competenciaId = await requireOpenPayableMonth(supabase, competencia);

  const issues = validatePayableRows(rows);
  const fatalIssues = issues.filter((issue) => issue.severidade === 'erro');
  const validRows = fatalIssues.length ? rows.filter((row) => !issues.some((issue) => issue.linha === row.linha && issue.severidade === 'erro')) : rows;

  const { data: currentRows, error } = await supabase
    .from('contas_pagar_itens')
    .select('id, descricao, vencimento_dia, vencimento_texto, valor_previsto, categoria, centro, pago, origem_tipo')
    .eq('competencia_id', competenciaId);

  if (error) throw new Error(`Erro ao montar prévia da importação: ${error.message}`);

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
  if (!supabase) throw new Error('Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');

  const competencia = sanitizeCompetencia(competenciaInput);
  const competenciaId = await requireOpenPayableMonth(supabase, competencia);
  const issues = validatePayableRows(rows);
  const fatalIssues = issues.filter((issue) => issue.severidade === 'erro');

  if (fatalIssues.length) {
    throw new Error(`Importação bloqueada: ${fatalIssues.length} linha(s) com erro. Faca a previa para ver a auditoria antes de confirmar.`);
  }

  const snapshotId = await createPayableSnapshot(supabase, competenciaId, 'antes_importacao_contas_pagar', {
    arquivo: fileName,
    linhas_lidas: rows.length,
  });

  const preview = await previewPayablesImport(competencia, rows, fileName);
  const selectCurrentRows = (columns: string) => supabase
    .from('contas_pagar_itens')
    .select(columns)
    .eq('competencia_id', competenciaId);

  let { data: currentRows, error: currentError } = await selectCurrentRows('id, competencia_id, competencia, descricao, vencimento_dia, vencimento_texto, valor_previsto, categoria, centro, pago, money_conta_id, money_conta_destino_id, origem_tipo');
  if (currentError && isMissingMoneyColumnsError(currentError)) {
    ({ data: currentRows, error: currentError } = await selectCurrentRows('id, competencia_id, competencia, descricao, vencimento_dia, vencimento_texto, valor_previsto, categoria, centro, pago, origem_tipo'));
  }

  if (currentError) throw new Error(`Erro ao consultar pagamentos atuais: ${currentError.message}`);

  const reconciliation = planPayablesImportReconciliation((currentRows || []) as unknown as PayableItem[], rows);

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

  const selectPayables = (columns: string) =>
    supabase
      .from('contas_pagar_itens')
      .select(columns)
      .eq('competencia_id', status.row.id)
      .order('vencimento_dia', { ascending: true, nullsFirst: false })
      .order('descricao', { ascending: true });

  let { data, error } = await selectPayables('id, competencia_id, competencia, descricao, vencimento_dia, vencimento_texto, valor_previsto, categoria, centro, pago, money_conta_id, money_conta_destino_id, origem_tipo, origem_execucao_id, origem_resumo_id, created_at, updated_at');
  if (error && isMissingMoneyColumnsError(error)) {
    ({ data, error } = await selectPayables('id, competencia_id, competencia, descricao, vencimento_dia, vencimento_texto, valor_previsto, categoria, centro, pago, origem_tipo, origem_execucao_id, origem_resumo_id, created_at, updated_at'));
  }

  if (error) throw new Error(`Erro ao listar pagamentos: ${error.message}`);
  const rows = (data || []) as unknown as PayableItem[];
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
  if (!supabase) throw new Error('Supabase não configurado.');

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
  const associatedCenter = field === 'categoria' ? await getAssociatedCenterForCategory(supabase, value) : null;
  const associatedCenterIds = associatedCenter
    ? rowsToUpdate.filter((row) => isWithoutCenter(row.centro)).map((row) => row.id)
    : [];

  const { error } = await supabase
    .from('contas_pagar_itens')
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq('competencia_id', competenciaId)
    .in('id', updateIds);

  if (error) throw new Error(`Erro ao classificar pagamentos: ${error.message}`);

  await ensurePayableCadastro(supabase, field, value);
  if (associatedCenter && associatedCenterIds.length) {
    const { error: centerError } = await supabase
      .from('contas_pagar_itens')
      .update({ centro: associatedCenter, updated_at: new Date().toISOString() })
      .eq('competencia_id', competenciaId)
      .in('id', associatedCenterIds);

    if (centerError) throw new Error(`Erro ao aplicar centro associado: ${centerError.message}`);
    await ensurePayableCadastro(supabase, 'centro', associatedCenter);
  }

  await logEvent({
    supabase,
    modulo: 'contas_pagar',
    competencia,
    action: 'saneamento_classificar_pagamentos',
    detalhe: {
      campo: field,
      valor: value,
      centro_associado: associatedCenter,
      centro_associado_atualizados: associatedCenterIds.length,
      selecionados: uniqueIds.length,
      atualizados: updateIds.length,
      valor_total: roundMoney(rowsToUpdate.reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0)),
    },
  });

  return { ok: true, updated: updateIds.length, field, value, ...(await listPayableSanitization(competencia)) };
}

export async function updatePayableItem(id: string, patch: Partial<Pick<PayableItem, 'descricao' | 'vencimento_dia' | 'vencimento_texto' | 'valor_previsto' | 'categoria' | 'pago' | 'money_conta_id' | 'money_conta_destino_id'>>) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data: item, error: readError } = await supabase
    .from('contas_pagar_itens')
    .select('id, competencia_id, competencia, origem_tipo')
    .eq('id', id)
    .single();

  if (readError) throw new Error(`Pagamento não encontrado: ${readError.message}`);
  await requireOpenPayableMonth(supabase, item.competencia as string);
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.descricao !== undefined) payload.descricao = String(patch.descricao).trim();
  if (patch.vencimento_dia !== undefined) {
    const vencimentoDia = patch.vencimento_dia === null ? null : Number(patch.vencimento_dia);
    if (vencimentoDia !== null && (!Number.isInteger(vencimentoDia) || vencimentoDia < 1 || vencimentoDia > 31)) {
      throw new Error('Dia de vencimento deve ficar entre 1 e 31.');
    }
    payload.vencimento_dia = vencimentoDia;
    payload.vencimento_texto = patch.vencimento_texto ?? (vencimentoDia ? String(vencimentoDia).padStart(2, '0') : null);
  } else if (patch.vencimento_texto !== undefined) {
    payload.vencimento_texto = patch.vencimento_texto;
  }
  if (patch.valor_previsto !== undefined) payload.valor_previsto = roundMoney(Number(patch.valor_previsto));
  if (patch.categoria !== undefined) payload.categoria = String(patch.categoria).trim() || 'Sem categoria';
  if (patch.money_conta_id !== undefined) payload.money_conta_id = patch.money_conta_id || null;
  if (patch.money_conta_destino_id !== undefined) payload.money_conta_destino_id = patch.money_conta_destino_id || null;
  if (patch.pago !== undefined) payload.pago = Boolean(patch.pago);

  let { error } = await supabase
    .from('contas_pagar_itens')
    .update(payload)
    .eq('id', id);

  if (error && isMissingMoneyColumnsError(error) && ('money_conta_id' in payload || 'money_conta_destino_id' in payload)) {
    delete payload.money_conta_id;
    delete payload.money_conta_destino_id;
    ({ error } = await supabase
      .from('contas_pagar_itens')
      .update(payload)
      .eq('id', id));
  }

  if (error) throw new Error(`Erro ao atualizar pagamento: ${error.message}`);
  if (patch.pago !== undefined) await syncCicloRegularidadePagamentos(supabase, item.competencia as string);
  await logEvent({ supabase, modulo: 'contas_pagar', competencia: item.competencia as string, action: 'atualizar_conta_pagar', entidadeTipo: 'contas_pagar_item', entidadeId: id, detalhe: { patch: payload } });
  return { ok: true };
}

export async function createManualPayableItem(input: CreatePayableItemInput) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase não configurado.');

  const competencia = sanitizeCompetencia(input.competencia);
  const competenciaId = await requireOpenPayableMonth(supabase, competencia);
  const descricao = String(input.descricao || '').trim();
  const valorPrevisto = roundMoney(Number(input.valorPrevisto || 0));
  const vencimentoDia = input.vencimentoDia === null || input.vencimentoDia === undefined ? null : Number(input.vencimentoDia);

  if (!descricao) throw new Error('Descrição do pagamento é obrigatória.');
  if (!Number.isFinite(valorPrevisto) || valorPrevisto <= 0) throw new Error('Valor do pagamento deve ser maior que zero.');
  if (vencimentoDia !== null && (!Number.isInteger(vencimentoDia) || vencimentoDia < 1 || vencimentoDia > 31)) {
    throw new Error('Dia de vencimento deve ficar entre 1 e 31.');
  }

  const insertPayload: Record<string, unknown> = {
    competencia_id: competenciaId,
    competencia,
    descricao,
    vencimento_dia: vencimentoDia,
    vencimento_texto: input.vencimentoTexto || (vencimentoDia ? String(vencimentoDia).padStart(2, '0') : null),
    valor_previsto: valorPrevisto,
    categoria: String(input.categoria || '').trim() || 'Sem categoria',
    centro: String(input.centro || '').trim() || null,
    pago: Boolean(input.pago),
    money_conta_id: input.moneyContaId || null,
    money_conta_destino_id: input.moneyContaDestinoId || null,
    origem_tipo: 'manual',
    raw: { origem: 'manual' },
  };

  let { data, error } = await supabase
    .from('contas_pagar_itens')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error && isMissingMoneyColumnsError(error)) {
    delete insertPayload.money_conta_id;
    delete insertPayload.money_conta_destino_id;
    ({ data, error } = await supabase
      .from('contas_pagar_itens')
      .insert(insertPayload)
      .select('id')
      .single());
  }

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
  if (!supabase) throw new Error('Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');

  const competencia = sanitizeCompetencia(competenciaInput);
  const current = await getPayableMonthStatus(competencia);
  if (!current.row) throw new Error('Esta competência ainda não foi aberta.');
  if (current.status !== 'aberto') throw new Error('Esta competência já está fechada ou não permite fechamento.');

  await syncCicloRegularidadePagamentos(supabase, competencia);

  const selectItemsToCopy = (columns: string) => supabase
    .from('contas_pagar_itens')
    .select(columns)
    .eq('competencia_id', current.row.id)
    .order('vencimento_dia', { ascending: true, nullsFirst: false });

  let { data: currentItems, error: itemsError } = await selectItemsToCopy('id, descricao, vencimento_dia, vencimento_texto, valor_previsto, categoria, centro, money_conta_id, money_conta_destino_id, origem_tipo, origem_execucao_id, origem_resumo_id, raw');
  if (itemsError && isMissingMoneyColumnsError(itemsError)) {
    ({ data: currentItems, error: itemsError } = await selectItemsToCopy('id, descricao, vencimento_dia, vencimento_texto, valor_previsto, categoria, centro, origem_tipo, origem_execucao_id, origem_resumo_id, raw'));
  }

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
    if (error) throw new Error(`Erro ao criar pagamentos do próximo mês: ${error.message}`);
    nextRow = data;
  } else if (nextRow.status === 'fechado') {
    throw new Error('O próximo mês já existe e está fechado. Não vou sobrescrever histórico fechado.');
  } else {
    const { error: deleteNextError } = await supabase
      .from('contas_pagar_itens')
      .delete()
      .eq('competencia_id', nextRow.id);
    if (deleteNextError) throw new Error(`Erro ao substituir pagamentos previstos do próximo mês: ${deleteNextError.message}`);
  }

  type PayableCopyCandidate = AdvanceDiscountTarget<Record<string, unknown>> & {
    id?: string;
    centro?: string | null;
    money_conta_id?: string | null;
    money_conta_destino_id?: string | null;
    origem_tipo?: string | null;
    raw?: Record<string, unknown> | null;
  };

  const currentItemsToEvaluate = ((currentItems || []) as unknown) as PayableCopyCandidate[];
  const advanceRows = currentItemsToEvaluate
    .filter((item) => Boolean(item.pago) && isAdvanceCategory(item.categoria))
    .map((item) => item as AdvanceDiscountSource);
  const recurringCandidates = currentItemsToEvaluate.filter((item) => !isAdvanceCategory(item.categoria));
  const discountedItems = applyAdvanceDiscounts(recurringCandidates, advanceRows);
  const itemsToCopy = discountedItems
    .filter((entry) => entry.discountedValue > 0)
    .map((entry) => {
      const raw = entry.item.raw && typeof entry.item.raw === 'object' && !Array.isArray(entry.item.raw) ? entry.item.raw : {};
      return {
        ...entry.item,
        valor_previsto: entry.discountedValue,
        raw: entry.advanceApplied > 0
          ? {
              ...raw,
              adiantamento_descontado: {
                valor_original: entry.originalValue,
                valor_descontado: entry.advanceApplied,
                valor_liquido: entry.discountedValue,
                origem_item_ids: entry.advanceSourceIds,
                origem_competencia: competencia,
              },
            }
          : raw,
      };
    });
  const fullyDiscountedItems = discountedItems.filter((entry) => entry.originalValue > 0 && entry.discountedValue <= 0);

  if (itemsToCopy.length) {
    const copyPayload: Array<Record<string, unknown>> = itemsToCopy.map((item) => ({
      competencia_id: nextRow.id,
      competencia: next,
      descricao: item.descricao,
      vencimento_dia: item.vencimento_dia,
      vencimento_texto: item.vencimento_texto,
      valor_previsto: item.valor_previsto,
      categoria: item.categoria,
      centro: item.centro,
      money_conta_id: item.money_conta_id || null,
      money_conta_destino_id: item.money_conta_destino_id || null,
      pago: false,
      origem_tipo: item.origem_tipo || 'recorrencia',
      origem_item_id: item.id,
      raw: item.raw || {},
    }));
    let { error: copyError } = await supabase.from('contas_pagar_itens').insert(copyPayload);
    if (copyError && isMissingMoneyColumnsError(copyError)) {
      copyPayload.forEach((item) => {
        delete item.money_conta_id;
        delete item.money_conta_destino_id;
      });
      ({ error: copyError } = await supabase.from('contas_pagar_itens').insert(copyPayload));
    }
    if (copyError) throw new Error(`Erro ao copiar pagamentos previstos para o próximo mês: ${copyError.message}`);
  }

  await createPayableSnapshot(supabase, current.row.id as string, 'antes_fechamento_contas_pagar', {
    proximo_mes: next,
    itens_avaliados: currentItemsToEvaluate.length,
    itens_copiados: itemsToCopy.length,
    adiantamentos_descontados: advanceRows.length,
    itens_quitados_por_adiantamento: fullyDiscountedItems.length,
  });

  const { error: closeError } = await supabase
    .from('contas_pagar_competencias')
    .update({ status: 'fechado', closed_at: new Date().toISOString() })
    .eq('id', current.row.id);

  if (closeError) throw new Error(`Erro ao fechar pagamentos: ${closeError.message}`);
  await logEvent({
    supabase,
    modulo: 'contas_pagar',
    competencia,
    action: 'fechar_mes',
    detalhe: {
      nextCompetencia: next,
      copied: itemsToCopy.length,
      advanceDiscounts: advanceRows.length,
      fullyDiscounted: fullyDiscountedItems.length,
    },
  });

  return { closed: competencia, nextCompetencia: next, copied: itemsToCopy.length, skippedCommissions: 0 };
}


export async function exportPayablesWorkbook(competenciaInput: string) {
  const result = await listPayables(competenciaInput);
  if (!result.configured) throw new Error('Supabase não configurado.');

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

