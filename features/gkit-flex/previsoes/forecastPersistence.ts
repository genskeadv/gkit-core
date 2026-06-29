import { getSupabaseAdmin, logEvent } from '../audit';
import { listGkitFlexColaboradores } from '../colaboradores/queries';

export type RevenueForecastRow = {
  id?: string;
  tipo: string;
  valor_previsto: number;
  origem_competencia?: string | null;
  origem_valor?: number | null;
  observacao?: string | null;
};

export type PaymentForecastRow = {
  id?: string;
  descricao: string;
  vencimento_dia?: number | null;
  vencimento_texto?: string | null;
  valor_previsto: number;
  categoria: string;
  centro?: string | null;
  origem_competencia?: string | null;
  origem_item_id?: string | null;
  observacao?: string | null;
  ordem?: number;
};

export type ForecastPayload = {
  receitas: RevenueForecastRow[];
  pagamentos: PaymentForecastRow[];
};

export type ForecastComparisonRow = {
  chave: string;
  label: string;
  previsto: number;
  realizado: number;
  diferenca: number;
  variacaoPercentual: number | null;
};

function roundMoney(value: number): number {
  return Math.round((value || 0) * 100) / 100;
}

const AUTOMATIC_COLLABORATOR_FORECAST = 'Automatico Flex - colaboradores';
const AUTOMATIC_COMMISSION_FORECAST = 'Automatico Flex - comissoes';

export function sanitizeCompetencia(value?: string | null): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 10);
  if (value && /^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function previousCompetencia(value: string): string {
  const competencia = sanitizeCompetencia(value);
  const [year, month] = competencia.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function normalizeRevenueRow(row: Record<string, unknown>): RevenueForecastRow {
  return {
    id: row.id ? String(row.id) : undefined,
    tipo: String(row.tipo || 'Sem tipo'),
    valor_previsto: roundMoney(Number(row.valor_previsto || 0)),
    origem_competencia: row.origem_competencia ? String(row.origem_competencia) : null,
    origem_valor: row.origem_valor === null || row.origem_valor === undefined ? null : roundMoney(Number(row.origem_valor || 0)),
    observacao: row.observacao ? String(row.observacao) : '',
  };
}

function normalizePaymentRow(row: Record<string, unknown>, index = 0): PaymentForecastRow {
  return {
    id: row.id ? String(row.id) : undefined,
    descricao: String(row.descricao || ''),
    vencimento_dia: row.vencimento_dia === null || row.vencimento_dia === undefined ? null : Number(row.vencimento_dia),
    vencimento_texto: row.vencimento_texto ? String(row.vencimento_texto) : '',
    valor_previsto: roundMoney(Number(row.valor_previsto || 0)),
    categoria: String(row.categoria || 'Sem categoria'),
    centro: row.centro ? String(row.centro) : '',
    origem_competencia: row.origem_competencia ? String(row.origem_competencia) : null,
    origem_item_id: row.origem_item_id ? String(row.origem_item_id) : null,
    observacao: row.observacao ? String(row.observacao) : '',
    ordem: Number(row.ordem ?? index),
  };
}

function summarizeForecast(receitas: RevenueForecastRow[], pagamentos: PaymentForecastRow[]) {
  const totalReceitas = roundMoney(receitas.reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0));
  const totalPagamentos = roundMoney(pagamentos.reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0));
  return {
    totalReceitas,
    totalPagamentos,
    saldoPrevisto: roundMoney(totalReceitas - totalPagamentos),
    receitasCount: receitas.length,
    pagamentosCount: pagamentos.length,
  };
}

function percentVariation(previsto: number, realizado: number): number | null {
  if (!previsto) return realizado ? 100 : null;
  return Math.round(((realizado - previsto) / previsto) * 10000) / 100;
}

function buildComparisonRows(
  forecastRows: Array<{ key: string; label: string; value: number }>,
  actualRows: Array<{ key: string; label: string; value: number }>,
): ForecastComparisonRow[] {
  const map = new Map<string, ForecastComparisonRow>();

  for (const row of forecastRows) {
    const current = map.get(row.key) || { chave: row.key, label: row.label, previsto: 0, realizado: 0, diferenca: 0, variacaoPercentual: null };
    current.previsto = roundMoney(current.previsto + Number(row.value || 0));
    map.set(row.key, current);
  }

  for (const row of actualRows) {
    const current = map.get(row.key) || { chave: row.key, label: row.label, previsto: 0, realizado: 0, diferenca: 0, variacaoPercentual: null };
    current.realizado = roundMoney(current.realizado + Number(row.value || 0));
    map.set(row.key, current);
  }

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      diferenca: roundMoney(row.realizado - row.previsto),
      variacaoPercentual: percentVariation(row.previsto, row.realizado),
    }))
    .sort((a, b) => Math.max(b.previsto, b.realizado) - Math.max(a.previsto, a.realizado));
}

