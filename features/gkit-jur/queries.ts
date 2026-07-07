import { notFound, redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess, type ModuleSearchParams } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { DATAJUD_TRIBUNAIS } from './datajud-tribunais'
import { formatCnj } from './normalizer'
import type {
  GkitJurAgenteData,
  GkitJurAgenteExecucao,
  GkitJurAgenteExecucaoStatus,
  GkitJurAuditoriaData,
  GkitJurDashboardMetrics,
  GkitJurDocumento,
  GkitJurDocumentoStatus,
  GkitJurDocumentoTipo,
  GkitJurEventoProcesso,
  GkitJurEventoTipo,
  GkitJurFormData,
  GkitJurGlobalSearchData,
  GkitJurGlobalSearchResult,
  GkitJurInboxData,
  GkitJurInboxFilaId,
  GkitJurInboxFilters,
  GkitJurInboxItem,
  GkitJurInboxOrdenacao,
  GkitJurInboxPrioridade,
  GkitJurIntegracaoData,
  GkitJurIntegracaoTribunal,
  GkitJurMonitoramentoNivel,
  GkitJurMonitoramentoStatus,
  GkitJurMovimentacao,
  GkitJurMovimentacaoTarefaData,
  GkitJurMovimentacaoTarefaRegra,
  GkitJurMovimentacoesData,
  GkitJurNivelProntidao,
  GkitJurPendenciasData,
  GkitJurProcessDetail,
  GkitJurProcessDetailData,
  GkitJurProcessFilterOptions,
  GkitJurProcessFilters,
  GkitJurProcessListData,
  GkitJurProcessListItem,
  GkitJurProcessSummary,
  GkitJurProcessStatusSuggestion,
  GkitJurProcessoStatus,
  GkitJurSaneamentoSuggestion,
  GkitJurSelectOption,
  GkitJurTarefa,
  GkitJurTarefaStatus,
  GkitJurTarefaTipo,
  GkitJurTimelineItem,
} from './types'

const PAGE_SIZE = 25
const INBOX_ITEMS_LIMIT = 60
const DEFAULT_PROCESS_STATUS = 'ativo'
const OPEN_TASK_STATUSES = ['aberta', 'em_andamento', 'aguardando_terceiro']
const GKIT_JUR_CRON_SCHEDULE = '0 6 * * *'
const GKIT_JUR_CRON_TIMEZONE = 'America/Sao_Paulo'
const GKIT_JUR_CRON_DEFAULT_DATAJUD_LIMIT = 8
const GKIT_JUR_CRON_DEFAULT_TIME_BUDGET_MS = 240_000

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

export function canSyncGkitJur(permissions: string[]) {
  return canAccess(permissions, 'gkit_jur.processos.sync')
}

