import * as XLSX from 'xlsx';
import { getSupabaseAdmin } from '../audit';
import { sanitizeCompetencia } from '../dashboard/dashboardPersistence';

type Status = 'ok' | 'aviso' | 'bloqueio';

type ChecklistItem = {
  id: string;
  titulo: string;
  status: Status;
  detalhe: string;
};

function roundMoney(value: number): number {
  return Math.round((value || 0) * 100) / 100;
}

function monthLabel(competencia: string): string {
  return competencia.slice(0, 7);
}

function countBy<T extends Record<string, any>>(rows: T[], key: keyof T, fallback = 'Nao informado') {
  const map = new Map<string, number>();
  for (const row of rows) {
    const label = String(row[key] || fallback);
    map.set(label, (map.get(label) || 0) + 1);
  }
  return Array.from(map.entries()).map(([nome, quantidade]) => ({ nome, quantidade })).sort((a, b) => b.quantidade - a.quantidade);
}

export async function getMonthlyAudit(competenciaInput?: string | null) {
  const competencia = sanitizeCompetencia(competenciaInput);
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return {
      configured: false,
      competencia,
      checklist: [],
      status: { geral: 'bloqueio' as Status, texto: 'Supabase nao configurado' },
      comissoes: null,
      contasPagar: null,
      versoes: { comissoes: [], importacoes: [], snapshots: [] },
      auditoria: { total: 0, porProblema: [], amostras: [] },
      eventos: [],
    };
  }

  const [{ data: commissionMonth, error: cmError }, { data: payableMonth, error: pmError }] = await Promise.all([
    supabase.from('comissao_competencias').select('id, competencia, status, opened_at, closed_at, reopened_at, created_at').eq('competencia', competencia).maybeSingle(),
    supabase.from('contas_pagar_competencias').select('id, competencia, status, opened_at, closed_at, reopened_at, created_at').eq('competencia', competencia).maybeSingle(),
  ]);
  if (cmError) throw new Error(`Erro ao consultar competencia de comissoes: ${cmError.message}`);
  if (pmError) throw new Error(`Erro ao consultar competencia de pagamentos: ${pmError.message}`);

  const { data: executions, error: execError } = await supabase
    .from('comissao_execucoes')
    .select('id, competencia, contas_file_name, clientes_file_name, status, total_valor_recebido, total_base_reduzida, total_comissao, audit_count, created_at')
    .eq('competencia', competencia)
    .order('created_at', { ascending: false });
  if (execError) throw new Error(`Erro ao consultar versoes de comissao: ${execError.message}`);

  const latestExecution = (executions || []).find((row) => row.status === 'processado') || null;

  const [summaryResult, auditResult, launchesResult] = latestExecution?.id
    ? await Promise.all([
        supabase.from('comissao_resumos').select('id, categoria, carteira, quantidade_lancamentos, valor_recebido, comissao_final').eq('execucao_id', latestExecution.id),
        supabase.from('comissao_auditoria').select('id, linha, cliente, documento, categoria, valor_recebido, carteira, problema, created_at').eq('execucao_id', latestExecution.id).order('created_at', { ascending: false }).limit(200),
        supabase.from('comissao_lancamentos').select('id, linha, cliente, documento, categoria, valor_recebido, carteira, criterio_match, observacao').eq('execucao_id', latestExecution.id).limit(5000),
      ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];

  if (summaryResult.error) throw new Error(`Erro ao consultar resumos de comissao: ${summaryResult.error.message}`);
  if (auditResult.error) throw new Error(`Erro ao consultar auditoria de comissao: ${auditResult.error.message}`);
  if (launchesResult.error) throw new Error(`Erro ao consultar lancamentos de comissao: ${launchesResult.error.message}`);

  const payableRows = payableMonth?.id
    ? await supabase
        .from('contas_pagar_itens')
        .select('id, descricao, vencimento_dia, valor_previsto, categoria, centro, pago, origem_tipo, origem_execucao_id, created_at, updated_at')
        .eq('competencia_id', payableMonth.id)
        .order('vencimento_dia', { ascending: true, nullsFirst: false })
    : { data: [], error: null };
  if (payableRows.error) throw new Error(`Erro ao consultar pagamentos: ${payableRows.error.message}`);

  const importacoes = payableMonth?.id
    ? await supabase
        .from('contas_pagar_importacoes')
        .select('id, arquivo_nome, modo, linhas_lidas, linhas_validas, linhas_com_erro, itens_novos, itens_alterados, itens_removidos, valor_atual_manual, valor_importado_manual, created_at')
        .eq('competencia_id', payableMonth.id)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [], error: null };
  if (importacoes.error) throw new Error(`Erro ao consultar importacoes: ${importacoes.error.message}`);

  const snapshots = payableMonth?.id
    ? await supabase
        .from('contas_pagar_snapshots')
        .select('id, motivo, total_itens, created_at')
        .eq('competencia_id', payableMonth.id)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [], error: null };
  if (snapshots.error) throw new Error(`Erro ao consultar snapshots: ${snapshots.error.message}`);

  const { data: eventos, error: eventosError } = await supabase
    .from('gkit_eventos')
    .select('id, modulo, competencia, action, entidade_tipo, entidade_id, detalhe, created_at')
    .eq('competencia', competencia)
    .order('created_at', { ascending: false })
    .limit(80);
  if (eventosError) throw new Error(`Erro ao consultar eventos: ${eventosError.message}`);

  const payables = payableRows.data || [];
  const payableTotal = roundMoney(payables.reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0));
  const payablePaid = roundMoney(payables.filter((row) => row.pago).reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0));
  const expectedCommission = roundMoney(Number(latestExecution?.total_comissao || 0));
  const commissionPayables = payables.filter((row) => String(row.categoria || row.descricao || '').toLowerCase().includes('comiss'));
  const commissionPayablesTotal = roundMoney(commissionPayables.reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0));
  const semCategoria = payables.filter((row) => !row.categoria || String(row.categoria).toLowerCase() === 'sem categoria').length;
  const valorZerado = payables.filter((row) => Number(row.valor_previsto || 0) <= 0).length;
  const vencimentoInvalido = payables.filter((row) => !row.vencimento_dia).length;

  const auditRows = auditResult.data || [];
  const launchRows = launchesResult.data || [];
  const totalRecebidoLancamentos = roundMoney(
    launchRows
      .filter((row) => Number(row.valor_recebido || 0) > 0)
      .reduce((acc, row) => acc + Number(row.valor_recebido || 0), 0),
  );
  const semVendedor = launchRows.filter((row) => !row.carteira || String(row.carteira).toLowerCase().includes('sem vendedor')).length;

  const checklist: ChecklistItem[] = [
    {
      id: 'comissoes_mes_aberto_ou_fechado',
      titulo: 'Competencia de comissoes existe',
      status: commissionMonth ? 'ok' : 'bloqueio',
      detalhe: commissionMonth ? `Status: ${commissionMonth.status}` : 'Abra o mes antes de calcular ou fechar comissoes.',
    },
    {
      id: 'comissoes_processadas',
      titulo: 'Comissoes processadas',
      status: latestExecution ? 'ok' : 'bloqueio',
      detalhe: latestExecution ? `Ultima execucao em ${latestExecution.created_at}` : 'Ainda nao ha calculo de comissoes processado para esta competencia.',
    },
    {
      id: 'auditoria_comissoes',
      titulo: 'Auditoria de comissoes',
      status: auditRows.length || semVendedor ? 'aviso' : 'ok',
      detalhe: auditRows.length || semVendedor ? `${auditRows.length} apontamento(s) e ${semVendedor} lancamento(s) sem vendedor.` : 'Sem apontamentos relevantes.',
    },
    {
      id: 'contas_pagar_mes_aberto_ou_fechado',
      titulo: 'Competencia de pagamentos existe',
      status: payableMonth ? 'ok' : 'bloqueio',
      detalhe: payableMonth ? `Status: ${payableMonth.status}` : 'Abra o mes antes de importar ou fechar pagamentos.',
    },
    {
      id: 'contas_pagar_importadas',
      titulo: 'Pagamentos importados/cadastrados',
      status: payables.length ? 'ok' : 'bloqueio',
      detalhe: payables.length ? `${payables.length} item(ns), total ${payableTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.` : 'Nenhum pagamento cadastrado para o mes.',
    },
    {
      id: 'qualidade_contas_pagar',
      titulo: 'Qualidade dos pagamentos',
      status: semCategoria || valorZerado || vencimentoInvalido ? 'aviso' : 'ok',
      detalhe: `${semCategoria} sem categoria, ${valorZerado} com valor zerado/negativo, ${vencimentoInvalido} sem vencimento valido.`,
    },
  ];

  const geral: Status = checklist.some((item) => item.status === 'bloqueio') ? 'bloqueio' : checklist.some((item) => item.status === 'aviso') ? 'aviso' : 'ok';

  return {
    configured: true,
    competencia,
    status: {
      geral,
      texto: geral === 'ok' ? 'Pronto para fechamento' : geral === 'aviso' ? 'Fechavel com ressalvas' : 'Pendencias bloqueantes',
    },
    checklist,
    comissoes: {
      competencia: commissionMonth || null,
      latestExecution,
      resumos: summaryResult.data || [],
      totalRecebido: totalRecebidoLancamentos || roundMoney(Number(latestExecution?.total_valor_recebido || 0)),
      totalComissao: expectedCommission,
      lancamentos: launchRows.length,
      semVendedor,
    },
    contasPagar: {
      competencia: payableMonth || null,
      total: payableTotal,
      totalPago: payablePaid,
      totalAberto: roundMoney(payableTotal - payablePaid),
      quantidade: payables.length,
      semCategoria,
      valorZerado,
      vencimentoInvalido,
      comissoesQuantidade: commissionPayables.length,
      comissoesTotal: commissionPayablesTotal,
      porCategoria: Object.entries(payables.reduce((acc: Record<string, number>, row) => {
        const key = String(row.categoria || 'Sem categoria');
        acc[key] = roundMoney((acc[key] || 0) + Number(row.valor_previsto || 0));
        return acc;
      }, {})).map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => Number(b.valor) - Number(a.valor)),
    },
    versoes: {
      comissoes: (executions || []).map((row, index) => ({ ...row, versao: (executions || []).length - index })),
      importacoes: importacoes.data || [],
      snapshots: snapshots.data || [],
    },
    auditoria: {
      total: auditRows.length,
      porProblema: countBy(auditRows as any[], 'problema', 'Sem descricao'),
      amostras: auditRows.slice(0, 30),
    },
    eventos: eventos || [],
  };
}