async function listForecastRows(supabase: ReturnType<typeof getSupabaseAdmin>, competencia: string) {
  if (!supabase) throw new Error('Supabase nao configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');

  const [receitasResult, pagamentosResult] = await Promise.all([
    supabase
      .from('gkit_flex_previsao_receitas')
      .select('id, tipo, valor_previsto, origem_competencia, origem_valor, observacao, created_at, updated_at')
      .eq('competencia', competencia)
      .order('tipo', { ascending: true }),
    supabase
      .from('gkit_flex_previsao_pagamentos')
      .select('id, descricao, vencimento_dia, vencimento_texto, valor_previsto, categoria, centro, origem_competencia, origem_item_id, observacao, ordem, created_at, updated_at')
      .eq('competencia', competencia)
      .order('ordem', { ascending: true })
      .order('descricao', { ascending: true }),
  ]);

  if (receitasResult.error) throw new Error(`Erro ao consultar previsao de receitas: ${receitasResult.error.message}`);
  if (pagamentosResult.error) throw new Error(`Erro ao consultar previsao de pagamentos: ${pagamentosResult.error.message}`);

  const receitas = ((receitasResult.data || []) as Array<Record<string, unknown>>).map(normalizeRevenueRow);
  const pagamentos = ((pagamentosResult.data || []) as Array<Record<string, unknown>>).map(normalizePaymentRow);

  return { receitas, pagamentos };
}

async function actualsForMonth(supabase: ReturnType<typeof getSupabaseAdmin>, competencia: string) {
  if (!supabase) {
    return {
      receitasRealizadas: 0,
      pagamentosRealizados: 0,
      receitasPorTipo: [] as Array<{ tipo: string; valor: number }>,
      pagamentosPorCategoria: [] as Array<{ categoria: string; valor: number }>,
    };
  }

  const { data: latestExecution } = await supabase
    .from('comissao_execucoes')
    .select('id, total_valor_recebido, created_at')
    .eq('competencia', competencia)
    .eq('status', 'processado')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let receitasPorTipo: Array<{ tipo: string; valor: number }> = [];
  let receitasRealizadas = roundMoney(Number(latestExecution?.total_valor_recebido || 0));
  if (latestExecution?.id) {
    const { data: launches, error: launchError } = await supabase
      .from('comissao_lancamentos')
      .select('categoria, valor_recebido')
      .eq('execucao_id', latestExecution.id)
      .gt('valor_recebido', 0);
    if (launchError) throw new Error(`Erro ao consultar receitas realizadas: ${launchError.message}`);

    const byTipo = new Map<string, number>();
    for (const row of launches || []) {
      const tipo = String(row.categoria || 'Sem tipo');
      byTipo.set(tipo, roundMoney((byTipo.get(tipo) || 0) + Number(row.valor_recebido || 0)));
    }
    receitasPorTipo = Array.from(byTipo.entries()).map(([tipo, valor]) => ({ tipo, valor })).sort((a, b) => b.valor - a.valor);
    receitasRealizadas = roundMoney((launches || []).reduce((acc, row) => acc + Number(row.valor_recebido || 0), 0)) || receitasRealizadas;
  }

  const { data: payableMonth } = await supabase
    .from('contas_pagar_competencias')
    .select('id')
    .eq('competencia', competencia)
    .maybeSingle();

  let pagamentosRealizados = 0;
  let pagamentosPorCategoria: Array<{ categoria: string; valor: number }> = [];
  if (payableMonth?.id) {
    const { data: payables, error: payablesError } = await supabase
      .from('contas_pagar_itens')
      .select('valor_previsto, pago, categoria')
      .eq('competencia_id', payableMonth.id);
    if (payablesError) throw new Error(`Erro ao consultar pagamentos realizados: ${payablesError.message}`);

    pagamentosRealizados = roundMoney((payables || []).filter((row) => row.pago).reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0));
    const byCategoria = new Map<string, number>();
    for (const row of (payables || []).filter((item) => item.pago)) {
      const categoria = String(row.categoria || 'Sem categoria');
      byCategoria.set(categoria, roundMoney((byCategoria.get(categoria) || 0) + Number(row.valor_previsto || 0)));
    }
    pagamentosPorCategoria = Array.from(byCategoria.entries()).map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor);
  }

  return {
    receitasRealizadas,
    pagamentosRealizados,
    receitasPorTipo,
    pagamentosPorCategoria,
  };
}

