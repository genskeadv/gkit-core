import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sanitizeCompetencia } from './dashboardPersistence';

export type TrendDirection = 'up' | 'down' | 'stable' | 'new';
export type AlertSeverity = 'bloqueio' | 'aviso' | 'info';

export type IntelligenceMetric = {
  key: string;
  label: string;
  atual: number;
  anterior: number;
  variacaoValor: number;
  variacaoPercentual: number | null;
  direcao: TrendDirection;
};

export type FinancialAlert = {
  severidade: AlertSeverity;
  titulo: string;
  detalhe: string;
  valor?: number;
};

export type WalletDashboardRow = {
  carteira: string;
  valorRecebido: number;
  comissaoAcordos: number;
  comissaoMensalidade: number;
  totalComissao: number;
  participacaoRecebido: number;
};

export type ExpenseDashboardRow = {
  grupo: string;
  previsto: number;
  pago: number;
  aberto: number;
  quantidade: number;
  participacao: number;
};

export type IntelligenceDashboard = {
  configured: boolean;
  competencia: string;
  competenciaAnterior: string;
  proximaCompetencia: string;
  comparativo: IntelligenceMetric[];
  projecao: {
    competencia: string;
    contasPagarPrevistas: number;
    contasPagas: number;
    contasEmAberto: number;
    comissoesPrevistas: number;
    itensPrevistos: number;
    observacoes: string[];
  };
  alertas: FinancialAlert[];
  carteiras: WalletDashboardRow[];
  despesasPorCategoria: ExpenseDashboardRow[];
  despesasPorCentro: ExpenseDashboardRow[];
};

type MonthNumbers = {
  competencia: string;
  recebido: number;
  comissoes: number;
  pagar: number;
  pago: number;
  aberto: number;
  saldo: number;
  itensPagar: number;
  comissoesNoPagar: number;
  semCategoria: number;
  vencimentos: Map<number, number>;
};