export function canConfigureGkitJur(permissions: string[]) {
  return canAccess(permissions, 'gkit_jur.admin.write')
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => {
      if (typeof item === 'string') return text(item)
      const record = recordValue(item)
      return text(record.label) || text(record.titulo) || text(record.motivo) || text(record.tipo)
    }).filter(Boolean)
    : []
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function nivelProntidao(value: unknown): GkitJurNivelProntidao {
  const current = text(value)
  if (['sem_base', 'capa', 'parcial', 'pronto', 'desatualizado', 'erro'].includes(current)) {
    return current as GkitJurNivelProntidao
  }
  return 'sem_base'
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

function envPositiveInt(value: string | undefined, fallback: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

function nextDailyUtcRun(hourUtc: number, minuteUtc: number) {
  const now = new Date()
  const next = new Date(now)
  next.setUTCHours(hourUtc, minuteUtc, 0, 0)
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString()
}

function formatDate(value: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value))
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
    responsaveis: new Map(((responsaveisResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.id), text(row.nome, text(row.email, 'Responsável sem nome'))])),
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
    admin().schema('gkit_jur').from('processos').select('tribunal_sigla').eq('status', DEFAULT_PROCESS_STATUS).not('tribunal_sigla', 'is', null).limit(5000),
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
      .eq('status', DEFAULT_PROCESS_STATUS)
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
    text(row.nome, text(row.email, 'Responsável sem nome')),
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
  const carteiraByResponsavelId = new Map<string, string>()
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
      label: usuarioMap.get(usuarioId) ?? 'Responsável sem nome',
      usuarioId,
    })
  }

  for (const row of (responsaveisResult.data ?? []) as Array<Record<string, unknown>>) {
    const carteiraId = text(row.carteira_id)
    const usuarioId = text(row.usuario_id)
    if (!carteiraId || !usuarioId || carteiraByResponsavelId.has(usuarioId)) continue
    carteiraByResponsavelId.set(usuarioId, carteiraId)
  }

  return {
    carteiraByClienteId,
    carteiraByClienteName,
    carteiraByResponsavelId,
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
  const carteiraFromCliente = (clienteId ? sources.carteiraByClienteId.get(clienteId) ?? null : null)
    ?? clienteSuggestion?.carteiraId
    ?? sources.carteiraByClienteName.get(clienteNameKey)
    ?? null
  const carteiraFromResponsavel = responsavelIdAtual ? sources.carteiraByResponsavelId.get(responsavelIdAtual) ?? null : null
  const carteiraId = carteiraIdAtual
    ?? carteiraFromCliente
    ?? carteiraFromResponsavel
    ?? null
  const responsavelSuggestion = !responsavelIdAtual && carteiraId ? sources.responsavelByCarteira.get(carteiraId) ?? null : null

  const hasCarteiraSuggestion = !carteiraIdAtual && Boolean(carteiraId)
  if (!clienteSuggestion && !hasCarteiraSuggestion && !responsavelSuggestion) return null

  const motivos = []
  if (clienteSuggestion) motivos.push('cliente por nome')
  if (hasCarteiraSuggestion && carteiraFromCliente === carteiraId) motivos.push('carteira por cliente')
  if (hasCarteiraSuggestion && carteiraFromResponsavel === carteiraId) motivos.push('carteira por responsável')
  if (responsavelSuggestion) motivos.push('responsável da carteira')

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
      .eq('status', DEFAULT_PROCESS_STATUS)
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
    admin().schema('gkit_jur').from('processos').select('id', { count: 'exact', head: true }).eq('status', DEFAULT_PROCESS_STATUS),
    admin().schema('gkit_jur').from('processos').select('id', { count: 'exact', head: true }).eq('status', DEFAULT_PROCESS_STATUS).eq('status_monitoramento', 'monitorando'),
    admin().schema('gkit_jur').from('movimentacoes').select('id', { count: 'exact', head: true }).gte('created_at', since.toISOString()),
    admin().schema('gkit_jur').from('processos').select('id', { count: 'exact', head: true }).eq('status', DEFAULT_PROCESS_STATUS).eq('status_monitoramento', 'erro'),
    admin().schema('gkit_jur').from('processos').select('id', { count: 'exact', head: true }).eq('status', DEFAULT_PROCESS_STATUS).is('cliente_id', null),
    admin().schema('gkit_jur').from('processos').select('id', { count: 'exact', head: true }).eq('status', DEFAULT_PROCESS_STATUS).is('carteira_id', null),
    admin().schema('gkit_jur').from('processos').select('id', { count: 'exact', head: true }).eq('status', DEFAULT_PROCESS_STATUS).is('responsavel_id', null),
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

  next = next.eq('status', filters.status || DEFAULT_PROCESS_STATUS)
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

function buildSearchPattern(value: string) {
  const clean = value.replace(/[%(),]/g, ' ').replace(/\s+/g, ' ').trim()
  return clean ? `%${clean}%` : ''
}

function processSearchResult(row: GkitJurProcessListItem): GkitJurGlobalSearchResult {
  return {
    id: `processo-${row.id}`,
    type: 'processo',
    title: row.numeroCnj,
    subtitle: row.clienteNome || row.titulo || row.pasta || 'Processo ativo sem cliente vinculado',
    meta: [row.tribunalSigla, row.carteiraNome, row.responsavelNome].filter(Boolean).join(' | ') || 'Sem vinculos completos',
    href: `/modulos/gkit-jur/processos/${row.id}`,
  }
}

export async function searchGkitJurGlobal(query: string): Promise<GkitJurGlobalSearchData> {
  const normalized = query.replace(/\s+/g, ' ').trim()
  const pattern = buildSearchPattern(normalized)
  if (!pattern) {
    return { query: normalized, total: 0, processos: [], tarefas: [], movimentacoes: [] }
  }
  const digits = normalized.replace(/\D/g, '')
  const processClauses = [
    `numero_cnj.ilike.${pattern}`,
    `numero_cnj_limpo.ilike.${pattern}`,
    `cliente_nome.ilike.${pattern}`,
    `titulo.ilike.${pattern}`,
    `pasta.ilike.${pattern}`,
    `classe_nome.ilike.${pattern}`,
    `orgao_julgador_nome.ilike.${pattern}`,
  ]
  if (digits.length >= 4) processClauses.push(`numero_cnj_limpo.ilike.%${digits}%`)

  const processosQuery = admin()
    .schema('gkit_jur')
    .from('processos')
    .select('id,numero_cnj,numero_cnj_limpo,titulo,pasta,cliente_id,cliente_nome,carteira_id,responsavel_id,tribunal_sigla,classe_nome,orgao_julgador_nome,ultima_movimentacao_em,ultima_sincronizacao_em,status,status_monitoramento,updated_at')
    .eq('status', DEFAULT_PROCESS_STATUS)
    .or(processClauses.join(','))
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(8)

  const tarefasQuery = admin()
    .schema('gkit_jur')
    .from('tarefas')
    .select('id,processo_id,titulo,descricao,status,prioridade,prazo_at,created_at')
    .in('status', OPEN_TASK_STATUSES)
    .or(`titulo.ilike.${pattern},descricao.ilike.${pattern}`)
    .order('prazo_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(8)

  const movimentacoesQuery = admin()
    .schema('gkit_jur')
    .from('movimentacoes')
    .select('id,processo_id,nome,data_hora,origem,created_at')
    .or(`nome.ilike.${pattern},origem.ilike.${pattern}`)
    .order('data_hora', { ascending: false, nullsFirst: false })
    .limit(8)

  const [processosResult, tarefasResult, movimentacoesResult] = await Promise.all([processosQuery, tarefasQuery, movimentacoesQuery])
  if (processosResult.error) throw new Error(processosResult.error.message)
  if (tarefasResult.error) throw new Error(tarefasResult.error.message)
  if (movimentacoesResult.error) throw new Error(movimentacoesResult.error.message)

  const processoRows = (processosResult.data ?? []) as Array<Record<string, unknown>>
  const tarefaRows = (tarefasResult.data ?? []) as Array<Record<string, unknown>>
  const movimentacaoRows = (movimentacoesResult.data ?? []) as Array<Record<string, unknown>>
  const relatedProcessIds = [...new Set([
    ...tarefaRows.map((row) => text(row.processo_id)).filter(Boolean),
    ...movimentacaoRows.map((row) => text(row.processo_id)).filter(Boolean),
  ])]

  const relatedResult = relatedProcessIds.length
    ? await admin()
      .schema('gkit_jur')
      .from('processos')
      .select('id,numero_cnj,numero_cnj_limpo,titulo,pasta,cliente_id,cliente_nome,carteira_id,responsavel_id,tribunal_sigla,classe_nome,orgao_julgador_nome,ultima_movimentacao_em,ultima_sincronizacao_em,status,status_monitoramento')
      .eq('status', DEFAULT_PROCESS_STATUS)
      .in('id', relatedProcessIds)
    : { data: [], error: null }

  if (relatedResult.error) throw new Error(relatedResult.error.message)

  const allProcessRows = [...processoRows, ...((relatedResult.data ?? []) as Array<Record<string, unknown>>)]
  const maps = await lookupMaps(allProcessRows)
  const processMap = new Map(allProcessRows.map((row) => {
    const processo = mapProcesso(row, maps)
    return [processo.id, processo]
  }))

  const processos = processoRows.map((row) => processSearchResult(mapProcesso(row, maps)))
  const tarefas = tarefaRows
    .map((row): GkitJurGlobalSearchResult | null => {
      const processo = processMap.get(text(row.processo_id))
      if (!processo) return null
      const prazo = text(row.prazo_at)
      return {
        id: `tarefa-${String(row.id)}`,
        type: 'tarefa',
        title: text(row.titulo, 'Tarefa sem titulo'),
        subtitle: `${processo.numeroCnj} - ${processo.clienteNome || processo.titulo || 'Processo ativo'}`,
        meta: [text(row.prioridade, 'media'), prazo ? `Prazo ${formatDate(prazo)}` : '', processo.responsavelNome].filter(Boolean).join(' | '),
        href: `/modulos/gkit-jur/processos/${processo.id}#tarefas`,
      }
    })
    .filter((row): row is GkitJurGlobalSearchResult => Boolean(row))

  const movimentacoes = movimentacaoRows
    .map((row): GkitJurGlobalSearchResult | null => {
      const processo = processMap.get(text(row.processo_id))
      if (!processo) return null
      const dataHora = text(row.data_hora)
      return {
        id: `movimentacao-${String(row.id)}`,
        type: 'movimentacao',
        title: text(row.nome, 'Movimentacao sem descricao'),
        subtitle: `${processo.numeroCnj} - ${processo.clienteNome || processo.titulo || 'Processo ativo'}`,
        meta: [dataHora ? formatDate(dataHora) : '', text(row.origem, 'DataJud')].filter(Boolean).join(' | '),
        href: `/modulos/gkit-jur/processos/${processo.id}#timeline`,
      }
    })
    .filter((row): row is GkitJurGlobalSearchResult => Boolean(row))

  return {
    query: normalized,
    total: processos.length + tarefas.length + movimentacoes.length,
    processos,
    tarefas,
    movimentacoes,
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

function tarefaStatus(value: unknown): GkitJurTarefaStatus {
  const current = text(value, 'aberta')
  if (['aberta', 'em_andamento', 'aguardando_terceiro', 'concluida', 'cancelada'].includes(current)) {
    return current as GkitJurTarefaStatus
  }
  return 'aberta'
}

function tarefaTipo(value: unknown): GkitJurTarefaTipo {
  const current = text(value, 'providencia_interna')
  if (['prazo', 'publicacao', 'movimentacao_relevante', 'documento_pendente', 'providencia_interna', 'audiencia', 'cumprimento', 'revisao'].includes(current)) {
    return current as GkitJurTarefaTipo
  }
  return 'providencia_interna'
}

function tarefaPrioridade(value: unknown): GkitJurInboxPrioridade {
  const current = text(value, 'media')
  if (['critica', 'alta', 'media', 'baixa'].includes(current)) return current as GkitJurInboxPrioridade
  return 'media'
}

function documentoStatus(value: unknown): GkitJurDocumentoStatus {
  const current = text(value, 'ativo')
  if (['ativo', 'arquivado', 'cancelado'].includes(current)) return current as GkitJurDocumentoStatus
  return 'ativo'
}

function documentoTipo(value: unknown): GkitJurDocumentoTipo {
  const current = text(value, 'documento_interno')
  if (['peticao', 'publicacao', 'decisao', 'ata', 'comprovante', 'documento_interno', 'contrato', 'procuracao', 'outro'].includes(current)) {
    return current as GkitJurDocumentoTipo
  }
  return 'documento_interno'
}

function eventoTipo(value: unknown): GkitJurEventoTipo {
  const current = text(value, 'providencia_interna')
  if (['publicacao', 'intimacao', 'despacho', 'decisao', 'audiencia', 'prazo', 'protocolo', 'contato', 'providencia_interna', 'documento', 'nota'].includes(current)) {
    return current as GkitJurEventoTipo
  }
  return 'providencia_interna'
}

async function lookupTarefaMaps(rows: Array<Record<string, unknown>>) {
  const carteiraIds = [...new Set(rows.map((row) => text(row.carteira_id)).filter(Boolean))]
  const responsavelIds = [...new Set(rows.map((row) => text(row.responsavel_id)).filter(Boolean))]

  const [carteirasResult, responsaveisResult] = await Promise.all([
    carteiraIds.length
      ? admin().schema('core').from('carteiras').select('id,nome').in('id', carteiraIds)
      : Promise.resolve({ data: [], error: null }),
    responsavelIds.length
      ? admin().schema('security').from('usuarios').select('id,nome,email').in('id', responsavelIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (carteirasResult.error) throw new Error(carteirasResult.error.message)
  if (responsaveisResult.error) throw new Error(responsaveisResult.error.message)

  return {
    carteiras: new Map(((carteirasResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.id), text(row.nome)])),
    responsaveis: new Map(((responsaveisResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.id), text(row.nome, text(row.email))])),
  }
}

function mapTarefa(row: Record<string, unknown>, maps: Awaited<ReturnType<typeof lookupTarefaMaps>>, fallback?: {
  carteiraNome: string | null
  responsavelNome: string | null
}): GkitJurTarefa {
  const carteiraId = text(row.carteira_id)
  const responsavelId = text(row.responsavel_id)
  const payload = row.payload && typeof row.payload === 'object'
    ? row.payload as Record<string, unknown>
    : {}
  return {
    id: String(row.id),
    processoId: String(row.processo_id),
    tipo: tarefaTipo(row.tipo),
    titulo: text(row.titulo, 'Tarefa sem título'),
    descricao: text(row.descricao) || null,
    status: tarefaStatus(row.status),
    prioridade: tarefaPrioridade(row.prioridade),
    prazoAt: text(row.prazo_at) || null,
    origem: text(row.origem, 'manual'),
    carteiraId: carteiraId || null,
    carteiraNome: carteiraId ? maps.carteiras.get(carteiraId) ?? fallback?.carteiraNome ?? null : fallback?.carteiraNome ?? null,
    responsavelId: responsavelId || null,
    responsavelNome: responsavelId ? maps.responsaveis.get(responsavelId) ?? fallback?.responsavelNome ?? null : fallback?.responsavelNome ?? null,
    payload,
    createdAt: text(row.created_at),
  }
}

function statusSuggestionFromTarefas(tarefas: GkitJurTarefa[], processo: GkitJurProcessDetail): GkitJurProcessStatusSuggestion | null {
  if (processo.status !== 'ativo') return null

  for (const tarefa of tarefas) {
    const suggestion = tarefa.payload.sugestao_status
    if (!suggestion || typeof suggestion !== 'object') continue

    const status = text((suggestion as Record<string, unknown>).status)
    const statusMonitoramento = text((suggestion as Record<string, unknown>).status_monitoramento)
    if (status !== 'encerrado') continue

    return {
      tarefaId: tarefa.id,
      tarefaTitulo: tarefa.titulo,
      status: 'encerrado',
      statusMonitoramento: statusMonitoramento === 'pausado' ? 'pausado' : 'nao_monitorar',
      motivo: text((suggestion as Record<string, unknown>).motivo, 'Movimentacao sugere encerramento do processo.'),
    }
  }

  return null
}

function mapProcessSummary(row: Record<string, unknown>): GkitJurProcessSummary {
  return {
    baseSincronizacaoEm: text(row.base_sincronizacao_em) || null,
    criterioProntidao: recordValue(row.criterio_prontidao),
    erroMensagem: text(row.erro_mensagem) || null,
    faseProcessual: text(row.fase_processual) || null,
    fonteResumo: text(row.fonte_resumo) || null,
    geradoEm: text(row.gerado_em) || null,
    metadata: recordValue(row.metadata),
    modeloVersao: text(row.modelo_versao) || null,
    movimentacoesConsideradas: numberValue(row.movimentacoes_consideradas),
    movimentacoesRelevantes: numberValue(row.movimentacoes_relevantes),
    nivelProntidao: nivelProntidao(row.nivel_prontidao),
    pendenciasIdentificadas: stringList(row.pendencias_identificadas),
    proximasAcoesSugeridas: stringList(row.proximas_acoes_sugeridas),
    resumoOperacional: text(row.resumo_operacional) || null,
    riscosAlertas: stringList(row.riscos_alertas),
    statusResumo: text(row.status_resumo, 'pendente'),
    ultimaMovimentacaoConsideradaEm: text(row.ultima_movimentacao_considerada_em) || null,
    ultimosEventosRelevantes: stringList(row.ultimos_eventos_relevantes),
    updatedAt: text(row.updated_at) || null,
  }
}

async function getGkitJurProcessSummary(processoId: string): Promise<GkitJurProcessSummary | null> {
  const result = await admin()
    .schema('gkit_jur')
    .from('processos_resumos')
    .select('processo_id,nivel_prontidao,status_resumo,resumo_operacional,pendencias_identificadas,riscos_alertas,proximas_acoes_sugeridas,ultimos_eventos_relevantes,movimentacoes_consideradas,movimentacoes_relevantes,ultima_movimentacao_considerada_em,base_sincronizacao_em,gerado_em,updated_at,erro_mensagem,fase_processual,fonte_resumo,modelo_versao,criterio_prontidao,metadata')
    .eq('processo_id', processoId)
    .maybeSingle()

  if (result.error) {
    if (result.error.code === '42P01' || result.error.code === 'PGRST205') return null
    throw new Error(result.error.message)
  }

  return result.data ? mapProcessSummary(result.data as Record<string, unknown>) : null
}

function mapDocumento(row: Record<string, unknown>, maps: Awaited<ReturnType<typeof lookupTarefaMaps>>, fallback?: {
  carteiraNome: string | null
  responsavelNome: string | null
}): GkitJurDocumento {
  const carteiraId = text(row.carteira_id)
  const responsavelId = text(row.responsavel_id)
  return {
    id: String(row.id),
    processoId: String(row.processo_id),
    tipo: documentoTipo(row.tipo),
    titulo: text(row.titulo, 'Documento sem título'),
    descricao: text(row.descricao) || null,
    status: documentoStatus(row.status),
    dataDocumento: text(row.data_documento) || null,
    urlExterna: text(row.url_externa) || null,
    storagePath: text(row.storage_path) || null,
    origem: text(row.origem, 'manual'),
    carteiraId: carteiraId || null,
    carteiraNome: carteiraId ? maps.carteiras.get(carteiraId) ?? fallback?.carteiraNome ?? null : fallback?.carteiraNome ?? null,
    responsavelId: responsavelId || null,
    responsavelNome: responsavelId ? maps.responsaveis.get(responsavelId) ?? fallback?.responsavelNome ?? null : fallback?.responsavelNome ?? null,
    createdAt: text(row.created_at),
  }
}

function mapEventoProcesso(row: Record<string, unknown>, maps: Awaited<ReturnType<typeof lookupTarefaMaps>>, fallback?: {
  carteiraNome: string | null
  responsavelNome: string | null
}): GkitJurEventoProcesso {
  const carteiraId = text(row.carteira_id)
  const responsavelId = text(row.responsavel_id)
  return {
    id: String(row.id),
    processoId: String(row.processo_id),
    tipo: eventoTipo(row.tipo),
    titulo: text(row.titulo, 'Evento sem título'),
    descricao: text(row.descricao) || null,
    dataEvento: text(row.data_evento, text(row.created_at)),
    origem: text(row.origem, 'manual'),
    carteiraId: carteiraId || null,
    carteiraNome: carteiraId ? maps.carteiras.get(carteiraId) ?? fallback?.carteiraNome ?? null : fallback?.carteiraNome ?? null,
    responsavelId: responsavelId || null,
    responsavelNome: responsavelId ? maps.responsaveis.get(responsavelId) ?? fallback?.responsavelNome ?? null : fallback?.responsavelNome ?? null,
    createdAt: text(row.created_at),
  }
}

function buildProcessTimeline(input: {
  documentos: GkitJurDocumento[]
  eventos: GkitJurEventoProcesso[]
  movimentacoes: GkitJurMovimentacao[]
  tarefas: GkitJurTarefa[]
}): GkitJurTimelineItem[] {
  const timeline: GkitJurTimelineItem[] = [
    ...input.eventos.map((row) => ({
      id: `evento:${row.id}`,
      tipo: 'evento' as const,
      sourceId: row.id,
      processoId: row.processoId,
      titulo: row.titulo,
      descricao: row.descricao,
      dataReferencia: row.dataEvento,
      status: row.tipo,
      origem: row.origem,
      prioridade: 'media' as const,
      href: null,
    })),
    ...input.documentos.map((row) => ({
      id: `documento:${row.id}`,
      tipo: 'documento' as const,
      sourceId: row.id,
      processoId: row.processoId,
      titulo: row.titulo,
      descricao: row.descricao,
      dataReferencia: row.dataDocumento || row.createdAt,
      status: row.status,
      origem: row.origem,
      prioridade: 'media' as const,
      href: row.urlExterna,
    })),
    ...input.tarefas.map((row) => ({
      id: `tarefa:${row.id}`,
      tipo: 'tarefa' as const,
      sourceId: row.id,
      processoId: row.processoId,
      titulo: row.titulo,
      descricao: row.descricao,
      dataReferencia: row.prazoAt || row.createdAt,
      status: row.status,
      origem: row.origem,
      prioridade: row.prioridade,
      href: '#tarefas',
    })),
    ...input.movimentacoes.map((row) => ({
      id: `movimentacao:${row.id}`,
      tipo: 'movimentacao' as const,
      sourceId: row.id,
      processoId: row.processoId,
      titulo: row.nome,
      descricao: row.clienteNome,
      dataReferencia: row.dataHora,
      status: row.relevante ? 'relevante' : 'informativa',
      origem: row.origem,
      prioridade: row.geraAlerta || row.relevante ? 'alta' as const : 'baixa' as const,
      href: null,
    })),
  ]

  return timeline
    .sort((a, b) => {
      const left = a.dataReferencia ? new Date(a.dataReferencia).getTime() : 0
      const right = b.dataReferencia ? new Date(b.dataReferencia).getTime() : 0
      return right - left
    })
    .slice(0, 80)
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
  const [movimentacoesResult, tarefasResult, documentosResult, eventosResult, resumo] = await Promise.all([
    admin()
      .schema('gkit_jur')
      .from('movimentacoes')
      .select('id,processo_id,nome,data_hora,origem,relevante,gera_alerta')
      .eq('processo_id', id)
      .order('data_hora', { ascending: false, nullsFirst: false })
      .limit(50),
    admin()
      .schema('gkit_jur')
      .from('tarefas')
      .select('id,processo_id,carteira_id,responsavel_id,tipo,titulo,descricao,status,prioridade,prazo_at,origem,payload,created_at')
      .eq('processo_id', id)
      .in('status', OPEN_TASK_STATUSES)
      .order('prazo_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(50),
    admin()
      .schema('gkit_jur')
      .from('documentos')
      .select('id,processo_id,carteira_id,responsavel_id,tipo,titulo,descricao,status,data_documento,url_externa,storage_path,origem,created_at')
      .eq('processo_id', id)
      .eq('status', 'ativo')
      .order('data_documento', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(50),
    admin()
      .schema('gkit_jur')
      .from('eventos_processo')
      .select('id,processo_id,carteira_id,responsavel_id,tipo,titulo,descricao,data_evento,origem,created_at')
      .eq('processo_id', id)
      .order('data_evento', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(50),
    getGkitJurProcessSummary(id),
  ])

  if (movimentacoesResult.error) throw new Error(movimentacoesResult.error.message)
  if (tarefasResult.error) throw new Error(tarefasResult.error.message)
  if (documentosResult.error) throw new Error(documentosResult.error.message)
  if (eventosResult.error) throw new Error(eventosResult.error.message)
  const tarefaRows = (tarefasResult.data ?? []) as Array<Record<string, unknown>>
  const documentoRows = (documentosResult.data ?? []) as Array<Record<string, unknown>>
  const eventoRows = (eventosResult.data ?? []) as Array<Record<string, unknown>>
  const tarefaMaps = await lookupTarefaMaps([...tarefaRows, ...documentoRows, ...eventoRows])

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

  const movimentacoes = ((movimentacoesResult.data ?? []) as Array<Record<string, unknown>>).map((mov) => mapMovimentacao(mov, new Map([[id, item]])))
  const tarefas = tarefaRows.map((tarefa) => mapTarefa(tarefa, tarefaMaps, {
    carteiraNome: item.carteiraNome,
    responsavelNome: item.responsavelNome,
  }))
  const documentos = documentoRows.map((documento) => mapDocumento(documento, tarefaMaps, {
    carteiraNome: item.carteiraNome,
    responsavelNome: item.responsavelNome,
  }))
  const eventos = eventoRows.map((evento) => mapEventoProcesso(evento, tarefaMaps, {
    carteiraNome: item.carteiraNome,
    responsavelNome: item.responsavelNome,
  }))

  return {
    documentos,
    eventos,
    formData,
    movimentacoes,
    processo,
    resumo,
    statusSuggestion: statusSuggestionFromTarefas(tarefas, processo),
    tarefas,
    timeline: buildProcessTimeline({ documentos, eventos, movimentacoes, tarefas }),
  }
}

async function pendingGroup(title: string, description: string, href: string, column: string) {
  const result = await admin()
    .schema('gkit_jur')
    .from('processos')
    .select('id,numero_cnj,numero_cnj_limpo,titulo,pasta,cliente_id,cliente_nome,carteira_id,responsavel_id,tribunal_sigla,classe_nome,orgao_julgador_nome,ultima_movimentacao_em,ultima_sincronizacao_em,status,status_monitoramento,updated_at', { count: 'exact' })
    .eq('status', DEFAULT_PROCESS_STATUS)
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
    pendingGroup('Sem carteira', 'Processos que ainda não entraram em uma carteira operacional.', '/modulos/gkit-jur/processos?saneamento=sem_carteira', 'carteira_id'),
    pendingGroup('Sem responsável', 'Processos sem dono operacional definido.', '/modulos/gkit-jur/processos?saneamento=sem_responsavel', 'responsavel_id'),
    pendingGroup('Sem tribunal', 'Processos sem tribunal identificado na importação.', '/modulos/gkit-jur/processos?saneamento=sem_tribunal', 'tribunal_sigla'),
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
      .eq('status', DEFAULT_PROCESS_STATUS)
      .in('id', processoIds)

    if (processosResult.error) throw new Error(processosResult.error.message)
    const rows = (processosResult.data ?? []) as Array<Record<string, unknown>>
    const maps = await lookupMaps(rows)
    rows.forEach((row) => processoMap.set(String(row.id), mapProcesso(row, maps)))
  }

  return {
    metrics,
    movimentacoes: movements
      .filter((row) => processoMap.has(text(row.processo_id)))
      .map((row) => mapMovimentacao(row, processoMap)),
  }
}

export async function getGkitJurAuditoria(): Promise<GkitJurAuditoriaData> {
  const [importadosResult, sincronizacoesResult] = await Promise.all([
    admin().schema('gkit_jur').from('processos').select('id', { count: 'exact', head: true }).eq('status', DEFAULT_PROCESS_STATUS).not('importado_de', 'is', null),
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

function inboxPriority(score: number): GkitJurInboxPrioridade {
  if (score >= 85) return 'critica'
  if (score >= 65) return 'alta'
  if (score >= 40) return 'media'
  return 'baixa'
}

function daysSince(value: string | null) {
  if (!value) return null
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return null
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000))
}

const INBOX_TYPE_ORDER: Record<string, number> = {
  tarefa: 1,
  pendencia: 2,
  automacao: 3,
  processo: 4,
}

function compareText(a: string | null | undefined, b: string | null | undefined) {
  return (a || '').localeCompare(b || '', 'pt-BR', { sensitivity: 'base' })
}

function compareInboxPriority(a: GkitJurInboxItem, b: GkitJurInboxItem) {
  if (b.score !== a.score) return b.score - a.score
  const ad = a.dataReferencia ? new Date(a.dataReferencia).getTime() : 0
  const bd = b.dataReferencia ? new Date(b.dataReferencia).getTime() : 0
  return ad - bd
}

function sortInboxItems(items: GkitJurInboxItem[], ordenacao: GkitJurInboxOrdenacao = 'prioridade') {
  return items.sort((a, b) => {
    if (ordenacao === 'tipo') {
      const typeDiff = (INBOX_TYPE_ORDER[a.tipo] ?? 99) - (INBOX_TYPE_ORDER[b.tipo] ?? 99)
      if (typeDiff !== 0) return typeDiff
      const originDiff = compareText(a.origem, b.origem)
      if (originDiff !== 0) return originDiff
      return compareInboxPriority(a, b)
    }

    if (ordenacao === 'responsavel') {
      const ownerDiff = compareText(a.responsavelNome || 'Sem responsavel', b.responsavelNome || 'Sem responsavel')
      if (ownerDiff !== 0) return ownerDiff
      return compareInboxPriority(a, b)
    }

    if (ordenacao === 'carteira') {
      const walletDiff = compareText(a.carteiraNome || 'Sem carteira', b.carteiraNome || 'Sem carteira')
      if (walletDiff !== 0) return walletDiff
      return compareInboxPriority(a, b)
    }

    return compareInboxPriority(a, b)
  })
}

function processInboxItem(
  processo: GkitJurProcessListItem,
  row: Record<string, unknown>,
  score: number,
  origem: string,
  motivo: string,
  acaoLabel: string,
): GkitJurInboxItem {
  return {
    id: `${origem.toLowerCase().replace(/\s+/g, '-')}-${processo.id}`,
    tipo: 'processo',
    origem,
    titulo: processo.numeroCnj,
    subtitulo: processo.clienteNome || processo.titulo || 'Processo sem cliente identificado',
    status: processo.status === 'erro' || processo.statusMonitoramento === 'erro' ? 'critico' : 'aberto',
    prioridade: inboxPriority(score),
    score,
    dataReferencia: processo.ultimaMovimentacaoEm ?? processo.ultimaSincronizacaoEm,
    prazoAt: null,
    processoId: processo.id,
    carteiraId: text(row.carteira_id) || null,
    responsavelId: text(row.responsavel_id) || null,
    responsavelNome: processo.responsavelNome,
    carteiraNome: processo.carteiraNome,
    entidadeTipo: 'processo',
    entidadeId: processo.id,
    acaoLabel,
    acaoUrl: `/modulos/gkit-jur/processos/${processo.id}`,
    motivo,
  }
}

function taskScore(task: GkitJurTarefa) {
  const base: Record<GkitJurInboxPrioridade, number> = { critica: 88, alta: 72, media: 52, baixa: 32 }
  let score = base[task.prioridade]
  if (task.prazoAt) {
    const due = new Date(task.prazoAt).getTime()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const daysToDue = Math.floor((due - today.getTime()) / 86_400_000)
    if (daysToDue < 0) score += 18
    else if (daysToDue === 0) score += 12
    else if (daysToDue <= 3) score += 6
  }
  return Math.min(99, score)
}

function taskInboxItem(task: GkitJurTarefa, processo: GkitJurProcessListItem): GkitJurInboxItem {
  const score = taskScore(task)
  const overdue = task.prazoAt ? new Date(task.prazoAt).getTime() < Date.now() : false
  return {
    id: `tarefa-${task.id}`,
    tipo: 'tarefa',
    origem: task.origem === 'manual' ? 'Tarefa manual' : 'Tarefa automática',
    titulo: task.titulo,
    subtitulo: `${processo.numeroCnj} - ${processo.clienteNome || processo.titulo || 'Processo sem cliente identificado'}`,
    status: overdue ? 'vencida' : task.status,
    prioridade: inboxPriority(score),
    score,
    dataReferencia: task.prazoAt ?? task.createdAt,
    prazoAt: task.prazoAt,
    processoId: task.processoId,
    carteiraId: task.carteiraId,
    responsavelId: task.responsavelId,
    responsavelNome: task.responsavelNome ?? processo.responsavelNome,
    carteiraNome: task.carteiraNome ?? processo.carteiraNome,
    entidadeTipo: 'tarefa',
    entidadeId: task.id,
    acaoLabel: 'Abrir processo',
    acaoUrl: `/modulos/gkit-jur/processos/${task.processoId}#tarefas`,
    motivo: overdue ? 'Tarefa com prazo vencido.' : task.prazoAt ? 'Tarefa com prazo definido.' : 'Tarefa aberta aguardando providência.',
  }
}

async function listInboxTarefaItems(): Promise<GkitJurInboxItem[]> {
  const result = await admin()
    .schema('gkit_jur')
    .from('tarefas')
    .select('id,processo_id,carteira_id,responsavel_id,tipo,titulo,descricao,status,prioridade,prazo_at,origem,created_at')
    .in('status', OPEN_TASK_STATUSES)
    .order('prazo_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(150)

  if (result.error) throw new Error(result.error.message)

  const rows = (result.data ?? []) as Array<Record<string, unknown>>
  const processoIds = [...new Set(rows.map((row) => text(row.processo_id)).filter(Boolean))]
  if (!processoIds.length) return []

  const processosResult = await admin()
    .schema('gkit_jur')
    .from('processos')
    .select('id,numero_cnj,numero_cnj_limpo,titulo,pasta,cliente_id,cliente_nome,carteira_id,responsavel_id,tribunal_sigla,classe_nome,orgao_julgador_nome,ultima_movimentacao_em,ultima_sincronizacao_em,status,status_monitoramento')
    .eq('status', DEFAULT_PROCESS_STATUS)
    .in('id', processoIds)

  if (processosResult.error) throw new Error(processosResult.error.message)

  const processoRows = (processosResult.data ?? []) as Array<Record<string, unknown>>
  const processoMaps = await lookupMaps(processoRows)
  const processoMap = new Map(processoRows.map((row) => [String(row.id), mapProcesso(row, processoMaps)]))
  const tarefaMaps = await lookupTarefaMaps(rows)

  return rows
    .map((row) => {
      const processo = processoMap.get(text(row.processo_id))
      if (!processo) return null
      return taskInboxItem(mapTarefa(row, tarefaMaps, {
        carteiraNome: processo.carteiraNome,
        responsavelNome: processo.responsavelNome,
      }), processo)
    })
    .filter(Boolean) as GkitJurInboxItem[]
}

async function listInboxProcessItems(): Promise<GkitJurInboxItem[]> {
  const result = await admin()
    .schema('gkit_jur')
    .from('processos')
    .select('id,numero_cnj,numero_cnj_limpo,titulo,pasta,cliente_id,cliente_nome,carteira_id,responsavel_id,tribunal_sigla,classe_nome,orgao_julgador_nome,ultima_movimentacao_em,ultima_sincronizacao_em,status,status_monitoramento,updated_at')
    .eq('status', DEFAULT_PROCESS_STATUS)
    .order('updated_at', { ascending: false })
    .limit(500)

  if (result.error) throw new Error(result.error.message)

  const rows = (result.data ?? []) as Array<Record<string, unknown>>
  const maps = await lookupMaps(rows)
  const items: GkitJurInboxItem[] = []

  for (const row of rows) {
    const processo = mapProcesso(row, maps)
    const missing = [
      !processo.clienteNome ? 'cliente' : '',
      !processo.carteiraNome ? 'carteira' : '',
      !processo.responsavelNome ? 'responsável' : '',
      !processo.tribunalSigla ? 'tribunal' : '',
    ].filter(Boolean)

    if (processo.status === 'erro' || processo.statusMonitoramento === 'erro') {
      items.push(processInboxItem(processo, row, 92, 'Monitoramento', 'Processo ou monitoramento com erro operacional.', 'Revisar processo'))
    }

    if (missing.length) {
      const score = missing.includes('responsável') ? 72 : 58
      items.push(processInboxItem(
        processo,
        row,
        score,
        'Saneamento',
        `Faltam vínculos de ${missing.join(', ')}.`,
        'Sanear cadastro',
      ))
    }

    const idleDays = daysSince(processo.ultimaMovimentacaoEm)
    if (!processo.ultimaMovimentacaoEm || (idleDays !== null && idleDays >= 180)) {
      items.push(processInboxItem(
        processo,
        row,
        idleDays === null ? 48 : Math.min(78, 40 + Math.floor(idleDays / 20)),
        'Monitoramento',
        idleDays === null ? 'Processo sem movimentação registrada.' : `Sem movimentação há ${idleDays} dia(s).`,
        'Acompanhar andamento',
      ))
    }
  }

  return items
}

async function listInboxPendenciaItems(): Promise<GkitJurInboxItem[]> {
  const result = await admin()
    .schema('gkit_jur')
    .from('pendencias')
    .select('id,carteira_id,processo_id,tipo,origem,titulo,descricao,prioridade,status,responsavel_id,prazo_limite,entidade_tipo,entidade_id,created_at')
    .in('status', ['aberta', 'em_tratamento', 'aguardando_terceiro'])
    .order('created_at', { ascending: false })
    .limit(100)

  if (result.error) throw new Error(result.error.message)

  const rows = (result.data ?? []) as Array<Record<string, unknown>>
  const carteiraIds = [...new Set(rows.map((row) => text(row.carteira_id)).filter(Boolean))]
  const responsavelIds = [...new Set(rows.map((row) => text(row.responsavel_id)).filter(Boolean))]
  const processoIds = [...new Set(rows.map((row) => text(row.processo_id)).filter(Boolean))]

  const [carteirasResult, responsaveisResult, processosAtivosResult] = await Promise.all([
    carteiraIds.length
      ? admin().schema('core').from('carteiras').select('id,nome').in('id', carteiraIds)
      : Promise.resolve({ data: [], error: null }),
    responsavelIds.length
      ? admin().schema('security').from('usuarios').select('id,nome,email').in('id', responsavelIds)
      : Promise.resolve({ data: [], error: null }),
    processoIds.length
      ? admin().schema('gkit_jur').from('processos').select('id').eq('status', DEFAULT_PROCESS_STATUS).in('id', processoIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (carteirasResult.error) throw new Error(carteirasResult.error.message)
  if (responsaveisResult.error) throw new Error(responsaveisResult.error.message)
  if (processosAtivosResult.error) throw new Error(processosAtivosResult.error.message)

  const carteiras = new Map(((carteirasResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.id), text(row.nome)]))
  const responsaveis = new Map(((responsaveisResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.id), text(row.nome, text(row.email))]))
  const processosAtivos = new Set(((processosAtivosResult.data ?? []) as Array<Record<string, unknown>>).map((row) => String(row.id)))
  const scoreByPriority: Record<GkitJurInboxPrioridade, number> = { critica: 90, alta: 72, media: 52, baixa: 28 }

  return rows.filter((row) => {
    const processoId = text(row.processo_id)
    return !processoId || processosAtivos.has(processoId)
  }).map((row) => {
    const priority = (['critica', 'alta', 'media', 'baixa'].includes(text(row.prioridade)) ? text(row.prioridade) : 'media') as GkitJurInboxPrioridade
    const score = scoreByPriority[priority]
    const carteiraId = text(row.carteira_id)
    const responsavelId = text(row.responsavel_id)
    const processoId = text(row.processo_id)
    return {
      id: `pendencia-${row.id}`,
      tipo: 'pendencia',
      origem: text(row.origem, 'Pendência'),
      titulo: text(row.titulo, 'Pendência operacional'),
      subtitulo: text(row.descricao, 'Trava operacional aberta.'),
      status: text(row.status, 'aberta'),
      prioridade: priority,
      score,
      dataReferencia: text(row.prazo_limite) || text(row.created_at) || null,
      prazoAt: text(row.prazo_limite) || null,
      processoId: processoId || null,
      carteiraId: carteiraId || null,
      responsavelId: responsavelId || null,
      responsavelNome: responsavelId ? responsaveis.get(responsavelId) ?? null : null,
      carteiraNome: carteiraId ? carteiras.get(carteiraId) ?? null : null,
      entidadeTipo: text(row.entidade_tipo, processoId ? 'processo' : 'pendencia'),
      entidadeId: text(row.entidade_id, processoId || String(row.id)),
      acaoLabel: processoId ? 'Abrir processo' : 'Resolver pendência',
      acaoUrl: processoId ? `/modulos/gkit-jur/processos/${processoId}` : '/modulos/gkit-jur/pendencias',
      motivo: 'Pendência persistente aberta no módulo jurídico.',
    }
  })
}

async function listInboxAgenteItems(): Promise<GkitJurInboxItem[]> {
  const result = await admin()
    .schema('gkit_jur')
    .from('agente_execucoes')
    .select('id,receita_id,fonte_id,carteira_id,status,erro_mensagem,tentativas,created_at,updated_at')
    .in('status', ['pendente', 'falha', 'precisa_intervencao', 'aguardando_validacao'])
    .order('created_at', { ascending: false })
    .limit(100)

  if (result.error) throw new Error(result.error.message)

  const rows = (result.data ?? []) as Array<Record<string, unknown>>
  const receitaIds = [...new Set(rows.map((row) => text(row.receita_id)).filter(Boolean))]
  const fonteIds = [...new Set(rows.map((row) => text(row.fonte_id)).filter(Boolean))]
  const carteiraIds = [...new Set(rows.map((row) => text(row.carteira_id)).filter(Boolean))]

  const [receitasResult, fontesResult, carteirasResult] = await Promise.all([
    receitaIds.length ? admin().schema('gkit_jur').from('agente_receitas').select('id,nome').in('id', receitaIds) : Promise.resolve({ data: [], error: null }),
    fonteIds.length ? admin().schema('gkit_jur').from('agente_fontes').select('id,nome').in('id', fonteIds) : Promise.resolve({ data: [], error: null }),
    carteiraIds.length ? admin().schema('core').from('carteiras').select('id,nome').in('id', carteiraIds) : Promise.resolve({ data: [], error: null }),
  ])

  if (receitasResult.error) throw new Error(receitasResult.error.message)
  if (fontesResult.error) throw new Error(fontesResult.error.message)
  if (carteirasResult.error) throw new Error(carteirasResult.error.message)

  const receitas = new Map(((receitasResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.id), text(row.nome)]))
  const fontes = new Map(((fontesResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.id), text(row.nome)]))
  const carteiras = new Map(((carteirasResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.id), text(row.nome)]))

  return rows.map((row) => {
    const statusValue = text(row.status, 'pendente')
    const score = statusValue === 'falha' || statusValue === 'precisa_intervencao' ? 86 : statusValue === 'aguardando_validacao' ? 68 : 45
    const receitaId = text(row.receita_id)
    const fonteId = text(row.fonte_id)
    const carteiraId = text(row.carteira_id)
    return {
      id: `agente-${row.id}`,
      tipo: 'automacao',
      origem: 'Agente jurídico',
      titulo: receitaId ? receitas.get(receitaId) ?? 'Execução do agente' : 'Execução do agente',
      subtitulo: fonteId ? fontes.get(fonteId) ?? 'Fonte não definida' : 'Fonte não definida',
      status: statusValue,
      prioridade: inboxPriority(score),
      score,
      dataReferencia: text(row.updated_at) || text(row.created_at) || null,
      prazoAt: null,
      processoId: null,
      carteiraId: carteiraId || null,
      responsavelId: null,
      responsavelNome: null,
      carteiraNome: carteiraId ? carteiras.get(carteiraId) ?? null : null,
      entidadeTipo: 'agente_execucao',
      entidadeId: String(row.id),
      acaoLabel: 'Abrir agente',
      acaoUrl: '/modulos/gkit-jur/agente',
      motivo: text(row.erro_mensagem, statusValue === 'aguardando_validacao' ? 'Resultado aguardando validação humana.' : 'Execução aguardando continuidade.'),
    }
  })
}

function filterInboxItems(items: GkitJurInboxItem[], selected: GkitJurInboxFilaId) {
  if (selected === 'tarefas') return items.filter((item) => item.tipo === 'tarefa')
  if (selected === 'criticos') return items.filter((item) => item.prioridade === 'critica' || item.score >= 85)
  if (selected === 'pendencias') return items.filter((item) => item.tipo === 'pendencia' || item.origem === 'Saneamento')
  if (selected === 'automacao') return items.filter((item) => item.tipo === 'automacao')
  if (selected === 'sem-retorno') return items.filter((item) => item.origem === 'Monitoramento' && item.motivo.toLowerCase().includes('movimentação'))
  return items
}

function buildGkitJurInboxFilters(params?: ModuleSearchParams | null): GkitJurInboxFilters {
  const ordenacao = singleParam(params?.ordenacao)
  return {
    carteiraId: singleParam(params?.carteira_id),
    ordenacao: (['prioridade', 'tipo', 'responsavel', 'carteira'].includes(ordenacao) ? ordenacao : 'prioridade') as GkitJurInboxOrdenacao,
    responsavelId: singleParam(params?.responsavel_id),
  }
}

function applyInboxFilters(items: GkitJurInboxItem[], filters: GkitJurInboxFilters) {
  return items.filter((item) => {
    if (filters.carteiraId && item.carteiraId !== filters.carteiraId) return false
    if (filters.responsavelId && item.responsavelId !== filters.responsavelId) return false
    return true
  })
}

export async function getGkitJurInbox(params?: ModuleSearchParams | null): Promise<GkitJurInboxData> {
  const selected = (['hoje', 'tarefas', 'criticos', 'pendencias', 'automacao', 'sem-retorno'].includes(singleParam(params?.fila))
    ? singleParam(params?.fila)
    : 'hoje') as GkitJurInboxFilaId
  const filters = buildGkitJurInboxFilters(params)

  const [processItems, tarefaItems, pendenciaItems, agenteItems, formData] = await Promise.all([
    listInboxProcessItems(),
    listInboxTarefaItems(),
    listInboxPendenciaItems(),
    listInboxAgenteItems(),
    getGkitJurFormData(),
  ])

  const allItems = applyInboxFilters(sortInboxItems([...tarefaItems, ...processItems, ...pendenciaItems, ...agenteItems], filters.ordenacao), filters)
  const tarefas = filterInboxItems(allItems, 'tarefas')
  const criticos = filterInboxItems(allItems, 'criticos')
  const pendencias = filterInboxItems(allItems, 'pendencias')
  const automacao = filterInboxItems(allItems, 'automacao')
  const semRetorno = filterInboxItems(allItems, 'sem-retorno')

  return {
    selected,
    filters,
    filterOptions: {
      carteiras: formData.carteiras,
      responsaveis: formData.responsaveis,
    },
    filas: [
      { id: 'hoje', title: 'Hoje', description: 'Fila recomendada para iniciar o dia.', count: allItems.length },
      { id: 'tarefas', title: 'Tarefas', description: 'Providências abertas dos processos.', count: tarefas.length },
      { id: 'criticos', title: 'Críticos', description: 'Risco, erro ou bloqueio real.', count: criticos.length },
      { id: 'pendencias', title: 'Pendências', description: 'Travas de cadastro e operação.', count: pendencias.length },
      { id: 'automacao', title: 'Automação', description: 'Intervenções do agente.', count: automacao.length },
      { id: 'sem-retorno', title: 'Sem retorno', description: 'Processos sem movimentação recente.', count: semRetorno.length },
    ],
    metrics: {
      hoje: allItems.length,
      criticos: criticos.length,
      prazos: tarefas.length,
      automacoes: automacao.length,
      pendencias: pendencias.length,
    },
    items: filterInboxItems(allItems, selected).slice(0, INBOX_ITEMS_LIMIT),
    proximasAcoes: [
      {
        title: 'Executar tarefas abertas',
        description: 'Providências manuais e futuras tarefas da integração entram nesta fila.',
        href: '/modulos/gkit-jur/inbox?fila=tarefas',
        label: 'Abrir tarefas',
        priority: tarefas.length ? 'alta' : 'baixa',
        count: tarefas.length,
      },
      {
        title: 'Sanear processos sem dono',
        description: 'Aplique as sugestões de cliente, carteira e responsável antes de ligar prazos e publicações.',
        href: '/modulos/gkit-jur/pendencias',
        label: 'Abrir saneamento',
        priority: pendencias.length ? 'alta' : 'baixa',
        count: pendencias.length,
      },
      {
        title: 'Revisar automações pendentes',
        description: 'Falhas, validações e execuções paradas entram aqui para intervenção humana.',
        href: '/modulos/gkit-jur/agente',
        label: 'Abrir agente',
        priority: automacao.length ? 'alta' : 'baixa',
        count: automacao.length,
      },
      {
        title: 'Acompanhar processos sem movimentação',
        description: 'Fila provisória até entrarmos com publicações, prazos e DataJud.',
        href: '/modulos/gkit-jur/processos?sort=ultima_movimentacao_em&dir=asc',
        label: 'Ver processos',
        priority: semRetorno.length ? 'media' : 'baixa',
        count: semRetorno.length,
      },
    ],
  }
}

function agentStatus(value: unknown): GkitJurAgenteExecucaoStatus {
  const current = text(value, 'pendente')
  if (['pendente', 'em_execucao', 'sucesso', 'falha', 'precisa_intervencao', 'aguardando_validacao', 'cancelada'].includes(current)) {
    return current as GkitJurAgenteExecucaoStatus
  }
  return 'pendente'
}

export async function getGkitJurAgenteData(): Promise<GkitJurAgenteData> {
  const [carteirasResult, fontesResult, receitasResult, execucoesResult] = await Promise.all([
    admin().schema('core').from('carteiras').select('id,nome').eq('status', 'ativo').order('nome', { ascending: true }),
    admin().schema('gkit_jur').from('agente_fontes').select('id,carteira_id,nome,tipo,url_base,exige_captcha,exige_2fa,ativo').order('created_at', { ascending: false }).limit(100),
    admin().schema('gkit_jur').from('agente_receitas').select('id,fonte_id,carteira_id,nome,descricao,tipo_coleta,periodicidade,script_key,tipo_arquivo_esperado,ativo').order('created_at', { ascending: false }).limit(100),
    admin().schema('gkit_jur').from('agente_execucoes').select('id,receita_id,fonte_id,carteira_id,status,iniciado_em,finalizado_em,erro_mensagem,tentativas,created_at').order('created_at', { ascending: false }).limit(50),
  ])

  for (const result of [carteirasResult, fontesResult, receitasResult, execucoesResult]) {
    if (result.error) throw new Error(result.error.message)
  }

  const carteiras = ((carteirasResult.data ?? []) as Array<Record<string, unknown>>).map((row) => optionFromRow(row, ['nome']))
  const carteiraMap = new Map(carteiras.map((item) => [item.value, item.label]))
  const fonteRows = (fontesResult.data ?? []) as Array<Record<string, unknown>>
  const receitaRows = (receitasResult.data ?? []) as Array<Record<string, unknown>>
  const fonteMap = new Map(fonteRows.map((row) => [String(row.id), text(row.nome)]))
  const receitaMap = new Map(receitaRows.map((row) => [String(row.id), text(row.nome)]))

  const fontes = fonteRows.map((row) => {
    const carteiraId = text(row.carteira_id)
    return {
      id: String(row.id),
      nome: text(row.nome, 'Fonte sem nome'),
      tipo: text(row.tipo, 'portal_web'),
      urlBase: text(row.url_base) || null,
      carteiraNome: carteiraId ? carteiraMap.get(carteiraId) ?? null : null,
      exigeCaptcha: Boolean(row.exige_captcha),
      exige2fa: Boolean(row.exige_2fa),
      ativo: Boolean(row.ativo),
    }
  })

  const receitas = receitaRows.map((row) => {
    const fonteId = text(row.fonte_id)
    const carteiraId = text(row.carteira_id)
    return {
      id: String(row.id),
      fonteId: fonteId || null,
      fonteNome: fonteId ? fonteMap.get(fonteId) ?? null : null,
      carteiraId: carteiraId || null,
      carteiraNome: carteiraId ? carteiraMap.get(carteiraId) ?? null : null,
      nome: text(row.nome, 'Receita sem nome'),
      descricao: text(row.descricao) || null,
      tipoColeta: text(row.tipo_coleta, 'movimentacao'),
      periodicidade: text(row.periodicidade, 'manual'),
      scriptKey: text(row.script_key) || null,
      tipoArquivoEsperado: text(row.tipo_arquivo_esperado, 'json'),
      ativo: Boolean(row.ativo),
    }
  })

  const execucoes = ((execucoesResult.data ?? []) as Array<Record<string, unknown>>).map((row): GkitJurAgenteExecucao => {
    const receitaId = text(row.receita_id)
    const fonteId = text(row.fonte_id)
    const carteiraId = text(row.carteira_id)
    return {
      id: String(row.id),
      receitaNome: receitaId ? receitaMap.get(receitaId) ?? 'Receita removida' : 'Execução avulsa',
      fonteNome: fonteId ? fonteMap.get(fonteId) ?? null : null,
      carteiraNome: carteiraId ? carteiraMap.get(carteiraId) ?? null : null,
      status: agentStatus(row.status),
      iniciadoEm: text(row.iniciado_em) || null,
      finalizadoEm: text(row.finalizado_em) || null,
      erroMensagem: text(row.erro_mensagem) || null,
      tentativas: Number(row.tentativas ?? 0),
      createdAt: text(row.created_at),
    }
  })

  return {
    carteiras,
    fontes,
    receitas,
    execucoes,
    metrics: {
      fontesAtivas: fontes.filter((item) => item.ativo).length,
      receitasAtivas: receitas.filter((item) => item.ativo).length,
      pendentes: execucoes.filter((item) => ['pendente', 'em_execucao', 'aguardando_validacao'].includes(item.status)).length,
      falhas: execucoes.filter((item) => ['falha', 'precisa_intervencao'].includes(item.status)).length,
    },
  }
}

async function fetchAllActiveProcessMonitoringRows() {
  const rows: Array<Record<string, unknown>> = []
  const pageSize = 1000

  for (let from = 0; ; from += pageSize) {
    const result = await admin()
      .schema('gkit_jur')
      .from('processos')
      .select('id,tribunal_sigla,tribunal_alias,status_monitoramento,ultima_sincronizacao_em,carteira_id,responsavel_id')
      .eq('status', DEFAULT_PROCESS_STATUS)
      .range(from, from + pageSize - 1)

    if (result.error) throw new Error(result.error.message)

    const data = (result.data ?? []) as Array<Record<string, unknown>>
    rows.push(...data)
    if (data.length < pageSize) break
  }

  return rows
}

function tribunalMonitoramentoNivel(item: Omit<GkitJurIntegracaoTribunal, 'nivel' | 'status'>): GkitJurMonitoramentoNivel {
  if (!item.totalAtivos) return 'cinza'
  if (!item.alias || item.erro > 0) return 'vermelho'
  if (item.semSincronizacao > 0 || item.atrasados > 0 || item.semCarteira > 0 || item.semResponsavel > 0 || item.pausado > 0) return 'amarelo'
  return 'verde'
}

function tribunalMonitoramentoStatus(nivel: GkitJurMonitoramentoNivel, item: Omit<GkitJurIntegracaoTribunal, 'nivel' | 'status'>) {
  if (nivel === 'vermelho') return item.alias ? 'Erro no monitoramento' : 'Sem mapeamento DataJud'
  if (nivel === 'amarelo') return item.semSincronizacao ? 'Aguardando primeira sincronização' : 'Requer saneamento'
  if (nivel === 'verde') return 'Monitoramento saudável'
  return 'Sem processos ativos'
}

async function getReadinessMetrics(activeProcessIds: Set<string>) {
  const totals = {
    aceitaveis: 0,
    capa: 0,
    desatualizado: 0,
    erro: 0,
    naoProntos: 0,
    parcial: 0,
    pronto: 0,
    semBase: 0,
    semResumo: activeProcessIds.size,
  }

  if (!activeProcessIds.size) return totals

  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const result = await admin()
      .schema('gkit_jur')
      .from('processos_resumos')
      .select('processo_id,nivel_prontidao')
      .range(from, from + pageSize - 1)

    if (result.error) {
      if (result.error.code === '42P01' || result.error.code === 'PGRST205') return totals
      throw new Error(result.error.message)
    }

    const data = (result.data ?? []) as Array<Record<string, unknown>>
    for (const row of data) {
      const processoId = text(row.processo_id)
      if (!activeProcessIds.has(processoId)) continue
      totals.semResumo -= 1
      const nivel = text(row.nivel_prontidao)
      if (nivel === 'pronto') totals.pronto += 1
      else if (nivel === 'parcial') totals.parcial += 1
      else if (nivel === 'capa') totals.capa += 1
      else if (nivel === 'desatualizado') totals.desatualizado += 1
      else if (nivel === 'erro') totals.erro += 1
      else totals.semBase += 1
    }

    if (data.length < pageSize) break
  }

  totals.semResumo = Math.max(0, totals.semResumo)
  totals.aceitaveis = totals.pronto
  totals.naoProntos = Math.max(0, activeProcessIds.size - totals.aceitaveis)

  return totals
}

export async function getGkitJurIntegracaoData(): Promise<GkitJurIntegracaoData> {
  const rows = await fetchAllActiveProcessMonitoringRows()
  const activeProcessIds = new Set(rows.map((row) => text(row.id)).filter(Boolean))
  const prontidao = await getReadinessMetrics(activeProcessIds)
  const cronResult = await admin()
    .schema('gkit_jur')
    .from('cron_locks')
    .select('job_key,locked_at,expires_at,metadata,updated_at')
    .eq('job_key', 'gkit_jur_nightly_sync')
    .maybeSingle()

  if (cronResult.error) throw new Error(cronResult.error.message)

  const cronRow = (cronResult.data ?? null) as Record<string, unknown> | null
  const cronMetadata = cronRow && typeof cronRow.metadata === 'object' && cronRow.metadata !== null
    ? cronRow.metadata as Record<string, unknown>
    : {}
  const cronResultPayload = typeof cronMetadata.result === 'object' && cronMetadata.result !== null
    ? cronMetadata.result as Record<string, unknown>
    : null
  const cronError = text(cronMetadata.error) || null
  const cronStartedAt = text(cronMetadata.started_at) || text(cronRow?.locked_at) || null
  const cronFinishedAt = text(cronMetadata.finished_at) || null
  const cronExpiresAt = text(cronRow?.expires_at)
  const cronRunning = Boolean(cronExpiresAt && new Date(cronExpiresAt).getTime() > Date.now() && !cronFinishedAt)
  const cronStatus = cronRunning ? 'em_execucao' : cronError ? 'erro' : cronFinishedAt ? 'ativo' : 'nunca_executado'
  const tribunalCatalog = new Map(DATAJUD_TRIBUNAIS.map((tribunal) => [tribunal.sigla, tribunal]))
  const staleBefore = Date.now() - 48 * 60 * 60 * 1000
  const groups = new Map<string, Omit<GkitJurIntegracaoTribunal, 'nivel' | 'status'>>()

  for (const row of rows) {
    const sigla = text(row.tribunal_sigla) || 'SEM_TRIBUNAL'
    const catalog = tribunalCatalog.get(sigla)
    const current = groups.get(sigla) ?? {
      alias: (catalog?.alias ?? text(row.tribunal_alias)) || null,
      atrasados: 0,
      erro: 0,
      monitorando: 0,
      naoMonitorar: 0,
      nome: catalog?.nome ?? (sigla === 'SEM_TRIBUNAL' ? 'Tribunal não identificado' : sigla),
      pausado: 0,
      saneamentoProcessos: 0,
      semCarteira: 0,
      semResponsavel: 0,
      semSincronizacao: 0,
      totalAtivos: 0,
      tribunal: sigla,
    }

    const syncAt = text(row.ultima_sincronizacao_em)
    const syncTime = syncAt ? new Date(syncAt).getTime() : Number.NaN
    const monitor = monitoramento(row.status_monitoramento)

    current.totalAtivos += 1
    if (monitor === 'monitorando') current.monitorando += 1
    if (monitor === 'erro') current.erro += 1
    if (monitor === 'pausado') current.pausado += 1
    if (monitor === 'nao_monitorar') current.naoMonitorar += 1
    if (!text(row.carteira_id) || !text(row.responsavel_id)) current.saneamentoProcessos += 1
    if (!text(row.carteira_id)) current.semCarteira += 1
    if (!text(row.responsavel_id)) current.semResponsavel += 1
    if (!syncAt) current.semSincronizacao += 1
    if (syncAt && (!Number.isFinite(syncTime) || syncTime < staleBefore)) current.atrasados += 1

    groups.set(sigla, current)
  }

  const levelWeight: Record<GkitJurMonitoramentoNivel, number> = { vermelho: 0, amarelo: 1, verde: 2, cinza: 3 }
  const tribunais = [...groups.values()]
    .map((item): GkitJurIntegracaoTribunal => {
      const nivel = tribunalMonitoramentoNivel(item)
      return { ...item, nivel, status: tribunalMonitoramentoStatus(nivel, item) }
    })
    .sort((a, b) => levelWeight[a.nivel] - levelWeight[b.nivel] || b.totalAtivos - a.totalAtivos || a.tribunal.localeCompare(b.tribunal, 'pt-BR'))

  return {
    cron: {
      ativo: Boolean(process.env.CRON_SECRET),
      batchLimit: envPositiveInt(process.env.GKIT_JUR_CRON_DATAJUD_LIMIT, GKIT_JUR_CRON_DEFAULT_DATAJUD_LIMIT, 10),
      horarioLocal: '03:00',
      lastError: cronError,
      lastFinishedAt: cronFinishedAt,
      lastResult: cronResultPayload
        ? {
            erros: Number(cronResultPayload.erro ?? 0),
            movimentosNovos: Number(cronResultPayload.movimentosNovos ?? 0),
            processos: Number(cronResultPayload.processos ?? 0),
            tarefasGeradas: Number(cronResultPayload.tarefasGeradas ?? 0),
          }
        : null,
      lastStartedAt: cronStartedAt,
      maxBatches: envPositiveInt(process.env.GKIT_JUR_CRON_DATAJUD_BATCHES, 30, 100),
      nextRunAt: process.env.CRON_SECRET ? nextDailyUtcRun(6, 0) : null,
      provider: 'Redundante: DataJud + AASP',
      running: cronRunning,
      schedule: GKIT_JUR_CRON_SCHEDULE,
      status: cronStatus,
      timeBudgetMs: envPositiveInt(process.env.GKIT_JUR_CRON_TIME_BUDGET_MS, GKIT_JUR_CRON_DEFAULT_TIME_BUDGET_MS, 260_000),
      timezone: GKIT_JUR_CRON_TIMEZONE,
    },
    metrics: {
      atrasados: tribunais.reduce((total, item) => total + item.atrasados, 0),
      configurados: tribunais.filter((item) => item.alias).length,
      criticos: tribunais.filter((item) => item.nivel === 'vermelho').length,
      semMapeamento: tribunais.filter((item) => !item.alias).reduce((total, item) => total + item.totalAtivos, 0),
      semSincronizacao: tribunais.reduce((total, item) => total + item.semSincronizacao, 0),
      totalAtivos: rows.length,
    },
    prontidao,
    tribunais,
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
  { label: 'Não monitorar', value: 'nao_monitorar' },
  { label: 'Erro', value: 'erro' },
]

export const gkitJurTarefaTipoOptions: GkitJurSelectOption[] = [
  { label: 'Prazo', value: 'prazo' },
  { label: 'Publicação', value: 'publicacao' },
  { label: 'Movimentação relevante', value: 'movimentacao_relevante' },
  { label: 'Documento pendente', value: 'documento_pendente' },
  { label: 'Providência interna', value: 'providencia_interna' },
  { label: 'Audiência', value: 'audiencia' },
  { label: 'Cumprimento', value: 'cumprimento' },
  { label: 'Revisão', value: 'revisao' },
]

export const gkitJurTarefaPrioridadeOptions: GkitJurSelectOption[] = [
  { label: 'Crítica', value: 'critica' },
  { label: 'Alta', value: 'alta' },
  { label: 'Média', value: 'media' },
  { label: 'Baixa', value: 'baixa' },
]

export const gkitJurTarefaStatusOptions: GkitJurSelectOption[] = [
  { label: 'Aberta', value: 'aberta' },
  { label: 'Em andamento', value: 'em_andamento' },
  { label: 'Aguardando terceiro', value: 'aguardando_terceiro' },
  { label: 'Concluída', value: 'concluida' },
  { label: 'Cancelada', value: 'cancelada' },
]

function termsFromJson(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => text(item)).filter(Boolean)
    : []
}

function mapMovimentacaoTarefaRegra(row: Record<string, unknown>): GkitJurMovimentacaoTarefaRegra {
  return {
    id: String(row.id),
    nome: text(row.nome, 'Regra sem nome'),
    descricao: text(row.descricao) || null,
    codigoMovimento: row.codigo_movimento === null || row.codigo_movimento === undefined ? null : Number(row.codigo_movimento),
    termos: termsFromJson(row.termos),
    tipoTarefa: tarefaTipo(row.tipo_tarefa),
    prioridade: tarefaPrioridade(row.prioridade),
    tituloTemplate: text(row.titulo_template, 'Tratar movimentação'),
    descricaoTemplate: text(row.descricao_template) || null,
    prazoDias: row.prazo_dias === null || row.prazo_dias === undefined ? null : Number(row.prazo_dias),
    gerarAutomaticamente: Boolean(row.gerar_automaticamente),
    ativo: Boolean(row.ativo),
    updatedAt: text(row.updated_at),
  }
}

export async function getGkitJurMovimentacaoTarefaData(): Promise<GkitJurMovimentacaoTarefaData> {
  const result = await admin()
    .schema('gkit_jur')
    .from('movimentacao_tarefa_regras')
    .select('id,nome,descricao,codigo_movimento,termos,tipo_tarefa,prioridade,titulo_template,descricao_template,prazo_dias,gerar_automaticamente,ativo,updated_at')
    .order('ativo', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(200)

  if (result.error) throw new Error(result.error.message)

  const regras = ((result.data ?? []) as Array<Record<string, unknown>>).map(mapMovimentacaoTarefaRegra)

  return {
    regras,
    metrics: {
      ativas: regras.filter((regra) => regra.ativo).length,
      automaticas: regras.filter((regra) => regra.ativo && regra.gerarAutomaticamente).length,
      total: regras.length,
    },
  }
}

export const gkitJurDocumentoTipoOptions: GkitJurSelectOption[] = [
  { label: 'Petição', value: 'peticao' },
  { label: 'Publicação', value: 'publicacao' },
  { label: 'Decisão', value: 'decisao' },
  { label: 'Ata', value: 'ata' },
  { label: 'Comprovante', value: 'comprovante' },
  { label: 'Documento interno', value: 'documento_interno' },
  { label: 'Contrato', value: 'contrato' },
  { label: 'Procuração', value: 'procuracao' },
  { label: 'Outro', value: 'outro' },
]

export const gkitJurEventoTipoOptions: GkitJurSelectOption[] = [
  { label: 'Publicação', value: 'publicacao' },
  { label: 'Intimação', value: 'intimacao' },
  { label: 'Despacho', value: 'despacho' },
  { label: 'Decisão', value: 'decisao' },
  { label: 'Audiência', value: 'audiencia' },
  { label: 'Prazo', value: 'prazo' },
  { label: 'Protocolo', value: 'protocolo' },
  { label: 'Contato', value: 'contato' },
  { label: 'Providência interna', value: 'providencia_interna' },
  { label: 'Documento', value: 'documento' },
  { label: 'Nota', value: 'nota' },
]

export const gkitJurTribunalOptions: GkitJurSelectOption[] = DATAJUD_TRIBUNAIS.map((tribunal) => ({
  label: tribunal.sigla,
  value: tribunal.sigla,
}))