function buildComparison(receitas: RevenueForecastRow[], pagamentos: PaymentForecastRow[], actuals: Awaited<ReturnType<typeof actualsForMonth>>) {
  const receitasPorTipo = buildComparisonRows(
    receitas.map((row) => ({ key: row.tipo || 'Sem tipo', label: row.tipo || 'Sem tipo', value: row.valor_previsto })),
    actuals.receitasPorTipo.map((row) => ({ key: row.tipo || 'Sem tipo', label: row.tipo || 'Sem tipo', value: row.valor })),
  );
  const pagamentosPorCategoria = buildComparisonRows(
    pagamentos.map((row) => ({ key: row.categoria || 'Sem categoria', label: row.categoria || 'Sem categoria', value: row.valor_previsto })),
    actuals.pagamentosPorCategoria.map((row) => ({ key: row.categoria || 'Sem categoria', label: row.categoria || 'Sem categoria', value: row.valor })),
  );
  const totalReceitasPrevistas = roundMoney(receitas.reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0));
  const totalPagamentosPrevistos = roundMoney(pagamentos.reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0));
  const saldoPrevisto = roundMoney(totalReceitasPrevistas - totalPagamentosPrevistos);
  const saldoRealizado = roundMoney(actuals.receitasRealizadas - actuals.pagamentosRealizados);

  return {
    resumo: {
      totalReceitasPrevistas,
      totalReceitasRealizadas: actuals.receitasRealizadas,
      diferencaReceitas: roundMoney(actuals.receitasRealizadas - totalReceitasPrevistas),
      totalPagamentosPrevistos,
      totalPagamentosRealizados: actuals.pagamentosRealizados,
      diferencaPagamentos: roundMoney(actuals.pagamentosRealizados - totalPagamentosPrevistos),
      saldoPrevisto,
      saldoRealizado,
      diferencaSaldo: roundMoney(saldoRealizado - saldoPrevisto),
    },
    receitasPorTipo,
    pagamentosPorCategoria,
  };
}

export async function getMonthlyForecast(competenciaInput?: string | null) {
  const supabase = getSupabaseAdmin();
  const competencia = sanitizeCompetencia(competenciaInput);
  const origemCompetencia = previousCompetencia(competencia);

  if (!supabase) {
    return {
      configured: false,
      competencia,
      origemCompetencia,
      receitas: [] as RevenueForecastRow[],
      pagamentos: [] as PaymentForecastRow[],
      summary: summarizeForecast([], []),
      actuals: { receitasRealizadas: 0, pagamentosRealizados: 0, receitasPorTipo: [], pagamentosPorCategoria: [] },
      comparativo: buildComparison([], [], { receitasRealizadas: 0, pagamentosRealizados: 0, receitasPorTipo: [], pagamentosPorCategoria: [] }),
    };
  }

  const { receitas, pagamentos } = await listForecastRows(supabase, competencia);
  const actuals = await actualsForMonth(supabase, competencia);
  return {
    configured: true,
    competencia,
    origemCompetencia,
    receitas,
    pagamentos,
    summary: summarizeForecast(receitas, pagamentos),
    actuals,
    comparativo: buildComparison(receitas, pagamentos, actuals),
  };
}

async function seedRevenueForecast(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>, competencia: string, origemCompetencia: string, overwrite: boolean) {
  const existing = await supabase
    .from('gkit_flex_previsao_receitas')
    .select('id')
    .eq('competencia', competencia)
    .limit(1);
  if (existing.error) throw new Error(`Erro ao consultar previsao de receitas: ${existing.error.message}`);
  if (existing.data?.length && !overwrite) return 0;

  const { data: latestExecution, error: executionError } = await supabase
    .from('comissao_execucoes')
    .select('id')
    .eq('competencia', origemCompetencia)
    .eq('status', 'processado')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (executionError) throw new Error(`Erro ao consultar receitas do mes anterior: ${executionError.message}`);

  if (overwrite) {
    const { error: deleteError } = await supabase.from('gkit_flex_previsao_receitas').delete().eq('competencia', competencia);
    if (deleteError) throw new Error(`Erro ao substituir previsao de receitas: ${deleteError.message}`);
  }

  if (!latestExecution?.id) return 0;

  const { data: rows, error } = await supabase
    .from('comissao_lancamentos')
    .select('categoria, valor_recebido')
    .eq('execucao_id', latestExecution.id)
    .gt('valor_recebido', 0);
  if (error) throw new Error(`Erro ao consultar tipos de receita do mes anterior: ${error.message}`);

  const byTipo = new Map<string, number>();
  for (const row of rows || []) {
    const tipo = String(row.categoria || 'Sem tipo');
    byTipo.set(tipo, roundMoney((byTipo.get(tipo) || 0) + Number(row.valor_recebido || 0)));
  }

  const payload = Array.from(byTipo.entries()).map(([tipo, valor]) => ({
    competencia,
    tipo,
    valor_previsto: valor,
    origem_competencia: origemCompetencia,
    origem_valor: valor,
  }));

  if (!payload.length) return 0;
  const { error: insertError } = await supabase.from('gkit_flex_previsao_receitas').insert(payload);
  if (insertError) throw new Error(`Erro ao gerar previsao de receitas: ${insertError.message}`);
  return payload.length;
}