function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function previousCompetencia(value: string): string {
  const competencia = sanitizeCompetencia(value);
  const [year, month] = competencia.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function nextCompetencia(value: string): string {
  const competencia = sanitizeCompetencia(value);
  const [year, month] = competencia.split('-').map(Number);
  const date = new Date(Date.UTC(year, month, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function variation(atual: number, anterior: number): Omit<IntelligenceMetric, 'key' | 'label'> {
  const variacaoValor = roundMoney(atual - anterior);
  const variacaoPercentual = anterior === 0 ? (atual === 0 ? 0 : null) : roundMoney((variacaoValor / anterior) * 100);
  let direcao: TrendDirection = 'stable';
  if (anterior === 0 && atual !== 0) direcao = 'new';
  else if (variacaoValor > 0.005) direcao = 'up';
  else if (variacaoValor < -0.005) direcao = 'down';
  return { atual: roundMoney(atual), anterior: roundMoney(anterior), variacaoValor, variacaoPercentual, direcao };
}

async function latestExecutionForMonth(supabase: SupabaseClient, competencia: string) {
  const { data, error } = await supabase
    .from('comissao_execucoes')
    .select('id, total_valor_recebido, total_comissao, created_at')
    .eq('competencia', competencia)
    .eq('status', 'processado')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Erro ao consultar execução de ${competencia}: ${error.message}`);
  return data as null | { id: string; total_valor_recebido: number; total_comissao: number; created_at: string };
}

async function payableMonthId(supabase: SupabaseClient, competencia: string) {
  const { data, error } = await supabase
    .from('contas_pagar_competencias')
    .select('id, status')
    .eq('competencia', competencia)
    .maybeSingle();
  if (error) throw new Error(`Erro ao consultar contas a pagar de ${competencia}: ${error.message}`);
  return data as null | { id: string; status: string };
}

async function monthNumbers(supabase: SupabaseClient, competencia: string): Promise<MonthNumbers> {
  const execution = await latestExecutionForMonth(supabase, competencia);
  const month = await payableMonthId(supabase, competencia);
  const result: MonthNumbers = {
    competencia,
    recebido: roundMoney(Number(execution?.total_valor_recebido || 0)),
    comissoes: roundMoney(Number(execution?.total_comissao || 0)),
    pagar: 0,
    pago: 0,
    aberto: 0,
    saldo: 0,
    itensPagar: 0,
    comissoesNoPagar: 0,
    semCategoria: 0,
    vencimentos: new Map<number, number>(),
  };

  if (month?.id) {
    const { data: payables, error } = await supabase
      .from('contas_pagar_itens')
      .select('valor_previsto, pago, origem_tipo, categoria, vencimento_dia')
      .eq('competencia_id', month.id);
    if (error) throw new Error(`Erro ao consultar itens de contas a pagar: ${error.message}`);

    for (const row of payables || []) {
      const value = Number(row.valor_previsto || 0);
      result.pagar = roundMoney(result.pagar + value);
      if (Boolean(row.pago)) result.pago = roundMoney(result.pago + value);
      if (row.origem_tipo === 'comissao') result.comissoesNoPagar = roundMoney(result.comissoesNoPagar + value);
      if (!String(row.categoria || '').trim()) result.semCategoria += 1;
      const day = Number(row.vencimento_dia || 0);
      if (day > 0) result.vencimentos.set(day, roundMoney((result.vencimentos.get(day) || 0) + value));
    }
    result.itensPagar = payables?.length || 0;
  }

  result.aberto = roundMoney(result.pagar - result.pago);
  result.saldo = roundMoney(result.recebido - result.pagar);
  return result;
}

function buildComparativo(atual: MonthNumbers, anterior: MonthNumbers): IntelligenceMetric[] {
  return [
    { key: 'recebido', label: 'Total recebido', ...variation(atual.recebido, anterior.recebido) },
    { key: 'pagar', label: 'Contas a pagar', ...variation(atual.pagar, anterior.pagar) },
    { key: 'pago', label: 'Total pago', ...variation(atual.pago, anterior.pago) },
    { key: 'aberto', label: 'Em aberto', ...variation(atual.aberto, anterior.aberto) },
    { key: 'comissoes', label: 'Comissões calculadas', ...variation(atual.comissoes, anterior.comissoes) },
    { key: 'saldo', label: 'Saldo operacional', ...variation(atual.saldo, anterior.saldo) },
  ];
}

async function walletDashboard(supabase: SupabaseClient, competencia: string): Promise<WalletDashboardRow[]> {
  const execution = await latestExecutionForMonth(supabase, competencia);
  if (!execution?.id) return [];

  const { data, error } = await supabase
    .from('comissao_resumos')
    .select('carteira, categoria, valor_recebido, comissao_final')
    .eq('execucao_id', execution.id);
  if (error) throw new Error(`Erro ao consultar carteiras: ${error.message}`);

  const map = new Map<string, WalletDashboardRow>();
  let totalRecebido = 0;
  for (const row of data || []) {
    const carteira = String(row.carteira || 'Sem vendedor');
    const categoria = String(row.categoria || 'Sem categoria').toLowerCase();
    const value = Number(row.valor_recebido || 0);
    const commission = Number(row.comissao_final || 0);
    totalRecebido += value;
    const current = map.get(carteira) || { carteira, valorRecebido: 0, comissaoAcordos: 0, comissaoMensalidade: 0, totalComissao: 0, participacaoRecebido: 0 };
    current.valorRecebido = roundMoney(current.valorRecebido + value);
    if (categoria.includes('acordo')) current.comissaoAcordos = roundMoney(current.comissaoAcordos + commission);
    else if (categoria.includes('mensalidade') || categoria.includes('assessoria')) current.comissaoMensalidade = roundMoney(current.comissaoMensalidade + commission);
    current.totalComissao = roundMoney(current.totalComissao + commission);
    map.set(carteira, current);
  }

  return Array.from(map.values())
    .map((row) => ({ ...row, participacaoRecebido: totalRecebido ? roundMoney((row.valorRecebido / totalRecebido) * 100) : 0 }))
    .sort((a, b) => b.valorRecebido - a.valorRecebido);
}

async function expenseDashboard(supabase: SupabaseClient, competencia: string, field: 'categoria' | 'centro'): Promise<ExpenseDashboardRow[]> {
  const month = await payableMonthId(supabase, competencia);
  if (!month?.id) return [];

  const { data, error } = await supabase
    .from('contas_pagar_itens')
    .select('valor_previsto, pago, categoria, centro')
    .eq('competencia_id', month.id);
  if (error) throw new Error(`Erro ao consultar despesas por ${field}: ${error.message}`);

  const map = new Map<string, ExpenseDashboardRow>();
  let total = 0;
  for (const row of data || []) {
    const group = String(row[field] || '').trim() || `Sem ${field === 'categoria' ? 'categoria' : 'centro'}`;
    const value = Number(row.valor_previsto || 0);
    total += value;
    const current = map.get(group) || { grupo: group, previsto: 0, pago: 0, aberto: 0, quantidade: 0, participacao: 0 };
    current.previsto = roundMoney(current.previsto + value);
    if (Boolean(row.pago)) current.pago = roundMoney(current.pago + value);
    current.aberto = roundMoney(current.previsto - current.pago);
    current.quantidade += 1;
    map.set(group, current);
  }

  return Array.from(map.values())
    .map((row) => ({ ...row, participacao: total ? roundMoney((row.previsto / total) * 100) : 0 }))
    .sort((a, b) => b.previsto - a.previsto);
}

function buildAlerts(atual: MonthNumbers, projection: MonthNumbers, categorias: ExpenseDashboardRow[], centros: ExpenseDashboardRow[]): FinancialAlert[] {
  const alerts: FinancialAlert[] = [];
  if (atual.saldo < 0) {
    alerts.push({ severidade: 'bloqueio', titulo: 'Saldo operacional negativo', detalhe: 'O total de contas a pagar supera o total recebido nesta competência.', valor: atual.saldo });
  }
  if (atual.semCategoria > 0) {
    alerts.push({ severidade: 'aviso', titulo: 'Despesas sem categoria', detalhe: `${atual.semCategoria} item(ns) do contas a pagar estão sem categoria.` });
  }
  if (Math.abs(atual.comissoes - atual.comissoesNoPagar) > 0.02) {
    alerts.push({ severidade: 'aviso', titulo: 'Comissões não sincronizadas', detalhe: 'O total de comissões calculadas difere do total de comissões no contas a pagar.', valor: roundMoney(atual.comissoes - atual.comissoesNoPagar) });
  }

  const biggestDue = Array.from(atual.vencimentos.entries()).sort((a, b) => b[1] - a[1])[0];
  if (biggestDue && atual.pagar > 0 && biggestDue[1] / atual.pagar >= 0.3) {
    alerts.push({ severidade: 'aviso', titulo: 'Concentração de vencimentos', detalhe: `O dia ${String(biggestDue[0]).padStart(2, '0')} concentra ${roundMoney((biggestDue[1] / atual.pagar) * 100)}% do contas a pagar.`, valor: biggestDue[1] });
  }

  const biggestCenter = centros[0];
  if (biggestCenter && biggestCenter.participacao >= 45) {
    alerts.push({ severidade: 'info', titulo: 'Centro de custo dominante', detalhe: `${biggestCenter.grupo} representa ${biggestCenter.participacao}% das despesas previstas.`, valor: biggestCenter.previsto });
  }

  const biggestCategory = categorias[0];
  if (biggestCategory && biggestCategory.participacao >= 35) {
    alerts.push({ severidade: 'info', titulo: 'Categoria concentrada', detalhe: `${biggestCategory.grupo} representa ${biggestCategory.participacao}% das despesas previstas.`, valor: biggestCategory.previsto });
  }

  if (projection.itensPagar > 0) {
    alerts.push({ severidade: 'info', titulo: 'Próximo mês projetado', detalhe: `A próxima competência já tem ${projection.itensPagar} item(ns) previstos em contas a pagar.`, valor: projection.pagar });
  }

  return alerts.slice(0, 8);
}

export async function getDashboardIntelligence(competenciaInput?: string | null): Promise<IntelligenceDashboard> {
  const competencia = sanitizeCompetencia(competenciaInput);
  const competenciaAnterior = previousCompetencia(competencia);
  const proximaCompetencia = nextCompetencia(competencia);
  const supabase = getSupabaseAdmin();

  const empty: IntelligenceDashboard = {
    configured: false,
    competencia,
    competenciaAnterior,
    proximaCompetencia,
    comparativo: [],
    projecao: {
      competencia: proximaCompetencia,
      contasPagarPrevistas: 0,
      contasPagas: 0,
      contasEmAberto: 0,
      comissoesPrevistas: 0,
      itensPrevistos: 0,
      observacoes: ['Supabase não configurado.'],
    },
    alertas: [],
    carteiras: [],
    despesasPorCategoria: [],
    despesasPorCentro: [],
  };

  if (!supabase) return empty;

  const [atual, anterior, proximo, carteiras, categorias, centros] = await Promise.all([
    monthNumbers(supabase, competencia),
    monthNumbers(supabase, competenciaAnterior),
    monthNumbers(supabase, proximaCompetencia),
    walletDashboard(supabase, competencia),
    expenseDashboard(supabase, competencia, 'categoria'),
    expenseDashboard(supabase, competencia, 'centro'),
  ]);

  return {
    configured: true,
    competencia,
    competenciaAnterior,
    proximaCompetencia,
    comparativo: buildComparativo(atual, anterior),
    projecao: {
      competencia: proximaCompetencia,
      contasPagarPrevistas: proximo.pagar,
      contasPagas: proximo.pago,
      contasEmAberto: proximo.aberto,
      comissoesPrevistas: proximo.comissoes,
      itensPrevistos: proximo.itensPagar,
      observacoes: [
        proximo.itensPagar ? 'Projeção baseada no contas a pagar já criado para a próxima competência.' : 'Ainda não há contas a pagar criadas para a próxima competência.',
        'Comissões do próximo mês só entram após novo cálculo da competência.',
      ],
    },
    alertas: buildAlerts(atual, proximo, categorias, centros),
    carteiras,
    despesasPorCategoria: categorias,
    despesasPorCentro: centros,
  };
}

export async function getWalletDashboard(competenciaInput?: string | null) {
  const supabase = getSupabaseAdmin();
  const competencia = sanitizeCompetencia(competenciaInput);
  if (!supabase) return { configured: false, competencia, rows: [] };
  return { configured: true, competencia, rows: await walletDashboard(supabase, competencia) };
}

export async function getExpenseDashboard(competenciaInput?: string | null) {
  const supabase = getSupabaseAdmin();
  const competencia = sanitizeCompetencia(competenciaInput);
  if (!supabase) return { configured: false, competencia, porCategoria: [], porCentro: [] };
  const [porCategoria, porCentro] = await Promise.all([
    expenseDashboard(supabase, competencia, 'categoria'),
    expenseDashboard(supabase, competencia, 'centro'),
  ]);
  return { configured: true, competencia, porCategoria, porCentro };
}
