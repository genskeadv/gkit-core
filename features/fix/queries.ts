import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { IntrListRow } from '@/features/fix/_legacy/intr-types'
import {
  getFixFinanceiroResumo,
  getIntrFechamento,
  listFixConciliacaoRows,
  listFixContaPagarRows,
  listFixExtratoLancamentoRows,
  listFixExtratoRows,
  listFixInteligenciaRows,
  listFixPrevisaoMacrogrupoRows,
  listFixPrevisaoRows,
  listFixSugestaoRows,
  listIntrComissaoRows,
  listIntrComissaoTipoRows,
  listIntrFechamentoRows,
  listIntrImportacaoRows,
  listIntrPagamentoRows,
  listIntrReceitaRows,
  listIntrTimeRows,
  requireIntrContext,
} from '@/features/fix/_legacy/intr-queries'

export * from '@/features/fix/_legacy/intr-queries'

export {
  getFixFinanceiroResumo,
  listFixConciliacaoRows,
  listFixContaPagarRows,
  listFixExtratoLancamentoRows,
  listFixExtratoRows,
  listFixInteligenciaRows,
  listFixPrevisaoMacrogrupoRows,
  listFixPrevisaoRows,
  listFixSugestaoRows,
  listIntrComissaoRows,
  listIntrComissaoTipoRows,
  listIntrFechamentoRows,
  listIntrImportacaoRows,
  listIntrPagamentoRows,
  listIntrReceitaRows,
  listIntrTimeRows,
  requireIntrContext,
}

function parseMoney(value: string) {
  const parsed = Number(value.replace(/[^0-9,-]/g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' }).format(value)
}

function countByStatus(rows: IntrListRow[], expected: string[]) {
  return rows.filter((row) => expected.some((status) => row.status.toLowerCase().includes(status))).length
}

export async function getFixCockpitResumo() {
  const [financeiro, comissoes, pagamentos, fechamentos, importacoes, times, tiposComissao] = await Promise.all([
    getFixFinanceiroResumo(),
    listIntrComissaoRows(),
    listIntrPagamentoRows(),
    listIntrFechamentoRows(),
    listIntrImportacaoRows(),
    listIntrTimeRows(),
    listIntrComissaoTipoRows(),
  ])

  const comissoesTotal = comissoes.reduce((sum, row) => sum + parseMoney(row.value), 0)
  const pagamentosPendentes = countByStatus(pagamentos, ['previsto', 'pendente', 'aberto'])
  const fechamentosAbertos = countByStatus(fechamentos, ['aberto', 'reaberto', 'conferencia', 'pendente'])
  const importacoesComAlerta = countByStatus(importacoes, ['erro', 'alerta', 'pendente'])

  return {
    cards: financeiro.cards,
    financeiro: {
      macrogrupos: financeiro.macrogrupos,
      sugestoes: financeiro.sugestoes,
      extratos: financeiro.extratos,
      contasPagar: financeiro.contasPagar,
      previsao: financeiro.previsao,
    },
    colaboradores: {
      cards: [
        { label: 'Comissões', value: formatBRL(comissoesTotal), hint: 'calculadas pela receita importada', tone: 'primary' as const },
        { label: 'Pagamentos', value: String(pagamentosPendentes), hint: 'pendentes ou previstos', tone: pagamentosPendentes ? 'warning' as const : 'success' as const },
        { label: 'Times', value: String(times.length), hint: 'grupos operacionais ativos', tone: 'success' as const },
        { label: 'Tipos', value: String(tiposComissao.length), hint: 'regras de comissão cadastradas', tone: 'primary' as const },
      ],
      comissoes,
      pagamentos,
      times,
      tiposComissao,
    },
    gestao: {
      cards: [
        { label: 'Importações', value: String(importacoes.length), hint: 'receitas e extratos no histórico', tone: 'primary' as const },
        { label: 'Alertas', value: String(importacoesComAlerta), hint: 'importações exigindo atenção', tone: importacoesComAlerta ? 'warning' as const : 'success' as const },
        { label: 'Fechamentos', value: String(fechamentos.length), hint: 'competências registradas', tone: 'primary' as const },
        { label: 'Abertos', value: String(fechamentosAbertos), hint: 'competências ainda em trabalho', tone: fechamentosAbertos ? 'warning' as const : 'success' as const },
      ],
      fechamentos,
      importacoes,
    },
  }
}


function fixAdmin() {
  return createSupabaseAdminClient() as any
}

function fixText(value: unknown, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}

function fixToneFromBoolean(active: unknown): IntrListRow['tone'] {
  return active === false ? 'warning' : 'success'
}

export async function listFixCategoriaFinanceiraRows(): Promise<IntrListRow[]> {
  const { data, error } = await fixAdmin()
    .schema('gkli_intr')
    .from('financeiro_categorias')
    .select('id,macrogrupo,nome,codigo,descricao,ativo,ordem')
    .order('macrogrupo', { ascending: true })
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })
    .limit(300)

  if (error) return []

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const active = row.ativo !== false
    return {
      id: fixText(row.id),
      title: fixText(row.nome, 'Categoria financeira'),
      subtitle: `${fixText(row.macrogrupo, 'macrogrupo')} · ${fixText(row.codigo, 'sem código')}`,
      status: active ? 'ativa' : 'inativa',
      value: fixText(row.ordem, '100'),
      meta: fixText(row.descricao, 'Sem descrição'),
      tone: fixToneFromBoolean(row.ativo),
    }
  })
}