export async function buildMonthlyClosingWorkbook(competenciaInput?: string | null): Promise<{ competencia: string; filename: string; buffer: Buffer }> {
  const data = await getMonthlyAudit(competenciaInput);
  if (!data.configured) throw new Error('Supabase nao configurado.');

  const workbook = XLSX.utils.book_new();

  const resumo = [
    { Indicador: 'Competencia', Valor: monthLabel(data.competencia) },
    { Indicador: 'Status geral', Valor: data.status.texto },
    { Indicador: 'Total recebido', Valor: data.comissoes?.totalRecebido || 0 },
    { Indicador: 'Total comissoes', Valor: data.comissoes?.totalComissao || 0 },
    { Indicador: 'Total de pagamentos', Valor: data.contasPagar?.total || 0 },
    { Indicador: 'Total pago', Valor: data.contasPagar?.totalPago || 0 },
    { Indicador: 'Total em aberto', Valor: data.contasPagar?.totalAberto || 0 },
    { Indicador: 'Itens sem vendedor', Valor: data.comissoes?.semVendedor || 0 },
    { Indicador: 'Despesas sem categoria', Valor: data.contasPagar?.semCategoria || 0 },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resumo), 'Resumo');

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.checklist), 'Checklist');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.comissoes?.resumos || []), 'Comissoes');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.contasPagar?.porCategoria || []), 'Pagar por categoria');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.auditoria.amostras || []), 'Auditoria');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.versoes.comissoes || []), 'Versoes comissoes');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.versoes.importacoes || []), 'Importacoes pagar');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.versoes.snapshots || []), 'Snapshots');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.eventos || []), 'Eventos');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
  return { competencia: data.competencia, filename: `fechamento-gkit-flex-${data.competencia.slice(0, 7)}.xlsx`, buffer };
}