async function seedPaymentForecast(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>, competencia: string, origemCompetencia: string, overwrite: boolean) {
  const existing = await supabase
    .from('gkit_flex_previsao_pagamentos')
    .select('id')
    .eq('competencia', competencia)
    .limit(1);
  if (existing.error) throw new Error(`Erro ao consultar previsao de pagamentos: ${existing.error.message}`);
  if (existing.data?.length && !overwrite) return 0;

  if (overwrite) {
    const { error: deleteError } = await supabase.from('gkit_flex_previsao_pagamentos').delete().eq('competencia', competencia);
    if (deleteError) throw new Error(`Erro ao substituir previsao de pagamentos: ${deleteError.message}`);
  }

  const { data: month, error: monthError } = await supabase
    .from('contas_pagar_competencias')
    .select('id')
    .eq('competencia', origemCompetencia)
    .maybeSingle();
  if (monthError) throw new Error(`Erro ao consultar fechamento anterior: ${monthError.message}`);
  if (!month?.id) return 0;

  const { data: rows, error } = await supabase
    .from('contas_pagar_itens')
    .select('id, descricao, vencimento_dia, vencimento_texto, valor_previsto, categoria, centro, origem_tipo')
    .eq('competencia_id', month.id)
    .order('vencimento_dia', { ascending: true, nullsFirst: false })
    .order('descricao', { ascending: true });
  if (error) throw new Error(`Erro ao consultar pagamentos do fechamento anterior: ${error.message}`);

  const payload = (rows || [])
    .filter((row) => row.origem_tipo !== 'comissao')
    .map((row, index) => ({
      competencia,
      descricao: String(row.descricao || ''),
      vencimento_dia: row.vencimento_dia,
      vencimento_texto: row.vencimento_texto,
      valor_previsto: roundMoney(Number(row.valor_previsto || 0)),
      categoria: String(row.categoria || 'Sem categoria'),
      centro: row.centro || null,
      origem_competencia: origemCompetencia,
      origem_item_id: row.id,
      ordem: index,
    }));

  const automaticPayload = await buildAutomaticPaymentForecast(supabase, competencia, payload.length);
  const fullPayload = [...payload, ...automaticPayload];

  if (!fullPayload.length) return 0;
  const { error: insertError } = await supabase.from('gkit_flex_previsao_pagamentos').insert(fullPayload);
  if (insertError) throw new Error(`Erro ao gerar previsao de pagamentos: ${insertError.message}`);
  return fullPayload.length;
}

async function buildAutomaticPaymentForecast(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  competencia: string,
  initialOrder: number,
) {
  const colaboradoresData = await listGkitFlexColaboradores();
  const colaboradores = colaboradoresData.colaboradores
    .filter((row) => row.status === 'ativo' && roundMoney(row.total_mensal) > 0)
    .sort((a, b) => a.usuario_nome.localeCompare(b.usuario_nome, 'pt-BR'));

  const colaboradorRows = colaboradores.map((row, index) => ({
    competencia,
    descricao: `Colaborador - ${row.usuario_nome}`,
    vencimento_dia: 5,
    vencimento_texto: '05',
    valor_previsto: roundMoney(row.total_mensal),
    categoria: 'Colaboradores',
    centro: row.carteira_nome || row.cargo_operacional || 'Pessoal',
    origem_competencia: competencia,
    origem_item_id: row.id,
    observacao: `${AUTOMATIC_COLLABORATOR_FORECAST}. Fonte: cadastro de colaboradores do Flex.`,
    ordem: initialOrder + index,
  }));

  const { data: latestExecution, error: executionError } = await supabase
    .from('comissao_execucoes')
    .select('id, total_comissao, created_at')
    .eq('competencia', competencia)
    .eq('status', 'processado')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (executionError) throw new Error(`Erro ao consultar comissao do mes: ${executionError.message}`);

  const commissionTotal = roundMoney(Number(latestExecution?.total_comissao || 0));
  const commissionRows = latestExecution?.id && commissionTotal > 0
    ? [{
        competencia,
        descricao: 'Comissoes calculadas do mes',
        vencimento_dia: 25,
        vencimento_texto: '25',
        valor_previsto: commissionTotal,
        categoria: 'Comissoes',
        centro: 'Equipe',
        origem_competencia: competencia,
        origem_item_id: String(latestExecution.id),
        observacao: `${AUTOMATIC_COMMISSION_FORECAST}. Fonte: ultima apuracao de receitas (${latestExecution.created_at || ''}).`,
        ordem: initialOrder + colaboradorRows.length,
      }]
    : [];

  return [...colaboradorRows, ...commissionRows];
}

