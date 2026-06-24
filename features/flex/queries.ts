import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'
import type {
  FlexCategoriaFinanceira,
  FlexCashFlowData,
  FlexColaborador,
  FlexComissao,
  FlexComissaoListItem,
  FlexDashboardData,
  FlexDespesaCategoriaMapeamento,
  FlexDespesaCategoriaPendencia,
  FlexDespesaInlineRow,
  FlexFechamento,
  FlexFormData,
  FlexExtrato,
  FlexExtratoLancamento,
  FlexListRow,
  FlexOption,
  FlexPagamento,
  FlexPagamentoAgenda,
  FlexPrevisaoDespesa,
  FlexReceita,
  FlexReceitaCategoriaMapeamento,
  FlexReceitaCategoriaPendencia,
  FlexReceitaMapeamento,
  FlexTipoComissao,
  FlexTipoPagamento,
  FlexTime,
  FlexTone,
  FlexValidacaoItem,
} from '@/features/flex/types'

function admin() {
  return createSupabaseAdminClient() as any
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numberValue(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function money(value: unknown) {
  return numberValue(value).toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })
}

function previousMonthDate() {
  const today = new Date()
  today.setMonth(today.getMonth() - 1)
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
}

function addMonthsDate(value: string, months: number) {
  const date = new Date(`${value.slice(0, 7)}-01T00:00:00`)
  date.setMonth(date.getMonth() + months)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

function monthValue(value: unknown) {
  return text(value).slice(0, 7)
}

function monthLabel(value: unknown) {
  const month = monthValue(value)
  if (!/^\d{4}-\d{2}$/.test(month)) return text(value)
  const [year, rawMonth] = month.split('-')
  return `${rawMonth}/${year}`
}

function dateText(value: unknown) {
  return typeof value === 'string' && value ? new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR') : ''
}

function paymentDateForCompetencia(competencia: string, diaPrevisto: number) {
  const month = `${competencia.slice(0, 7)}-01`
  const next = addMonthsDate(month, 1)
  const lastDay = new Date(`${next}T00:00:00`)
  lastDay.setDate(0)
  const day = Math.min(Math.max(Number(diaPrevisto) || 1, 1), lastDay.getDate())
  return `${month.slice(0, 8)}${String(day).padStart(2, '0')}`
}

function sumMoneyRows(rows: Array<Record<string, any>>, key: string) {
  return rows.reduce((sum, row) => sum + Math.abs(numberValue(row[key])), 0)
}

function statusTone(status: string): FlexTone {
  const normalized = status.toLowerCase()
  if (normalized.includes('pronto') || normalized.includes('fechado')) return 'success'
  if (normalized.includes('validacao') || normalized.includes('reaberto')) return 'warning'
  if (['ativo', 'publicado', 'concluido', 'concluído', 'ok', 'pago', 'conciliado'].some((item) => normalized.includes(item))) return 'success'
  if (['inativo', 'cancelado', 'bloqueado', 'erro', 'atrasado'].some((item) => normalized.includes(item))) return 'danger'
  if (['pendente', 'rascunho', 'analise'].some((item) => normalized.includes(item))) return 'warning'
  return 'primary'
}

function option(row: any, labelKey = 'nome'): FlexOption {
  return {
    id: String(row.id),
    label: text(row[labelKey], String(row.id)),
    meta: text(row.email ?? row.status ?? row.codigo),
  }
}

export async function requireFlexContext() {
  return requireModuleAccess('flex')
}

export function canWriteFlex(permissions: string[], permission: string) {
  return canAccess(permissions, permission)
}

export async function listFlexCompetenciaOptions(limit = 18): Promise<FlexOption[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('fechamentos')
    .select('competencia,status')
    .order('competencia', { ascending: false })
    .limit(limit)

  const options = !error && data?.length
    ? ((data ?? []) as any[]).map((row) => ({
        id: monthValue(row.competencia),
        label: monthLabel(row.competencia),
        meta: text(row.status, 'competencia'),
      }))
    : []

  if (options.length) return options

  const base = previousMonthDate()
  return Array.from({ length: 6 }, (_, index) => {
    const competencia = addMonthsDate(base, index - 2)
    return {
      id: monthValue(competencia),
      label: monthLabel(competencia),
      meta: index === 2 ? 'referencia' : 'sugerida',
    }
  }).reverse()
}

export async function getFlexFormData(): Promise<FlexFormData> {
  const supabase = admin()
  const [usuarios, carteiras, times, categorias, colaboradores, tiposPagamento, tiposComissao, comissoes, lancamentos, previsoesDespesa, competencias] = await Promise.all([
    supabase.schema('security').from('usuarios').select('id,nome,email,status').eq('status', 'ativo').order('nome', { ascending: true }).limit(500),
    supabase.schema('core').from('carteiras').select('id,nome,status').eq('status', 'ativo').order('nome', { ascending: true }).limit(500),
    supabase.schema('flex').from('times').select('id,nome,status').order('nome', { ascending: true }).limit(500),
    supabase.schema('flex').from('categorias_financeiras').select('id,nome,macrogrupo,tipo,status').order('macrogrupo', { ascending: true }).order('nome', { ascending: true }).limit(500),
    supabase.schema('flex').from('colaboradores').select('id,usuario_id,status,security_usuario:usuario_id(nome,email)').order('atualizado_em', { ascending: false }).limit(500),
    supabase.schema('flex').from('tipos_pagamento').select('id,codigo,nome,status').eq('status', 'ativo').order('nome', { ascending: true }).limit(500),
    supabase.schema('flex').from('tipos_comissao').select('id,nome,percentual,status').eq('status', 'ativo').order('nome', { ascending: true }).limit(500),
    supabase.schema('flex').from('comissoes').select('id,valor_comissao,status,competencia,colaborador:colaborador_id(security_usuario:usuario_id(nome))').order('competencia', { ascending: false }).limit(500),
    supabase.schema('flex').from('extrato_lancamentos').select('id,descricao,historico,valor,tipo,data_lancamento,conciliado').eq('tipo', 'saida').eq('conciliado', false).order('data_lancamento', { ascending: false }).limit(500),
    supabase.schema('flex').from('previsoes_despesa').select('id,fornecedor,tipo_despesa,valor_previsto,status').eq('status', 'ativo').order('fornecedor', { ascending: true }).limit(500),
    listFlexCompetenciaOptions(),
  ])

  const usuarioOptions = ((usuarios.data ?? []) as any[]).map((row) => option(row))
  const usuariosComComplemento = new Set(((colaboradores.data ?? []) as any[]).map((row) => String(row.usuario_id)))

  const categoriaOptions = ((categorias.data ?? []) as any[]).map((row) => ({
    id: String(row.id),
    label: text(row.nome),
    meta: text(row.macrogrupo),
    tipo: text(row.tipo),
  }))

  return {
    categorias: categoriaOptions.map(({ id, label, meta }) => ({ id, label, meta })),
    categoriasDespesa: categoriaOptions.filter((row) => row.tipo === 'despesa').map(({ id, label, meta }) => ({ id, label, meta })),
    categoriasReceita: categoriaOptions.filter((row) => row.tipo === 'receita').map(({ id, label, meta }) => ({ id, label, meta })),
    carteiras: ((carteiras.data ?? []) as any[]).map((row) => option(row)),
    colaboradores: ((colaboradores.data ?? []) as any[]).map((row) => ({
      id: String(row.id),
      label: text(row.security_usuario?.nome, 'Colaborador Flex'),
      meta: text(row.security_usuario?.email ?? row.status),
    })),
    comissoes: ((comissoes.data ?? []) as any[]).map((row) => ({
      id: String(row.id),
      label: text(row.colaborador?.security_usuario?.nome, 'Comissão'),
      meta: `${money(row.valor_comissao)} - ${text(row.status)}`,
    })),
    competencias,
    extratoLancamentos: ((lancamentos.data ?? []) as any[]).map((row) => ({
      id: String(row.id),
      label: text(row.descricao, text(row.historico, 'Lançamento')),
      meta: `${money(row.valor)} - ${text(row.data_lancamento)}`,
    })),
    previsoesDespesa: ((previsoesDespesa.data ?? []) as any[]).map((row) => ({
      id: String(row.id),
      label: text(row.fornecedor, 'Previsão'),
      meta: `${text(row.tipo_despesa)} - ${money(row.valor_previsto)}`,
    })),
    tiposPagamento: ((tiposPagamento.data ?? []) as any[]).map((row) => option(row)),
    tiposComissao: ((tiposComissao.data ?? []) as any[]).map((row) => ({
      id: String(row.id),
      label: text(row.nome),
      meta: `${numberValue(row.percentual).toLocaleString('pt-BR')}%`,
    })),
    times: ((times.data ?? []) as any[]).map((row) => option(row)),
    usuarios: usuarioOptions,
    usuariosColaborador: usuarioOptions.filter((row) => !usuariosComComplemento.has(row.id)),
  }
}

export async function listFlexImportacoes(): Promise<FlexListRow[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('importacoes')
    .select('id,tipo,origem,arquivo_nome,status,total_itens,total_processados,total_erros,total_alertas,criado_em')
    .order('criado_em', { ascending: false })
    .limit(200)

  if (error) return []

  return ((data ?? []) as any[]).map((row) => ({
    id: String(row.id),
    title: text(row.arquivo_nome, text(row.origem, 'Lançamento manual')),
    subtitle: `${text(row.tipo, 'outro')} - ${new Date(row.criado_em).toLocaleDateString('pt-BR')}`,
    status: text(row.status, 'processado'),
    value: String(numberValue(row.total_processados || row.total_itens)),
    meta: `${numberValue(row.total_alertas)} alerta(s), ${numberValue(row.total_erros)} erro(s)`,
    tone: statusTone(text(row.status, 'processado')),
  }))
}

export async function listFlexReceitas(): Promise<FlexListRow[]> {
  const supabase = admin()
  const { data, error } = await supabase
    .schema('flex')
    .from('receitas')
    .select('id,cliente,descricao,competencia,data_recebimento,valor_recebido,status,origem,categoria_id,colaborador_id')
    .order('competencia', { ascending: false })
    .order('criado_em', { ascending: false })
    .limit(500)

  if (error) return []

  const receitaRows = (data ?? []) as any[]
  const categoriaIds = Array.from(new Set(receitaRows.map((row) => String(row.categoria_id ?? '')).filter(Boolean)))
  const colaboradorIds = Array.from(new Set(receitaRows.map((row) => String(row.colaborador_id ?? '')).filter(Boolean)))

  const [categorias, colaboradores] = await Promise.all([
    categoriaIds.length
      ? supabase.schema('flex').from('categorias_financeiras').select('id,nome,macrogrupo').in('id', categoriaIds)
      : Promise.resolve({ data: [], error: null }),
    colaboradorIds.length
      ? supabase.schema('flex').from('colaboradores').select('id,usuario_id').in('id', colaboradorIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const categoriasById = new Map(((categorias.data ?? []) as any[]).map((row) => [String(row.id), row]))
  const colaboradorRows = (colaboradores.data ?? []) as any[]
  const usuarioIds = Array.from(new Set(colaboradorRows.map((row) => String(row.usuario_id ?? '')).filter(Boolean)))
  const usuarios = usuarioIds.length
    ? await supabase.schema('security').from('usuarios').select('id,nome').in('id', usuarioIds)
    : { data: [], error: null }
  const usuariosById = new Map(((usuarios.data ?? []) as any[]).map((row) => [String(row.id), row]))
  const colaboradoresById = new Map(colaboradorRows.map((row) => [String(row.id), row]))

  return receitaRows.map((row) => {
    const categoria = row.categoria_id ? categoriasById.get(String(row.categoria_id)) : null
    const colaborador = row.colaborador_id ? colaboradoresById.get(String(row.colaborador_id)) : null
    const usuario = colaborador?.usuario_id ? usuariosById.get(String(colaborador.usuario_id)) : null
    const categoriaNome = text(categoria?.nome, text(row.descricao, 'Sem categoria'))

    return {
      id: String(row.id),
      title: text(row.cliente, 'Receita'),
      subtitle: [categoriaNome, text(usuario?.nome)].filter(Boolean).join(' - '),
      status: text(row.status, 'realizada'),
      value: money(row.valor_recebido),
      meta: monthLabel(row.competencia),
      tone: statusTone(text(row.status, 'realizada')),
    }
  })
}

export async function listFlexReceitasPorCategoria(): Promise<FlexListRow[]> {
  const supabase = admin()
  const { data, error } = await supabase
    .schema('flex')
    .from('receitas')
    .select('id,competencia,valor_recebido,status,categoria_id')
    .order('competencia', { ascending: false })
    .limit(5000)

  if (error) return []

  const receitaRows = (data ?? []) as any[]
  const categoriaIds = Array.from(new Set(receitaRows.map((row) => String(row.categoria_id ?? '')).filter(Boolean)))
  const categorias = categoriaIds.length
    ? await supabase.schema('flex').from('categorias_financeiras').select('id,nome,macrogrupo').in('id', categoriaIds)
    : { data: [], error: null }
  const categoriasById = new Map(((categorias.data ?? []) as any[]).map((row) => [String(row.id), row]))
  const groups = new Map<string, {
    categoriaId: string | null
    count: number
    latestCompetencia: string
    macrogrupo: string
    status: string
    title: string
    total: number
  }>()

  for (const row of receitaRows) {
    const categoriaId = row.categoria_id ? String(row.categoria_id) : null
    const categoria = categoriaId ? categoriasById.get(categoriaId) : null
    const key = categoriaId ?? 'sem-categoria'
    const current = groups.get(key) ?? {
      categoriaId,
      count: 0,
      latestCompetencia: '',
      macrogrupo: text(categoria?.macrogrupo, categoriaId ? 'receita' : 'classificação pendente'),
      status: categoriaId ? 'realizada' : 'pendente',
      title: text(categoria?.nome, 'Sem categoria'),
      total: 0,
    }

    current.count += 1
    current.total += numberValue(row.valor_recebido)
    const competencia = monthValue(row.competencia)
    if (competencia > current.latestCompetencia) current.latestCompetencia = competencia
    if (!categoriaId || text(row.status).toLowerCase().includes('pendente')) current.status = 'pendente'
    groups.set(key, current)
  }

  return Array.from(groups.entries())
    .map(([key, group]) => ({
      id: key,
      title: group.title,
      subtitle: `${group.count} receita(s) - competência mais recente ${monthLabel(group.latestCompetencia)}`,
      status: group.status === 'pendente' ? 'Ajustar' : 'Realizada',
      value: money(group.total),
      meta: group.macrogrupo,
      detailHref: group.status === 'pendente' ? '/modulos/flex/financeiro/receitas#receitas-pendentes' : undefined,
      tone: group.status === 'pendente' ? 'warning' as const : 'success' as const,
    }))
    .sort((a, b) => {
      if (a.id === 'sem-categoria') return -1
      if (b.id === 'sem-categoria') return 1
      const aValue = numberValue(a.value.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.'))
      const bValue = numberValue(b.value.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.'))
      return bValue - aValue
    })
}

export async function listFlexReceitaCategoriaPendencias(): Promise<FlexReceitaCategoriaPendencia[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('receitas')
    .select('id,cliente,descricao,competencia,valor_recebido,categoria_id,metadata')
    .is('categoria_id', null)
    .order('competencia', { ascending: false })
    .limit(5000)

  if (error) return []

  const groups = new Map<string, FlexReceitaCategoriaPendencia>()

  for (const row of ((data ?? []) as any[])) {
    const categoriaOrigem = text(row.metadata?.categoria_omie, text(row.descricao, 'Sem categoria Omie'))
    const current = groups.get(categoriaOrigem) ?? {
      categoriaOrigem,
      count: 0,
      latestCompetencia: '',
      sample: text(row.cliente, 'Receita'),
      total: 0,
    }

    current.count += 1
    current.total += numberValue(row.valor_recebido)
    const competencia = monthValue(row.competencia)
    if (competencia > current.latestCompetencia) current.latestCompetencia = competencia
    if (current.sample === 'Receita') current.sample = text(row.cliente, current.sample)
    groups.set(categoriaOrigem, current)
  }

  return Array.from(groups.values()).sort((a, b) => b.total - a.total)
}

export async function listFlexReceitaCategoriaMapeamentos(): Promise<FlexReceitaCategoriaMapeamento[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('receita_categoria_mapeamentos')
    .select('id,origem,categoria_origem,categoria_id,status,observacao,categoria:categoria_id(nome,macrogrupo)')
    .eq('origem', 'omie')
    .order('categoria_origem', { ascending: true })
    .limit(500)

  if (error) return []
  return (data ?? []) as FlexReceitaCategoriaMapeamento[]
}

export async function listFlexDespesaCategoriaPendencias(): Promise<FlexDespesaCategoriaPendencia[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('extrato_lancamentos')
    .select('id,fornecedor,descricao,historico,data_lancamento,valor,tipo,categoria_id')
    .eq('tipo', 'saida')
    .is('categoria_id', null)
    .order('data_lancamento', { ascending: false })
    .limit(5000)

  if (error) return []

  const groups = new Map<string, FlexDespesaCategoriaPendencia>()

  for (const row of ((data ?? []) as any[])) {
    const termoOrigem = text(row.fornecedor, text(row.descricao, text(row.historico, 'Lançamento sem termo')))
    const current = groups.get(termoOrigem) ?? {
      termoOrigem,
      count: 0,
      latestCompetencia: '',
      sample: text(row.descricao, text(row.historico, 'Despesa')),
      total: 0,
    }

    current.count += 1
    current.total += numberValue(row.valor)
    const competencia = monthValue(row.data_lancamento)
    if (competencia > current.latestCompetencia) current.latestCompetencia = competencia
    groups.set(termoOrigem, current)
  }

  return Array.from(groups.values()).sort((a, b) => b.total - a.total)
}

export async function listFlexDespesaCategoriaMapeamentos(): Promise<FlexDespesaCategoriaMapeamento[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('despesa_categoria_mapeamentos')
    .select('id,origem,termo_origem,categoria_id,macrogrupo,status,observacao,categoria:categoria_id(nome,macrogrupo)')
    .eq('origem', 'ofx')
    .order('termo_origem', { ascending: true })
    .limit(500)

  if (error) return []
  return (data ?? []) as FlexDespesaCategoriaMapeamento[]
}

export async function listFlexExtratos(): Promise<FlexListRow[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('extratos')
    .select('id,banco,conta,periodo_inicio,periodo_fim,saldo_inicial,saldo_final,status,criado_em')
    .order('criado_em', { ascending: false })
    .limit(200)

  if (error) return []

  return ((data ?? []) as FlexExtrato[]).map((row) => ({
    id: row.id,
    title: text(row.banco, 'Extrato'),
    subtitle: [text(row.conta), row.periodo_inicio, row.periodo_fim].filter(Boolean).join(' - '),
    status: row.status,
    value: money(row.saldo_final ?? 0),
    meta: 'extrato',
    detailHref: `/modulos/flex/financeiro/extratos/${row.id}`,
    tone: statusTone(row.status),
  }))
}

export async function listFlexExtratoLancamentos(extratoId?: string, competencia?: string, status?: string): Promise<FlexListRow[]> {
  let query = admin()
    .schema('flex')
    .from('extrato_lancamentos')
    .select('id,extrato_id,categoria_id,previsao_despesa_id,data_lancamento,fornecedor,historico,descricao,valor,tipo,macrogrupo,status_classificacao,confianca,conciliado,categoria:categoria_id(nome,macrogrupo)')
    .order('data_lancamento', { ascending: false })
    .limit(500)

  if (extratoId) query = query.eq('extrato_id', extratoId)
  if (competencia) query = query.gte('data_lancamento', `${competencia.slice(0, 7)}-01`).lt('data_lancamento', addMonthsDate(competencia, 1))
  if (status === 'pendente') query = query.is('categoria_id', null)
  if (status === 'classificado') query = query.not('categoria_id', 'is', null)

  const { data, error } = await query
  if (error) return []

  return ((data ?? []) as any[]).map((row) => {
    const classificationStatus = row.categoria_id ? 'classificado' : 'pendente'

    return {
      id: String(row.id),
      title: text(row.fornecedor, text(row.descricao, text(row.historico, 'Lançamento'))),
      subtitle: [text(row.categoria?.nome, 'Sem categoria'), text(row.macrogrupo), text(row.data_lancamento)].filter(Boolean).join(' - '),
      status: row.conciliado ? 'conciliado' : classificationStatus,
      value: money(row.valor),
      meta: text(row.tipo, 'saida'),
      detailHref: `/modulos/flex/financeiro/despesas/${row.id}`,
      tone: row.conciliado ? 'success' : statusTone(classificationStatus),
    }
  })
}

export async function listFlexDespesas(competencia?: string, status?: string): Promise<FlexListRow[]> {
  const rows = await listFlexExtratoLancamentos(undefined, competencia, status)
  return rows.filter((row) => row.meta === 'saida')
}

export async function listFlexDespesasInline(competencia?: string, status?: string): Promise<FlexDespesaInlineRow[]> {
  let query = admin()
    .schema('flex')
    .from('extrato_lancamentos')
    .select('id,extrato_id,categoria_id,previsao_despesa_id,data_lancamento,fornecedor,historico,descricao,valor,tipo,macrogrupo,status_classificacao,confianca,conciliado,categoria:categoria_id(nome)')
    .eq('tipo', 'saida')
    .order('data_lancamento', { ascending: false })
    .order('valor', { ascending: false })
    .limit(500)

  if (competencia) query = query.gte('data_lancamento', `${competencia.slice(0, 7)}-01`).lt('data_lancamento', addMonthsDate(competencia, 1))
  if (status === 'pendente') query = query.is('categoria_id', null)
  if (status === 'classificado') query = query.not('categoria_id', 'is', null)

  const { data, error } = await query
  if (error) return []

  return ((data ?? []) as any[]).map((row) => ({
    id: String(row.id),
    extrato_id: String(row.extrato_id),
    categoria_id: row.categoria_id ? String(row.categoria_id) : null,
    categoria_nome: row.categoria?.nome ?? null,
    previsao_despesa_id: row.previsao_despesa_id ? String(row.previsao_despesa_id) : null,
    data_lancamento: String(row.data_lancamento),
    fornecedor: row.fornecedor ?? null,
    historico: row.historico ?? null,
    descricao: row.descricao ?? null,
    valor: Number(row.valor || 0),
    tipo: String(row.tipo ?? 'saida'),
    macrogrupo: row.macrogrupo ?? null,
    status_classificacao: row.categoria_id ? 'classificado' : 'pendente',
    confianca: row.confianca === null ? null : Number(row.confianca),
    conciliado: Boolean(row.conciliado),
  }))
}

export async function listFlexPrevisoesDespesas(competencia?: string): Promise<FlexListRow[]> {
  const competenciaDate = competencia ? `${competencia.slice(0, 7)}-01` : ''
  let query = admin()
    .schema('flex')
    .from('previsoes_despesa')
    .select('id,fornecedor,tipo_despesa,aliases,macrogrupo,valor_previsto,dia_previsto,competencia_inicio,competencia_fim,recorrente,status,origem,categoria:categoria_id(nome,macrogrupo)')
    .order('fornecedor', { ascending: true })
    .limit(500)

  if (competenciaDate) {
    query = query.eq('status', 'ativo').lte('competencia_inicio', competenciaDate).or(`competencia_fim.is.null,competencia_fim.gte.${competenciaDate}`)
  }

  const { data, error } = await query
  if (error) return []

  return ((data ?? []) as any[]).map((row) => {
    const diaVencimento = row.recorrente ? String(row.dia_previsto ?? 5).padStart(2, '0') : ''
    return {
      id: String(row.id),
      title: text(row.fornecedor, 'Fornecedor'),
      subtitle: [text(row.tipo_despesa, 'Despesa'), text(row.categoria?.nome), row.recorrente ? text(row.macrogrupo, text(row.categoria?.macrogrupo, text(row.origem, 'manual'))) : 'não recorrente', Array.isArray(row.aliases) && row.aliases.length ? `${row.aliases.length} alias` : ''].filter(Boolean).join(' - '),
      status: text(row.status, 'ativo'),
      value: money(row.valor_previsto),
      meta: diaVencimento ? `Vencimento: dia ${diaVencimento}` : 'Sem vencimento recorrente',
      tone: statusTone(text(row.status, 'ativo')),
      detailHref: `/modulos/flex/financeiro/previsao/${row.id}`,
    }
  })
}

export async function listFlexPrevisaoComissoesPagamentos(competencia?: string): Promise<FlexListRow[]> {
  const competenciaDate = competencia ? `${competencia.slice(0, 7)}-01` : ''
  let query = admin()
    .schema('flex')
    .from('pagamentos')
    .select('id,competencia,data_prevista,valor_bruto,valor_descontos,valor_liquido,status,comissao:comissao_id(id,competencia),colaborador:colaborador_id(security_usuario:usuario_id(nome))')
    .not('comissao_id', 'is', null)
    .order('data_prevista', { ascending: true, nullsFirst: false })
    .limit(500)

  if (competenciaDate) query = query.eq('competencia', competenciaDate)

  const { data, error } = await query
  if (error) return []

  return ((data ?? []) as any[]).map((row) => {
    const value = row.valor_liquido ?? (numberValue(row.valor_bruto) - numberValue(row.valor_descontos))
    const comissaoCompetencia = text(row.comissao?.competencia)
    return {
      id: `comissao-pagamento-${row.id}`,
      title: text(row.colaborador?.security_usuario?.nome, 'Colaborador'),
      subtitle: [
        'Comissão aprovada',
        comissaoCompetencia ? `receita ${monthLabel(comissaoCompetencia)}` : '',
      ].filter(Boolean).join(' - '),
      status: text(row.status, 'previsto'),
      value: money(value),
      meta: `Vencimento: dia ${String(row.data_prevista ?? '').slice(8, 10) || '20'}`,
      detailHref: row.comissao?.id ? `/modulos/flex/comissoes/${row.comissao.id}` : `/modulos/flex/pagamentos/${row.id}`,
      tone: statusTone(text(row.status, 'previsto')),
    }
  })
}

export async function listFlexPrevisoesDespesasRaw(): Promise<FlexPrevisaoDespesa[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('previsoes_despesa')
    .select('*')
    .order('fornecedor', { ascending: true })
    .limit(500)

  if (error) return []
  return (data ?? []) as FlexPrevisaoDespesa[]
}

export async function listFlexOrcamentos(): Promise<FlexListRow[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('orcamentos')
    .select('id,competencia,valor_previsto,origem,status,categoria:categoria_id(nome,macrogrupo)')
    .order('competencia', { ascending: false })
    .limit(500)

  if (error) return []

  return ((data ?? []) as any[]).map((row) => ({
    id: String(row.id),
    title: text(row.categoria?.nome, 'Orcamento'),
    subtitle: [text(row.categoria?.macrogrupo), text(row.competencia)].filter(Boolean).join(' - '),
    status: text(row.status, 'publicado'),
    value: money(row.valor_previsto),
    meta: text(row.origem, 'manual'),
    tone: statusTone(text(row.status, 'publicado')),
  }))
}

export async function listFlexValidacoes(competencia?: string): Promise<FlexListRow[]> {
  let query = admin()
    .schema('flex')
    .from('validacoes')
    .select('id,competencia,valor_previsto,valor_realizado,diferenca,status,tratamento,categoria:categoria_id(nome,macrogrupo)')
    .limit(500)

  if (competencia) query = query.eq('competencia', competencia)
  const { data, error } = await query.order('competencia', { ascending: false })

  if (error) return []

  return ((data ?? []) as any[]).map((row) => ({
    id: String(row.id),
    title: text(row.categoria?.nome, 'Validacao'),
    subtitle: [text(row.categoria?.macrogrupo), text(row.competencia), text(row.tratamento)].filter(Boolean).join(' - '),
    status: text(row.status, 'pendente'),
    value: money(row.diferenca),
    meta: `previsto ${money(row.valor_previsto)} / real ${money(row.valor_realizado)}`,
    detailHref: row.competencia ? `/modulos/flex/financeiro/despesas?competencia=${String(row.competencia).slice(0, 7)}` : '/modulos/flex/financeiro/despesas',
    tone: statusTone(text(row.status, 'pendente')),
  }))
}

export async function listFlexValidacaoItens(competencia?: string): Promise<FlexListRow[]> {
  const rows = await listFlexValidacaoItensRaw(competencia)

  return rows.map((row) => ({
    id: row.id,
    title: text(row.fornecedor, text(row.descricao, 'Validacao')),
    subtitle: [
      text(row.tipo, 'pendência'),
      row.data_prevista ? `previsto ${dateText(row.data_prevista)}` : '',
      row.data_realizada ? `real ${dateText(row.data_realizada)}` : '',
    ].filter(Boolean).join(' - '),
    status: text(row.status, 'pendente'),
    value: money(row.diferenca ?? row.valor_realizado ?? row.valor_previsto ?? 0),
    meta: `previsto ${money(row.valor_previsto ?? 0)} / real ${money(row.valor_realizado ?? 0)}`,
    detailHref: row.competencia ? `/modulos/flex/financeiro/despesas?competencia=${String(row.competencia).slice(0, 7)}#item-${row.id}` : '/modulos/flex/financeiro/despesas',
    tone: statusTone(text(row.status, 'pendente')),
  }))
}

export async function listFlexValidacaoItensRaw(competencia?: string, status?: string): Promise<FlexValidacaoItem[]> {
  let query = admin()
    .schema('flex')
    .from('validacao_itens')
    .select('*')
    .limit(500)

  if (competencia) query = query.eq('competencia', competencia)
  if (status) query = query.eq('status', status)
  const { data, error } = await query.order('competencia', { ascending: false }).order('criado_em', { ascending: false })

  if (error) return []
  return (data ?? []) as FlexValidacaoItem[]
}

export async function listFlexSugestoes(): Promise<FlexListRow[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('sugestoes')
    .select('id,tipo,competencia,titulo,descricao,status,criado_em')
    .order('criado_em', { ascending: false })
    .limit(500)

  if (error) return []

  return ((data ?? []) as any[]).map((row) => ({
    id: String(row.id),
    title: text(row.titulo, 'Sugestao'),
    subtitle: text(row.descricao, text(row.competencia)),
    status: text(row.status, 'pendente'),
    value: text(row.tipo, 'ajuste'),
    meta: row.competencia ? text(row.competencia) : new Date(row.criado_em).toLocaleDateString('pt-BR'),
    detailHref: `/modulos/flex/financeiro/sugestoes#sugestao-${row.id}`,
    tone: statusTone(text(row.status, 'pendente')),
  }))
}

export async function listFlexReceitaPendencias(): Promise<FlexListRow[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('receitas')
    .select('id,cliente,descricao,competencia,valor_recebido,categoria_id,colaborador_id,time_id,metadata')
    .order('competencia', { ascending: false })
    .limit(1000)

  if (error) return []

  return ((data ?? []) as any[]).filter((row) => !row.categoria_id || (!row.colaborador_id && !row.time_id)).map((row) => {
    const semCategoria = !row.categoria_id
    const semDestino = !row.colaborador_id && !row.time_id
    const vendedor = text(row.metadata?.vendedor_omie)

    return {
      id: `receita-pendencia-${row.id}`,
      title: semCategoria ? 'Classificar receita' : 'Mapear comissão',
      subtitle: [
        text(row.cliente, 'Receita'),
        text(row.descricao, 'Sem categoria Omie'),
        vendedor ? `vendedor ${vendedor}` : 'sem vendedor Omie',
      ].filter(Boolean).join(' - '),
      status: semCategoria && semDestino ? 'classificacao' : semCategoria ? 'categoria' : 'mapeamento',
      value: money(row.valor_recebido),
      meta: monthLabel(row.competencia),
      detailHref: `/modulos/flex/financeiro/receitas/${row.id}`,
      tone: 'warning' as const,
    }
  })
}

export async function getFlexFinanceiroResumo(): Promise<FlexDashboardData> {
  const [receitas, despesas, extratos, orcamentos, validacoes, validacaoItens, sugestoes, pendenciasReceitas] = await Promise.all([
    listFlexReceitas(),
    listFlexDespesas(),
    listFlexExtratos(),
    listFlexOrcamentos(),
    listFlexValidacoes(),
    listFlexValidacaoItens(),
    listFlexSugestoes(),
    listFlexReceitaPendencias(),
  ])

  const sumRows = (rows: FlexListRow[]) => rows.reduce((sum, row) => {
    const normalized = row.value.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.')
    const parsed = Number(normalized)
    return sum + (Number.isFinite(parsed) ? parsed : 0)
  }, 0)

  const validacoesPendentes = [...validacoes, ...validacaoItens].filter((row) => row.status.toLowerCase().includes('pendente')).length
  const sugestoesPendentes = sugestoes.filter((row) => row.status.toLowerCase().includes('pendente')).length
  const pendenciasDespesas = [...validacaoItens.filter((row) => row.tone === 'warning'), ...validacoes.filter((row) => row.tone === 'warning'), ...sugestoes.filter((row) => row.tone === 'warning')]

  return {
    cards: [
      { label: 'Receitas', value: money(sumRows(receitas)), hint: `${receitas.length} registro(s)`, tone: receitas.length ? 'success' : 'primary' },
      { label: 'Despesas', value: money(sumRows(despesas)), hint: `${despesas.length} saida(s)`, tone: despesas.length ? 'warning' : 'primary' },
      { label: 'Extratos', value: String(extratos.length), hint: 'arquivos processados', tone: extratos.length ? 'success' : 'primary' },
      { label: 'Orçamentos', value: String(orcamentos.length), hint: 'previsões publicadas', tone: orcamentos.length ? 'success' : 'warning' },
      { label: 'Validações', value: String(validacoesPendentes), hint: 'pendentes', tone: validacoesPendentes ? 'warning' : 'success' },
      { label: 'Sugestoes', value: String(sugestoesPendentes), hint: 'pendentes', tone: sugestoesPendentes ? 'warning' : 'success' },
    ],
    pendencias: [...pendenciasReceitas, ...pendenciasDespesas].slice(0, 8),
    pendenciasReceitas,
    pendenciasDespesas,
  }
}

export async function getFlexFluxoCaixaCockpit(competencia?: string): Promise<FlexCashFlowData> {
  const competenciaMes = competencia && /^\d{4}-\d{2}$/.test(competencia) ? competencia : (await getFlexCompetenciaOperacional()).competenciaMes
  const competenciaDate = `${competenciaMes}-01`
  const nextCompetenciaDate = addMonthsDate(competenciaDate, 1)
  const today = new Date().toISOString().slice(0, 10)
  const supabase = admin()

  const [previsoes, lancamentos, pagamentos] = await Promise.all([
    supabase
      .schema('flex')
      .from('previsoes_despesa')
      .select('id,fornecedor,tipo_despesa,valor_previsto,dia_previsto,macrogrupo,status,categoria:categoria_id(nome,macrogrupo)')
      .eq('status', 'ativo')
      .lte('competencia_inicio', competenciaDate)
      .or(`competencia_fim.is.null,competencia_fim.gte.${competenciaDate}`)
      .limit(500),
    supabase
      .schema('flex')
      .from('extrato_lancamentos')
      .select('id,previsao_despesa_id,data_lancamento,fornecedor,descricao,historico,valor,tipo,status_classificacao,conciliado,categoria:categoria_id(nome,macrogrupo)')
      .eq('tipo', 'saida')
      .gte('data_lancamento', competenciaDate)
      .lt('data_lancamento', nextCompetenciaDate)
      .order('data_lancamento', { ascending: false })
      .limit(1000),
    supabase
      .schema('flex')
      .from('pagamentos')
      .select('id,competencia,descricao,data_prevista,data_pagamento,valor_liquido,valor_bruto,valor_descontos,status,origem,comissao_id,colaborador:colaborador_id(security_usuario:usuario_id(nome))')
      .eq('competencia', competenciaDate)
      .order('data_prevista', { ascending: true, nullsFirst: false })
      .limit(500),
  ])

  const previsaoRows = previsoes.error ? [] : ((previsoes.data ?? []) as any[])
  const lancamentoRows = lancamentos.error ? [] : ((lancamentos.data ?? []) as any[])
  const pagamentoRows = pagamentos.error ? [] : ((pagamentos.data ?? []) as any[])
  const lancamentosPorPrevisao = new Map<string, any[]>()

  for (const row of lancamentoRows) {
    const previsaoId = text(row.previsao_despesa_id)
    if (!previsaoId) continue
    const current = lancamentosPorPrevisao.get(previsaoId) ?? []
    current.push(row)
    lancamentosPorPrevisao.set(previsaoId, current)
  }

  const previstas: FlexListRow[] = previsaoRows.map((row) => {
    const linked = lancamentosPorPrevisao.get(String(row.id)) ?? []
    const previsto = numberValue(row.valor_previsto)
    const pago = sumMoneyRows(linked, 'valor')
    const falta = Math.max(previsto - pago, 0)
    const dataPrevista = paymentDateForCompetencia(competenciaDate, numberValue(row.dia_previsto) || 5)
    const status = pago >= previsto && previsto > 0 ? 'conciliado' : pago > 0 ? 'parcial' : dataPrevista < today ? 'atrasado' : 'previsto'

    return {
      id: `previsao-caixa-${row.id}`,
      title: text(row.fornecedor, 'Despesa prevista'),
      subtitle: [text(row.tipo_despesa, 'Despesa'), text(row.categoria?.nome), `venc. ${dateText(dataPrevista)}`].filter(Boolean).join(' - '),
      status,
      value: money(previsto),
      meta: `Pago ${money(pago)} / Falta ${money(falta)}`,
      detailHref: `/modulos/flex/financeiro/previsao/${row.id}`,
      tone: status === 'conciliado' ? 'success' : status === 'atrasado' ? 'danger' : status === 'parcial' ? 'warning' : 'primary',
    }
  })

  const pagamentosPrevistos: FlexListRow[] = pagamentoRows.map((row) => {
    const previsto = numberValue(row.valor_liquido ?? (numberValue(row.valor_bruto) - numberValue(row.valor_descontos)))
    const pago = ['pago', 'conciliado'].includes(text(row.status).toLowerCase()) ? previsto : 0
    const falta = Math.max(previsto - pago, 0)
    const dataPrevista = text(row.data_prevista)
    const status = pago >= previsto && previsto > 0 ? 'pago' : dataPrevista && dataPrevista < today ? 'atrasado' : text(row.status, 'previsto')

    return {
      id: `pagamento-caixa-${row.id}`,
      title: text(row.colaborador?.security_usuario?.nome, text(row.descricao, 'Pagamento previsto')),
      subtitle: [row.comissao_id ? 'Comissão aprovada' : text(row.origem, 'Pagamento'), dataPrevista ? `venc. ${dateText(dataPrevista)}` : 'sem data prevista'].filter(Boolean).join(' - '),
      status,
      value: money(previsto),
      meta: `Pago ${money(pago)} / Falta ${money(falta)}`,
      detailHref: row.comissao_id ? `/modulos/flex/comissoes/${row.comissao_id}` : `/modulos/flex/pagamentos/${row.id}`,
      tone: status === 'pago' || status === 'conciliado' ? 'success' : status === 'atrasado' ? 'danger' : 'primary',
    }
  })

  const movimentos: FlexListRow[] = lancamentoRows.map((row) => {
    const conciliado = Boolean(row.previsao_despesa_id)
    return {
      id: `movimento-caixa-${row.id}`,
      title: text(row.fornecedor, text(row.descricao, text(row.historico, 'Saída do extrato'))),
      subtitle: [conciliado ? 'Conciliada com previsão' : 'Fora da previsão', text(row.categoria?.nome), dateText(row.data_lancamento)].filter(Boolean).join(' - '),
      status: conciliado ? 'conciliado' : text(row.status_classificacao, 'sem previsão'),
      value: money(Math.abs(numberValue(row.valor))),
      meta: text(row.previsao_despesa_id) ? 'prevista' : 'não planejada',
      detailHref: `/modulos/flex/financeiro/despesas/${row.id}`,
      tone: conciliado ? 'success' : 'warning',
    }
  })

  const todasPrevistas = [...previstas, ...pagamentosPrevistos]
  const abertas = todasPrevistas
    .filter((row) => !['conciliado', 'pago'].includes(row.status))
    .sort((a, b) => a.status === 'atrasado' && b.status !== 'atrasado' ? -1 : b.status === 'atrasado' && a.status !== 'atrasado' ? 1 : a.title.localeCompare(b.title))
    .slice(0, 12)

  const previstoTotal = previsaoRows.reduce((sum, row) => sum + numberValue(row.valor_previsto), 0)
    + pagamentoRows.reduce((sum, row) => sum + numberValue(row.valor_liquido ?? (numberValue(row.valor_bruto) - numberValue(row.valor_descontos))), 0)
  const pagoExtratoTotal = sumMoneyRows(lancamentoRows, 'valor')
  const pagamentoPagoTotal = pagamentoRows
    .filter((row) => ['pago', 'conciliado'].includes(text(row.status).toLowerCase()))
    .reduce((sum, row) => sum + numberValue(row.valor_liquido ?? (numberValue(row.valor_bruto) - numberValue(row.valor_descontos))), 0)
  const conciliadoTotal = sumMoneyRows(lancamentoRows.filter((row) => row.previsao_despesa_id), 'valor')
  const foraPrevisaoTotal = sumMoneyRows(lancamentoRows.filter((row) => !row.previsao_despesa_id), 'valor')
  const faltaTotal = Math.max(previstoTotal - conciliadoTotal - pagamentoPagoTotal, 0)

  return {
    competenciaMes,
    label: monthLabel(competenciaDate),
    cards: [
      { label: 'Previsto', value: money(previstoTotal), hint: `${todasPrevistas.length} item(ns)`, tone: 'primary' },
      { label: 'Pago no mês', value: money(pagoExtratoTotal + pagamentoPagoTotal), hint: `${lancamentoRows.length} saída(s) no extrato`, tone: pagoExtratoTotal || pagamentoPagoTotal ? 'success' : 'primary' },
      { label: 'Conciliado', value: money(conciliadoTotal), hint: 'extrato vinculado à previsão', tone: conciliadoTotal ? 'success' : 'warning' },
      { label: 'Falta pagar', value: money(faltaTotal), hint: `${abertas.length} item(ns) em aberto`, tone: faltaTotal ? 'warning' : 'success' },
      { label: 'Fora da previsão', value: money(foraPrevisaoTotal), hint: 'saídas sem vínculo', tone: foraPrevisaoTotal ? 'danger' : 'success' },
    ],
    previstas: todasPrevistas.slice(0, 14),
    abertas,
    movimentos: movimentos.slice(0, 14),
  }
}

export async function getFlexCompetenciaOperacional() {
  const { data, error } = await admin()
    .schema('flex')
    .from('fechamentos')
    .select('id,competencia,status,saldo_operacional,pendencias_total,fechado_em')
    .order('competencia', { ascending: false })
    .limit(20)

  if (error || !data?.length) {
    const competencia = previousMonthDate()
    return {
      id: null as string | null,
      competencia,
      competenciaMes: competencia.slice(0, 7),
      label: monthLabel(competencia),
      status: 'aberto',
      pendenciasTotal: 0,
      saldoOperacional: 0,
      fechadoEm: null as string | null,
      detailHref: '/modulos/flex/fechamentos',
    }
  }

  const rows = data as Array<Record<string, any>>
  const row = rows.find((item) => String(item.status) !== 'fechado') ?? rows[0]
  const competencia = text(row.competencia, previousMonthDate())

  return {
    id: text(row.id) || null,
    competencia,
    competenciaMes: competencia.slice(0, 7),
    label: monthLabel(competencia),
    status: text(row.status, 'aberto'),
    pendenciasTotal: numberValue(row.pendencias_total),
    saldoOperacional: numberValue(row.saldo_operacional),
    fechadoEm: text(row.fechado_em) || null,
    detailHref: row.id ? `/modulos/flex/fechamentos/${row.id}` : '/modulos/flex/fechamentos',
  }
}

export async function listFlexOperadorTarefas(): Promise<FlexListRow[]> {
  const supabase = admin()
  const [receitas, despesas, validacoes, validacaoItens, comissoes, pagamentos, comissoesAprovadas, pagamentosComissao] = await Promise.all([
    supabase
      .schema('flex')
      .from('receitas')
      .select('id,cliente,competencia,valor_recebido,categoria_id,colaborador_id,time_id,status')
      .is('categoria_id', null)
      .order('competencia', { ascending: false })
      .limit(50),
    supabase
      .schema('flex')
      .from('extrato_lancamentos')
      .select('id,descricao,historico,data_lancamento,valor,tipo,status_classificacao')
      .eq('tipo', 'saida')
      .eq('status_classificacao', 'pendente')
      .order('data_lancamento', { ascending: false })
      .limit(50),
    supabase
      .schema('flex')
      .from('validacoes')
      .select('id,competencia,valor_previsto,valor_realizado,diferenca,status,categoria:categoria_id(nome,macrogrupo)')
      .eq('status', 'pendente')
      .order('competencia', { ascending: false })
      .limit(50),
    supabase
      .schema('flex')
      .from('validacao_itens')
      .select('id,competencia,tipo,fornecedor,descricao,valor_previsto,valor_realizado,diferenca,status')
      .eq('status', 'pendente')
      .order('competencia', { ascending: false })
      .limit(50),
    supabase
      .schema('flex')
      .from('comissoes')
      .select('id,competencia,valor_comissao,status,colaborador:colaborador_id(security_usuario:usuario_id(nome)),tipo:tipo_comissao_id(nome)')
      .in('status', ['calculada', 'em_conferencia', 'rejeitada'])
      .order('competencia', { ascending: false })
      .limit(50),
    supabase
      .schema('flex')
      .from('pagamentos')
      .select('id,competencia,descricao,data_prevista,valor_liquido,status,origem,colaborador:colaborador_id(security_usuario:usuario_id(nome))')
      .in('status', ['previsto', 'em_processamento'])
      .order('data_prevista', { ascending: true })
      .limit(50),
    supabase
      .schema('flex')
      .from('comissoes')
      .select('id,competencia,valor_comissao,status,colaborador:colaborador_id(security_usuario:usuario_id(nome))')
      .eq('status', 'aprovada')
      .order('competencia', { ascending: false })
      .limit(100),
    supabase
      .schema('flex')
      .from('pagamentos')
      .select('comissao_id')
      .not('comissao_id', 'is', null)
      .limit(500),
  ])

  const rows: FlexListRow[] = []

  for (const result of [receitas, despesas, validacoes, validacaoItens, comissoes, pagamentos, comissoesAprovadas, pagamentosComissao]) {
    if (result.error) continue
  }

  for (const row of (receitas.data ?? []) as any[]) {
    rows.push({
      id: `receita-${row.id}`,
      title: 'Categorizar receita',
      subtitle: `${text(row.cliente, 'Receita')} - ${text(row.competencia)}`,
      status: 'pendente',
      value: money(row.valor_recebido),
      meta: 'Receitas',
      detailHref: '/modulos/flex/financeiro/receitas',
      tone: 'warning',
    })
  }

  for (const row of (despesas.data ?? []) as any[]) {
    rows.push({
      id: `despesa-${row.id}`,
      title: 'Classificar despesa',
      subtitle: `${text(row.descricao, text(row.historico, 'Lançamento'))} - ${dateText(row.data_lancamento)}`,
      status: 'pendente',
      value: money(row.valor),
      meta: 'Despesas',
      detailHref: '/modulos/flex/financeiro/despesas',
      tone: 'warning',
    })
  }

  for (const row of (validacoes.data ?? []) as any[]) {
    rows.push({
      id: `validacao-${row.id}`,
      title: 'Tratar divergência',
      subtitle: `${text(row.categoria?.nome, 'Previsão mensal')} - ${text(row.competencia)}`,
      status: 'decisão',
      value: money(row.diferenca),
      meta: 'Validação',
      detailHref: '/modulos/flex/financeiro/validacao',
      tone: 'warning',
    })
  }

  for (const row of (validacaoItens.data ?? []) as any[]) {
    rows.push({
      id: `validacao-item-${row.id}`,
      title: 'Tratar despesa',
      subtitle: `${text(row.fornecedor, text(row.descricao, 'Despesa'))} - ${text(row.tipo, 'pendência')}`,
      status: 'decisao',
      value: money(row.diferenca ?? row.valor_realizado ?? row.valor_previsto ?? 0),
      meta: 'Validação',
      detailHref: '/modulos/flex/financeiro/validacao',
      tone: 'warning',
    })
  }

  for (const row of (comissoes.data ?? []) as any[]) {
    rows.push({
      id: `comissao-${row.id}`,
      title: 'Aprovar comissão',
      subtitle: `${text(row.colaborador?.security_usuario?.nome, 'Colaborador')} - ${text(row.competencia)}`,
      status: text(row.status, 'calculada'),
      value: money(row.valor_comissao),
      meta: 'Comissões',
      detailHref: '/modulos/flex/comissoes/aprovacao',
      tone: 'warning',
    })
  }

  for (const row of (pagamentos.data ?? []) as any[]) {
    const overdue = row.data_prevista && row.data_prevista < new Date().toISOString().slice(0, 10)
    rows.push({
      id: `pagamento-${row.id}`,
      title: overdue ? 'Pagamento atrasado' : 'Processar pagamento',
      subtitle: `${text(row.colaborador?.security_usuario?.nome, text(row.descricao, 'Pagamento'))} - ${dateText(row.data_prevista)}`,
      status: overdue ? 'atrasado' : text(row.status, 'previsto'),
      value: money(row.valor_liquido),
      meta: 'Calendário',
      detailHref: `/modulos/flex/pagamentos/${row.id}`,
      tone: overdue ? 'danger' : 'warning',
    })
  }

  const comissoesComPagamento = new Set(((pagamentosComissao.data ?? []) as any[]).map((row) => String(row.comissao_id)))
  for (const row of (comissoesAprovadas.data ?? []) as any[]) {
    if (comissoesComPagamento.has(String(row.id))) continue
    rows.push({
      id: `comissao-calendario-${row.id}`,
      title: 'Lançar comissão no calendário',
      subtitle: `${text(row.colaborador?.security_usuario?.nome, 'Colaborador')} - ${text(row.competencia)}`,
      status: 'aprovada',
      value: money(row.valor_comissao),
      meta: 'Comissões',
      detailHref: '/modulos/flex/pagamentos',
      tone: 'primary',
    })
  }

  return rows.slice(0, 20)
}

export async function listFlexCalendarioPagamentos(competencia?: string): Promise<FlexListRow[]> {
  const competenciaDate = competencia ? `${competencia.slice(0, 7)}-01` : ''
  let query = admin()
    .schema('flex')
    .from('pagamentos')
    .select('id,competencia,descricao,data_prevista,data_pagamento,valor_liquido,valor_bruto,valor_descontos,status,origem,agenda_id,comissao_id,colaborador:colaborador_id(security_usuario:usuario_id(nome)),tipo:tipo_pagamento_id(nome)')
    .order('data_prevista', { ascending: true, nullsFirst: false })
    .order('competencia', { ascending: false })
    .limit(500)

  if (competenciaDate) query = query.eq('competencia', competenciaDate)

  const { data, error } = await query
  if (error) return []

  const today = new Date().toISOString().slice(0, 10)
  return ((data ?? []) as any[]).map((row) => {
    const value = row.valor_liquido ?? (numberValue(row.valor_bruto) - numberValue(row.valor_descontos))
    const overdue = row.data_prevista && row.data_prevista < today && ['previsto', 'em_processamento'].includes(String(row.status))
    const origem = row.comissao_id ? 'comissão' : row.agenda_id ? 'agenda' : text(row.origem, 'manual')
    return {
      id: String(row.id),
      title: text(row.colaborador?.security_usuario?.nome, text(row.descricao, 'Pagamento')),
      subtitle: [text(row.tipo?.nome, text(row.descricao, 'Pagamento')), dateText(row.data_prevista), row.data_pagamento ? `pago ${dateText(row.data_pagamento)}` : ''].filter(Boolean).join(' - '),
      status: overdue ? 'atrasado' : text(row.status, 'previsto'),
      value: money(value),
      meta: `${origem} - ${text(row.competencia)}`,
      detailHref: `/modulos/flex/pagamentos/${row.id}`,
      tone: overdue ? 'danger' : statusTone(text(row.status, 'previsto')),
    }
  })
}

export async function listFlexPrevisaoCalendarioRows(competencia: string): Promise<FlexListRow[]> {
  const competenciaDate = `${competencia.slice(0, 7)}-01`
  const supabase = admin()
  const [previsoes, pagamentos, agendas, pagamentosAgendas, colaboradores, comissoes, pagamentosComissao] = await Promise.all([
    listFlexPrevisoesDespesas(competenciaDate),
    listFlexCalendarioPagamentos(competenciaDate),
    supabase
      .schema('flex')
      .from('pagamento_agendas')
      .select('id,colaborador_id,descricao,dia_previsto,valor_bruto,valor_descontos,inicio_competencia,fim_competencia,status,tipo:tipo_pagamento_id(nome),colaborador:colaborador_id(security_usuario:usuario_id(nome))')
      .eq('status', 'ativo')
      .lte('inicio_competencia', competenciaDate)
      .or(`fim_competencia.is.null,fim_competencia.gte.${competenciaDate}`)
      .limit(500),
    supabase
      .schema('flex')
      .from('pagamentos')
      .select('agenda_id')
      .eq('competencia', competenciaDate)
      .not('agenda_id', 'is', null),
    supabase
      .schema('flex')
      .from('colaboradores')
      .select('id,usuario_id,status,salario,participacao_honorarios,pro_labore,ajuda_custo,outros_vencimentos,beneficio_valor')
      .eq('status', 'ativo')
      .limit(500),
    supabase
      .schema('flex')
      .from('comissoes')
      .select('id,competencia,valor_comissao,status,colaborador:colaborador_id(security_usuario:usuario_id(nome))')
      .eq('competencia', competenciaDate)
      .eq('status', 'aprovada')
      .limit(500),
    supabase
      .schema('flex')
      .from('pagamentos')
      .select('comissao_id')
      .eq('competencia', competenciaDate)
      .not('comissao_id', 'is', null),
  ])

  const generatedAgendaIds = new Set(((pagamentosAgendas.data ?? []) as any[]).map((row) => String(row.agenda_id)))
  const generatedComissaoIds = new Set(((pagamentosComissao.data ?? []) as any[]).map((row) => String(row.comissao_id)))
  const agendaKeys = new Set(((agendas.data ?? []) as any[]).map((row) => `${row.colaborador_id}:${row.descricao}`))
  const colaboradorRowsRaw = colaboradores.error ? [] : (colaboradores.data ?? []) as any[]
  const usuarioIds = Array.from(new Set(colaboradorRowsRaw.map((row) => String(row.usuario_id ?? '')).filter(Boolean)))
  const usuarios = usuarioIds.length
    ? await supabase.schema('security').from('usuarios').select('id,nome').in('id', usuarioIds)
    : { data: [] as any[], error: null }
  const usuariosById = new Map(((usuarios.data ?? []) as any[]).map((row) => [String(row.id), row]))
  const agendaRows = agendas.error ? [] : ((agendas.data ?? []) as any[])
    .filter((row) => !generatedAgendaIds.has(String(row.id)))
    .map((row) => {
      const value = numberValue(row.valor_bruto) - numberValue(row.valor_descontos)
      return {
        id: `agenda-${row.id}`,
        title: text(row.colaborador?.security_usuario?.nome, text(row.descricao, 'Pagamento fixo')),
        subtitle: [text(row.tipo?.nome, text(row.descricao, 'Pagamento')), `previsto ${dateText(paymentDateForCompetencia(competenciaDate, row.dia_previsto ?? 5))}`].filter(Boolean).join(' - '),
        status: 'previsto',
        value: money(value),
        meta: `agenda - ${monthLabel(competenciaDate)}`,
        detailHref: `/modulos/flex/pagamentos/agenda/${row.id}`,
        tone: 'primary' as const,
      }
    })
  const colaboradorRows = colaboradorRowsRaw.flatMap((row) => {
    const usuario = usuariosById.get(String(row.usuario_id))
    const items = [
      { descricao: 'Salário - cadastro colaborador', nome: 'Salário', valor: row.salario },
      { descricao: 'Participação em honorários - cadastro colaborador', nome: 'Participação em honorários', valor: row.participacao_honorarios },
      { descricao: 'Pró-labore - cadastro colaborador', nome: 'Pró-labore', valor: row.pro_labore },
      { descricao: 'Ajuda de custo - cadastro colaborador', nome: 'Ajuda de custo', valor: row.ajuda_custo },
      { descricao: 'Benefício - cadastro colaborador', nome: 'Benefício', valor: row.beneficio_valor },
      { descricao: 'Outros vencimentos - cadastro colaborador', nome: 'Outros vencimentos', valor: row.outros_vencimentos },
    ]

    return items
      .filter((item) => numberValue(item.valor) > 0 && !agendaKeys.has(`${row.id}:${item.descricao}`))
      .map((item) => ({
        id: `colaborador-${row.id}-${item.descricao}`,
        title: text(usuario?.nome, 'Colaborador'),
        subtitle: `${item.nome} - previsto ${dateText(paymentDateForCompetencia(competenciaDate, 5))}`,
        status: 'previsto',
        value: money(item.valor),
        meta: `colaborador - ${monthLabel(competenciaDate)}`,
        detailHref: `/modulos/flex/colaboradores/${row.id}`,
        tone: 'primary' as const,
      }))
  })
  const comissaoRows = comissoes.error ? [] : ((comissoes.data ?? []) as any[])
    .filter((row) => !generatedComissaoIds.has(String(row.id)))
    .map((row) => ({
      id: `comissao-${row.id}`,
      title: text(row.colaborador?.security_usuario?.nome, 'Comissão aprovada'),
      subtitle: `Comissão aprovada - previsto ${dateText(paymentDateForCompetencia(competenciaDate, 20))}`,
      status: 'previsto',
      value: money(row.valor_comissao),
      meta: `comissão - ${monthLabel(competenciaDate)}`,
      detailHref: `/modulos/flex/comissoes/${row.id}`,
      tone: 'primary' as const,
    }))
  const previsaoRows = previsoes.map((row) => ({
    ...row,
    id: `previsao-${row.id}`,
    subtitle: `${row.subtitle} - previsto ${dateText(paymentDateForCompetencia(competenciaDate, Number(row.subtitle.match(/dia (\d+)/)?.[1] ?? 5)))}`,
    meta: `previsao - ${monthLabel(competenciaDate)}`,
  }))

  return [...previsaoRows, ...agendaRows, ...colaboradorRows, ...pagamentos, ...comissaoRows].sort((a, b) => {
    const dateA = a.subtitle.match(/\d{2}\/\d{2}\/\d{4}/)?.[0]?.split('/').reverse().join('-') ?? '9999-12-31'
    const dateB = b.subtitle.match(/\d{2}\/\d{2}\/\d{4}/)?.[0]?.split('/').reverse().join('-') ?? '9999-12-31'
    return dateA.localeCompare(dateB) || a.title.localeCompare(b.title)
  })
}

export async function getFlexCalendarioResumo(competencia?: string): Promise<FlexDashboardData> {
  const rows = await listFlexCalendarioPagamentos(competencia)
  const total = rows.reduce((sum, row) => {
    const normalized = row.value.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.')
    const parsed = Number(normalized)
    return sum + (Number.isFinite(parsed) ? parsed : 0)
  }, 0)
  const atrasados = rows.filter((row) => row.status === 'atrasado').length
  const abertos = rows.filter((row) => ['previsto', 'em_processamento', 'atrasado'].includes(row.status)).length
  const pagos = rows.filter((row) => ['pago', 'conciliado'].includes(row.status)).length
  const comissoes = rows.filter((row) => row.meta.includes('comissão')).length

  return {
    cards: [
      { label: 'Calendário', value: String(rows.length), hint: 'lançamentos', tone: rows.length ? 'success' : 'primary' },
      { label: 'Valor previsto', value: money(total), hint: 'total listado', tone: rows.length ? 'primary' : 'warning' },
      { label: 'Em aberto', value: String(abertos), hint: 'previstos/processando', tone: abertos ? 'warning' : 'success' },
      { label: 'Pagos', value: String(pagos), hint: 'pagos/conciliados', tone: pagos ? 'success' : 'primary' },
      { label: 'Atrasados', value: String(atrasados), hint: 'exigem ação', tone: atrasados ? 'danger' : 'success' },
      { label: 'Comissões', value: String(comissoes), hint: 'origem comissão', tone: comissoes ? 'primary' : 'success' },
    ],
    pendencias: rows.filter((row) => ['atrasado', 'previsto', 'em_processamento'].includes(row.status)).slice(0, 8),
    pendenciasReceitas: [],
    pendenciasDespesas: [],
  }
}

export async function listFlexComissoes(): Promise<FlexListRow[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('comissoes')
    .select('id,competencia,valor_base,percentual,valor_comissao,status,origem,observacao,colaborador:colaborador_id(security_usuario:usuario_id(nome,email)),tipo:tipo_comissao_id(nome),receita:receita_id(cliente)')
    .order('competencia', { ascending: false })
    .order('atualizado_em', { ascending: false })
    .limit(500)

  if (error) return []

  return ((data ?? []) as any[]).map((row) => ({
    id: String(row.id),
    title: text(row.colaborador?.security_usuario?.nome, 'Colaborador'),
    subtitle: [text(row.tipo?.nome, 'Comissão'), text(row.receita?.cliente), text(row.competencia)].filter(Boolean).join(' - '),
    status: text(row.status, 'calculada'),
    value: money(row.valor_comissao),
    meta: `${numberValue(row.percentual).toLocaleString('pt-BR')}%`,
    detailHref: `/modulos/flex/comissoes/${row.id}`,
    tone: statusTone(text(row.status, 'calculada')),
  }))
}

export async function listFlexComissoesOperacionais(competencia?: string, status?: string): Promise<FlexComissaoListItem[]> {
  let query = admin()
    .schema('flex')
    .from('comissoes')
    .select('id,competencia,valor_base,percentual,valor_comissao,status,origem,observacao,colaborador_id,tipo_comissao_id,receita_id')
    .order('competencia', { ascending: false })
    .order('atualizado_em', { ascending: false })
    .limit(1000)

  if (competencia) query = query.eq('competencia', competencia)
  if (status && status !== 'todos') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return []

  const rows = (data ?? []) as any[]
  const colaboradorIds = Array.from(new Set(rows.map((row) => String(row.colaborador_id ?? '')).filter(Boolean)))
  const tipoIds = Array.from(new Set(rows.map((row) => String(row.tipo_comissao_id ?? '')).filter(Boolean)))
  const receitaIds = Array.from(new Set(rows.map((row) => String(row.receita_id ?? '')).filter(Boolean)))

  const [colaboradores, tipos, receitas] = await Promise.all([
    colaboradorIds.length
      ? admin().schema('flex').from('colaboradores').select('id,usuario_id').in('id', colaboradorIds)
      : { data: [], error: null },
    tipoIds.length
      ? admin().schema('flex').from('tipos_comissao').select('id,nome').in('id', tipoIds)
      : { data: [], error: null },
    receitaIds.length
      ? admin().schema('flex').from('receitas').select('id,cliente').in('id', receitaIds)
      : { data: [], error: null },
  ])

  if (colaboradores.error || tipos.error || receitas.error) return []

  const colaboradorRows = (colaboradores.data ?? []) as any[]
  const usuarioIds = Array.from(new Set(colaboradorRows.map((row) => String(row.usuario_id ?? '')).filter(Boolean)))
  const usuarios = usuarioIds.length
    ? await admin().schema('security').from('usuarios').select('id,nome').in('id', usuarioIds)
    : { data: [], error: null }

  if (usuarios.error) return []

  const usuarioNomePorId = new Map(((usuarios.data ?? []) as any[]).map((row) => [String(row.id), text(row.nome, 'Colaborador')]))
  const colaboradorNomePorId = new Map(colaboradorRows.map((row) => [String(row.id), usuarioNomePorId.get(String(row.usuario_id)) ?? 'Colaborador']))
  const tipoNomePorId = new Map(((tipos.data ?? []) as any[]).map((row) => [String(row.id), text(row.nome, 'Comissão')]))
  const receitaNomePorId = new Map(((receitas.data ?? []) as any[]).map((row) => [String(row.id), text(row.cliente, 'Receita')]))

  return rows.map((row) => ({
    id: String(row.id),
    competencia: text(row.competencia),
    colaborador: colaboradorNomePorId.get(String(row.colaborador_id)) ?? 'Colaborador',
    receita: receitaNomePorId.get(String(row.receita_id)) ?? 'Receita',
    tipo: tipoNomePorId.get(String(row.tipo_comissao_id)) ?? 'Comissão',
    valor_base: numberValue(row.valor_base),
    percentual: numberValue(row.percentual),
    valor_comissao: numberValue(row.valor_comissao),
    status: text(row.status, 'calculada'),
    origem: row.origem ?? null,
    observacao: row.observacao ?? null,
  }))
}

export async function listFlexReceitaMapeamentos(): Promise<FlexListRow[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('receita_mapeamentos')
    .select('id,origem,vendedor_nome,destino_tipo,prioridade,status,categoria:categoria_id(nome),colaborador:colaborador_id(security_usuario:usuario_id(nome,email)),time:time_id(nome)')
    .order('prioridade', { ascending: true })
    .order('vendedor_nome', { ascending: true })
    .limit(500)

  if (error) return []

  return ((data ?? []) as any[]).map((row) => ({
    id: String(row.id),
    title: text(row.vendedor_nome, 'Vendedor Omie'),
    subtitle: [
      text(row.categoria?.nome, 'Todas as categorias'),
      row.destino_tipo === 'time' ? text(row.time?.nome, 'Time') : text(row.colaborador?.security_usuario?.nome, 'Colaborador'),
    ].filter(Boolean).join(' - '),
    status: text(row.status, 'ativo'),
    value: text(row.destino_tipo, 'destino'),
    meta: `prioridade ${numberValue(row.prioridade)}`,
    detailHref: `/modulos/flex/comissoes/mapeamentos/${row.id}`,
    tone: statusTone(text(row.status, 'ativo')),
  }))
}

export async function listFlexVendedoresOmiePendentes(): Promise<FlexListRow[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('receitas')
    .select('id,metadata,valor_recebido,colaborador_id,time_id,categoria:categoria_id(nome)')
    .eq('origem', 'omie_financas')
    .limit(2000)

  if (error) return []

  const grouped = new Map<string, { vendedor: string; categoria: string; count: number; total: number }>()

  for (const row of (data ?? []) as any[]) {
    if (row.colaborador_id || row.time_id) continue
    const vendedor = text(row.metadata?.vendedor_omie)
    if (!vendedor) continue
    const categoria = text(row.categoria?.nome, 'Sem categoria')
    const key = `${vendedor}:${categoria}`
    const current = grouped.get(key) ?? { vendedor, categoria, count: 0, total: 0 }
    current.count += 1
    current.total += numberValue(row.valor_recebido)
    grouped.set(key, current)
  }

  return Array.from(grouped.values()).map((row) => ({
    id: `${row.vendedor}:${row.categoria}`,
    title: row.vendedor,
    subtitle: row.categoria,
    status: 'pendente',
    value: money(row.total),
    meta: `${row.count} receita(s) sem destino`,
    tone: 'warning' as const,
  }))
}

export async function listFlexPagamentoAgendas(): Promise<FlexListRow[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('pagamento_agendas')
    .select('id,descricao,dia_previsto,valor_bruto,valor_descontos,percentual,inicio_competencia,fim_competencia,status,tipo:tipo_pagamento_id(nome),colaborador:colaborador_id(security_usuario:usuario_id(nome)),time:time_id(nome)')
    .order('atualizado_em', { ascending: false })
    .limit(500)

  if (error) return []

  return ((data ?? []) as any[]).map((row) => ({
    id: String(row.id),
    title: text(row.descricao, text(row.tipo?.nome, 'Agenda')),
    subtitle: [text(row.colaborador?.security_usuario?.nome), text(row.time?.nome), `dia ${row.dia_previsto ?? '-'}`].filter(Boolean).join(' - '),
    status: text(row.status, 'ativo'),
    value: money(row.valor_bruto),
    meta: text(row.inicio_competencia),
    detailHref: `/modulos/flex/pagamentos/agenda/${row.id}`,
    tone: statusTone(text(row.status, 'ativo')),
  }))
}

export async function listFlexPagamentos(): Promise<FlexListRow[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('pagamentos')
    .select('id,competencia,descricao,data_prevista,data_pagamento,valor_bruto,valor_descontos,valor_liquido,status,origem,colaborador:colaborador_id(security_usuario:usuario_id(nome,email)),tipo:tipo_pagamento_id(nome)')
    .order('competencia', { ascending: false })
    .order('data_prevista', { ascending: false })
    .limit(500)

  if (error) return []

  return ((data ?? []) as any[]).map((row) => ({
    id: String(row.id),
    title: text(row.colaborador?.security_usuario?.nome, 'Colaborador'),
    subtitle: [text(row.tipo?.nome, text(row.descricao, 'Pagamento')), text(row.data_prevista), text(row.data_pagamento)].filter(Boolean).join(' - '),
    status: text(row.status, 'previsto'),
    value: money(row.valor_liquido ?? (numberValue(row.valor_bruto) - numberValue(row.valor_descontos))),
    meta: text(row.competencia),
    detailHref: `/modulos/flex/pagamentos/${row.id}`,
    tone: statusTone(text(row.status, 'previsto')),
  }))
}

export async function listFlexFechamentos(): Promise<FlexListRow[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('fechamentos')
    .select('id,competencia,status,receita_total,despesa_total,comissao_total,pagamentos_previstos_total,pagamentos_pagos_total,saldo_operacional,pendencias_total,fechado_em')
    .order('competencia', { ascending: false })
    .limit(200)

  if (error) return []

  return ((data ?? []) as FlexFechamento[]).map((row) => ({
    id: row.id,
    title: `Competência ${monthLabel(row.competencia)}`,
    subtitle: `${row.pendencias_total} pendência(s) - saldo ${money(row.saldo_operacional)}`,
    status: row.status,
    value: money(row.receita_total),
    meta: row.fechado_em ? `fechado ${new Date(row.fechado_em).toLocaleDateString('pt-BR')}` : 'em aberto',
    detailHref: `/modulos/flex/fechamentos/${row.id}`,
    tone: statusTone(row.status),
  }))
}

export async function listFlexFechamentoChecklist(fechamentoId: string): Promise<FlexListRow[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('fechamento_checklist')
    .select('id,chave,titulo,status,total,pendencias,detalhe')
    .eq('fechamento_id', fechamentoId)
    .order('chave', { ascending: true })

  if (error) return []

  return ((data ?? []) as any[]).map((row) => ({
    id: String(row.id),
    title: text(row.titulo),
    subtitle: text(row.detalhe),
    status: text(row.status, 'pendente'),
    value: String(row.pendencias ?? 0),
    meta: `${row.total ?? 0} item(ns)`,
    tone: statusTone(text(row.status, 'pendente')),
  }))
}

export async function getFlexComissao(id: string): Promise<FlexComissao> {
  const { data, error } = await admin().schema('flex').from('comissoes').select('*').eq('id', id).single()
  if (error || !data) throw new Error(error?.message ?? 'Comissão Flex não encontrada.')
  return data as FlexComissao
}

export async function getFlexPagamentoAgenda(id: string): Promise<FlexPagamentoAgenda> {
  const { data, error } = await admin().schema('flex').from('pagamento_agendas').select('*').eq('id', id).single()
  if (error || !data) throw new Error(error?.message ?? 'Agenda Flex não encontrada.')
  return data as FlexPagamentoAgenda
}

export async function getFlexPagamento(id: string): Promise<FlexPagamento> {
  const { data, error } = await admin().schema('flex').from('pagamentos').select('*').eq('id', id).single()
  if (error || !data) throw new Error(error?.message ?? 'Pagamento Flex não encontrado.')
  return data as FlexPagamento
}

export async function getFlexFechamento(id: string): Promise<FlexFechamento> {
  const { data, error } = await admin().schema('flex').from('fechamentos').select('*').eq('id', id).single()
  if (error || !data) throw new Error(error?.message ?? 'Fechamento Flex não encontrado.')
  return data as FlexFechamento
}

export async function listFlexColaboradores(): Promise<FlexListRow[]> {
  const supabase = admin()
  const { data, error } = await supabase
    .schema('flex')
    .from('colaboradores')
    .select('id,usuario_id,time_id,gestor_usuario_id,cargo_operacional,data_inicio,status,salario,participacao_honorarios,pro_labore,ajuda_custo,outros_vencimentos,beneficio_valor,recebe_comissoes')
    .order('atualizado_em', { ascending: false })
    .limit(500)

  if (error) return []

  const colaboradorRows = (data ?? []) as any[]
  const usuarioIds = Array.from(new Set(colaboradorRows.map((row) => String(row.usuario_id)).filter(Boolean)))
  const timeIds = Array.from(new Set(colaboradorRows.map((row) => String(row.time_id ?? '')).filter(Boolean)))

  const [usuarios, times] = await Promise.all([
    usuarioIds.length
      ? supabase.schema('security').from('usuarios').select('id,nome,email').in('id', usuarioIds)
      : Promise.resolve({ data: [], error: null }),
    timeIds.length
      ? supabase.schema('flex').from('times').select('id,nome').in('id', timeIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const usuariosById = new Map(((usuarios.data ?? []) as any[]).map((row) => [String(row.id), row]))
  const timesById = new Map(((times.data ?? []) as any[]).map((row) => [String(row.id), row]))

  return colaboradorRows.map((row) => {
    const usuario = usuariosById.get(String(row.usuario_id))
    const time = row.time_id ? timesById.get(String(row.time_id)) : null
    const total = numberValue(row.salario) + numberValue(row.participacao_honorarios) + numberValue(row.pro_labore) + numberValue(row.ajuda_custo) + numberValue(row.outros_vencimentos) + numberValue(row.beneficio_valor)
    const recebimentos = [
      numberValue(row.salario) > 0 ? 'salario' : '',
      numberValue(row.participacao_honorarios) > 0 ? 'honorarios' : '',
      numberValue(row.pro_labore) > 0 ? 'pro-labore' : '',
      numberValue(row.beneficio_valor) > 0 ? 'beneficios' : '',
      numberValue(row.ajuda_custo) + numberValue(row.outros_vencimentos) > 0 ? 'outros' : '',
      row.recebe_comissoes ? 'comissoes' : '',
    ].filter(Boolean).join(', ')

    return {
      id: String(row.id),
      title: text(usuario?.nome, 'Usuário Core'),
      subtitle: [
        text(row.cargo_operacional, 'Sem funcao'),
        text(time?.nome),
        row.data_inicio ? `inicio ${dateText(row.data_inicio)}` : '',
      ].filter(Boolean).join(' - '),
      status: text(row.status, 'ativo'),
      value: money(total),
      meta: recebimentos || text(usuario?.email, 'complemento Flex'),
      detailHref: `/modulos/flex/colaboradores/${row.id}`,
      tone: statusTone(text(row.status, 'ativo')),
    }
  })
}

export async function listFlexTimes(): Promise<FlexListRow[]> {
  const { data, error } = await admin().schema('flex').from('times').select('id,nome,descricao,status').order('nome', { ascending: true }).limit(500)
  if (error) return []

  return ((data ?? []) as FlexTime[]).map((row) => ({
    id: row.id,
    title: row.nome,
    subtitle: row.descricao ?? 'Equipe operacional',
    status: row.status,
    value: row.status,
    meta: 'time',
    detailHref: `/modulos/flex/times/${row.id}`,
    tone: statusTone(row.status),
  }))
}

export async function listFlexCategorias(): Promise<FlexListRow[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('categorias_financeiras')
    .select('id,nome,macrogrupo,tipo,status')
    .order('macrogrupo', { ascending: true })
    .order('nome', { ascending: true })
    .limit(500)

  if (error) return []

  return ((data ?? []) as FlexCategoriaFinanceira[]).map((row) => ({
    id: row.id,
    title: row.nome,
    subtitle: row.macrogrupo,
    status: row.status,
    value: row.tipo,
    meta: 'categoria',
    detailHref: `/modulos/flex/configuracoes/categorias/${row.id}`,
    tone: statusTone(row.status),
  }))
}

export async function listFlexTiposPagamento(): Promise<FlexListRow[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('tipos_pagamento')
    .select('id,codigo,nome,status')
    .order('nome', { ascending: true })
    .limit(500)

  if (error) return []

  return ((data ?? []) as FlexTipoPagamento[]).map((row) => ({
    id: row.id,
    title: row.nome,
    subtitle: row.codigo,
    status: row.status,
    value: row.codigo,
    meta: 'tipo de pagamento',
    detailHref: `/modulos/flex/configuracoes/tipos-pagamento/${row.id}`,
    tone: statusTone(row.status),
  }))
}

export async function listFlexTiposComissao(): Promise<FlexListRow[]> {
  const { data, error } = await admin()
    .schema('flex')
    .from('tipos_comissao')
    .select('id,nome,categoria_id,percentual,base_calculo,escopo,status,categoria:categoria_id(nome,macrogrupo)')
    .order('nome', { ascending: true })
    .limit(500)

  if (error) return []

  return ((data ?? []) as any[]).map((row) => ({
    id: String(row.id),
    title: text(row.nome),
    subtitle: [text(row.categoria?.nome, 'Sem categoria'), text(row.escopo, 'individual')].join(' - '),
    status: text(row.status, 'ativo'),
    value: `${numberValue(row.percentual).toLocaleString('pt-BR')}%`,
    meta: text(row.base_calculo, 'valor_recebido'),
    detailHref: `/modulos/flex/tipos-comissao/${row.id}`,
    tone: statusTone(text(row.status, 'ativo')),
  }))
}

export async function getFlexDashboardData(): Promise<FlexDashboardData> {
  const [colaboradores, times, categorias, tiposPagamento, tiposComissao, tarefas] = await Promise.all([
    listFlexColaboradores(),
    listFlexTimes(),
    listFlexCategorias(),
    listFlexTiposPagamento(),
    listFlexTiposComissao(),
    listFlexOperadorTarefas(),
  ])

  const pendencias = [
    !colaboradores.length ? { id: 'colaboradores', title: 'Complementos de colaboradores', subtitle: 'Cadastre os complementos financeiros dos usuarios Core.', status: 'pendente', value: '0', meta: 'cadastro base', detailHref: '/modulos/flex/colaboradores', tone: 'warning' as const } : null,
    !categorias.length ? { id: 'categorias', title: 'Categorias financeiras', subtitle: 'Defina macrogrupos para receitas, despesas e orçamento.', status: 'pendente', value: '0', meta: 'configuração', detailHref: '/modulos/flex/configuracoes/categorias', tone: 'warning' as const } : null,
    !tiposPagamento.length ? { id: 'tipos-pagamento', title: 'Tipos de pagamento', subtitle: 'Crie os tipos usados por agendas e pagamentos.', status: 'pendente', value: '0', meta: 'configuração', detailHref: '/modulos/flex/configuracoes/tipos-pagamento', tone: 'warning' as const } : null,
    !tiposComissao.length ? { id: 'tipos-comissao', title: 'Tipos de comissão', subtitle: 'Configure regras percentuais para cálculo futuro.', status: 'pendente', value: '0', meta: 'configuração', detailHref: '/modulos/flex/tipos-comissao', tone: 'warning' as const } : null,
  ].filter(Boolean) as FlexListRow[]

  return {
    cards: [
      { label: 'Colaboradores', value: String(colaboradores.length), hint: 'complementos Flex', tone: colaboradores.length ? 'success' : 'warning' },
      { label: 'Times', value: String(times.length), hint: 'equipes operacionais', tone: times.length ? 'success' : 'primary' },
      { label: 'Categorias', value: String(categorias.length), hint: 'macrogrupos financeiros', tone: categorias.length ? 'success' : 'warning' },
      { label: 'Tipos de pagamento', value: String(tiposPagamento.length), hint: 'base da agenda', tone: tiposPagamento.length ? 'success' : 'warning' },
      { label: 'Tipos de comissão', value: String(tiposComissao.length), hint: 'regras percentuais', tone: tiposComissao.length ? 'success' : 'warning' },
      { label: 'Tarefas', value: String(tarefas.length), hint: 'fila do operador', tone: tarefas.length ? 'warning' : 'success' },
    ],
    pendencias: tarefas.length ? tarefas : pendencias,
    pendenciasReceitas: [],
    pendenciasDespesas: [],
  }
}

export async function getFlexColaborador(id: string): Promise<FlexColaborador> {
  const { data, error } = await admin().schema('flex').from('colaboradores').select('*').eq('id', id).single()
  if (error || !data) throw new Error(error?.message ?? 'Colaborador Flex não encontrado.')
  return data as FlexColaborador
}

export async function getFlexReceita(id: string): Promise<FlexReceita> {
  const { data, error } = await admin().schema('flex').from('receitas').select('*').eq('id', id).single()
  if (error || !data) throw new Error(error?.message ?? 'Receita Flex não encontrada.')
  return data as FlexReceita
}

export async function getFlexExtratoLancamento(id: string): Promise<FlexExtratoLancamento> {
  const { data, error } = await admin().schema('flex').from('extrato_lancamentos').select('*').eq('id', id).single()
  if (error || !data) throw new Error(error?.message ?? 'Lançamento de extrato não encontrado.')
  return data as FlexExtratoLancamento
}

export async function getFlexPrevisaoDespesa(id: string): Promise<FlexPrevisaoDespesa> {
  const { data, error } = await admin().schema('flex').from('previsoes_despesa').select('*').eq('id', id).single()
  if (error || !data) throw new Error(error?.message ?? 'Previsão Flex não encontrada.')
  return data as FlexPrevisaoDespesa
}

export async function getFlexTime(id: string): Promise<FlexTime> {
  const { data, error } = await admin().schema('flex').from('times').select('*').eq('id', id).single()
  if (error || !data) throw new Error(error?.message ?? 'Time Flex não encontrado.')
  return data as FlexTime
}

export async function getFlexCategoria(id: string): Promise<FlexCategoriaFinanceira> {
  const { data, error } = await admin().schema('flex').from('categorias_financeiras').select('*').eq('id', id).single()
  if (error || !data) throw new Error(error?.message ?? 'Categoria Flex não encontrada.')
  return data as FlexCategoriaFinanceira
}

export async function getFlexTipoPagamento(id: string): Promise<FlexTipoPagamento> {
  const { data, error } = await admin().schema('flex').from('tipos_pagamento').select('*').eq('id', id).single()
  if (error || !data) throw new Error(error?.message ?? 'Tipo de pagamento Flex não encontrado.')
  return data as FlexTipoPagamento
}

export async function getFlexTipoComissao(id: string): Promise<FlexTipoComissao> {
  const { data, error } = await admin().schema('flex').from('tipos_comissao').select('*').eq('id', id).single()
  if (error || !data) throw new Error(error?.message ?? 'Tipo de comissão Flex não encontrado.')
  return data as FlexTipoComissao
}

export async function getFlexReceitaMapeamento(id: string): Promise<FlexReceitaMapeamento> {
  const { data, error } = await admin().schema('flex').from('receita_mapeamentos').select('*').eq('id', id).single()
  if (error || !data) throw new Error(error?.message ?? 'Mapeamento Omie não encontrado.')
  return data as FlexReceitaMapeamento
}