export async function listFixRegraClassificacaoRows(): Promise<IntrListRow[]> {
  const { data, error } = await fixAdmin()
    .schema('gkli_intr')
    .from('financeiro_regras_classificacao')
    .select('id,nome,termo,campo_alvo,tipo_match,macrogrupo,prioridade,ativo,categoria:financeiro_categorias(nome)')
    .order('prioridade', { ascending: true })
    .order('nome', { ascending: true })
    .limit(300)

  if (error) return []

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const active = row.ativo !== false
    const categoria = row.categoria as Record<string, unknown> | null
    return {
      id: fixText(row.id),
      title: fixText(row.nome, 'Regra de classificação'),
      subtitle: `${fixText(row.termo, 'sem termo')} · ${fixText(row.campo_alvo, 'ambos')} · ${fixText(row.tipo_match, 'contém')}`,
      status: active ? 'ativa' : 'inativa',
      value: fixText(row.prioridade, '100'),
      meta: `${fixText(row.macrogrupo, 'macrogrupo')} · ${fixText(categoria?.nome, 'sem categoria')}`,
      tone: fixToneFromBoolean(row.ativo),
    }
  })
}


export async function listFixReceitaRealizadaRows(): Promise<IntrListRow[]> {
  return listIntrReceitaRows()
}

export async function listFixDespesaRealizadaRows(): Promise<IntrListRow[]> {
  const { data, error } = await fixAdmin()
    .from('gkli_intr_fix_despesas_realizadas_resumo')
    .select('*')
    .order('data_lancamento', { ascending: false })
    .limit(500)

  if (error) return listFixExtratoLancamentoRows()

  return ((data ?? []) as Array<Record<string, unknown>>).map((row, index) => {
    const status = fixText(row.status_classificacao, 'classificada')
    const macrogrupo = fixText(row.macrogrupo, 'nao_classificado')
    const isUnclassified = macrogrupo === 'nao_classificado' || status.includes('pendente')
    return {
      id: fixText(row.id, `despesa-${index}`),
      title: fixText(row.descricao ?? row.historico, 'Despesa realizada'),
      subtitle: `${fixDate(row.data_lancamento)} · ${fixText(row.categoria_nome, 'Sem categoria')}`,
      status,
      value: fixBRL(row.valor_abs ?? row.valor),
      meta: `${macrogrupo.replace('_', ' ')} · ${fixText(row.origem, 'extrato')}`,
      tone: isUnclassified ? 'warning' : 'success',
    }
  })
}

