import type { SupabaseClient } from '@supabase/supabase-js';
import type { PayableImportIssue, PayableImportPreview, PayableImportRow, PayableItem, PayableMonthStatus, PayableSummary } from './types';
import { getSupabaseAdmin, logEvent } from '../audit';
import { buildPayablesExportWorkbook } from './payableProcessor';
import { syncCicloRegularidadePagamentos } from '../regularidade-pagamentos';

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

function validatePayableRows(rows: PayableImportRow[]): PayableImportIssue[] {
  const issues: PayableImportIssue[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (!row.descricao.trim()) {
      issues.push({ linha: row.linha, severidade: 'erro', campo: 'Descrição', mensagem: 'Descrição vazia.' });
    }
    if (!row.vencimentoDia) {
      issues.push({ linha: row.linha, severidade: 'aviso', campo: 'Vencimento', mensagem: 'Vencimento sem dia válido entre 1 e 31. O texto original será preservado.' });
    }
    if (!Number.isFinite(Number(row.valorPrevisto)) || Number(row.valorPrevisto) < 0) {
      issues.push({ linha: row.linha, severidade: 'erro', campo: 'Valor previsto', mensagem: 'Valor previsto inválido ou negativo.' });
    }
    if (!row.categoria.trim()) {
      issues.push({ linha: row.linha, severidade: 'aviso', campo: 'Categoria', mensagem: 'Categoria vazia; será gravada como Sem categoria.' });
    }

    const key = itemBusinessKey(row);
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

  if (itensError) throw new Error(`Erro ao criar snapshot do contas a pagar: ${itensError.message}`);

  const { data: snapshot, error } = await supabase.from('contas_pagar_snapshots').insert({
    competencia_id: competenciaId,
    competencia: month?.competencia || null,
    motivo,
    total_itens: itens?.length || 0,
    payload: { competencia: month?.competencia, status: month?.status, itens: itens || [], detalhe },
  }).select('id').single();

  if (error) throw new Error(`Erro ao gravar snapshot do contas a pagar: ${error.message}`);

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

async function getMonthRow(supabase: SupabaseClient, competencia: string) {
  const { data, error } = await supabase
    .from('contas_pagar_competencias')
    .select('id, competencia, status, opened_at, closed_at, created_at')
    .eq('competencia', competencia)
    .maybeSingle();

  if (error) throw new Error(`Erro ao consultar competência de contas a pagar: ${error.message}`);
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
    if (error) throw new Error(`Erro ao abrir contas a pagar: ${error.message}`);
  } else {
    const { error } = await supabase
      .from('contas_pagar_competencias')
      .update({ status: 'aberto', closed_at: null, reopened_at: new Date().toISOString() })
      .eq('competencia', competencia);
    if (error) throw new Error(`Erro ao reabrir contas a pagar: ${error.message}`);
  }

  await logEvent({ supabase, modulo: 'contas_pagar', competencia, action: mode === 'reabrir' ? 'reabrir_mes' : 'abrir_mes', detalhe: { mode } });
  return getPayableMonthStatus(competencia);
}

async function requireOpenPayableMonth(supabase: SupabaseClient, competencia: string): Promise<string> {
  const row = await getMonthRow(supabase, competencia);
  if (!row) throw new Error('Competência ainda não aberta. Abra o mês antes de importar ou editar contas a pagar.');
  if (row.status !== 'aberto') throw new Error('Competência fechada. Reabra o mês antes de alterar contas a pagar.');
  return row.id as string;
}


async function syncCommissionPayables(supabase: SupabaseClient, competencia: string, competenciaId: string) {
  // Só sincroniza comissões para mês aberto. Mês fechado é histórico imutável.
  const { data: month, error: monthError } = await supabase
    .from('contas_pagar_competencias')
    .select('status')
    .eq('id', competenciaId)
    .maybeSingle();

  if (monthError) throw new Error(`Erro ao validar mês para sincronizar comissões: ${monthError.message}`);
  if (!month || month.status !== 'aberto') return { synced: false, inserted: 0 };

  const { data: latestExecution, error: executionError } = await supabase
    .from('comissao_execucoes')
    .select('id, created_at')
    .eq('competencia', competencia)
    .eq('status', 'processado')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (executionError) throw new Error(`Erro ao consultar comissões calculadas: ${executionError.message}`);

  const { data: existingCommissionItems, error: existingCommissionError } = await supabase
    .from('contas_pagar_itens')
    .select('origem_resumo_id,pago')
    .eq('competencia_id', competenciaId)
    .eq('origem_tipo', 'comissao');

  if (existingCommissionError) throw new Error(`Erro ao preservar pagamentos de comissão: ${existingCommissionError.message}`);

  const paidBySummaryId = new Map(
    (existingCommissionItems || [])
      .filter((item) => item.origem_resumo_id)
      .map((item) => [String(item.origem_resumo_id), Boolean(item.pago)]),
  );

  // Remove os itens automáticos anteriores. Os itens manuais/importados ficam preservados.
  const { error: deleteError } = await supabase
    .from('contas_pagar_itens')
    .delete()
    .eq('competencia_id', competenciaId)
    .eq('origem_tipo', 'comissao');

  if (deleteError) throw new Error(`Erro ao atualizar contas de comissão: ${deleteError.message}`);

  if (!latestExecution?.id) return { synced: true, inserted: 0 };

  const { data: summaries, error: summaryError } = await supabase
    .from('comissao_resumos')
    .select('id, categoria, carteira, comissao_final')
    .eq('execucao_id', latestExecution.id)
    .gt('comissao_final', 0)
    .order('categoria', { ascending: true })
    .order('carteira', { ascending: true });

  if (summaryError) throw new Error(`Erro ao consultar resumo de comissões: ${summaryError.message}`);

  const rows = (summaries || []).map((summary) => ({
    competencia_id: competenciaId,
    competencia,
    descricao: `Comissão - ${summary.categoria} - ${summary.carteira}`,
    vencimento_dia: 30,
    vencimento_texto: '30',
    valor_previsto: roundMoney(Number(summary.comissao_final || 0)),
    categoria: 'Comissões',
    centro: 'Pessoal',
    pago: paidBySummaryId.get(String(summary.id)) ?? false,
    origem_tipo: 'comissao',
    origem_execucao_id: latestExecution.id,
    origem_resumo_id: summary.id,
    raw: {
      origem: 'comissao_calculada',
      categoria_comissao: summary.categoria,
      carteira: summary.carteira,
      execucao_id: latestExecution.id,
      resumo_id: summary.id,
    },
  }));

  if (rows.length) {
    const { error: insertError } = await supabase.from('contas_pagar_itens').insert(rows);
    if (insertError) throw new Error(`Erro ao inserir comissões no contas a pagar: ${insertError.message}`);
  }

  return { synced: true, inserted: rows.length };
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

  const manualCurrent = (currentRows || []).filter((row) => row.origem_tipo !== 'comissao') as PayableItem[];
  const commissionCurrent = (currentRows || []).filter((row) => row.origem_tipo === 'comissao') as PayableItem[];
  const currentByKey = new Map(manualCurrent.map((row) => [itemBusinessKey(row), row]));
  const importedByKey = new Map(validRows.map((row) => [itemBusinessKey(row), row]));

  let itensNovos = 0;
  let itensAlterados = 0;
  for (const row of validRows) {
    const current = currentByKey.get(itemBusinessKey(row));
    if (!current) {
      itensNovos += 1;
      continue;
    }
    const changed =
      roundMoney(Number(current.valor_previsto || 0)) !== roundMoney(Number(row.valorPrevisto || 0)) ||
      Boolean(current.pago) !== Boolean(row.pago) ||
      String(current.centro || '') !== String(row.centro || '') ||
      String(current.vencimento_texto || '') !== String(row.vencimentoTexto || '');
    if (changed) itensAlterados += 1;
  }

  let itensRemovidos = 0;
  for (const current of manualCurrent) {
    if (!importedByKey.has(itemBusinessKey(current))) itensRemovidos += 1;
  }

  const valorAtualManual = roundMoney(manualCurrent.reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0));
  const valorImportadoManual = roundMoney(validRows.reduce((acc, row) => acc + Number(row.valorPrevisto || 0), 0));

  const preview: PayableImportPreview = {
    competencia,
    arquivo: fileName,
    linhasLidas: rows.length,
    linhasValidas: validRows.length,
    linhasComErro: fatalIssues.length,
    itensAtuais: currentRows?.length || 0,
    itensAtuaisManuais: manualCurrent.length,
    itensAtuaisComissao: commissionCurrent.length,
    itensNovos,
    itensAlterados,
    itensRemovidos,
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
    throw new Error(`Importação bloqueada: ${fatalIssues.length} linha(s) com erro. Faça a prévia para ver a auditoria antes de confirmar.`);
  }

  const snapshotId = await createPayableSnapshot(supabase, competenciaId, 'antes_importacao_contas_pagar', {
    arquivo: fileName,
    linhas_lidas: rows.length,
  });

  const preview = await previewPayablesImport(competencia, rows, fileName);

  const { error: deleteError } = await supabase
    .from('contas_pagar_itens')
    .delete()
    .eq('competencia_id', competenciaId)
    .or('origem_tipo.is.null,origem_tipo.neq.comissao');

  if (deleteError) throw new Error(`Erro ao sobrescrever contas a pagar abertas: ${deleteError.message}`);

  if (rows.length) {
    const { error: insertError } = await supabase.from('contas_pagar_itens').insert(rows.map((row) => ({
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

    if (insertError) throw new Error(`Erro ao importar contas a pagar: ${insertError.message}`);
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

  await syncCommissionPayables(supabase, competencia, competenciaId);
  await syncCicloRegularidadePagamentos(supabase, competencia);
  return { ...(await listPayables(competencia)), preview, snapshotId };
}

export async function listPayables(competenciaInput: string) {
  const supabase = getSupabaseAdmin();
  const competencia = sanitizeCompetencia(competenciaInput);
  if (!supabase) return { configured: false, competencia, status: 'nao_aberto' as PayableMonthStatus, rows: [] as PayableItem[], summary: summarize([]) };

  const status = await getPayableMonthStatus(competencia);
  if (!status.row) return { configured: true, competencia, status: status.status, rows: [] as PayableItem[], summary: summarize([]) };

  if (status.status === 'aberto') {
    await syncCommissionPayables(supabase, competencia, status.row.id as string);
    await syncCicloRegularidadePagamentos(supabase, competencia);
  }

  const { data, error } = await supabase
    .from('contas_pagar_itens')
    .select('id, competencia_id, competencia, descricao, vencimento_dia, vencimento_texto, valor_previsto, categoria, centro, pago, origem_tipo, origem_execucao_id, origem_resumo_id, created_at, updated_at')
    .eq('competencia_id', status.row.id)
    .order('vencimento_dia', { ascending: true, nullsFirst: false })
    .order('descricao', { ascending: true });

  if (error) throw new Error(`Erro ao listar contas a pagar: ${error.message}`);
  const rows = (data || []) as PayableItem[];
  return { configured: true, competencia, status: status.status, rows, summary: summarize(rows) };
}

export async function updatePayableItem(id: string, patch: Partial<Pick<PayableItem, 'descricao' | 'valor_previsto' | 'categoria' | 'pago'>>) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data: item, error: readError } = await supabase
    .from('contas_pagar_itens')
    .select('id, competencia_id, competencia, origem_tipo')
    .eq('id', id)
    .single();

  if (readError) throw new Error(`Conta a pagar não encontrada: ${readError.message}`);
  await requireOpenPayableMonth(supabase, item.competencia as string);
  if ((item as { origem_tipo?: string | null }).origem_tipo === 'comissao' && (patch.descricao !== undefined || patch.valor_previsto !== undefined || patch.categoria !== undefined)) {
    throw new Error('Itens automáticos de comissão não podem ter descrição, categoria ou valor alterados manualmente. Recalcule as comissões para corrigir a origem.');
  }

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.descricao !== undefined) payload.descricao = String(patch.descricao).trim();
  if (patch.valor_previsto !== undefined) payload.valor_previsto = roundMoney(Number(patch.valor_previsto));
  if (patch.categoria !== undefined) payload.categoria = String(patch.categoria).trim() || 'Sem categoria';
  if (patch.pago !== undefined) payload.pago = Boolean(patch.pago);

  const { error } = await supabase
    .from('contas_pagar_itens')
    .update(payload)
    .eq('id', id);

  if (error) throw new Error(`Erro ao atualizar conta a pagar: ${error.message}`);
  if (patch.pago !== undefined && (item as { origem_tipo?: string | null }).origem_tipo === 'comissao') {
    await syncCicloRegularidadePagamentos(supabase, item.competencia as string);
  }
  await logEvent({ supabase, modulo: 'contas_pagar', competencia: item.competencia as string, action: 'atualizar_conta_pagar', entidadeTipo: 'contas_pagar_item', entidadeId: id, detalhe: { patch: payload } });
  return { ok: true };
}

export async function closePayableMonthAndCreateNext(competenciaInput: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');

  const competencia = sanitizeCompetencia(competenciaInput);
  const current = await getPayableMonthStatus(competencia);
  if (!current.row) throw new Error('Esta competência ainda não foi aberta.');
  if (current.status !== 'aberto') throw new Error('Esta competência já está fechada ou não permite fechamento.');

  await syncCommissionPayables(supabase, competencia, current.row.id as string);
  await syncCicloRegularidadePagamentos(supabase, competencia);

  const { data: currentItems, error: itemsError } = await supabase
    .from('contas_pagar_itens')
    .select('id, descricao, vencimento_dia, vencimento_texto, valor_previsto, categoria, centro, origem_tipo, origem_execucao_id, origem_resumo_id, raw')
    .eq('competencia_id', current.row.id)
    .order('vencimento_dia', { ascending: true, nullsFirst: false });

  if (itemsError) throw new Error(`Erro ao carregar contas atuais para fechamento: ${itemsError.message}`);

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
    if (error) throw new Error(`Erro ao criar contas a pagar do próximo mês: ${error.message}`);
    nextRow = data;
  } else if (nextRow.status === 'fechado') {
    throw new Error('O próximo mês já existe e está fechado. Não vou sobrescrever histórico fechado.');
  } else {
    const { error: deleteNextError } = await supabase
      .from('contas_pagar_itens')
      .delete()
      .eq('competencia_id', nextRow.id);
    if (deleteNextError) throw new Error(`Erro ao substituir contas do próximo mês: ${deleteNextError.message}`);
  }

  const itemsToCopy = (currentItems || []).filter((item) => item.origem_tipo !== 'comissao');

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
    if (copyError) throw new Error(`Erro ao copiar contas para o próximo mês: ${copyError.message}`);
  }

  await createPayableSnapshot(supabase, current.row.id as string, 'antes_fechamento_contas_pagar', { proximo_mes: next, itens_copiados: itemsToCopy.length });

  const { error: closeError } = await supabase
    .from('contas_pagar_competencias')
    .update({ status: 'fechado', closed_at: new Date().toISOString() })
    .eq('id', current.row.id);

  if (closeError) throw new Error(`Erro ao fechar contas a pagar: ${closeError.message}`);
  await logEvent({ supabase, modulo: 'contas_pagar', competencia, action: 'fechar_mes', detalhe: { nextCompetencia: next, copied: itemsToCopy.length } });

  return { closed: competencia, nextCompetencia: next, copied: itemsToCopy.length, skippedCommissions: (currentItems?.length || 0) - itemsToCopy.length };
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
    filename: `contas-a-pagar-${result.competencia.slice(0, 7)}.xlsx`,
  };
}
