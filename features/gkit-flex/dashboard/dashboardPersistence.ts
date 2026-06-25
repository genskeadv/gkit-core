import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { closeCommissionMonth, openCommissionMonth } from '../comissoes/supabasePersistence';
import { closePayableMonthAndCreateNext, openPayableMonth } from '../contas-pagar/payablePersistence';

type MonthStatus = 'aberto' | 'fechado' | 'nao_aberto';

type DashboardSummary = {
  configured: boolean;
  competencia: string;
  comissoes: {
    status: MonthStatus;
    canProcess: boolean;
    latestExecution: null | {
      id: string;
      competencia: string;
      contas_file_name: string | null;
      clientes_file_name: string | null;
      total_valor_recebido: number;
      total_base_reduzida: number;
      total_comissao: number;
      audit_count: number;
      created_at: string;
    };
    totalsByCategory: Array<{
      categoria: string;
      valor_recebido: number;
      comissao_final: number;
    }>;
  };
  contasPagar: {
    status: MonthStatus;
    canEdit: boolean;
    total: number;
    totalPago: number;
    totalAberto: number;
    quantidade: number;
    quantidadePaga: number;
    quantidadeComissoes: number;
    totalComissoesNoPagar: number;
  };
  saldo: {
    recebidoMenosPagarTotal: number;
    recebidoMenosPagarAberto: number;
  };
};

function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function roundMoney(value: number): number {
  return Math.round((value || 0) * 100) / 100;
}

export function sanitizeCompetencia(value?: string | null): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 10);
  if (value && /^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

async function getStatus(
  supabase: SupabaseClient,
  table: 'comissao_competencias' | 'contas_pagar_competencias',
  competencia: string,
): Promise<{ status: MonthStatus; row: { id: string; status: string } | null }> {
  const { data, error } = await supabase
    .from(table)
    .select('id, status')
    .eq('competencia', competencia)
    .maybeSingle();

  if (error) throw new Error(`Erro ao consultar ${table}: ${error.message}`);
  if (!data) return { status: 'nao_aberto', row: null };
  return { status: data.status as MonthStatus, row: data as { id: string; status: string } };
}

export async function getDashboardSummary(competenciaInput?: string | null): Promise<DashboardSummary> {
  const competencia = sanitizeCompetencia(competenciaInput);
  const supabase = getSupabaseAdmin();

  const empty: DashboardSummary = {
    configured: false,
    competencia,
    comissoes: {
      status: 'nao_aberto',
      canProcess: false,
      latestExecution: null,
      totalsByCategory: [],
    },
    contasPagar: {
      status: 'nao_aberto',
      canEdit: false,
      total: 0,
      totalPago: 0,
      totalAberto: 0,
      quantidade: 0,
      quantidadePaga: 0,
      quantidadeComissoes: 0,
      totalComissoesNoPagar: 0,
    },
    saldo: {
      recebidoMenosPagarTotal: 0,
      recebidoMenosPagarAberto: 0,
    },
  };

  if (!supabase) return empty;

  const commissionMonth = await getStatus(supabase, 'comissao_competencias', competencia);
  const payableMonth = await getStatus(supabase, 'contas_pagar_competencias', competencia);

  const summary: DashboardSummary = {
    ...empty,
    configured: true,
    comissoes: {
      ...empty.comissoes,
      status: commissionMonth.status,
      canProcess: commissionMonth.status === 'aberto',
    },
    contasPagar: {
      ...empty.contasPagar,
      status: payableMonth.status,
      canEdit: payableMonth.status === 'aberto',
    },
  };

  const { data: latestExecution, error: latestError } = await supabase
    .from('comissao_execucoes')
    .select(
      'id, competencia, contas_file_name, clientes_file_name, total_valor_recebido, total_base_reduzida, total_comissao, audit_count, created_at',
    )
    .eq('competencia', competencia)
    .eq('status', 'processado')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw new Error(`Erro ao consultar última execução de comissões: ${latestError.message}`);

  if (latestExecution) {
    summary.comissoes.latestExecution = {
      id: latestExecution.id as string,
      competencia: latestExecution.competencia as string,
      contas_file_name: (latestExecution.contas_file_name as string | null) || null,
      clientes_file_name: (latestExecution.clientes_file_name as string | null) || null,
      total_valor_recebido: roundMoney(Number(latestExecution.total_valor_recebido || 0)),
      total_base_reduzida: roundMoney(Number(latestExecution.total_base_reduzida || 0)),
      total_comissao: roundMoney(Number(latestExecution.total_comissao || 0)),
      audit_count: Number(latestExecution.audit_count || 0),
      created_at: latestExecution.created_at as string,
    };

    const { data: rows, error: categoryError } = await supabase
      .from('comissao_resumos')
      .select('categoria, valor_recebido, comissao_final')
      .eq('execucao_id', latestExecution.id);

    if (categoryError) throw new Error(`Erro ao consultar categorias de comissão: ${categoryError.message}`);

    const byCategory = new Map<string, { categoria: string; valor_recebido: number; comissao_final: number }>();

    for (const row of rows || []) {
      const categoria = String(row.categoria || 'Sem categoria');
      const current = byCategory.get(categoria) || {
        categoria,
        valor_recebido: 0,
        comissao_final: 0,
      };

      current.valor_recebido = roundMoney(current.valor_recebido + Number(row.valor_recebido || 0));
      current.comissao_final = roundMoney(current.comissao_final + Number(row.comissao_final || 0));

      byCategory.set(categoria, current);
    }

    summary.comissoes.totalsByCategory = Array.from(byCategory.values()).sort((a, b) =>
      a.categoria.localeCompare(b.categoria),
    );
  }

  if (payableMonth.row?.id) {
    const { data: payables, error: payablesError } = await supabase
      .from('contas_pagar_itens')
      .select('valor_previsto, pago, origem_tipo')
      .eq('competencia_id', payableMonth.row.id);

    if (payablesError) throw new Error(`Erro ao consultar contas a pagar: ${payablesError.message}`);

    const rows = payables || [];
    const total = roundMoney(rows.reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0));
    const totalPago = roundMoney(
      rows.filter((row) => Boolean(row.pago)).reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0),
    );
    const commissionRows = rows.filter((row) => row.origem_tipo === 'comissao');

    summary.contasPagar.total = total;
    summary.contasPagar.totalPago = totalPago;
    summary.contasPagar.totalAberto = roundMoney(total - totalPago);
    summary.contasPagar.quantidade = rows.length;
    summary.contasPagar.quantidadePaga = rows.filter((row) => Boolean(row.pago)).length;
    summary.contasPagar.quantidadeComissoes = commissionRows.length;
    summary.contasPagar.totalComissoesNoPagar = roundMoney(
      commissionRows.reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0),
    );
  }

  const totalRecebido = summary.comissoes.latestExecution?.total_valor_recebido || 0;

  summary.saldo.recebidoMenosPagarTotal = roundMoney(totalRecebido - summary.contasPagar.total);
  summary.saldo.recebidoMenosPagarAberto = roundMoney(totalRecebido - summary.contasPagar.totalAberto);

  return summary;
}