export async function listFixDespesaNaoClassificadaRows(): Promise<IntrListRow[]> {
  const rows = await listFixDespesaRealizadaRows()
  return rows.filter((row) => row.status.toLowerCase().includes('pendente') || row.meta.toLowerCase().includes('nao classificado'))
}

export async function listFixDespesaRecorrenteRows(): Promise<IntrListRow[]> {
  const { data, error } = await fixAdmin()
    .from('gkli_intr_fix_despesas_recorrentes_resumo')
    .select('*')
    .order('valor_medio', { ascending: false })
    .limit(300)

  if (error) return listFixContaPagarRows()

  return ((data ?? []) as Array<Record<string, unknown>>).map((row, index) => {
    const active = row.ativo !== false
    return {
      id: fixText(row.id, `recorrente-${index}`),
      title: fixText(row.descricao_padrao ?? row.referencia_nome, 'Despesa recorrente'),
      subtitle: `${fixText(row.macrogrupo, 'operacional')} · ${fixText(row.categoria_nome, 'Sem categoria')}`,
      status: active ? 'recorrente' : 'inativa',
      value: fixBRL(row.valor_medio ?? row.valor_previsto),
      meta: `dia ${fixText(row.dia_previsto, '-')} · confiança ${fixText(row.confianca, '0')}%`,
      tone: active ? 'primary' : 'warning',
    }
  })
}

export async function listFixOrcamentoRows(): Promise<IntrListRow[]> {
  const { data, error } = await fixAdmin()
    .from('gkli_intr_fix_orcamento_despesas_resumo')
    .select('*')
    .order('competencia', { ascending: true })
    .order('valor_previsto', { ascending: false })
    .limit(500)

  if (error) return listFixPrevisaoRows()

  return ((data ?? []) as Array<Record<string, unknown>>).map((row, index) => {
    const status = fixText(row.status, 'previsto')
    return {
      id: fixText(row.id, `orcamento-${index}`),
      title: fixText(row.referencia_nome ?? row.categoria_nome, 'Item de orçamento'),
      subtitle: `${fixDate(row.competencia)} · ${fixText(row.macrogrupo, 'operacional')} · ${fixText(row.categoria_nome, 'Sem categoria')}`,
      status,
      value: fixBRL(row.valor_previsto),
      meta: `${fixText(row.origem_previsao, 'histórico')} · confiança ${fixText(row.confianca, '0')}%`,
      tone: status === 'ajustado' ? 'warning' : 'primary',
    }
  })
}

function fixNumber(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function fixBRL(value: unknown) {
  return new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' }).format(fixNumber(value))
}

function fixDate(value: unknown) {
  if (!value) return 'Sem data'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return fixText(value, 'Sem data')
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date)
}


function fixValidationTone(status: string): IntrListRow['tone'] {
  if (status === 'validada') return 'success'
  if (status === 'divergente' || status === 'nao_localizada' || status === 'nova_despesa') return 'warning'
  if (status === 'ignorada') return 'primary'
  if (status === 'desvio_registrado') return 'danger'
  return 'primary'
}

export async function listFixValidacaoDespesaRows(statuses?: string[]): Promise<IntrListRow[]> {
  let query = fixAdmin()
    .from('gkli_intr_fix_validacao_despesas_resumo')
    .select('*')
    .order('competencia', { ascending: false })
    .order('status', { ascending: true })
    .order('diferenca', { ascending: false })
    .limit(500)

  if (statuses?.length) {
    query = query.in('status', statuses)
  }

  const { data, error } = await query
  if (error) return []

  return ((data ?? []) as Array<Record<string, unknown>>).map((row, index) => {
    const status = fixText(row.status, 'pendente')
    const previsto = fixNumber(row.valor_previsto)
    const realizado = fixNumber(row.valor_realizado)
    const diferenca = fixNumber(row.diferenca)
    const sinal = diferenca > 0 ? '+' : ''
    const percentual = row.percentual_desvio === null || row.percentual_desvio === undefined
      ? 'sem base'
      : `${sinal}${fixNumber(row.percentual_desvio).toFixed(2)}%`
    return {
      id: fixText(row.id, `validacao-${index}`),
      title: fixText(row.referencia_nome ?? row.categoria_nome, 'Validação de despesa'),
      subtitle: `${fixDate(row.competencia)} · ${fixText(row.macrogrupo, 'operacional')} · ${fixText(row.categoria_nome, 'Sem categoria')}`,
      status: status.replaceAll('_', ' '),
      value: `${fixBRL(previsto)} → ${fixBRL(realizado)}`,
      meta: `desvio ${fixBRL(diferenca)} · ${percentual} · ${fixText(row.acao_sugerida, 'Sem ação sugerida')}`,
      tone: fixValidationTone(status),
    }
  })
}

