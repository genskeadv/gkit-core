import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, logEvent } from '../audit';
import type { CommissionProcessResult } from './types';

type SaveExecutionInput = {
  competencia: string;
  contasFileName: string;
  clientesFileName: string;
  result: CommissionProcessResult;
};

type SaveExecutionResult = {
  executionId: string | null;
  saved: boolean;
  warning?: string;
};

type MonthStatus = 'aberto' | 'fechado' | 'nao_aberto';

function sumBy<T>(rows: T[], picker: (row: T) => number): number {
  return Math.round(rows.reduce((acc, row) => acc + picker(row), 0) * 100) / 100;
}

export function sanitizeCompetencia(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 10);
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export async function getCommissionMonthStatus(competenciaInput: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { configured: false, competencia: sanitizeCompetencia(competenciaInput), status: 'nao_aberto' as MonthStatus, canProcess: false, row: null };
  }

  const competencia = sanitizeCompetencia(competenciaInput);
  const { data, error } = await supabase
    .from('comissao_competencias')
    .select('id, competencia, status, opened_at, closed_at, reopened_at, created_at')
    .eq('competencia', competencia)
    .maybeSingle();

  if (error) throw new Error(`Erro ao consultar competencia no Supabase: ${error.message}`);

  if (!data) {
    return { configured: true, competencia, status: 'nao_aberto' as MonthStatus, canProcess: false, row: null };
  }

  return {
    configured: true,
    competencia,
    status: data.status as MonthStatus,
    canProcess: data.status === 'aberto',
    row: data,
  };
}