export async function updateDashboardMonth(competenciaInput: string, action: 'abrir' | 'fechar' | 'reabrir') {
  const competencia = sanitizeCompetencia(competenciaInput);

  if (action === 'abrir') {
    const [comissoes, contasPagar] = await Promise.all([
      openCommissionMonth(competencia, 'abrir'),
      openPayableMonth(competencia, 'abrir'),
    ]);

    return { ok: true, action, competencia, comissoes, contasPagar };
  }

  if (action === 'reabrir') {
    const [comissoes, contasPagar] = await Promise.all([
      openCommissionMonth(competencia, 'reabrir'),
      openPayableMonth(competencia, 'reabrir'),
    ]);

    return { ok: true, action, competencia, comissoes, contasPagar };
  }

  // Fechamento operacional: fecha comissões e contas a pagar. O contas a pagar cria o próximo mês
  // com base nos itens recorrentes/importados e sem copiar as comissões.
  const results: Record<string, unknown> = { ok: true, action, competencia };

  try {
    results.comissoes = await closeCommissionMonth(competencia);
  } catch (error) {
    results.comissoesWarning = error instanceof Error ? error.message : 'Não foi possível fechar comissões.';
  }

  try {
    results.contasPagar = await closePayableMonthAndCreateNext(competencia);
  } catch (error) {
    results.contasPagarWarning = error instanceof Error ? error.message : 'Não foi possível fechar contas a pagar.';
  }

  return results;
}

export async function getDashboardPeriods(competenciaInput?: string | null) {
  const summary = await getDashboardSummary(competenciaInput);

  return {
    configured: summary.configured,
    competencia: summary.competencia,
    comissoes: {
      status: summary.comissoes.status,
      canProcess: summary.comissoes.canProcess,
    },
    contasPagar: {
      status: summary.contasPagar.status,
      canEdit: summary.contasPagar.canEdit,
    },
  };
}