export async function getFixValidacaoDespesaResumo() {
  const rows = await listFixValidacaoDespesaRows()
  const pendentes = rows.filter((row) => ['divergente', 'nao localizada', 'nova despesa'].includes(row.status.toLowerCase()))
  const validadas = rows.filter((row) => row.status.toLowerCase() === 'validada')
  const ignoradas = rows.filter((row) => row.status.toLowerCase() === 'ignorada')
  const registradas = rows.filter((row) => row.status.toLowerCase() === 'desvio registrado')

  return {
    cards: [
      { label: 'Validações', value: String(rows.length), hint: 'itens orçamento x realizado', tone: 'primary' as const },
      { label: 'Pendências', value: String(pendentes.length), hint: 'desvios exigindo ação', tone: pendentes.length ? 'warning' as const : 'success' as const },
      { label: 'Validadas', value: String(validadas.length), hint: 'dentro da tolerância', tone: 'success' as const },
      { label: 'Tratadas', value: String(ignoradas.length + registradas.length), hint: 'registradas ou ignoradas', tone: 'primary' as const },
    ],
    rows,
    pendentes,
    validadas,
    ignoradas,
    registradas,
  }
}

function fixFormatBRL(value: unknown) {
  const parsed = Number(value ?? 0)
  return new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' }).format(Number.isFinite(parsed) ? parsed : 0)
}

function fixDateLabel(value: unknown) {
  if (!value) return 'Sem data'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return fixText(value, 'Sem data')
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date)
}

function fixStatusTone(status: string): IntrListRow['tone'] {
  const normalized = status.toLowerCase()
  if (['aprovada', 'paga', 'pago'].includes(normalized)) return 'success'
  if (['rejeitada', 'cancelada', 'cancelado'].includes(normalized)) return 'danger'
  if (['calculada', 'em_conferencia', 'previsto', 'em_processamento'].includes(normalized)) return 'warning'
  return 'primary'
}

function fixComissaoStatusLabel(status: unknown) {
  const normalized = fixText(status, 'calculada')
  const labels: Record<string, string> = {
    calculada: 'pendente de aprovação',
    em_conferencia: 'em aprovação',
    aprovada: 'aprovada',
    rejeitada: 'rejeitada',
    paga: 'paga',
    cancelada: 'cancelada',
  }
  return labels[normalized] ?? normalized
}