export async function seedMonthlyForecast(competenciaInput: string, tipo: 'receitas' | 'pagamentos' | 'tudo', overwrite = false) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase nao configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');

  const competencia = sanitizeCompetencia(competenciaInput);
  const origemCompetencia = previousCompetencia(competencia);
  const result = { receitas: 0, pagamentos: 0 };

  if (tipo === 'receitas' || tipo === 'tudo') {
    result.receitas = await seedRevenueForecast(supabase, competencia, origemCompetencia, overwrite);
  }
  if (tipo === 'pagamentos' || tipo === 'tudo') {
    result.pagamentos = await seedPaymentForecast(supabase, competencia, origemCompetencia, overwrite);
  }

  await logEvent({ supabase, modulo: 'previsoes', competencia, action: 'gerar_previsao', detalhe: { tipo, overwrite, origemCompetencia, ...result } });
  return { ...(await getMonthlyForecast(competencia)), generated: result };
}

export async function saveMonthlyForecast(competenciaInput: string, payload: ForecastPayload) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase nao configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');

  const competencia = sanitizeCompetencia(competenciaInput);
  const receitas = (payload.receitas || [])
    .map((row) => ({
      competencia,
      tipo: String(row.tipo || '').trim(),
      valor_previsto: roundMoney(Number(row.valor_previsto || 0)),
      origem_competencia: row.origem_competencia || null,
      origem_valor: row.origem_valor ?? null,
      observacao: row.observacao || null,
      updated_at: new Date().toISOString(),
    }))
    .filter((row) => row.tipo);

  const pagamentos = (payload.pagamentos || [])
    .map((row, index) => ({
      competencia,
      descricao: String(row.descricao || '').trim(),
      vencimento_dia: row.vencimento_dia ? Number(row.vencimento_dia) : null,
      vencimento_texto: row.vencimento_texto || (row.vencimento_dia ? String(row.vencimento_dia).padStart(2, '0') : null),
      valor_previsto: roundMoney(Number(row.valor_previsto || 0)),
      categoria: String(row.categoria || 'Sem categoria').trim() || 'Sem categoria',
      centro: row.centro || null,
      origem_competencia: row.origem_competencia || null,
      origem_item_id: row.origem_item_id || null,
      observacao: row.observacao || null,
      ordem: Number(row.ordem ?? index),
      updated_at: new Date().toISOString(),
    }))
    .filter((row) => row.descricao);

  const [deleteReceitas, deletePagamentos] = await Promise.all([
    supabase.from('gkit_flex_previsao_receitas').delete().eq('competencia', competencia),
    supabase.from('gkit_flex_previsao_pagamentos').delete().eq('competencia', competencia),
  ]);
  if (deleteReceitas.error) throw new Error(`Erro ao limpar previsao de receitas: ${deleteReceitas.error.message}`);
  if (deletePagamentos.error) throw new Error(`Erro ao limpar previsao de pagamentos: ${deletePagamentos.error.message}`);

  if (receitas.length) {
    const { error } = await supabase.from('gkit_flex_previsao_receitas').insert(receitas);
    if (error) throw new Error(`Erro ao salvar previsao de receitas: ${error.message}`);
  }
  if (pagamentos.length) {
    const { error } = await supabase.from('gkit_flex_previsao_pagamentos').insert(pagamentos);
    if (error) throw new Error(`Erro ao salvar previsao de pagamentos: ${error.message}`);
  }

  await logEvent({ supabase, modulo: 'previsoes', competencia, action: 'salvar_previsao', detalhe: { receitas: receitas.length, pagamentos: pagamentos.length } });
  return getMonthlyForecast(competencia);
}
