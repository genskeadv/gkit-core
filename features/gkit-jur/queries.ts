import { notFound, redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess, type ModuleSearchParams } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { DATAJUD_TRIBUNAIS } from './datajud-tribunais'
import { formatCnj } from './normalizer'
import type {
  GkitJurAuditoriaData,
  GkitJurDashboardMetrics,
  GkitJurFormData,
  GkitJurMonitoramentoStatus,
  GkitJurMovimentacao,
  GkitJurMovimentacoesData,
  GkitJurPendenciasData,
  GkitJurProcessDetail,
  GkitJurProcessDetailData,
  GkitJurProcessFilterOptions,
  GkitJurProcessFilters,
  GkitJurProcessListData,
  GkitJurProcessListItem,
  GkitJurProcessoStatus,
  GkitJurSaneamentoSuggestion,
  GkitJurSelectOption,
} from './types'

const PAGE_SIZE = 25

function admin() {
  return createSupabaseAdminClient() as any
}

export async function requireGkitJurContext(target = '/modulos/gkit-jur') {
  const context = await requireModuleAccess('gkit-jur', target)

  if (!canAccess(context.permissions, 'gkit_jur.dashboard.read')) {
    redirect('/plataforma')
  }

  return context
}

export function canWriteGkitJur(permissions: string[]) {
  return canAccess(permissions, 'gkit_jur.processos.write')
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeName(value: unknown) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(condominio|cond|edificio|residencial|associacao|assoc)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function positiveInt(value: string, fallback = 1) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function buildGkitJurProcessFilters(params?: ModuleSearchParams | null): GkitJurProcessFilters {
  const dir = singleParam(params?.dir) === 'asc' ? 'asc' : 'desc'
  const sort = singleParam(params?.sort) || 'updated_at'

  return {
    carteiraId: singleParam(params?.carteira_id),
    dir,
    monitoramento: singleParam(params?.monitoramento),
    page: positiveInt(singleParam(params?.page), 1),
    q: singleParam(params?.q).trim(),
    responsavelId: singleParam(params?.responsavel_id),
    saneamento: singleParam(params?.saneamento),
    sort,
    status: singleParam(params?.status),
    tribunal: singleParam(params?.tribunal),
  }
}

function status(value: unknown): GkitJurProcessoStatus {
  const current = text(value, 'ativo')
  if (['ativo', 'arquivado', 'suspenso', 'encerrado', 'erro'].includes(current)) {
    return current as GkitJurProcessoStatus
  }
  return 'ativo'
}

function monitoramento(value: unknown): GkitJurMonitoramentoStatus {
  const current = text(value, 'monitorando')
  if (['monitorando', 'pausado', 'erro', 'nao_monitorar'].includes(current)) {
    return current as GkitJurMonitoramentoStatus
  }
  return 'monitorando'
}

function mapProcesso(row: Record<string, unknown>, maps: {
  clientes: Map<string, string>
  carteiras: Map<string, string>
  responsaveis: Map<string, string>
}): GkitJurProcessListItem {
  const clienteId = text(row.cliente_id)
  const carteiraId = text(row.carteira_id)
  const responsavelId = text(row.responsavel_id)
  const clienteSnapshot = text(row.cliente_nome) || null

  return {
    id: String(row.id),
    numeroCnj: formatCnj(text(row.numero_cnj, text(row.numero_cnj_limpo))),
    titulo: text(row.titulo) || null,
    pasta: text(row.pasta) || null,
    clienteNome: clienteId ? (maps.clientes.get(clienteId) ?? clienteSnapshot) : clienteSnapshot,
    carteiraNome: carteiraId ? maps.carteiras.get(carteiraId) ?? null : null,
    responsavelNome: responsavelId ? maps.responsaveis.get(responsavelId) ?? null : null,
    tribunalSigla: text(row.tribunal_sigla) || null,
    classeNome: text(row.classe_nome) || null,
    orgaoJulgadorNome: text(row.orgao_julgador_nome) || null,
    ultimaMovimentacaoEm: text(row.ultima_movimentacao_em) || null,
    ultimaSincronizacaoEm: text(row.ultima_sincronizacao_em) || null,
    status: status(row.status),
    statusMonitoramento: monitoramento(row.status_monitoramento),
  }
}

async function lookupMaps(rows: Array<Record<string, unknown>>) {
  const clienteIds = [...new Set(rows.map((row) => text(row.cliente_id)).filter(Boolean))]
  const carteiraIds = [...new Set(rows.map((row) => text(row.carteira_id)).filter(Boolean))]
  const responsavelIds = [...new Set(rows.map((row) => text(row.responsavel_id)).filter(Boolean))]

  const [clientesResult, carteirasResult, responsaveisResult] = await Promise.all([
    clienteIds.length
      ? admin().schema('ciclo').from('clientes').select('id,nome,nome_fantasia,razao_social').in('id', clienteIds)
      : Promise.resolve({ data: [], error: null }),
    carteiraIds.length
      ? admin().schema('core').from('carteiras').select('id,nome').in('id', carteiraIds)
      : Promise.resolve({ data: [], error: null }),
    responsavelIds.length
      ? admin().schema('security').from('usuarios').select('id,nome,email').in('id', responsavelIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (clientesResult.error) throw new Error(clientesResult.error.message)
  if (carteirasResult.error) throw new Error(carteirasResult.error.message)
  if (responsaveisResult.error) throw new Error(responsaveisResult.error.message)

  return {
    clientes: new Map(((clientesResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [
      String(row.id),
      text(row.nome_fantasia, text(row.nome, text(row.razao_social, 'Cliente sem nome'))),
    ])),
    carteiras: new Map(((carteirasResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.id), text(row.nome, 'Carteira sem nome')])),
    responsaveis: new Map(((responsaveisResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.id), text(row.nome, text(row.email, 'Responsavel sem nome'))])),
  }
}

function optionFromRow(row: Record<string, unknown>, labelKeys: string[]): GkitJurSelectOption {
  const label = labelKeys.reduce((current, key) => current || text(row[key]), '')
  return { label: label || 'Sem nome', value: String(row.id) }
}

async function getFilterOptions(): Promise<GkitJurProcessFilterOptions> {
  const [carteirasResult, responsaveisResult, tribunaisResult] = await Promise.all([
    admin().schema('core').from('carteiras').select('id,nome').eq('status', 'ativo').order('nome', { ascending: true }),
    admin().schema('security').from('usuarios').select('id,nome,email').eq('status', 'ativo').order('nome', { ascending: true }),
    admin().schema('gkit_jur').from('processos').select('tribunal_sigla').not('tribunal_sigla', 'is', null).limit(5000),
  ])

  if (carteirasResult.error) throw new Error(carteirasResult.error.message)
  if (responsaveisResult.error) throw new Error(responsaveisResult.error.message)
  if (tribunaisResult.error) throw new Error(tribunaisResult.error.message)

  const tribunais = [...new Set(((tribunaisResult.data ?? []) as Array<Record<string, unknown>>)
    .map((row) => text(row.tribunal_sigla))
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))

  return {
    carteiras: ((carteirasResult.data ?? []) as Array<Record<string, unknown>>).map((row) => optionFromRow(row, ['nome'])),
    responsaveis: ((responsaveisResult.data ?? []) as Array<Record<string, unknown>>).map((row) => optionFromRow(row, ['nome', 'email'])),
    tribunais: tribunais.map((tribunal) => ({ label: tribunal, value: tribunal })),
  }
}

async function getGkitJurFormData(): Promise<GkitJurFormData> {
  const [filterOptions, clientesResult] = await Promise.all([
    getFilterOptions(),
    admin()
      .schema('ciclo')
      .from('clientes')
      .select('id,nome,nome_fantasia,razao_social')
      .order('nome', { ascending: true })
      .limit(5000),
  ])

  if (clientesResult.error) throw new Error(clientesResult.error.message)

  return {
    carteiras: filterOptions.carteiras,
    clientes: ((clientesResult.data ?? []) as Array<Record<string, unknown>>).map((row) => optionFromRow(row, ['nome_fantasia', 'nome', 'razao_social'])),
    responsaveis: filterOptions.responsaveis,
  }
}

type ClienteSuggestionSource = {
  carteiraId: string | null
  id: string
  label: string
}

type ResponsavelSuggestionSource = {
  carteiraId: string
  label: string
  usuarioId: string
}

async function getSuggestionSources() {
  const [clientesResult, carteirasResult, responsaveisResult, processosComCarteiraResult] = await Promise.all([
    admin()
      .schema('ciclo')
      .from('clientes')
      .select('id,nome,nome_fantasia,razao_social,carteira_id')
      .limit(5000),
    admin().schema('core').from('carteiras').select('id,nome').eq('status', 'ativo'),
    admin()
      .schema('core')
      .from('carteira_colaboradores')
      .select('carteira_id,usuario_id,principal,ativo')
      .eq('ativo', true)
      .order('principal', { ascending: false }),
    admin()
      .schema('gkit_jur')
      .from('processos')
      .select('cliente_nome,cliente_id,carteira_id')
      .not('carteira_id', 'is', null)
      .limit(5000),
  ])

  if (clientesResult.error) throw new Error(clientesResult.error.message)
  if (carteirasResult.error) throw new Error(carteirasResult.error.message)
  if (responsaveisResult.error) throw new Error(responsaveisResult.error.message)
  if (processosComCarteiraResult.error) throw new Error(processosComCarteiraResult.error.message)

  const usuarioIds = [...new Set(((responsaveisResult.data ?? []) as Array<Record<string, unknown>>).map((row) => text(row.usuario_id)).filter(Boolean))]
  const usuariosResult = usuarioIds.length
    ? await admin().schema('security').from('usuarios').select('id,nome,email').in('id', usuarioIds)
    : { data: [], error: null }
  if (usuariosResult.error) throw new Error(usuariosResult.error.message)

  const usuarioMap = new Map(((usuariosResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [
    String(row.id),
    text(row.nome, text(row.email, 'Responsavel sem nome')),
  ]))
  const carteiraMap = new Map(((carteirasResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.id), text(row.nome)]))
  const clienteMap = new Map<string, ClienteSuggestionSource>()

  for (const row of (clientesResult.data ?? []) as Array<Record<string, unknown>>) {
    const source = {
      carteiraId: text(row.carteira_id) || null,
      id: String(row.id),
      label: text(row.nome_fantasia, text(row.nome, text(row.razao_social, 'Cliente sem nome'))),
    }
    for (const key of [normalizeName(row.nome_fantasia), normalizeName(row.nome), normalizeName(row.razao_social)].filter(Boolean)) {
      if (!clienteMap.has(key)) clienteMap.set(key, source)
    }
  }

  const carteiraByClienteName = new Map<string, string>()
  const carteiraByClienteId = new Map<string, string>()
  for (const row of (processosComCarteiraResult.data ?? []) as Array<Record<string, unknown>>) {
    const carteiraId = text(row.carteira_id)
    if (!carteiraId) continue
    const clienteId = text(row.cliente_id)
    const clienteName = normalizeName(row.cliente_nome)
    if (clienteId && !carteiraByClienteId.has(clienteId)) carteiraByClienteId.set(clienteId, carteiraId)
    if (clienteName && !carteiraByClienteName.has(clienteName)) carteiraByClienteName.set(clienteName, carteiraId)
  }

  const responsavelByCarteira = new Map<string, ResponsavelSuggestionSource>()
  for (const row of (responsaveisResult.data ?? []) as Array<Record<string, unknown>>) {
    const carteiraId = text(row.carteira_id)
    const usuarioId = text(row.usuario_id)
    if (!carteiraId || !usuarioId || responsavelByCarteira.has(carteiraId)) continue
    responsavelByCarteira.set(carteiraId, {
      carteiraId,
      label: usuarioMap.get(usuarioId) ?? 'Responsavel sem nome',
      usuarioId,
    })
  }

  return {
    carteiraByClienteId,
    carteiraByClienteName,
    carteiraMap,
    clienteMap,
    responsavelByCarteira,
  }
}

function buildSuggestion(row: Record<string, unknown>, maps: Awaited<ReturnType<typeof lookupMaps>>, sources: Awaited<ReturnType<typeof getSuggestionSources>>) {
  const processo = mapProcesso(row, maps)
  const clienteIdAtual = text(row.cliente_id) || null
  const carteiraIdAtual = text(row.carteira_id) || null
  const responsavelIdAtual = text(row.responsavel_id) || null
  const clienteNameKey = normalizeName(row.cliente_nome)
  const clienteSuggestion = clienteIdAtual ? null : sources.clienteMap.get(clienteNameKey) ?? null
  const clienteId = clienteIdAtual ?? clienteSuggestion?.id ?? null
  const carteiraId = carteiraIdAtual
    ?? (clienteId ? sources.carteiraByClienteId.get(clienteId) ?? null : null)
    ?? clienteSuggestion?.carteiraId
    ?? sources.carteiraByClienteName.get(clienteNameKey)
    ?? null
  const responsavelSuggestion = !responsavelIdAtual && carteiraId ? sources.responsavelByCarteira.get(carteiraId) ?? null : null

  const hasCarteiraSuggestion = !carteiraIdAtual && Boolean(carteiraId)
  if (!clienteSuggestion && !hasCarteiraSuggestion && !responsavelSuggestion) return null

  const motivos = []
  if (clienteSuggestion) motivos.push('cliente por nome')
  if (hasCarteiraSuggestion) motivos.push('carteira por cliente')
  if (responsavelSuggestion) motivos.push('responsavel da carteira')

  return {
    processo,
    clienteId: clienteSuggestion?.id ?? null,
    clienteNome: clienteSuggestion?.label ?? null,
    carteiraId: hasCarteiraSuggestion ? carteiraId : null,
    carteiraNome: hasCarteiraSuggestion && carteiraId ? sources.carteiraMap.get(carteiraId) ?? null : null,
    responsavelId: responsavelSuggestion?.usuarioId ?? null,
    responsavelNome: responsavelSuggestion?.label ?? null,
    motivo: motivos.join(', '),
  } satisfies GkitJurSaneamentoSuggestion
}

export async function getGkitJurSaneamentoSuggestions(limit = 8) {
  const [sources, processosResult] = await Promise.all([
    getSuggestionSources(),
    admin()
      .schema('gkit_jur')
      .from('processos')
      .select('id,numero_cnj,numero_cnj_limpo,titulo,pasta,cliente_id,cliente_nome,carteira_id,responsavel_id,tribunal_sigla,classe_nome,orgao_julgador_nome,ultima_movimentacao_em,ultima_sincronizacao_em,status,status_monitoramento,updated_at')
      .or('cliente_id.is.null,carteira_id.is.null,responsavel_id.is.null')
      .order('updated_at', { ascending: false })
      .limit(1500),
  ])

  if (processosResult.error) throw new Error(processosResult.error.message)

  const rows = (processosResult.data ?? []) as Array<Record<string, unknown>>
  const maps = await lookupMaps(rows)
  const suggestions = rows
    .map((row) => buildSuggestion(row, maps, sources))
    .filter(Boolean) as GkitJurSaneamentoSuggestion[]

  return {
    suggestions: suggestions.slice(0, limit),
    suggestionTotals: {
      cliente: suggestions.filter((item) => item.clienteId).length,
      carteira: suggestions.filter((item) => item.carteiraId).length,
      responsavel: suggestions.filter((item) => item.responsavelId).length,
      total: suggestions.length,
    },
  }
}

export async function getGkitJurDashboardMetrics(): Promise<GkitJurDashboardMetrics> {
  const since = new Date()
  since.setDate(since.getDate() - 7)

  const [ativos, monitorados, movimentacoes, erros, semCliente, semCarteira, semResponsavel] = await Promise.all([
    admin().schema('gkit_jur').from('processos').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
    admin().schema('gkit_jur').from('processos').select('id', { count: 'exact', head: true }).eq('status_monitoramento', 'monitorando'),
    admin().schema('gkit_jur').from('movimentacoes').select('id', { count: 'exact', head: true }).gte('created_at', since.toISOString()),
    admin().schema('gkit_jur').from('processos').select('id', { count: 'exact', head: true }).or('status.eq.erro,status_monitoramento.eq.erro'),
    admin().schema('gkit_jur').from('processos').select('id', { count: 'exact', head: true }).is('cliente_id', null),
    admin().schema('gkit_jur').from('processos').select('id', { count: 'exact', head: true }).is('carteira_id', null),
    admin().schema('gkit_jur').from('processos').select('id', { count: 'exact', head: true }).is('responsavel_id', null),
  ])

  for (const result of [ativos, monitorados, movimentacoes, erros, semCliente, semCarteira, semResponsavel]) {
    if (result.error) throw new Error(result.error.message)
  }

  return {
    processosAtivos: ativos.count ?? 0,
    processosMonitorados: monitorados.count ?? 0,
    movimentacoesUltimos7Dias: movimentacoes.count ?? 0,
    processosComErro: erros.count ?? 0,
    semCliente: semCliente.count ?? 0,
    semCarteira: semCarteira.count ?? 0,
    semResponsavel: semResponsavel.count ?? 0,
  }
}

function applyProcessFilters(query: any, filters: GkitJurProcessFilters) {
  let next = query

  if (filters.q) {
    const clean = filters.q.replace(/[%(),]/g, ' ').trim()
    if (clean) {
      const pattern = `%${clean}%`
      next = next.or([
        `numero_cnj.ilike.${pattern}`,
        `numero_cnj_limpo.ilike.${pattern}`,
        `cliente_nome.ilike.${pattern}`,
        `titulo.ilike.${pattern}`,
        `pasta.ilike.${pattern}`,
        `classe_nome.ilike.${pattern}`,
      ].join(','))
    }
  }

  if (filters.status) next = next.eq('status', filters.status)
  if (filters.monitoramento) next = next.eq('status_monitoramento', filters.monitoramento)
  if (filters.tribunal) next = next.eq('tribunal_sigla', filters.tribunal)
  if (filters.carteiraId) next = next.eq('carteira_id', filters.carteiraId)
  if (filters.responsavelId) next = next.eq('responsavel_id', filters.responsavelId)
  if (filters.saneamento === 'sem_cliente') next = next.is('cliente_id', null)
  if (filters.saneamento === 'sem_carteira') next = next.is('carteira_id', null)
  if (filters.saneamento === 'sem_responsavel') next = next.is('responsavel_id', null)
  if (filters.saneamento === 'sem_tribunal') next = next.is('tribunal_sigla', null)

  return next
}

function sortColumn(sort: string) {
  if (['cliente_nome', 'tribunal_sigla', 'data_ajuizamento', 'ultima_movimentacao_em', 'updated_at'].includes(sort)) return sort
  return 'updated_at'
}

export async function listGkitJurProcesses(filters: GkitJurProcessFilters = buildGkitJurProcessFilters()): Promise<GkitJurProcessListData> {
  const from = (filters.page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = admin()
    .schema('gkit_jur')
    .from('processos')
    .select('id,numero_cnj,numero_cnj_limpo,titulo,pasta,cliente_id,cliente_nome,carteira_id,responsavel_id,tribunal_sigla,classe_nome,orgao_julgador_nome,ultima_movimentacao_em,ultima_sincronizacao_em,status,status_monitoramento,updated_at,data_ajuizamento', { count: 'exact' })

  query = applyProcessFilters(query, filters)
    .order(sortColumn(filters.sort), { ascending: filters.dir === 'asc', nullsFirst: false })
    .range(from, to)

  const [metrics, filterOptions, processosResult] = await Promise.all([
    getGkitJurDashboardMetrics(),
    getFilterOptions(),
    query,
  ])

  if (processosResult.error) throw new Error(processosResult.error.message)

  const rows = (processosResult.data ?? []) as Array<Record<string, unknown>>
  const maps = await lookupMaps(rows)
  const total = processosResult.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return {
    filters,
    filterOptions,
    metrics,
    pagination: {
      currentPage: filters.page,
      from: total ? from + 1 : 0,
      pageSize: PAGE_SIZE,
      to: Math.min(to + 1, total),
      total,
      totalPages,
    },
    processes: rows.map((row) => mapProcesso(row, maps)),
  }
}

function mapMovimentacao(row: Record<string, unknown>, processos: Map<string, GkitJurProcessListItem>): GkitJurMovimentacao {
  const processoId = String(row.processo_id)
  const processo = processos.get(processoId)
  return {
    id: String(row.id),
    processoId,
    numeroCnj: processo?.numeroCnj ?? '-',
    clienteNome: processo?.clienteNome ?? null,
    dataHora: text(row.data_hora) || null,
    nome: text(row.nome, 'Movimentacao sem descricao'),
    origem: text(row.origem, 'manual'),
    relevante: Boolean(row.relevante),
    geraAlerta: Boolean(row.gera_alerta),
  }
}

export async function getGkitJurProcessDetail(id: string): Promise<GkitJurProcessDetailData> {
  const [processoResult, formData] = await Promise.all([
    admin()
      .schema('gkit_jur')
      .from('processos')
      .select('id,numero_cnj,numero_cnj_limpo,titulo,pasta,cliente_id,cliente_nome,carteira_id,responsavel_id,tribunal_sigla,tribunal_alias,classe_nome,orgao_julgador_nome,ultima_movimentacao_em,ultima_sincronizacao_em,status,status_monitoramento,data_ajuizamento,observacoes,url_processo,origem_modulo,importado_de,created_at,updated_at')
      .eq('id', id)
      .single(),
    getGkitJurFormData(),
  ])

  if (processoResult.error || !processoResult.data) notFound()

  const row = processoResult.data as Record<string, unknown>
  const maps = await lookupMaps([row])
  const item = mapProcesso(row, maps)
  const movimentacoesResult = await admin()
    .schema('gkit_jur')
    .from('movimentacoes')
    .select('id,processo_id,nome,data_hora,origem,relevante,gera_alerta')
    .eq('processo_id', id)
    .order('data_hora', { ascending: false, nullsFirst: false })
    .limit(50)

  if (movimentacoesResult.error) throw new Error(movimentacoesResult.error.message)

  const processo: GkitJurProcessDetail = {
    ...item,
    clienteId: text(row.cliente_id) || null,
    carteiraId: text(row.carteira_id) || null,
    responsavelId: text(row.responsavel_id) || null,
    dataAjuizamento: text(row.data_ajuizamento) || null,
    observacoes: text(row.observacoes) || null,
    orgaoJulgadorNome: text(row.orgao_julgador_nome) || null,
    urlProcesso: text(row.url_processo) || null,
    tribunalAlias: text(row.tribunal_alias) || null,
    origemModulo: text(row.origem_modulo) || null,
    importadoDe: text(row.importado_de) || null,
    createdAt: text(row.created_at) || null,
    updatedAt: text(row.updated_at) || null,
  }

  return {
    formData,
    movimentacoes: ((movimentacoesResult.data ?? []) as Array<Record<string, unknown>>).map((mov) => mapMovimentacao(mov, new Map([[id, item]]))),
    processo,
  }
}

async function pendingGroup(title: string, description: string, href: string, column: string) {
  const result = await admin()
    .schema('gkit_jur')
    .from('processos')
    .select('id,numero_cnj,numero_cnj_limpo,titulo,pasta,cliente_id,cliente_nome,carteira_id,responsavel_id,tribunal_sigla,classe_nome,orgao_julgador_nome,ultima_movimentacao_em,ultima_sincronizacao_em,status,status_monitoramento,updated_at', { count: 'exact' })
    .is(column, null)
    .order('updated_at', { ascending: false })
    .limit(5)

  if (result.error) throw new Error(result.error.message)
  const rows = (result.data ?? []) as Array<Record<string, unknown>>
  const maps = await lookupMaps(rows)
  return {
    description,
    href,
    items: rows.map((row) => mapProcesso(row, maps)),
    total: result.count ?? 0,
    title,
  }
}

export async function getGkitJurPendencias(): Promise<GkitJurPendenciasData> {
  const [metrics, sugestoes, semCliente, semCarteira, semResponsavel, semTribunal] = await Promise.all([
    getGkitJurDashboardMetrics(),
    getGkitJurSaneamentoSuggestions(),
    pendingGroup('Sem cliente vinculado', 'Processos que precisam apontar para a base do Ciclo.', '/modulos/gkit-jur/processos?saneamento=sem_cliente', 'cliente_id'),
    pendingGroup('Sem carteira', 'Processos que ainda nao entraram em uma carteira operacional.', '/modulos/gkit-jur/processos?saneamento=sem_carteira', 'carteira_id'),
    pendingGroup('Sem responsavel', 'Processos sem dono operacional definido.', '/modulos/gkit-jur/processos?saneamento=sem_responsavel', 'responsavel_id'),
    pendingGroup('Sem tribunal', 'Processos sem tribunal identificado na importacao.', '/modulos/gkit-jur/processos?saneamento=sem_tribunal', 'tribunal_sigla'),
  ])

  return { groups: [semCliente, semCarteira, semResponsavel, semTribunal], metrics, ...sugestoes }
}

export async function listGkitJurMovimentacoes(): Promise<GkitJurMovimentacoesData> {
  const [metrics, movimentacoesResult] = await Promise.all([
    getGkitJurDashboardMetrics(),
    admin()
      .schema('gkit_jur')
      .from('movimentacoes')
      .select('id,processo_id,nome,data_hora,origem,relevante,gera_alerta')
      .order('data_hora', { ascending: false, nullsFirst: false })
      .limit(100),
  ])

  if (movimentacoesResult.error) throw new Error(movimentacoesResult.error.message)

  const movements = (movimentacoesResult.data ?? []) as Array<Record<string, unknown>>
  const processoIds = [...new Set(movements.map((row) => text(row.processo_id)).filter(Boolean))]
  const processoMap = new Map<string, GkitJurProcessListItem>()

  if (processoIds.length) {
    const processosResult = await admin()
      .schema('gkit_jur')
      .from('processos')
      .select('id,numero_cnj,numero_cnj_limpo,titulo,pasta,cliente_id,cliente_nome,carteira_id,responsavel_id,tribunal_sigla,classe_nome,orgao_julgador_nome,ultima_movimentacao_em,ultima_sincronizacao_em,status,status_monitoramento')
      .in('id', processoIds)

    if (processosResult.error) throw new Error(processosResult.error.message)
    const rows = (processosResult.data ?? []) as Array<Record<string, unknown>>
    const maps = await lookupMaps(rows)
    rows.forEach((row) => processoMap.set(String(row.id), mapProcesso(row, maps)))
  }

  return {
    metrics,
    movimentacoes: movements.map((row) => mapMovimentacao(row, processoMap)),
  }
}

export async function getGkitJurAuditoria(): Promise<GkitJurAuditoriaData> {
  const [importadosResult, sincronizacoesResult] = await Promise.all([
    admin().schema('gkit_jur').from('processos').select('id', { count: 'exact', head: true }).not('importado_de', 'is', null),
    admin()
      .schema('gkit_jur')
      .from('sincronizacoes')
      .select('id,status,started_at,finished_at,numero_cnj_limpo,tribunal_alias,total_movimentacoes_recebidas,total_movimentacoes_novas,erro_mensagem')
      .order('started_at', { ascending: false })
      .limit(50),
  ])

  if (importadosResult.error) throw new Error(importadosResult.error.message)
  if (sincronizacoesResult.error) throw new Error(sincronizacoesResult.error.message)

  return {
    importados: importadosResult.count ?? 0,
    sincronizacoes: ((sincronizacoesResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      status: text(row.status),
      startedAt: text(row.started_at) || null,
      finishedAt: text(row.finished_at) || null,
      numeroCnj: formatCnj(text(row.numero_cnj_limpo)),
      tribunalAlias: text(row.tribunal_alias),
      totalMovimentacoes: Number(row.total_movimentacoes_recebidas ?? 0),
      totalNovas: Number(row.total_movimentacoes_novas ?? 0),
      erroMensagem: text(row.erro_mensagem) || null,
    })),
  }
}

export const gkitJurStatusOptions: GkitJurSelectOption[] = [
  { label: 'Ativo', value: 'ativo' },
  { label: 'Suspenso', value: 'suspenso' },
  { label: 'Encerrado', value: 'encerrado' },
  { label: 'Arquivado', value: 'arquivado' },
  { label: 'Erro', value: 'erro' },
]

export const gkitJurMonitoramentoOptions: GkitJurSelectOption[] = [
  { label: 'Monitorando', value: 'monitorando' },
  { label: 'Pausado', value: 'pausado' },
  { label: 'Nao monitorar', value: 'nao_monitorar' },
  { label: 'Erro', value: 'erro' },
]

export const gkitJurTribunalOptions: GkitJurSelectOption[] = DATAJUD_TRIBUNAIS.map((tribunal) => ({
  label: tribunal.sigla,
  value: tribunal.sigla,
}))