export async function getFixComissoesAprovacaoResumo() {
  const [{ data: comissoes }, { data: pagamentos }] = await Promise.all([
    fixAdmin()
      .schema('gkli_intr')
      .from('comissoes')
      .select('status,valor_comissao')
      .limit(5000),
    fixAdmin()
      .schema('gkli_intr')
      .from('pagamentos')
      .select('status,valor_liquido,valor_bruto,comissao_id')
      .not('comissao_id', 'is', null)
      .limit(5000),
  ])

  const comissaoRows = (comissoes ?? []) as Array<Record<string, unknown>>
  const pagamentoRows = (pagamentos ?? []) as Array<Record<string, unknown>>
  const pendentes = comissaoRows.filter((row) => ['calculada', 'em_conferencia'].includes(fixText(row.status)))
  const aprovadas = comissaoRows.filter((row) => fixText(row.status) === 'aprovada')
  const rejeitadas = comissaoRows.filter((row) => fixText(row.status) === 'rejeitada')
  const pagamentosPendentes = pagamentoRows.filter((row) => ['previsto', 'em_processamento'].includes(fixText(row.status)))
  const sum = (rows: Array<Record<string, unknown>>, key: string) => rows.reduce((acc, row) => acc + fixNumber(row[key]), 0)

  return [
    { label: 'Pendentes', value: String(pendentes.length), hint: 'calculadas/em aprovação', tone: pendentes.length ? 'warning' as const : 'success' as const },
    { label: 'Valor pendente', value: fixFormatBRL(sum(pendentes, 'valor_comissao')), hint: 'aguardando aprovação', tone: pendentes.length ? 'warning' as const : 'success' as const },
    { label: 'Aprovadas', value: fixFormatBRL(sum(aprovadas, 'valor_comissao')), hint: `${aprovadas.length} comissão(ões)`, tone: 'success' as const },
    { label: 'Pagamentos', value: String(pagamentosPendentes.length), hint: 'pendentes de pagamento', tone: pagamentosPendentes.length ? 'warning' as const : 'success' as const },
    { label: 'Rejeitadas', value: String(rejeitadas.length), hint: 'fora do pagamento', tone: rejeitadas.length ? 'danger' as const : 'primary' as const },
  ]
}

export async function listFixComissoesAprovacaoRows(): Promise<IntrListRow[]> {
  let { data, error } = await fixAdmin()
    .from('gkit_fix_comissoes_aprovacao_resumo')
    .select('*')
    .in('status', ['calculada', 'em_conferencia', 'aprovada', 'rejeitada'])
    .order('competencia', { ascending: false })
    .limit(500)

  if (error) {
    const fallback = await fixAdmin()
      .from('gkli_intr_comissoes_resumo')
      .select('*')
      .in('status', ['calculada', 'em_conferencia', 'aprovada', 'rejeitada'])
      .order('competencia', { ascending: false })
      .limit(500)
    data = fallback.data
    error = fallback.error
  }

  if (error) return []

  return ((data ?? []) as Array<Record<string, unknown>>).map((row, index) => {
    const status = fixText(row.status, 'calculada')
    const colaborador = fixText(row.colaborador_nome ?? row.vendedor_nome ?? row.nome, 'Colaborador')
    const cliente = fixText(row.cliente, 'Sem cliente')
    const categoria = fixText(row.categoria_importada ?? row.categoria ?? row.tipo_comissao_nome, 'Categoria')
    return {
      id: fixText(row.id, `comissao-${index}`),
      title: colaborador,
      subtitle: `${cliente} · ${categoria}`,
      status: fixComissaoStatusLabel(status),
      value: fixFormatBRL(row.valor_comissao ?? row.comissao_total ?? row.valor),
      meta: `${fixDateLabel(row.competencia ?? row.criado_em)} · ${fixText(row.tipo_comissao_nome, 'tipo não informado')}`,
      tone: fixStatusTone(status),
    }
  })
}