export async function openCommissionMonth(competenciaInput: string, mode: 'abrir' | 'reabrir' = 'abrir') {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase nao configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');

  const competencia = sanitizeCompetencia(competenciaInput);
  const current = await getCommissionMonthStatus(competencia);

  if (current.status === 'aberto') return current;

  if (current.status === 'fechado' && mode !== 'reabrir') {
    throw new Error('Esta competencia esta fechada. Use reabrir mes para liberar novo processamento.');
  }

  if (current.status === 'nao_aberto') {
    const { error } = await supabase.from('comissao_competencias').insert({
      competencia,
      status: 'aberto',
      opened_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Erro ao abrir competencia: ${error.message}`);
  } else {
    const { error } = await supabase
      .from('comissao_competencias')
      .update({ status: 'aberto', closed_at: null, reopened_at: new Date().toISOString() })
      .eq('competencia', competencia);
    if (error) throw new Error(`Erro ao reabrir competencia: ${error.message}`);
  }

  await logEvent({ supabase, modulo: 'comissoes', competencia, action: mode === 'reabrir' ? 'reabrir_mes' : 'abrir_mes', detalhe: { mode } });
  return getCommissionMonthStatus(competencia);
}

export async function closeCommissionMonth(competenciaInput: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase nao configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');

  const competencia = sanitizeCompetencia(competenciaInput);
  const current = await getCommissionMonthStatus(competencia);

  if (current.status === 'nao_aberto') {
    throw new Error('Esta competencia ainda nao foi aberta. Nao ha mes para fechar.');
  }

  if (current.status === 'fechado') return current;

  const { error } = await supabase
    .from('comissao_competencias')
    .update({ status: 'fechado', closed_at: new Date().toISOString() })
    .eq('competencia', competencia);

  if (error) throw new Error(`Erro ao fechar competencia: ${error.message}`);
  await logEvent({ supabase, modulo: 'comissoes', competencia, action: 'fechar_mes' });
  return getCommissionMonthStatus(competencia);
}

async function requireOpenMonth(supabase: SupabaseClient, competencia: string): Promise<string> {
  const { data, error } = await supabase
    .from('comissao_competencias')
    .select('id, status')
    .eq('competencia', competencia)
    .maybeSingle();

  if (error) throw new Error(`Erro ao validar competencia: ${error.message}`);
  if (!data) throw new Error('Competencia ainda nao aberta. Abra o mes antes de calcular comissoes.');
  if (data.status !== 'aberto') throw new Error('Competencia fechada. Reabra o mes antes de recalcular ou importar novas planilhas.');

  return data.id as string;
}

async function replaceOpenMonthExecution(supabase: SupabaseClient, competencia: string) {
  const { data, error } = await supabase
    .from('comissao_execucoes')
    .select('id')
    .eq('competencia', competencia)
    .eq('status', 'processado');

  if (error) throw new Error(`Erro ao consultar execucoes anteriores: ${error.message}`);

  const executionIds = (data || []).map((row) => row.id as string).filter(Boolean);
  if (!executionIds.length) return 0;

  const deleteTables = ['comissao_auditoria', 'comissao_lancamentos', 'comissao_resumos'];
  for (const table of deleteTables) {
    const { error: childError } = await supabase.from(table).delete().in('execucao_id', executionIds);
    if (childError) throw new Error(`Erro ao substituir ${table}: ${childError.message}`);
  }

  const { error: executionError } = await supabase.from('comissao_execucoes').delete().in('id', executionIds);
  if (executionError) throw new Error(`Erro ao substituir execucoes anteriores: ${executionError.message}`);

  return executionIds.length;
}

export async function saveCommissionExecution(input: SaveExecutionInput): Promise<SaveExecutionResult> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return {
      executionId: null,
      saved: false,
      warning: 'Supabase nao configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para gravar a execucao.',
    };
  }

  const competencia = sanitizeCompetencia(input.competencia);
  const competenciaId = await requireOpenMonth(supabase, competencia);
  const replacedExecutions = await replaceOpenMonthExecution(supabase, competencia);
  const totalValorRecebido = sumBy(input.result.summaries, (row) => row.valorRecebido);
  const totalBaseReduzida = sumBy(input.result.summaries, (row) => row.valorAposReducao);
  const totalComissao = sumBy(input.result.summaries, (row) => row.comissaoFinal);

  const { data: execution, error: executionError } = await supabase
    .from('comissao_execucoes')
    .insert({
      competencia_id: competenciaId,
      competencia,
      contas_file_name: input.contasFileName,
      clientes_file_name: input.clientesFileName,
      total_valor_recebido: totalValorRecebido,
      total_base_reduzida: totalBaseReduzida,
      total_comissao: totalComissao,
      audit_count: input.result.auditRows.length,
      status: 'processado',
    })
    .select('id')
    .single();

  if (executionError) {
    throw new Error(`Erro ao gravar execucao no Supabase: ${executionError.message}`);
  }

  const executionId = execution.id as string;

  if (input.result.summaries.length) {
    const { error } = await supabase.from('comissao_resumos').insert(
      input.result.summaries.map((row) => ({
        execucao_id: executionId,
        categoria: row.categoria,
        carteira: row.carteira,
        quantidade_lancamentos: row.quantidadeLancamentos,
        valor_recebido: row.valorRecebido,
        reducao_percentual: row.reducaoPercentual,
        valor_reducao: row.valorReducao,
        valor_apos_reducao: row.valorAposReducao,
        percentual_comissao: row.percentualComissao,
        comissao_total: row.comissaoTotal,
        divisor: row.divisor,
        comissao_final: row.comissaoFinal,
      })),
    );
    if (error) throw new Error(`Erro ao gravar resumos no Supabase: ${error.message}`);
  }

  if (input.result.enrichedRows.length) {
    const chunks = chunkArray(input.result.enrichedRows, 500);
    for (const chunk of chunks) {
      const { error } = await supabase.from('comissao_lancamentos').insert(
        chunk.map((row) => ({
          execucao_id: executionId,
          linha: row.linha,
          cliente: row.cliente,
          documento: row.documento,
          categoria: row.categoria,
          situacao: row.situacao,
          valor_recebido: row.valorRecebido,
          carteira: row.vendedor,
          criterio_match: row.criterioMatch,
          observacao: row.observacao,
          raw: row.raw,
        })),
      );
      if (error) throw new Error(`Erro ao gravar lancamentos no Supabase: ${error.message}`);
    }
  }

  if (input.result.auditRows.length) {
    const { error } = await supabase.from('comissao_auditoria').insert(
      input.result.auditRows.map((row) => ({
        execucao_id: executionId,
        linha: row.linha,
        cliente: row.cliente,
        documento: row.documento,
        categoria: row.categoria,
        valor_recebido: row.valorRecebido,
        carteira: row.vendedor,
        problema: row.problema,
      })),
    );
    if (error) throw new Error(`Erro ao gravar auditoria no Supabase: ${error.message}`);
  }

  await logEvent({ supabase, modulo: 'comissoes', competencia, action: 'calcular_comissoes', entidadeTipo: 'comissao_execucao', entidadeId: executionId, detalhe: { contasFileName: input.contasFileName, clientesFileName: input.clientesFileName, totalValorRecebido, totalBaseReduzida, totalComissao, auditCount: input.result.auditRows.length, replacedExecutions } });

  return { executionId, saved: true };
}

export async function listCommissionExecutions() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { configured: false, rows: [] as unknown[] };
  }

  const { data, error } = await supabase
    .from('comissao_execucoes')
    .select('id, competencia, contas_file_name, clientes_file_name, total_valor_recebido, total_base_reduzida, total_comissao, audit_count, status, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(`Erro ao consultar execucoes no Supabase: ${error.message}`);
  return { configured: true, rows: data ?? [] };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