function fixMonthInput(value: string) {
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value.slice(0, 7)}-01`
  return value
}

function fixStatusLabel(status: unknown) {
  const normalized = fixText(status, 'aberto')
  const labels: Record<string, string> = {
    aberto: 'aberta',
    em_conferencia: 'em análise',
    em_analise: 'em análise',
    fechado: 'fechada',
    reaberto: 'reaberta',
    cancelado: 'cancelada',
  }
  return labels[normalized] ?? normalized.replaceAll('_', ' ')
}

function fixChecklistItem({
  description,
  href,
  key,
  label,
  ok,
  pendencias,
  total,
  value,
}: {
  key: string
  label: string
  description: string
  ok: boolean
  total: number
  pendencias: number
  value?: string
  href?: string
}) {
  return { key, label, description, ok, total, pendencias, value, href }
}

function mapFixFechamentoGovernanca(row: Record<string, unknown>) {
  const receitasTotal = fixNumber(row.receitas_total)
  const despesasPendentes = fixNumber(row.despesas_pendentes)
  const despesasTotal = fixNumber(row.despesas_total)
  const orcamentoItens = fixNumber(row.orcamento_itens)
  const validacoesTotal = fixNumber(row.validacoes_total)
  const validacoesPendentes = fixNumber(row.validacoes_pendentes)
  const comissoesTotal = fixNumber(row.comissoes_total)
  const comissoesPendentes = fixNumber(row.comissoes_pendentes)
  const pagamentosPendentes = fixNumber(row.pagamentos_pendentes)
  const pagamentosTotal = fixNumber(row.pagamentos_total)
  const pendenciasTotal = despesasPendentes + validacoesPendentes + comissoesPendentes + pagamentosPendentes

  return {
    id: fixText(row.id),
    competencia: fixText(row.competencia),
    competenciaLabel: fixText(row.competencia_label, fixDate(row.competencia)),
    status: fixText(row.status, 'aberto'),
    receitaTotal: fixNumber(row.receita_total ?? row.receitas_valor),
    despesaTotal: fixNumber(row.despesas_valor),
    orcamentoTotal: fixNumber(row.orcamento_valor),
    comissaoTotal: fixNumber(row.comissao_total),
    pagamentosPrevistosTotal: fixNumber(row.pagamentos_previstos_total),
    pagamentosPagosTotal: fixNumber(row.pagamentos_pagos_total),
    saldoOperacional: fixNumber(row.saldo_operacional),
    pendenciasTotal,
    fechadoEm: fixText(row.fechado_em) || null,
    atualizadoEm: fixText(row.atualizado_em) || null,
    observacao: fixText(row.observacao) || null,
    reaberturaMotivo: fixText(row.reabertura_motivo) || null,
    checklist: [
      fixChecklistItem({
        key: 'receitas',
        label: 'Receitas importadas',
        description: receitasTotal ? 'Receitas Omie importadas para a competência.' : 'Importe as receitas Omie da competência.',
        ok: receitasTotal > 0,
        total: receitasTotal,
        pendencias: receitasTotal > 0 ? 0 : 1,
        value: fixBRL(row.receitas_valor ?? row.receita_total),
        href: '/modulos/fix/financeiro/receitas',
      }),
      fixChecklistItem({
        key: 'despesas',
        label: 'Despesas classificadas',
        description: despesasPendentes ? 'Existem saídas sem categoria ou macrogrupo.' : 'Todas as despesas importadas estão classificadas.',
        ok: despesasTotal > 0 && despesasPendentes === 0,
        total: despesasTotal,
        pendencias: despesasPendentes,
        value: fixBRL(row.despesas_valor),
        href: '/modulos/fix/financeiro/despesas',
      }),
      fixChecklistItem({
        key: 'orcamento',
        label: 'Orçamento gerado',
        description: orcamentoItens ? 'Há orçamento de despesas para a competência.' : 'Gere o orçamento de despesas antes da validação.',
        ok: orcamentoItens > 0,
        total: orcamentoItens,
        pendencias: orcamentoItens > 0 ? 0 : 1,
        value: fixBRL(row.orcamento_valor),
        href: '/modulos/fix/financeiro/orcamento',
      }),
      fixChecklistItem({
        key: 'validacao',
        label: 'Validação concluída',
        description: validacoesPendentes ? 'Há divergências, despesas novas ou não localizadas sem tratamento.' : 'Validações de despesas estão tratadas.',
        ok: validacoesTotal > 0 && validacoesPendentes === 0,
        total: validacoesTotal,
        pendencias: validacoesPendentes,
        value: `${validacoesTotal} item(ns)`,
        href: '/modulos/fix/financeiro/validacao',
      }),
      fixChecklistItem({
        key: 'comissoes',
        label: 'Comissões aprovadas',
        description: comissoesPendentes ? 'Existem comissões calculadas ou em aprovação.' : 'Comissões da competência estão aprovadas ou sem pendência.',
        ok: comissoesTotal === 0 || comissoesPendentes === 0,
        total: comissoesTotal,
        pendencias: comissoesPendentes,
        value: fixBRL(row.comissao_total),
        href: '/modulos/fix/comissoes/aprovacao',
      }),
      fixChecklistItem({
        key: 'pagamentos',
        label: 'Pagamentos processados',
        description: pagamentosPendentes ? 'Há pagamentos previstos ou em processamento.' : 'Pagamentos estão processados ou sem pendência.',
        ok: pagamentosTotal === 0 || pagamentosPendentes === 0,
        total: pagamentosTotal,
        pendencias: pagamentosPendentes,
        value: `${fixBRL(row.pagamentos_pagos_total)} pagos`,
        href: '/modulos/fix/pagamentos',
      }),
    ],
  }
}

export async function getFixFechamentoGovernanca(id: string) {
  const { data, error } = await fixAdmin()
    .from('gkit_fix_fechamento_checklist_resumo')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    const fallback = await getIntrFechamento(id)
    return {
      id: fallback.id,
      competencia: fallback.competencia,
      competenciaLabel: fixDate(fallback.competencia),
      status: fallback.status,
      receitaTotal: fallback.receita_total,
      despesaTotal: 0,
      orcamentoTotal: 0,
      comissaoTotal: fallback.comissao_total,
      pagamentosPrevistosTotal: fallback.pagamentos_previstos_total,
      pagamentosPagosTotal: fallback.pagamentos_pagos_total,
      saldoOperacional: fallback.saldo_operacional,
      pendenciasTotal: fallback.pendencias_total,
      fechadoEm: null,
      atualizadoEm: null,
      observacao: fallback.observacao,
      reaberturaMotivo: null,
      checklist: [],
    }
  }

  return mapFixFechamentoGovernanca(data as Record<string, unknown>)
}

export async function listFixFechamentoGovernancaRows(): Promise<IntrListRow[]> {
  const { data, error } = await fixAdmin()
    .from('gkit_fix_fechamento_checklist_resumo')
    .select('*')
    .order('competencia', { ascending: false })
    .limit(200)

  if (error) return listIntrFechamentoRows()

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const fechamento = mapFixFechamentoGovernanca(row)
    const status = fixText(row.status, 'aberto')
    return {
      id: fechamento.id,
      title: fechamento.competenciaLabel,
      subtitle: `${fechamento.pendenciasTotal} pendência(s) · ${fechamento.checklist.filter((item) => item.ok).length}/${fechamento.checklist.length} etapas ok`,
      status: fixStatusLabel(status),
      value: fixBRL(row.saldo_operacional ?? 0),
      meta: `Receitas ${fixBRL(row.receitas_valor ?? row.receita_total)} · Despesas ${fixBRL(row.despesas_valor)}`,
      tone: status === 'fechado' ? 'success' : fechamento.pendenciasTotal ? 'warning' : 'primary',
    }
  })
}

export async function getFixCompetenciaAtualGovernanca() {
  const now = new Date()
  const competencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  let { data } = await fixAdmin()
    .from('gkit_fix_fechamento_checklist_resumo')
    .select('*')
    .eq('competencia', competencia)
    .maybeSingle()

  if (!data) {
    const latest = await fixAdmin()
      .from('gkit_fix_fechamento_checklist_resumo')
      .select('*')
      .order('competencia', { ascending: false })
      .limit(1)
      .maybeSingle()
    data = latest.data
  }

  return data ? mapFixFechamentoGovernanca(data as Record<string, unknown>) : null
}

export async function getFixFechamentoChecklistByCompetencia(competenciaRaw: string) {
  const competencia = fixMonthInput(competenciaRaw)
  const { data, error } = await fixAdmin()
    .from('gkit_fix_fechamento_checklist_resumo')
    .select('*')
    .eq('competencia', competencia)
    .maybeSingle()
  if (error || !data) return null
  return mapFixFechamentoGovernanca(data as Record<string, unknown>)
}
