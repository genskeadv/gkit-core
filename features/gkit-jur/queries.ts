import { notFound, redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess, type ModuleSearchParams } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { DATAJUD_TRIBUNAIS } from './datajud-tribunais'
import { formatCnj } from './normalizer'
import type {
  GkitJurAcordoLembreteEmail,
  GkitJurAcordoLembreteEmailStatus,
  GkitJurAcordoLembreteEmailTipo,
  GkitJurAcordoJudicial,
  GkitJurAcordoParcela,
  GkitJurAcordoParcelaStatus,
  GkitJurAcordosData,
  GkitJurAcordoStatus,
  GkitJurAgenteData,
  GkitJurAgenteExecucao,
  GkitJurAgenteExecucaoStatus,
  GkitJurAuditoriaData,
  GkitJurCockpitAreaData,
  GkitJurCockpitBar,
  GkitJurCockpitRow,
  GkitJurCockpitUnicoData,
  GkitJurDashboardMetrics,
  GkitJurDocumento,
  GkitJurDocumentoStatus,
  GkitJurDocumentoTipo,
  GkitJurEtiqueta,
  GkitJurEtiquetasData,
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
  GkitJurLabData,
  GkitJurMonitoramentoNivel,
  GkitJurMonitoramentoStatus,
  GkitJurMovimentacao,
  GkitJurMovimentacaoFilters,
  GkitJurMovimentacaoTarefaData,
  GkitJurMovimentacaoTarefaRegra,
  GkitJurMovimentacoesData,
  GkitJurNivelProntidao,
  GkitJurPendenciasData,
  GkitJurPreJuridico,
  GkitJurPreJuridicoAtaStatus,
  GkitJurPreJuridicoCotaDebito,
  GkitJurPreJuridicoData,
  GkitJurPreJuridicoDebitoStatus,
  GkitJurPreJuridicoFilters,
  GkitJurPreJuridicoPrioridade,
  GkitJurPreJuridicoProbabilidade,
  GkitJurPreJuridicoProcuracaoStatus,
  GkitJurPreJuridicoStatus,
  GkitJurPublicacao,
  GkitJurPublicacaoDecisao,
  GkitJurPublicacaoFilters,
  GkitJurPublicacaoStatus,
  GkitJurPublicacoesData,
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
const MOVEMENT_PROCESS_SCOPE_LIMIT = 5000
const PROCESS_LIST_SELECT = 'id,numero_cnj,numero_cnj_limpo,titulo,pasta,cliente_id,cliente_nome,carteira_id,responsavel_id,tribunal_sigla,classe_nome,orgao_julgador_nome,ultima_movimentacao_em,ultima_sincronizacao_em,status,status_monitoramento'

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

function normalizeSearch(value: unknown) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

const CLIENT_MATCH_STOP_WORDS = new Set([
  'administradora',
  'administracao',
  'advogados',
  'assessoria',
  'associacao',
  'assoc',
  'clube',
  'cond',
  'condominio',
  'convention',
  'ed',
  'edificio',
  'empreendimento',
  'imoveis',
  'ltda',
  'me',
  'residencial',
  'residence',
  's',
  'sa',
  'service',
  'spe',
])

const CLIENT_ENTITY_SIGNAL = /\b(condominio|cond|edificio|residencial|associacao|assoc|home|park|tower|building|residence|plaza|village|jardim|villa|vilas)\b/i

function normalizeClientMatch(value: unknown) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(cnpj|cpf)\b[:\s\d./-]*/gi, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function clientTokens(value: unknown) {
  return normalizeClientMatch(value)
    .split(' ')
    .filter((token) => token.length > 2 && !CLIENT_MATCH_STOP_WORDS.has(token))
}

function cleanClientMatchKey(value: unknown) {
  return clientTokens(value).join(' ')
}

function clientTokenScore(candidate: string, clientName: string) {
  const candidateTokens = new Set(clientTokens(candidate))
  const clientTokensSet = new Set(clientTokens(clientName))
  if (!candidateTokens.size || !clientTokensSet.size) return 0

  let intersection = 0
  candidateTokens.forEach((token) => {
    if (clientTokensSet.has(token)) intersection += 1
  })

  const union = new Set([...candidateTokens, ...clientTokensSet]).size
  const coverage = intersection / Math.min(candidateTokens.size, clientTokensSet.size)
  const jaccard = union ? intersection / union : 0
  return Math.max(jaccard, coverage * 0.92)
}

function clientCandidateCoverage(candidate: string, clientName: string) {
  const candidateTokens = new Set(clientTokens(candidate))
  const clientTokensSet = new Set(clientTokens(clientName))
  if (!candidateTokens.size || !clientTokensSet.size) return 0

  let intersection = 0
  candidateTokens.forEach((token) => {
    if (clientTokensSet.has(token)) intersection += 1
  })

  return intersection / candidateTokens.size
}

function hasClientEntitySignal(value: unknown) {
  return CLIENT_ENTITY_SIGNAL.test(normalizeClientMatch(value))
}

function uniqueById(values: ClienteSuggestionSource[]) {
  const byId = new Map<string, ClienteSuggestionSource>()
  values.forEach((item) => byId.set(item.id, item))
  return [...byId.values()]
}

function pushClientMap(map: Map<string, ClienteSuggestionSource[]>, key: string, source: ClienteSuggestionSource) {
  if (!key) return
  const values = map.get(key) ?? []
  if (!values.some((item) => item.id === source.id)) values.push(source)
  map.set(key, values)
}

type ClienteCandidateSource = 'cliente_nome' | 'titulo_parte' | 'metadata'

type ClienteCandidate = {
  label: string
  source: ClienteCandidateSource
}

type ClienteMatch = {
  candidate: ClienteCandidate
  confidence: 'alta' | 'media'
  matchType: string
  score: number
  source: ClienteSuggestionSource
}

function addClienteCandidate(candidates: ClienteCandidate[], label: unknown, source: ClienteCandidateSource, requireSignal = false) {
  const value = text(label)
    .replace(/\b(autor|autora|requerente|reclamante|exequente|cliente|envolvido|parte)\b\s*[:;-]?\s*/gi, '')
    .replace(/\b(cnpj|cpf)\b[:\s\d./-]*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (value.length < 4) return
  if (requireSignal && !hasClientEntitySignal(value)) return
  if (candidates.some((item) => normalizeClientMatch(item.label) === normalizeClientMatch(value))) return
  candidates.push({ label: value, source })
}

function addTitleCandidates(candidates: ClienteCandidate[], titulo: unknown) {
  const value = text(titulo)
  if (!value) return
  value
    .split(/\s+(?:x|vs\.?|versus|contra)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => addClienteCandidate(candidates, part, 'titulo_parte', true))
}

function addMetadataCandidates(candidates: ClienteCandidate[], value: unknown, depth = 0) {
  if (depth > 4 || value == null) return
  if (typeof value === 'string') {
    addClienteCandidate(candidates, value, 'metadata', true)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item) => addMetadataCandidates(candidates, item, depth + 1))
    return
  }

  const record = recordValue(value)
  for (const key of ['nome', 'name', 'label', 'titulo', 'razao_social', 'nome_fantasia', 'parte', 'envolvido']) {
    if (record[key]) addClienteCandidate(candidates, record[key], 'metadata', true)
  }
  Object.values(record).forEach((item) => addMetadataCandidates(candidates, item, depth + 1))
}

function clienteCandidates(row: Record<string, unknown>) {
  const candidates: ClienteCandidate[] = []
  addClienteCandidate(candidates, row.cliente_nome, 'cliente_nome')
  addTitleCandidates(candidates, row.titulo)
  addMetadataCandidates(candidates, row.metadata_datajud)
  return candidates
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
    etiquetaId: singleParam(params?.etiqueta_id),
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

export function buildGkitJurPreJuridicoFilters(params?: ModuleSearchParams | null): GkitJurPreJuridicoFilters {
  const dir = singleParam(params?.dir) === 'asc' ? 'asc' : 'desc'
  const sort = singleParam(params?.sort) || 'updated_at'

  return {
    carteiraId: singleParam(params?.carteira_id),
    dir,
    page: positiveInt(singleParam(params?.page), 1),
    q: singleParam(params?.q).trim(),
    responsavelId: singleParam(params?.responsavel_id),
    sort,
    status: singleParam(params?.status),
  }
}

export function buildGkitJurMovimentacaoFilters(params?: ModuleSearchParams | null): GkitJurMovimentacaoFilters {
  const dir = singleParam(params?.dir) === 'asc' ? 'asc' : 'desc'
  const sort = singleParam(params?.sort) || 'data_hora'

  return {
    carteiraId: singleParam(params?.carteira_id),
    dir,
    origem: singleParam(params?.origem),
    page: positiveInt(singleParam(params?.page), 1),
    q: singleParam(params?.q).trim(),
    relevancia: singleParam(params?.relevancia),
    responsavelId: singleParam(params?.responsavel_id),
    sort,
    tribunal: singleParam(params?.tribunal),
  }
}

export function buildGkitJurPublicacaoFilters(params?: ModuleSearchParams | null): GkitJurPublicacaoFilters {
  const dir = singleParam(params?.dir) === 'asc' ? 'asc' : 'desc'
  const sort = singleParam(params?.sort) || 'data_disponibilizacao'

  return {
    carteiraId: singleParam(params?.carteira_id),
    dir,
    fonte: singleParam(params?.fonte),
    page: positiveInt(singleParam(params?.page), 1),
    q: singleParam(params?.q).trim(),
    responsavelId: singleParam(params?.responsavel_id),
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

function preJuridicoStatus(value: unknown): GkitJurPreJuridicoStatus {
  const current = text(value, 'em_analise')
  if (['em_analise', 'aguardando_documentos', 'aprovado', 'descartado', 'convertido'].includes(current)) {
    return current as GkitJurPreJuridicoStatus
  }
  return 'em_analise'
}

function preJuridicoPrioridade(value: unknown): GkitJurPreJuridicoPrioridade {
  const current = text(value, 'media')
  if (['baixa', 'media', 'alta', 'critica'].includes(current)) return current as GkitJurPreJuridicoPrioridade
  return 'media'
}

function preJuridicoProbabilidade(value: unknown): GkitJurPreJuridicoProbabilidade {
  const current = text(value, 'media')
  if (['baixa', 'media', 'alta'].includes(current)) return current as GkitJurPreJuridicoProbabilidade
  return 'media'
}

function preJuridicoAtaStatus(value: unknown): GkitJurPreJuridicoAtaStatus {
  const current = text(value, 'pendente')
  if (['pendente', 'solicitada', 'recebida', 'dispensada'].includes(current)) return current as GkitJurPreJuridicoAtaStatus
  return 'pendente'
}

function preJuridicoDebitoStatus(value: unknown): GkitJurPreJuridicoDebitoStatus {
  const current = text(value, 'pendente')
  if (['pendente', 'solicitado', 'recebido', 'dispensado'].includes(current)) return current as GkitJurPreJuridicoDebitoStatus
  return 'pendente'
}

function preJuridicoProcuracaoStatus(value: unknown): GkitJurPreJuridicoProcuracaoStatus {
  const current = text(value, 'pendente')
  if (['pendente', 'gerada', 'enviada', 'assinada', 'dispensada'].includes(current)) return current as GkitJurPreJuridicoProcuracaoStatus
  return 'pendente'
}

function preJuridicoCotasDebito(value: unknown): GkitJurPreJuridicoCotaDebito[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const record = recordValue(item)
    const valor = Number(record.valor ?? 0)
    return {
      recibo: text(record.recibo),
      vencimento: text(record.vencimento) || null,
      valor: Number.isFinite(valor) ? valor : 0,
    }
  }).filter((item) => item.recibo || item.vencimento || item.valor > 0)
}

function preJuridicoProntoDistribuicao(row: {
  ataEleicaoStatus: GkitJurPreJuridicoAtaStatus
  ataPrestacaoContasStatus: GkitJurPreJuridicoAtaStatus
  debitosAtualizadosStatus: GkitJurPreJuridicoDebitoStatus
  procuracaoStatus: GkitJurPreJuridicoProcuracaoStatus
}) {
  const atasOk = ['recebida', 'dispensada'].includes(row.ataEleicaoStatus) && ['recebida', 'dispensada'].includes(row.ataPrestacaoContasStatus)
  const debitosOk = ['recebido', 'dispensado'].includes(row.debitosAtualizadosStatus)
  const procuracaoOk = ['assinada', 'dispensada'].includes(row.procuracaoStatus)
  return atasOk && debitosOk && procuracaoOk
}

function mapProcesso(row: Record<string, unknown>, maps: {
  clientes: Map<string, string>
  carteiras: Map<string, string>
  responsaveis: Map<string, string>
  etiquetas?: Map<string, GkitJurEtiqueta[]>
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
    etiquetas: maps.etiquetas?.get(String(row.id)) ?? [],
  }
}

function mapPreJuridico(row: Record<string, unknown>, maps: {
  clientes: Map<string, string>
  carteiras: Map<string, string>
  responsaveis: Map<string, string>
}): GkitJurPreJuridico {
  const clienteId = text(row.cliente_id)
  const carteiraId = text(row.carteira_id)
  const responsavelId = text(row.responsavel_id)
  const clienteSnapshot = text(row.cliente_nome) || null
  const valorEstimado = row.valor_estimado === null || row.valor_estimado === undefined ? null : Number(row.valor_estimado)
  const ataEleicaoStatus = preJuridicoAtaStatus(row.ata_eleicao_status)
  const ataPrestacaoContasStatus = preJuridicoAtaStatus(row.ata_prestacao_contas_status)
  const debitosAtualizadosStatus = preJuridicoDebitoStatus(row.debitos_atualizados_status)
  const procuracaoStatus = preJuridicoProcuracaoStatus(row.procuracao_status)
  const prontoDistribuicao = preJuridicoProntoDistribuicao({
    ataEleicaoStatus,
    ataPrestacaoContasStatus,
    debitosAtualizadosStatus,
    procuracaoStatus,
  })

  return {
    id: String(row.id),
    titulo: text(row.titulo, 'Caso sem titulo'),
    clienteId: clienteId || null,
    clienteNome: clienteId ? (maps.clientes.get(clienteId) ?? clienteSnapshot) : clienteSnapshot,
    clienteSnapshotNome: clienteSnapshot,
    descricao: text(row.descricao),
    carteiraId: carteiraId || null,
    carteiraNome: carteiraId ? maps.carteiras.get(carteiraId) ?? null : null,
    responsavelId: responsavelId || null,
    responsavelNome: responsavelId ? maps.responsaveis.get(responsavelId) ?? null : null,
    origem: text(row.origem) || null,
    area: text(row.area) || null,
    valorEstimado: Number.isFinite(valorEstimado) ? valorEstimado : null,
    laudoPdfUrl: text(row.laudo_pdf_url) || null,
    unidade: text(row.unidade) || null,
    bloco: text(row.bloco) || null,
    responsavelUnidade: text(row.responsavel_unidade) || null,
    cotasDebito: preJuridicoCotasDebito(row.cotas_debito),
    ataEleicaoStatus,
    ataPrestacaoContasStatus,
    debitosAtualizadosStatus,
    procuracaoStatus,
    administradoraEmail: text(row.administradora_email) || null,
    sindicoEmail: text(row.sindico_email) || null,
    administradoraSolicitadaEm: text(row.administradora_solicitada_em) || null,
    administradoraRetornoEm: text(row.administradora_retorno_em) || null,
    procuracaoGeradaEm: text(row.procuracao_gerada_em) || null,
    procuracaoEnviadaEm: text(row.procuracao_enviada_em) || null,
    sindicoRetornoEm: text(row.sindico_retorno_em) || null,
    prontoDistribuicaoEm: text(row.pronto_distribuicao_em) || null,
    prontoDistribuicao,
    probabilidade: preJuridicoProbabilidade(row.probabilidade),
    prioridade: preJuridicoPrioridade(row.prioridade),
    status: preJuridicoStatus(row.status),
    motivoStatus: text(row.motivo_status) || null,
    dataEntrada: text(row.data_entrada) || null,
    prazoAnalise: text(row.prazo_analise) || null,
    convertidoProcessoId: text(row.convertido_processo_id) || null,
    convertidoEm: text(row.convertido_em) || null,
    createdAt: text(row.created_at) || null,
    updatedAt: text(row.updated_at) || null,
  }
}

function mapEtiqueta(row: Record<string, unknown>): GkitJurEtiqueta {
  return {
    id: String(row.id),
    nome: text(row.nome, 'Etiqueta sem nome'),
    cor: text(row.cor, '#64748b'),
    ativo: Boolean(row.ativo),
    updatedAt: text(row.updated_at) || null,
  }
}

async function listGkitJurEtiquetas(onlyActive = false): Promise<GkitJurEtiqueta[]> {
  let query = admin()
    .schema('gkit_jur')
    .from('etiquetas')
    .select('id,nome,cor,ativo,updated_at')
    .order('ativo', { ascending: false })
    .order('nome', { ascending: true })
    .limit(500)

  if (onlyActive) query = query.eq('ativo', true)

  const result = await query
  if (result.error) {
    if (String(result.error.message ?? '').includes('etiquetas')) return []
    throw new Error(result.error.message)
  }

  return ((result.data ?? []) as Array<Record<string, unknown>>).map(mapEtiqueta)
}

async function lookupEtiquetas(processoIds: string[]) {
  const ids = [...new Set(processoIds.filter(Boolean))]
  if (!ids.length) return new Map<string, GkitJurEtiqueta[]>()

  const result = await admin()
    .schema('gkit_jur')
    .from('processo_etiquetas')
    .select('processo_id,etiqueta_id')
    .in('processo_id', ids)

  if (result.error) {
    if (String(result.error.message ?? '').includes('processo_etiquetas')) return new Map<string, GkitJurEtiqueta[]>()
    throw new Error(result.error.message)
  }

  const etiquetaIds = [...new Set(((result.data ?? []) as Array<Record<string, unknown>>).map((row) => text(row.etiqueta_id)).filter(Boolean))]
  const etiquetasResult = etiquetaIds.length
    ? await admin()
      .schema('gkit_jur')
      .from('etiquetas')
      .select('id,nome,cor,ativo,updated_at')
      .in('id', etiquetaIds)
    : { data: [], error: null }

  if (etiquetasResult.error) throw new Error(etiquetasResult.error.message)

  const etiquetasById = new Map(((etiquetasResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [
    String(row.id),
    mapEtiqueta(row),
  ]))
  const tagMap = new Map<string, GkitJurEtiqueta[]>()
  for (const row of (result.data ?? []) as Array<Record<string, unknown>>) {
    const processoId = text(row.processo_id)
    const etiqueta = etiquetasById.get(text(row.etiqueta_id))
    if (!processoId || !etiqueta) continue
    const current = tagMap.get(processoId) ?? []
    current.push(etiqueta)
    tagMap.set(processoId, current)
  }

  for (const [processoId, etiquetas] of tagMap.entries()) {
    tagMap.set(processoId, etiquetas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))
  }

  return tagMap
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
  const [carteirasResult, responsaveisResult, tribunaisResult, etiquetas] = await Promise.all([
    admin().schema('core').from('carteiras').select('id,nome').eq('status', 'ativo').order('nome', { ascending: true }),
    admin().schema('security').from('usuarios').select('id,nome,email').eq('status', 'ativo').order('nome', { ascending: true }),
    admin().schema('gkit_jur').from('processos').select('tribunal_sigla').eq('status', DEFAULT_PROCESS_STATUS).not('tribunal_sigla', 'is', null).limit(5000),
    listGkitJurEtiquetas(true),
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
    etiquetas,
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
    etiquetas: filterOptions.etiquetas,
    responsaveis: filterOptions.responsaveis,
  }
}

type ClienteSuggestionSource = {
  carteiraId: string | null
  id: string
  label: string
  matchKeys: string[]
  searchKeys: string[]
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
  const clienteExactMap = new Map<string, ClienteSuggestionSource[]>()
  const clienteCleanMap = new Map<string, ClienteSuggestionSource[]>()
  const clienteSearchIndex: ClienteSuggestionSource[] = []

  for (const row of (clientesResult.data ?? []) as Array<Record<string, unknown>>) {
    const names = [text(row.nome_fantasia), text(row.nome), text(row.razao_social)].filter(Boolean)
    const source = {
      carteiraId: text(row.carteira_id) || null,
      id: String(row.id),
      label: text(row.nome_fantasia, text(row.nome, text(row.razao_social, 'Cliente sem nome'))),
      matchKeys: [...new Set(names.map((name) => normalizeName(name)).filter(Boolean))],
      searchKeys: [...new Set(names.map((name) => cleanClientMatchKey(name)).filter(Boolean))],
    }
    for (const key of source.matchKeys) {
      if (!clienteMap.has(key)) clienteMap.set(key, source)
      pushClientMap(clienteExactMap, key, source)
    }
    for (const key of source.searchKeys) pushClientMap(clienteCleanMap, key, source)
    clienteSearchIndex.push(source)
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
    clienteCleanMap,
    clienteExactMap,
    clienteMap,
    clienteSearchIndex,
    responsavelByCarteira,
  }
}

function uniqueClientMatch(values: ClienteSuggestionSource[] | undefined) {
  const unique = values ? uniqueById(values) : []
  return unique.length === 1 ? unique[0] : null
}

function findClienteSuggestion(row: Record<string, unknown>, sources: Awaited<ReturnType<typeof getSuggestionSources>>): ClienteMatch | null {
  const candidates = clienteCandidates(row)

  for (const candidate of candidates) {
    const exact = uniqueClientMatch(sources.clienteExactMap.get(normalizeName(candidate.label)))
    if (exact) {
      return {
        candidate,
        confidence: 'alta',
        matchType: candidate.source === 'cliente_nome' ? 'cliente por nome' : `cliente por ${candidate.source.replace('_', ' ')}`,
        score: 1,
        source: exact,
      }
    }

    const clean = uniqueClientMatch(sources.clienteCleanMap.get(cleanClientMatchKey(candidate.label)))
    if (clean) {
      return {
        candidate,
        confidence: 'alta',
        matchType: `cliente por equivalencia (${candidate.source.replace('_', ' ')})`,
        score: 0.98,
        source: clean,
      }
    }
  }

  const fuzzyMatches: ClienteMatch[] = []
  for (const candidate of candidates.filter((item) => hasClientEntitySignal(item.label))) {
    const candidateKey = cleanClientMatchKey(candidate.label)
    if (candidateKey.length < 6 || clientTokens(candidateKey).length < 2) continue

    for (const source of sources.clienteSearchIndex) {
      const bestMatch = source.searchKeys.reduce((best, key) => {
        const score = clientTokenScore(candidateKey, key)
        const coverage = clientCandidateCoverage(candidateKey, key)
        return score > best.score ? { coverage, score } : best
      }, { coverage: 0, score: 0 })
      const bestScore = bestMatch.score
      if (bestScore < 0.82) continue
      if (bestMatch.coverage < 0.86) continue

      fuzzyMatches.push({
        candidate,
        confidence: bestScore >= 0.88 ? 'alta' : 'media',
        matchType: `cliente por similaridade (${candidate.source.replace('_', ' ')})`,
        score: bestScore,
        source,
      })
    }
  }

  const ranked = fuzzyMatches.sort((a, b) => b.score - a.score)
  const best = ranked[0]
  if (!best) return null

  const tied = ranked.filter((item) => item.source.id !== best.source.id && best.score - item.score < 0.08)
  if (tied.length) return null

  return best
}

function buildSuggestion(row: Record<string, unknown>, maps: Awaited<ReturnType<typeof lookupMaps>>, sources: Awaited<ReturnType<typeof getSuggestionSources>>) {
  const processo = mapProcesso(row, maps)
  const clienteIdAtual = text(row.cliente_id) || null
  const carteiraIdAtual = text(row.carteira_id) || null
  const responsavelIdAtual = text(row.responsavel_id) || null
  const clienteNameKey = normalizeName(row.cliente_nome)
  const clienteMatch = clienteIdAtual ? null : findClienteSuggestion(row, sources)
  const clienteSuggestion = clienteMatch?.source ?? null
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
  if (clienteMatch) motivos.push(`${clienteMatch.matchType} (${clienteMatch.confidence})`)
  if (hasCarteiraSuggestion && carteiraFromCliente === carteiraId) motivos.push('carteira por cliente')
  if (hasCarteiraSuggestion && carteiraFromResponsavel === carteiraId) motivos.push('carteira por responsável')
  if (responsavelSuggestion) motivos.push('responsável da carteira')

  return {
    processo,
    clienteId: clienteSuggestion?.id ?? null,
    clienteNome: clienteSuggestion?.label ?? null,
    clienteCandidato: clienteMatch?.candidate.label ?? null,
    clienteConfianca: clienteMatch?.confidence ?? null,
    clienteFonte: clienteMatch?.candidate.source ?? null,
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
      .select('id,numero_cnj,numero_cnj_limpo,titulo,pasta,cliente_id,cliente_nome,carteira_id,responsavel_id,tribunal_sigla,classe_nome,orgao_julgador_nome,ultima_movimentacao_em,ultima_sincronizacao_em,status,status_monitoramento,metadata_datajud,updated_at')
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
      clienteAltaConfianca: suggestions.filter((item) => item.clienteId && item.clienteConfianca === 'alta').length,
      clienteMediaConfianca: suggestions.filter((item) => item.clienteId && item.clienteConfianca === 'media').length,
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

function applyPreJuridicoFilters(query: any, filters: GkitJurPreJuridicoFilters) {
  let next = query

  if (filters.q) {
    const clean = filters.q.replace(/[%(),]/g, ' ').trim()
    if (clean) {
      const pattern = `%${clean}%`
      next = next.or([
        `titulo.ilike.${pattern}`,
        `cliente_nome.ilike.${pattern}`,
        `descricao.ilike.${pattern}`,
        `origem.ilike.${pattern}`,
        `area.ilike.${pattern}`,
        `unidade.ilike.${pattern}`,
        `bloco.ilike.${pattern}`,
        `responsavel_unidade.ilike.${pattern}`,
      ].join(','))
    }
  }

  if (filters.status) next = next.eq('status', filters.status)
  if (filters.carteiraId) next = next.eq('carteira_id', filters.carteiraId)
  if (filters.responsavelId) next = next.eq('responsavel_id', filters.responsavelId)

  return next
}

function preJuridicoSortColumn(sort: string) {
  if (['titulo', 'cliente_nome', 'data_entrada', 'prazo_analise', 'status', 'prioridade', 'unidade', 'updated_at', 'created_at'].includes(sort)) return sort
  return 'updated_at'
}

async function getGkitJurPreJuridicoMetrics() {
  const result = await admin()
    .schema('gkit_jur')
    .from('pre_juridicos')
    .select('status')
    .limit(5000)

  if (result.error) throw new Error(result.error.message)
  const rows = (result.data ?? []) as Array<Record<string, unknown>>
  const count = (value: GkitJurPreJuridicoStatus) => rows.filter((row) => preJuridicoStatus(row.status) === value).length

  return {
    total: rows.length,
    emAnalise: count('em_analise'),
    aguardandoDocumentos: count('aguardando_documentos'),
    aprovados: count('aprovado'),
    descartados: count('descartado'),
    convertidos: count('convertido'),
  }
}

async function resolveEtiquetaProcessIds(etiquetaId: string) {
  if (!etiquetaId) return null

  const result = await admin()
    .schema('gkit_jur')
    .from('processo_etiquetas')
    .select('processo_id')
    .eq('etiqueta_id', etiquetaId)
    .limit(MOVEMENT_PROCESS_SCOPE_LIMIT)

  if (result.error) {
    if (String(result.error.message ?? '').includes('processo_etiquetas')) return []
    throw new Error(result.error.message)
  }

  return [...new Set(((result.data ?? []) as Array<Record<string, unknown>>).map((row) => text(row.processo_id)).filter(Boolean))]
}

function sortColumn(sort: string) {
  if (['cliente_nome', 'tribunal_sigla', 'data_ajuizamento', 'ultima_movimentacao_em', 'updated_at'].includes(sort)) return sort
  return 'updated_at'
}

export async function listGkitJurPreJuridicos(filters: GkitJurPreJuridicoFilters = buildGkitJurPreJuridicoFilters()): Promise<GkitJurPreJuridicoData> {
  const from = (filters.page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = admin()
    .schema('gkit_jur')
    .from('pre_juridicos')
    .select('id,titulo,cliente_id,cliente_nome,descricao,carteira_id,responsavel_id,origem,area,valor_estimado,laudo_pdf_url,unidade,bloco,responsavel_unidade,cotas_debito,ata_eleicao_status,ata_prestacao_contas_status,debitos_atualizados_status,procuracao_status,administradora_email,sindico_email,administradora_solicitada_em,administradora_retorno_em,procuracao_gerada_em,procuracao_enviada_em,sindico_retorno_em,pronto_distribuicao_em,probabilidade,prioridade,status,motivo_status,data_entrada,prazo_analise,convertido_processo_id,convertido_em,created_at,updated_at', { count: 'exact' })

  query = applyPreJuridicoFilters(query, filters)
    .order(preJuridicoSortColumn(filters.sort), { ascending: filters.dir === 'asc', nullsFirst: false })
    .range(from, to)

  const [metrics, formData, result] = await Promise.all([
    getGkitJurPreJuridicoMetrics(),
    getGkitJurFormData(),
    query,
  ])

  if (result.error) throw new Error(result.error.message)

  const rows = (result.data ?? []) as Array<Record<string, unknown>>
  const maps = await lookupMaps(rows)
  const total = result.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return {
    filters,
    filterOptions: {
      carteiras: formData.carteiras,
      clientes: formData.clientes,
      responsaveis: formData.responsaveis,
    },
    formData,
    items: rows.map((row) => mapPreJuridico(row, maps)),
    metrics,
    pagination: {
      currentPage: filters.page,
      from: total ? from + 1 : 0,
      pageSize: PAGE_SIZE,
      to: Math.min(to + 1, total),
      total,
      totalPages,
    },
  }
}

export async function listGkitJurProcesses(filters: GkitJurProcessFilters = buildGkitJurProcessFilters()): Promise<GkitJurProcessListData> {
  const from = (filters.page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const etiquetaProcessIds = await resolveEtiquetaProcessIds(filters.etiquetaId)

  let query = admin()
    .schema('gkit_jur')
    .from('processos')
    .select('id,numero_cnj,numero_cnj_limpo,titulo,pasta,cliente_id,cliente_nome,carteira_id,responsavel_id,tribunal_sigla,classe_nome,orgao_julgador_nome,ultima_movimentacao_em,ultima_sincronizacao_em,status,status_monitoramento,updated_at,data_ajuizamento', { count: 'exact' })

  query = applyProcessFilters(query, filters)
  if (etiquetaProcessIds) query = etiquetaProcessIds.length ? query.in('id', etiquetaProcessIds) : null

  query = query
    ? query
      .order(sortColumn(filters.sort), { ascending: filters.dir === 'asc', nullsFirst: false })
      .range(from, to)
    : null

  const [metrics, filterOptions, processosResult] = await Promise.all([
    getGkitJurDashboardMetrics(),
    getFilterOptions(),
    query ?? Promise.resolve({ data: [], error: null, count: 0 }),
  ])

  if (processosResult.error) throw new Error(processosResult.error.message)

  const rows = (processosResult.data ?? []) as Array<Record<string, unknown>>
  const maps = await lookupMaps(rows)
  const etiquetas = await lookupEtiquetas(rows.map((row) => String(row.id)))
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
    processes: rows.map((row) => mapProcesso(row, { ...maps, etiquetas })),
  }
}

export async function getGkitJurProcessCockpitData(): Promise<GkitJurProcessListData> {
  const filters = buildGkitJurProcessFilters()
  const [metrics, filterOptions, processosResult] = await Promise.all([
    getGkitJurDashboardMetrics(),
    getFilterOptions(),
    admin()
      .schema('gkit_jur')
      .from('processos')
      .select('id,numero_cnj,numero_cnj_limpo,titulo,pasta,cliente_id,cliente_nome,carteira_id,responsavel_id,tribunal_sigla,classe_nome,orgao_julgador_nome,ultima_movimentacao_em,ultima_sincronizacao_em,status,status_monitoramento,updated_at,data_ajuizamento', { count: 'exact' })
      .eq('status', DEFAULT_PROCESS_STATUS)
      .order('updated_at', { ascending: false })
      .limit(1200),
  ])

  if (processosResult.error) throw new Error(processosResult.error.message)
  const rows = (processosResult.data ?? []) as Array<Record<string, unknown>>
  const maps = await lookupMaps(rows)
  const total = processosResult.count ?? rows.length

  return {
    filters,
    filterOptions,
    metrics,
    pagination: {
      currentPage: 1,
      from: total ? 1 : 0,
      pageSize: rows.length,
      to: rows.length,
      total,
      totalPages: 1,
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

function acordoStatus(value: unknown): GkitJurAcordoStatus {
  const current = text(value, 'ativo')
  if (['ativo', 'cumprido', 'quebrado', 'cancelado'].includes(current)) return current as GkitJurAcordoStatus
  return 'ativo'
}

function acordoParcelaStatus(value: unknown): GkitJurAcordoParcelaStatus {
  const current = text(value, 'pendente')
  if (['pendente', 'paga', 'cancelada'].includes(current)) return current as GkitJurAcordoParcelaStatus
  return 'pendente'
}

function acordoLembreteEmailStatus(value: unknown): GkitJurAcordoLembreteEmailStatus {
  const current = text(value, 'pendente')
  if (['pendente', 'enviado', 'cancelado', 'erro'].includes(current)) return current as GkitJurAcordoLembreteEmailStatus
  return 'pendente'
}

function acordoLembreteEmailTipo(value: unknown): GkitJurAcordoLembreteEmailTipo {
  const current = text(value, 'antes_vencimento')
  if (['antes_vencimento', 'no_vencimento', 'apos_vencimento'].includes(current)) return current as GkitJurAcordoLembreteEmailTipo
  return 'antes_vencimento'
}

function moneyNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function isPastDate(value: string | null) {
  if (!value) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return date.getTime() < today.getTime()
}

function mapAcordoParcela(row: Record<string, unknown>): GkitJurAcordoParcela {
  const status = acordoParcelaStatus(row.status)
  const vencimento = text(row.vencimento)
  return {
    id: String(row.id),
    acordoId: String(row.acordo_id),
    numero: numberValue(row.numero),
    valor: moneyNumber(row.valor),
    vencimento,
    status,
    pagoEm: text(row.pago_em) || null,
    valorPago: row.valor_pago === null || row.valor_pago === undefined ? null : moneyNumber(row.valor_pago),
    observacoes: text(row.observacoes) || null,
    emAtraso: status === 'pendente' && isPastDate(vencimento),
  }
}

function mapAcordoLembreteEmail(
  row: Record<string, unknown>,
  parcela: GkitJurAcordoParcela | null,
): GkitJurAcordoLembreteEmail {
  return {
    id: String(row.id),
    acordoId: String(row.acordo_id),
    parcelaId: String(row.parcela_id),
    parcelaNumero: parcela?.numero ?? null,
    parcelaVencimento: parcela?.vencimento ?? null,
    diasReferencia: numberValue(row.dias_referencia),
    tipo: acordoLembreteEmailTipo(row.tipo),
    agendadoPara: text(row.agendado_para),
    destinatarioEmail: text(row.destinatario_email) || null,
    assunto: text(row.assunto) || null,
    corpo: text(row.corpo) || null,
    status: acordoLembreteEmailStatus(row.status),
    enviadoEm: text(row.enviado_em) || null,
    erroMensagem: text(row.erro_mensagem) || null,
  }
}

function emptyProcessForAcordo(processoId: string): GkitJurProcessListItem {
  return {
    id: processoId,
    numeroCnj: '-',
    titulo: null,
    pasta: null,
    clienteNome: null,
    carteiraNome: null,
    responsavelNome: null,
    tribunalSigla: null,
    classeNome: null,
    orgaoJulgadorNome: null,
    ultimaMovimentacaoEm: null,
    ultimaSincronizacaoEm: null,
    status: 'ativo',
    statusMonitoramento: 'monitorando',
    etiquetas: [],
  }
}

function mapAcordoJudicial(
  row: Record<string, unknown>,
  processo: GkitJurProcessListItem | null,
  parcelas: GkitJurAcordoParcela[],
  lembretesEmail: GkitJurAcordoLembreteEmail[],
): GkitJurAcordoJudicial {
  const processoId = String(row.processo_id)
  const process = processo ?? emptyProcessForAcordo(processoId)
  const parcelasPagas = parcelas.filter((parcela) => parcela.status === 'paga').length
  const parcelasPendentes = parcelas.filter((parcela) => parcela.status === 'pendente').length
  const parcelasAtrasadas = parcelas.filter((parcela) => parcela.emAtraso).length
  const valorPago = parcelas.reduce((total, parcela) => total + (parcela.status === 'paga' ? parcela.valorPago ?? parcela.valor : 0), 0)
  const valorTotal = moneyNumber(row.valor_total)
  const nextParcela = parcelas
    .filter((parcela) => parcela.status === 'pendente')
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0]
  const lembretesPendentes = lembretesEmail.filter((lembrete) => lembrete.status === 'pendente').length
  const lembretesAtrasados = lembretesEmail.filter((lembrete) => lembrete.status === 'pendente' && isPastDate(lembrete.agendadoPara)).length
  const proximoLembrete = lembretesEmail
    .filter((lembrete) => lembrete.status === 'pendente')
    .sort((a, b) => a.agendadoPara.localeCompare(b.agendadoPara))[0]
  const rawLembreteDias = Array.isArray(row.lembrete_dias)
    ? row.lembrete_dias.map((value) => Number.parseInt(String(value), 10)).filter((value) => Number.isFinite(value))
    : [-5, -1, 0, 3, 7]

  return {
    id: String(row.id),
    processoId,
    numeroCnj: process.numeroCnj,
    processoTitulo: process.titulo,
    clienteNome: process.clienteNome,
    carteiraNome: process.carteiraNome,
    responsavelNome: process.responsavelNome,
    valorTotal,
    quantidadeParcelas: numberValue(row.quantidade_parcelas),
    diaVencimento: numberValue(row.dia_vencimento),
    primeiroVencimento: text(row.primeiro_vencimento),
    status: acordoStatus(row.status),
    emailLembrete: text(row.email_lembrete) || null,
    lembretesPagamentoAtivos: row.lembretes_pagamento_ativos !== false,
    lembreteDias: rawLembreteDias.length ? rawLembreteDias : [-5, -1, 0, 3, 7],
    observacoes: text(row.observacoes) || null,
    quebradoEm: text(row.quebrado_em) || null,
    quitadoEm: text(row.quitado_em) || null,
    createdAt: text(row.created_at) || null,
    updatedAt: text(row.updated_at) || null,
    parcelas,
    parcelasPagas,
    parcelasPendentes,
    parcelasAtrasadas,
    valorPago,
    valorPendente: Math.max(0, valorTotal - valorPago),
    proximoVencimento: nextParcela?.vencimento ?? null,
    lembretesEmail,
    lembretesPendentes,
    lembretesAtrasados,
    proximoLembreteEmail: proximoLembrete?.agendadoPara ?? null,
  }
}

async function hydrateAcordosJudiciais(
  acordoRows: Array<Record<string, unknown>>,
  knownProcessos = new Map<string, GkitJurProcessListItem>(),
) {
  const acordoIds = acordoRows.map((row) => String(row.id)).filter(Boolean)
  const processoIds = [...new Set(acordoRows.map((row) => text(row.processo_id)).filter(Boolean))]

  const [parcelasResult, lembretesResult, processosResult] = await Promise.all([
    acordoIds.length
      ? admin()
        .schema('gkit_jur')
        .from('acordo_parcelas')
        .select('id,acordo_id,numero,valor,vencimento,status,pago_em,valor_pago,observacoes')
        .in('acordo_id', acordoIds)
        .order('numero', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    acordoIds.length
      ? admin()
        .schema('gkit_jur')
        .from('acordo_lembretes_email')
        .select('id,acordo_id,parcela_id,dias_referencia,tipo,agendado_para,destinatario_email,assunto,corpo,status,enviado_em,erro_mensagem')
        .in('acordo_id', acordoIds)
        .order('agendado_para', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    processoIds.filter((id) => !knownProcessos.has(id)).length
      ? admin()
        .schema('gkit_jur')
        .from('processos')
        .select(PROCESS_LIST_SELECT)
        .in('id', processoIds.filter((id) => !knownProcessos.has(id)))
      : Promise.resolve({ data: [], error: null }),
  ])

  if (parcelasResult.error) throw new Error(parcelasResult.error.message)
  if (lembretesResult.error && !['42P01', 'PGRST205'].includes(String(lembretesResult.error.code))) {
    throw new Error(lembretesResult.error.message)
  }
  if (processosResult.error) throw new Error(processosResult.error.message)

  const processRows = (processosResult.data ?? []) as Array<Record<string, unknown>>
  const maps = await lookupMaps(processRows)
  const processoMap = new Map(knownProcessos)
  for (const row of processRows) {
    const processo = mapProcesso(row, maps)
    processoMap.set(processo.id, processo)
  }

  const parcelasByAcordo = new Map<string, GkitJurAcordoParcela[]>()
  const parcelasById = new Map<string, GkitJurAcordoParcela>()
  for (const row of (parcelasResult.data ?? []) as Array<Record<string, unknown>>) {
    const parcela = mapAcordoParcela(row)
    parcelasById.set(parcela.id, parcela)
    const current = parcelasByAcordo.get(parcela.acordoId) ?? []
    current.push(parcela)
    parcelasByAcordo.set(parcela.acordoId, current)
  }

  const lembretesByAcordo = new Map<string, GkitJurAcordoLembreteEmail[]>()
  for (const row of (lembretesResult.data ?? []) as Array<Record<string, unknown>>) {
    const lembrete = mapAcordoLembreteEmail(row, parcelasById.get(String(row.parcela_id)) ?? null)
    const current = lembretesByAcordo.get(lembrete.acordoId) ?? []
    current.push(lembrete)
    lembretesByAcordo.set(lembrete.acordoId, current)
  }

  return acordoRows.map((row) => {
    const acordoId = String(row.id)
    const processoId = text(row.processo_id)
    return mapAcordoJudicial(
      row,
      processoMap.get(processoId) ?? null,
      parcelasByAcordo.get(acordoId) ?? [],
      lembretesByAcordo.get(acordoId) ?? [],
    )
  })
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
  const metadata = recordValue(row.metadata)
  const resumoInteligente = recordValue(metadata.resumoInteligente)
  const nivelConfianca = text(resumoInteligente.nivelConfianca)

  return {
    baseSincronizacaoEm: text(row.base_sincronizacao_em) || null,
    criterioProntidao: recordValue(row.criterio_prontidao),
    erroMensagem: text(row.erro_mensagem) || null,
    faseProcessual: text(row.fase_processual) || null,
    fonteResumo: text(row.fonte_resumo) || null,
    geradoEm: text(row.gerado_em) || null,
    metadata,
    modeloVersao: text(row.modelo_versao) || null,
    movimentacoesConsideradas: numberValue(row.movimentacoes_consideradas),
    movimentacoesRelevantes: numberValue(row.movimentacoes_relevantes),
    nivelProntidao: nivelProntidao(row.nivel_prontidao),
    pendenciasIdentificadas: stringList(row.pendencias_identificadas),
    proximasAcoesSugeridas: stringList(row.proximas_acoes_sugeridas),
    resumoInteligente: Object.keys(resumoInteligente).length ? {
      doQueSeTrata: text(resumoInteligente.doQueSeTrata) || null,
      erroGeracaoIa: text(resumoInteligente.erroGeracaoIa) || null,
      faseAtual: text(resumoInteligente.faseAtual) || null,
      fonte: text(resumoInteligente.fonte) || null,
      geradoEm: text(resumoInteligente.geradoEm) || null,
      leituraExecutiva: text(resumoInteligente.leituraExecutiva) || null,
      modelo: text(resumoInteligente.modelo) || null,
      nivelConfianca: ['alto', 'medio', 'baixo'].includes(nivelConfianca) ? nivelConfianca as 'alto' | 'medio' | 'baixo' : null,
      precisaRevisaoHumana: Boolean(resumoInteligente.precisaRevisaoHumana),
      principaisAndamentos: stringList(resumoInteligente.principaisAndamentos),
      proximasAcoesSugeridas: stringList(resumoInteligente.proximasAcoesSugeridas),
      riscosAlertas: stringList(resumoInteligente.riscosAlertas),
      ultimosMarcos: stringList(resumoInteligente.ultimosMarcos),
    } : null,
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
  const etiquetas = await lookupEtiquetas([id])
  const item = mapProcesso(row, { ...maps, etiquetas })
  const [movimentacoesResult, tarefasResult, documentosResult, eventosResult, acordosResult, resumo] = await Promise.all([
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
    admin()
      .schema('gkit_jur')
      .from('acordos_judiciais')
      .select('id,processo_id,valor_total,quantidade_parcelas,dia_vencimento,primeiro_vencimento,status,email_lembrete,lembretes_pagamento_ativos,lembrete_dias,observacoes,quebrado_em,quitado_em,created_at,updated_at')
      .eq('processo_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    getGkitJurProcessSummary(id),
  ])

  if (movimentacoesResult.error) throw new Error(movimentacoesResult.error.message)
  if (tarefasResult.error) throw new Error(tarefasResult.error.message)
  if (documentosResult.error) throw new Error(documentosResult.error.message)
  if (eventosResult.error) throw new Error(eventosResult.error.message)
  if (acordosResult.error) throw new Error(acordosResult.error.message)
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
  const acordos = await hydrateAcordosJudiciais((acordosResult.data ?? []) as Array<Record<string, unknown>>, new Map([[id, item]]))

  return {
    acordos,
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

export async function getGkitJurAcordosData(): Promise<GkitJurAcordosData> {
  const result = await admin()
    .schema('gkit_jur')
    .from('acordos_judiciais')
    .select('id,processo_id,valor_total,quantidade_parcelas,dia_vencimento,primeiro_vencimento,status,email_lembrete,lembretes_pagamento_ativos,lembrete_dias,observacoes,quebrado_em,quitado_em,created_at,updated_at')
    .in('status', ['ativo', 'quebrado', 'cumprido'])
    .order('updated_at', { ascending: false })
    .limit(500)

  if (result.error) throw new Error(result.error.message)

  const acordos = await hydrateAcordosJudiciais((result.data ?? []) as Array<Record<string, unknown>>)
  const ativos = acordos.filter((acordo) => acordo.status === 'ativo')
  const atrasados = acordos.filter((acordo) => acordo.status === 'ativo' && acordo.parcelasAtrasadas > 0)
  const lembretesPendentes = ativos.reduce((total, acordo) => total + acordo.lembretesPendentes, 0)
  const lembretesAtrasados = ativos.reduce((total, acordo) => total + acordo.lembretesAtrasados, 0)
  const hoje = new Date().toISOString().slice(0, 10)
  const lembretesHoje = ativos.reduce((total, acordo) => (
    total + acordo.lembretesEmail.filter((lembrete) => lembrete.status === 'pendente' && lembrete.agendadoPara === hoje).length
  ), 0)

  return {
    acordos,
    metrics: {
      ativos: ativos.length,
      atrasados: atrasados.length,
      lembretesAtrasados,
      lembretesHoje,
      lembretesPendentes,
      quebrados: acordos.filter((acordo) => acordo.status === 'quebrado').length,
      total: acordos.length,
      valorAberto: ativos.reduce((total, acordo) => total + acordo.valorPendente, 0),
    },
  }
}

function cockpitBars(entries: Array<{ label: string; count: number; tone: GkitJurCockpitBar['tone'] }>): GkitJurCockpitBar[] {
  const total = entries.reduce((sum, entry) => sum + entry.count, 0)
  return entries.map((entry) => ({
    label: entry.label,
    value: total ? Math.max(4, Math.round((entry.count / total) * 100)) : 0,
    tone: entry.tone,
  }))
}

function cockpitTrend(values: number[]) {
  const clean = values.map((value) => Math.max(0, Number.isFinite(value) ? value : 0))
  const max = Math.max(...clean, 1)
  const normalized = clean.map((value) => value ? Math.max(18, Math.round((value / max) * 100)) : 8)
  while (normalized.length < 7) normalized.push(normalized[normalized.length % clean.length] ?? 8)
  return normalized.slice(0, 7)
}

function cockpitTone(priority: string, statusValue = ''): GkitJurCockpitRow['tone'] {
  const key = normalizeSearch(`${priority} ${statusValue}`)
  if (key.includes('critica') || key.includes('vencida') || key.includes('erro') || key.includes('quebrado')) return 'critical'
  if (key.includes('alta') || key.includes('atras') || key.includes('pendente') || key.includes('triada')) return 'medium'
  return 'ok'
}

function cockpitOwner(...values: Array<string | null | undefined>) {
  return values.find((value) => value && value.trim()) ?? 'Sem dono definido'
}

function cockpitDate(value: string | null | undefined) {
  return value ? formatDate(value) : 'Sem data'
}

async function countRows(query: any, missingAsZero = false) {
  const result = await query
  if (result.error) {
    if (missingAsZero && ['42P01', 'PGRST205'].includes(text(result.error.code))) return 0
    throw new Error(result.error.message)
  }
  return result.count ?? 0
}

async function getGkitJurCockpitProcessosArea(): Promise<GkitJurCockpitAreaData> {
  const [rowsResult, readiness] = await Promise.all([
    admin()
      .schema('gkit_jur')
      .from('processos')
      .select(`${PROCESS_LIST_SELECT},updated_at`, { count: 'exact' })
      .eq('status', DEFAULT_PROCESS_STATUS)
      .order('updated_at', { ascending: false })
      .limit(5),
    getGkitJurLabReadiness(),
  ])

  if (rowsResult.error) throw new Error(rowsResult.error.message)

  const rows = (rowsResult.data ?? []) as Array<Record<string, unknown>>
  const maps = await lookupMaps(rows)
  const processos = rows.map((row) => mapProcesso(row, maps))
  const count = rowsResult.count ?? processos.length
  const readinessValues = {
    pronto: readiness.pronto ?? 0,
    parcial: readiness.parcial ?? 0,
    capa: readiness.capa ?? 0,
    erro: (readiness.erro ?? 0) + (readiness.sem_base ?? 0),
  }

  return {
    action: 'Carteira processual',
    count,
    description: 'Processos ativos da carteira, com dono, prontidao e movimento.',
    filters: ['Sem dono', 'Sem movimento', 'Alta exposicao', 'Prontos'],
    bars: cockpitBars([
      { label: 'Pronto', count: readinessValues.pronto, tone: 'green' },
      { label: 'Parcial', count: readinessValues.parcial, tone: 'blue' },
      { label: 'Capa', count: readinessValues.capa, tone: 'yellow' },
      { label: 'Risco', count: readinessValues.erro, tone: 'red' },
    ]),
    trend: cockpitTrend([readinessValues.capa, readinessValues.parcial, readinessValues.pronto, count]),
    rows: processos.map((processo, index) => {
      const raw = rows[index] ?? {}
      return {
        id: processo.numeroCnj,
        title: processo.clienteNome || processo.titulo || processo.pasta || 'Processo sem cliente identificado',
        subtitle: [processo.classeNome, processo.tribunalSigla, processo.orgaoJulgadorNome].filter(Boolean).join(' | ') || 'Sem classificacao completa',
        owner: cockpitOwner(processo.responsavelNome, processo.carteiraNome),
        status: processo.statusMonitoramento,
        due: cockpitDate(text(raw.updated_at) || processo.ultimaMovimentacaoEm || processo.ultimaSincronizacaoEm),
        tone: cockpitTone('', processo.statusMonitoramento),
        href: `/modulos/gkit-jur/processos/${processo.id}`,
      }
    }),
  }
}

async function getGkitJurCockpitPreJuridicoArea(): Promise<GkitJurCockpitAreaData> {
  const [rowsResult, metrics] = await Promise.all([
    admin()
      .schema('gkit_jur')
      .from('pre_juridicos')
      .select('id,titulo,cliente_id,cliente_nome,descricao,carteira_id,responsavel_id,origem,area,valor_estimado,laudo_pdf_url,unidade,bloco,responsavel_unidade,cotas_debito,ata_eleicao_status,ata_prestacao_contas_status,debitos_atualizados_status,procuracao_status,administradora_email,sindico_email,administradora_solicitada_em,administradora_retorno_em,procuracao_gerada_em,procuracao_enviada_em,sindico_retorno_em,pronto_distribuicao_em,probabilidade,prioridade,status,motivo_status,data_entrada,prazo_analise,convertido_processo_id,convertido_em,created_at,updated_at', { count: 'exact' })
      .in('status', ['em_analise', 'aguardando_documentos', 'aprovado'])
      .order('prazo_analise', { ascending: true, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(5),
    getGkitJurPreJuridicoMetrics(),
  ])

  if (rowsResult.error) throw new Error(rowsResult.error.message)

  const rows = (rowsResult.data ?? []) as Array<Record<string, unknown>>
  const maps = await lookupMaps(rows)
  const items = rows.map((row) => mapPreJuridico(row, maps))
  const ativos = metrics.emAnalise + metrics.aguardandoDocumentos + metrics.aprovados

  return {
    action: 'Triagem antes do processo',
    count: ativos,
    description: 'Casos pre-juridicos em triagem, documentos e decisao de ajuizamento.',
    filters: ['Em analise', 'Documentos', 'Alta prioridade', 'Aprovados'],
    bars: cockpitBars([
      { label: 'Analise', count: metrics.emAnalise, tone: 'blue' },
      { label: 'Docs', count: metrics.aguardandoDocumentos, tone: 'yellow' },
      { label: 'Aprovado', count: metrics.aprovados, tone: 'green' },
      { label: 'Convertido', count: metrics.convertidos, tone: 'red' },
    ]),
    trend: cockpitTrend([metrics.aguardandoDocumentos, metrics.emAnalise, metrics.aprovados, metrics.convertidos, ativos]),
    rows: items.map((item) => ({
      id: item.id,
      title: item.titulo,
      subtitle: item.clienteNome || item.clienteSnapshotNome || item.descricao || 'Caso em triagem pre-juridica',
      owner: cockpitOwner(item.responsavelNome, item.carteiraNome),
      status: item.prioridade === 'critica' ? 'critica' : item.status,
      due: item.prazoAnalise ? cockpitDate(item.prazoAnalise) : cockpitDate(item.updatedAt || item.dataEntrada || item.createdAt),
      tone: cockpitTone(item.prioridade, item.status),
      href: `/modulos/gkit-jur/pre-juridico?q=${encodeURIComponent(item.titulo)}`,
    })),
  }
}

async function getGkitJurCockpitTarefasArea(): Promise<GkitJurCockpitAreaData> {
  const [rowsResult, criticaCount, altaCount, mediaCount, baixaCount] = await Promise.all([
    admin()
      .schema('gkit_jur')
      .from('tarefas')
      .select('id,processo_id,carteira_id,responsavel_id,tipo,titulo,descricao,status,prioridade,prazo_at,origem,payload,created_at', { count: 'exact' })
      .in('status', OPEN_TASK_STATUSES)
      .order('prazo_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(5),
    countRows(admin().schema('gkit_jur').from('tarefas').select('id', { count: 'exact', head: true }).in('status', OPEN_TASK_STATUSES).eq('prioridade', 'critica')),
    countRows(admin().schema('gkit_jur').from('tarefas').select('id', { count: 'exact', head: true }).in('status', OPEN_TASK_STATUSES).eq('prioridade', 'alta')),
    countRows(admin().schema('gkit_jur').from('tarefas').select('id', { count: 'exact', head: true }).in('status', OPEN_TASK_STATUSES).eq('prioridade', 'media')),
    countRows(admin().schema('gkit_jur').from('tarefas').select('id', { count: 'exact', head: true }).in('status', OPEN_TASK_STATUSES).eq('prioridade', 'baixa')),
  ])

  if (rowsResult.error) throw new Error(rowsResult.error.message)

  const rows = (rowsResult.data ?? []) as Array<Record<string, unknown>>
  const processoIds = [...new Set(rows.map((row) => text(row.processo_id)).filter(Boolean))]
  const processosResult = processoIds.length
    ? await admin().schema('gkit_jur').from('processos').select(PROCESS_LIST_SELECT).in('id', processoIds)
    : { data: [], error: null }
  if (processosResult.error) throw new Error(processosResult.error.message)

  const processoRows = (processosResult.data ?? []) as Array<Record<string, unknown>>
  const processoMaps = await lookupMaps(processoRows)
  const processoMap = new Map(processoRows.map((row) => [String(row.id), mapProcesso(row, processoMaps)]))
  const tarefaMaps = await lookupTarefaMaps(rows)
  const total = rowsResult.count ?? rows.length

  return {
    action: 'Fila operacional',
    count: total,
    description: 'Tarefas abertas da carteira, priorizadas por prazo e severidade.',
    filters: ['Criticas', 'Hoje', 'Sem responsavel', 'Automacao'],
    bars: cockpitBars([
      { label: 'Critica', count: criticaCount, tone: 'red' },
      { label: 'Alta', count: altaCount, tone: 'yellow' },
      { label: 'Media', count: mediaCount, tone: 'blue' },
      { label: 'Baixa', count: baixaCount, tone: 'green' },
    ]),
    trend: cockpitTrend([baixaCount, mediaCount, altaCount, criticaCount, total]),
    rows: rows.map((row) => {
      const tarefa = mapTarefa(row, tarefaMaps)
      const processo = processoMap.get(tarefa.processoId)
      return {
        id: tarefa.id,
        title: tarefa.titulo,
        subtitle: processo ? `${processo.numeroCnj} - ${processo.clienteNome || processo.titulo || 'Processo ativo'}` : text(row.descricao, 'Tarefa aberta sem processo localizado'),
        owner: cockpitOwner(tarefa.responsavelNome, tarefa.carteiraNome, processo?.responsavelNome, processo?.carteiraNome),
        status: tarefa.prioridade,
        due: tarefa.prazoAt ? cockpitDate(tarefa.prazoAt) : cockpitDate(tarefa.createdAt),
        tone: cockpitTone(tarefa.prioridade, tarefa.status),
        href: `/modulos/gkit-jur/processos/${tarefa.processoId}#tarefas`,
      }
    }),
  }
}

async function getGkitJurCockpitPublicacoesArea(): Promise<GkitJurCockpitAreaData> {
  const actionableStatuses = ['pendente', 'triada_ia', 'em_tratamento']
  const [rowsResult, pendentesCount, triadasCount, emTratamentoCount, tratadasCount] = await Promise.all([
    admin()
      .schema('gkit_jur')
      .from('publicacoes_monitoradas')
      .select('id,processo_id,numero_cnj_limpo,fonte,fonte_evento_id,data_disponibilizacao,data_publicacao,jornal,termo,origem_orgao,arq,pub,texto_preview,texto_completo,texto_hash,status,decisao_tratamento,classificacao_ia,confianca_ia,sugestao_ia,tarefa_id,tratado_por,tratado_em,motivo_tratamento,conteudo_removido_em,created_at,updated_at', { count: 'exact' })
      .in('status', actionableStatuses)
      .order('data_disponibilizacao', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(5),
    countRows(admin().schema('gkit_jur').from('publicacoes_monitoradas').select('id', { count: 'exact', head: true }).eq('status', 'pendente'), true),
    countRows(admin().schema('gkit_jur').from('publicacoes_monitoradas').select('id', { count: 'exact', head: true }).eq('status', 'triada_ia'), true),
    countRows(admin().schema('gkit_jur').from('publicacoes_monitoradas').select('id', { count: 'exact', head: true }).eq('status', 'em_tratamento'), true),
    countRows(admin().schema('gkit_jur').from('publicacoes_monitoradas').select('id', { count: 'exact', head: true }).eq('status', 'tratada'), true),
  ])

  if (rowsResult.error) {
    if (['42P01', 'PGRST205'].includes(text(rowsResult.error.code))) {
      return {
        action: 'Inbox de publicacoes',
        count: 0,
        description: 'Publicacoes dos processos da carteira.',
        filters: ['Nao tratadas', 'Viraram prazo', 'Exigem leitura', 'Baixo risco'],
        bars: cockpitBars([]),
        trend: cockpitTrend([0]),
        rows: [],
      }
    }
    throw new Error(rowsResult.error.message)
  }

  const rows = (rowsResult.data ?? []) as Array<Record<string, unknown>>
  const processoIds = [...new Set(rows.map((row) => text(row.processo_id)).filter(Boolean))]
  const cnjs = [...new Set(rows.map((row) => text(row.numero_cnj_limpo)).filter(Boolean))]
  const processosByIdResult = processoIds.length
    ? await admin().schema('gkit_jur').from('processos').select(PROCESS_LIST_SELECT).in('id', processoIds)
    : { data: [], error: null }
  if (processosByIdResult.error) throw new Error(processosByIdResult.error.message)
  const loadedById = (processosByIdResult.data ?? []) as Array<Record<string, unknown>>
  const loadedCnjs = new Set(loadedById.map((row) => text(row.numero_cnj_limpo)).filter(Boolean))
  const missingCnjs = cnjs.filter((cnj) => !loadedCnjs.has(cnj))
  const processosByCnjResult = missingCnjs.length
    ? await admin().schema('gkit_jur').from('processos').select(PROCESS_LIST_SELECT).in('numero_cnj_limpo', missingCnjs)
    : { data: [], error: null }
  if (processosByCnjResult.error) throw new Error(processosByCnjResult.error.message)

  const processRows = [
    ...loadedById,
    ...((processosByCnjResult.data ?? []) as Array<Record<string, unknown>>),
  ]
  const maps = await lookupMaps(processRows)
  const processoMap = new Map<string, GkitJurProcessListItem>()
  const processoCnjMap = new Map<string, GkitJurProcessListItem>()
  processRows.forEach((row) => {
    const processo = mapProcesso(row, maps)
    processoMap.set(processo.id, processo)
    const cnj = text(row.numero_cnj_limpo)
    if (cnj) processoCnjMap.set(cnj, processo)
  })

  const publicacoes = rows.map((row) => mapPublicacao(row, processoMap, processoCnjMap, maps))
  const total = rowsResult.count ?? rows.length

  return {
    action: 'Inbox de publicacoes',
    count: total,
    description: 'Publicacoes dos processos da carteira, agrupadas para tratamento.',
    filters: ['Nao tratadas', 'Viraram prazo', 'Exigem leitura', 'Baixo risco'],
    bars: cockpitBars([
      { label: 'Pendente', count: pendentesCount, tone: 'red' },
      { label: 'Triada', count: triadasCount, tone: 'yellow' },
      { label: 'Tratando', count: emTratamentoCount, tone: 'blue' },
      { label: 'Tratada', count: tratadasCount, tone: 'green' },
    ]),
    trend: cockpitTrend([pendentesCount, triadasCount, emTratamentoCount, tratadasCount, total]),
    rows: publicacoes.map((item) => ({
      id: item.numeroCnj || item.id,
      title: item.termo || item.sugestaoIa || item.textoPreview || 'Publicacao recebida',
      subtitle: item.textoPreview || [item.fonte, item.jornal, item.origemOrgao].filter(Boolean).join(' | ') || 'Sem resumo de publicacao',
      owner: cockpitOwner(item.responsavelNome, item.carteiraNome, item.clienteNome),
      status: item.status,
      due: cockpitDate(item.dataDisponibilizacao || item.dataPublicacao || item.createdAt),
      tone: cockpitTone('', item.status),
      href: item.processoBaseId ? `/modulos/gkit-jur/processos/${item.processoBaseId}` : `/modulos/gkit-jur/publicacoes/lista?q=${encodeURIComponent(item.numeroCnj || item.id)}`,
    })),
  }
}

async function getGkitJurCockpitAcordosArea(): Promise<GkitJurCockpitAreaData> {
  const data = await getGkitJurAcordosData()
  const ativos = data.acordos.filter((acordo) => acordo.status === 'ativo')
  const cumpridos = data.acordos.filter((acordo) => acordo.status === 'cumprido')
  const quebrados = data.acordos.filter((acordo) => acordo.status === 'quebrado')

  return {
    action: 'Carteira de acordos',
    count: data.metrics.total,
    description: 'Acordos judiciais em negociacao, execucao ou risco.',
    filters: ['Ativos', 'Atrasados', 'Quebrados', 'Cumpridos'],
    bars: cockpitBars([
      { label: 'Ativo', count: ativos.length, tone: 'blue' },
      { label: 'Atrasado', count: data.metrics.atrasados, tone: 'red' },
      { label: 'Quebrado', count: quebrados.length, tone: 'yellow' },
      { label: 'Cumprido', count: cumpridos.length, tone: 'green' },
    ]),
    trend: cockpitTrend([cumpridos.length, ativos.length, data.metrics.atrasados, quebrados.length, data.metrics.total]),
    rows: data.acordos.slice(0, 5).map((acordo) => ({
      id: acordo.id,
      title: acordo.numeroCnj || 'Acordo judicial',
      subtitle: acordo.clienteNome || acordo.observacoes || 'Acordo vinculado ao processo',
      owner: cockpitOwner(acordo.carteiraNome, acordo.responsavelNome),
      status: acordo.parcelasAtrasadas > 0 ? 'atrasado' : acordo.status,
      due: acordo.proximoVencimento ? cockpitDate(acordo.proximoVencimento) : cockpitDate(acordo.updatedAt),
      tone: cockpitTone('', acordo.parcelasAtrasadas > 0 ? 'atrasado' : acordo.status),
      href: `/modulos/gkit-jur/processos/${acordo.processoId}#acordos`,
    })),
  }
}

async function getGkitJurCockpitAgendaArea(): Promise<GkitJurCockpitAreaData> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = today.toISOString()

  const rowsResult = await admin()
    .schema('gkit_jur')
    .from('eventos_processo')
    .select('id,processo_id,carteira_id,responsavel_id,tipo,titulo,descricao,data_evento,origem,created_at', { count: 'exact' })
    .gte('data_evento', todayIso)
    .order('data_evento', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(5)

  if (rowsResult.error) {
    if (['42P01', 'PGRST205'].includes(text(rowsResult.error.code))) {
      return {
        action: 'Eventos da carteira',
        count: 0,
        description: 'Eventos futuros dos processos da carteira.',
        filters: ['Hoje', 'Semana', 'Audiencias', 'Prazos internos'],
        bars: cockpitBars([]),
        trend: cockpitTrend([0]),
        rows: [],
      }
    }
    throw new Error(rowsResult.error.message)
  }

  const rows = (rowsResult.data ?? []) as Array<Record<string, unknown>>
  const [audienciasCount, prazosCount, providenciasCount] = await Promise.all([
    countRows(admin().schema('gkit_jur').from('eventos_processo').select('id', { count: 'exact', head: true }).gte('data_evento', todayIso).eq('tipo', 'audiencia'), true),
    countRows(admin().schema('gkit_jur').from('eventos_processo').select('id', { count: 'exact', head: true }).gte('data_evento', todayIso).eq('tipo', 'prazo'), true),
    countRows(admin().schema('gkit_jur').from('eventos_processo').select('id', { count: 'exact', head: true }).gte('data_evento', todayIso).eq('tipo', 'providencia_interna'), true),
  ])
  const processoIds = [...new Set(rows.map((row) => text(row.processo_id)).filter(Boolean))]
  const processosResult = processoIds.length
    ? await admin().schema('gkit_jur').from('processos').select(PROCESS_LIST_SELECT).in('id', processoIds)
    : { data: [], error: null }
  if (processosResult.error) throw new Error(processosResult.error.message)

  const processoRows = (processosResult.data ?? []) as Array<Record<string, unknown>>
  const processoMaps = await lookupMaps(processoRows)
  const processoMap = new Map(processoRows.map((row) => [String(row.id), mapProcesso(row, processoMaps)]))
  const eventoMaps = await lookupTarefaMaps(rows)
  const eventos = rows.map((row) => {
    const processo = processoMap.get(text(row.processo_id))
    return mapEventoProcesso(row, eventoMaps, {
      carteiraNome: processo?.carteiraNome ?? null,
      responsavelNome: processo?.responsavelNome ?? null,
    })
  })
  const total = rowsResult.count ?? rows.length

  return {
    action: 'Eventos da carteira',
    count: total,
    description: 'Audiencias, prazos internos e compromissos futuros dos processos.',
    filters: ['Hoje', 'Semana', 'Audiencias', 'Prazos internos'],
    bars: cockpitBars([
      { label: 'Audiencia', count: audienciasCount, tone: 'red' },
      { label: 'Prazo', count: prazosCount, tone: 'yellow' },
      { label: 'Providencia', count: providenciasCount, tone: 'blue' },
      { label: 'Outros', count: Math.max(0, total - audienciasCount - prazosCount - providenciasCount), tone: 'green' },
    ]),
    trend: cockpitTrend([audienciasCount, prazosCount, providenciasCount, total]),
    rows: eventos.map((evento) => {
      const processo = processoMap.get(evento.processoId)
      return {
        id: evento.id,
        title: evento.titulo,
        subtitle: processo ? `${processo.numeroCnj} - ${processo.clienteNome || processo.titulo || 'Processo ativo'}` : evento.descricao || 'Evento vinculado ao juridico',
        owner: cockpitOwner(evento.responsavelNome, evento.carteiraNome),
        status: evento.tipo,
        due: cockpitDate(evento.dataEvento),
        tone: cockpitTone('', evento.tipo),
        href: `/modulos/gkit-jur/processos/${evento.processoId}#timeline`,
      }
    }),
  }
}

export async function getGkitJurCockpitUnicoData(): Promise<GkitJurCockpitUnicoData> {
  const [processos, preJuridico, tarefas, publicacoes, acordos, agenda] = await Promise.all([
    getGkitJurCockpitProcessosArea(),
    getGkitJurCockpitPreJuridicoArea(),
    getGkitJurCockpitTarefasArea(),
    getGkitJurCockpitPublicacoesArea(),
    getGkitJurCockpitAcordosArea(),
    getGkitJurCockpitAgendaArea(),
  ])

  return { processos, pre_juridico: preJuridico, tarefas, publicacoes, acordos, agenda }
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

function movementSortValue(row: GkitJurMovimentacao, sort: string) {
  if (sort === 'nome') return row.nome
  if (sort === 'origem') return row.origem
  if (sort === 'processo') return row.numeroCnj
  return row.dataHora ?? ''
}

function matchesMovementFilters(row: GkitJurMovimentacao, processo: GkitJurProcessListItem | undefined, filters: GkitJurMovimentacaoFilters) {
  if (!processo) return false
  if (filters.carteiraId && processo.carteiraNome == null) return false
  if (filters.responsavelId && processo.responsavelNome == null) return false
  if (filters.tribunal && processo.tribunalSigla !== filters.tribunal) return false
  if (filters.origem && row.origem !== filters.origem) return false
  if (filters.relevancia === 'relevante' && !row.relevante) return false
  if (filters.relevancia === 'alerta' && !row.geraAlerta) return false
  if (filters.relevancia === 'informativa' && (row.relevante || row.geraAlerta)) return false
  if (filters.q) {
    const haystack = normalizeSearch([
      row.nome,
      row.origem,
      row.numeroCnj,
      row.clienteNome,
      processo.titulo,
      processo.classeNome,
      processo.carteiraNome,
      processo.responsavelNome,
    ].filter(Boolean).join(' '))
    if (!haystack.includes(normalizeSearch(filters.q))) return false
  }
  return true
}

async function resolveMovementProcessScope(filters: GkitJurMovimentacaoFilters) {
  if (!filters.carteiraId && !filters.responsavelId && !filters.tribunal) return null

  let query = admin()
    .schema('gkit_jur')
    .from('processos')
    .select(PROCESS_LIST_SELECT)
    .eq('status', DEFAULT_PROCESS_STATUS)

  if (filters.carteiraId) query = query.eq('carteira_id', filters.carteiraId)
  if (filters.responsavelId) query = query.eq('responsavel_id', filters.responsavelId)
  if (filters.tribunal) query = query.eq('tribunal_sigla', filters.tribunal)

  const result = await query.limit(MOVEMENT_PROCESS_SCOPE_LIMIT)
  if (result.error) throw new Error(result.error.message)
  return (result.data ?? []) as Array<Record<string, unknown>>
}

export async function listGkitJurMovimentacoes(filters: GkitJurMovimentacaoFilters = buildGkitJurMovimentacaoFilters()): Promise<GkitJurMovimentacoesData> {
  const from = (filters.page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE
  const scopedProcessRows = await resolveMovementProcessScope(filters)
  const scopedProcessIds = scopedProcessRows
    ? scopedProcessRows.map((row) => text(row.id)).filter(Boolean)
    : null

  let movimentacoesQuery = admin()
    .schema('gkit_jur')
    .from('movimentacoes')
    .select('id,processo_id,nome,data_hora,origem,relevante,gera_alerta')

  if (scopedProcessIds) movimentacoesQuery = scopedProcessIds.length ? movimentacoesQuery.in('processo_id', scopedProcessIds) : null
  if (filters.origem && movimentacoesQuery) movimentacoesQuery = movimentacoesQuery.eq('origem', filters.origem)
  if (filters.relevancia === 'relevante' && movimentacoesQuery) movimentacoesQuery = movimentacoesQuery.eq('relevante', true)
  if (filters.relevancia === 'alerta' && movimentacoesQuery) movimentacoesQuery = movimentacoesQuery.eq('gera_alerta', true)
  if (filters.relevancia === 'informativa' && movimentacoesQuery) {
    movimentacoesQuery = movimentacoesQuery.eq('relevante', false).eq('gera_alerta', false)
  }

  const [metrics, filterOptions, movimentacoesResult, origensResult] = await Promise.all([
    getGkitJurDashboardMetrics(),
    getFilterOptions(),
    movimentacoesQuery
      ? movimentacoesQuery
        .order('data_hora', { ascending: filters.dir === 'asc', nullsFirst: false })
        .limit(1000)
      : Promise.resolve({ data: [], error: null }),
    admin()
      .schema('gkit_jur')
      .from('movimentacoes')
      .select('origem')
      .limit(5000),
  ])

  if (movimentacoesResult.error) throw new Error(movimentacoesResult.error.message)
  if (origensResult.error) throw new Error(origensResult.error.message)

  const movements = (movimentacoesResult.data ?? []) as Array<Record<string, unknown>>
  const processoIds = [...new Set(movements.map((row) => text(row.processo_id)).filter(Boolean))]
  const processoMap = new Map<string, GkitJurProcessListItem>()
  const rawProcessRows = new Map<string, Record<string, unknown>>()

  if (processoIds.length) {
    const scopedRowsById = new Map((scopedProcessRows ?? []).map((row) => [String(row.id), row]))
    const missingProcessIds = scopedProcessRows ? processoIds.filter((id) => !scopedRowsById.has(id)) : processoIds
    const loadedRows = scopedProcessRows
      ? processoIds.map((id) => scopedRowsById.get(id)).filter(Boolean) as Array<Record<string, unknown>>
      : []
    const processosResult = missingProcessIds.length
      ? await admin()
        .schema('gkit_jur')
        .from('processos')
        .select(PROCESS_LIST_SELECT)
        .eq('status', DEFAULT_PROCESS_STATUS)
        .in('id', missingProcessIds)
      : { data: [], error: null }

    if (processosResult.error) throw new Error(processosResult.error.message)
    const rows = [...loadedRows, ...((processosResult.data ?? []) as Array<Record<string, unknown>>)]
    const maps = await lookupMaps(rows)
    rows.forEach((row) => {
      rawProcessRows.set(String(row.id), row)
      processoMap.set(String(row.id), mapProcesso(row, maps))
    })
  }

  const mapped = movements
    .map((row) => mapMovimentacao(row, processoMap))
    .filter((row) => {
      const processo = processoMap.get(row.processoId)
      const raw = rawProcessRows.get(row.processoId)
      if (!processo || !raw) return false
      if (filters.carteiraId && text(raw.carteira_id) !== filters.carteiraId) return false
      if (filters.responsavelId && text(raw.responsavel_id) !== filters.responsavelId) return false
      return matchesMovementFilters(row, processo, filters)
    })
    .sort((a, b) => {
      const left = movementSortValue(a, filters.sort)
      const right = movementSortValue(b, filters.sort)
      const result = String(left).localeCompare(String(right), 'pt-BR', { numeric: true })
      return filters.dir === 'asc' ? result : -result
    })

  const total = mapped.length
  const origens = [...new Set(((origensResult.data ?? []) as Array<Record<string, unknown>>)
    .map((row) => text(row.origem))
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))

  return {
    filterOptions: {
      ...filterOptions,
      origens: origens.map((origem) => ({ label: origem, value: origem })),
    },
    filters,
    metrics,
    movimentacoes: mapped.slice(from, to),
    pagination: {
      currentPage: filters.page,
      from: total ? from + 1 : 0,
      pageSize: PAGE_SIZE,
      to: Math.min(to, total),
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    },
  }
}

function publicacaoStatus(value: unknown): GkitJurPublicacaoStatus {
  const current = text(value, 'pendente')
  if (['pendente', 'triada_ia', 'em_tratamento', 'tratada', 'dispensada', 'duplicada', 'erro'].includes(current)) {
    return current as GkitJurPublicacaoStatus
  }
  return 'pendente'
}

function publicacaoDecisao(value: unknown): GkitJurPublicacaoDecisao | null {
  const current = text(value)
  if ([
    'gerar_prazo',
    'gerar_tarefa',
    'registrar_ciencia',
    'vincular_documento',
    'atualizar_resumo',
    'dispensar_sem_acao',
    'marcar_duplicada',
    'revisar_cadastro_processo',
  ].includes(current)) {
    return current as GkitJurPublicacaoDecisao
  }
  return null
}

async function resolvePublicationProcessScope(filters: GkitJurPublicacaoFilters) {
  if (!filters.carteiraId && !filters.responsavelId && !filters.tribunal) return null

  let query = admin()
    .schema('gkit_jur')
    .from('processos')
    .select(PROCESS_LIST_SELECT)

  if (filters.carteiraId) query = query.eq('carteira_id', filters.carteiraId)
  if (filters.responsavelId) query = query.eq('responsavel_id', filters.responsavelId)
  if (filters.tribunal) query = query.eq('tribunal_sigla', filters.tribunal)

  const result = await query.limit(MOVEMENT_PROCESS_SCOPE_LIMIT)
  if (result.error) throw new Error(result.error.message)
  return (result.data ?? []) as Array<Record<string, unknown>>
}

function mapPublicacao(
  row: Record<string, unknown>,
  processoMap: Map<string, GkitJurProcessListItem>,
  processoCnjMap: Map<string, GkitJurProcessListItem>,
  maps: Awaited<ReturnType<typeof lookupMaps>>,
): GkitJurPublicacao {
  const processoId = text(row.processo_id)
  const processo = processoId ? processoMap.get(processoId) ?? null : null
  const numeroCnjLimpo = text(row.numero_cnj_limpo)
  const processoBase = processo ?? processoCnjMap.get(numeroCnjLimpo) ?? null
  const tratadoPor = text(row.tratado_por)
  return {
    id: String(row.id),
    processoId: processoId || null,
    processoBaseId: processoBase?.id ?? null,
    processoBaseStatus: processoBase?.status ?? null,
    processoBaseStatusMonitoramento: processoBase?.statusMonitoramento ?? null,
    numeroCnj: formatCnj(numeroCnjLimpo),
    numeroCnjLimpo,
    fonte: text(row.fonte, 'fonte'),
    fonteEventoId: text(row.fonte_evento_id) || null,
    dataDisponibilizacao: text(row.data_disponibilizacao) || null,
    dataPublicacao: text(row.data_publicacao) || null,
    jornal: text(row.jornal) || null,
    termo: text(row.termo) || null,
    origemOrgao: text(row.origem_orgao) || null,
    arq: text(row.arq) || null,
    pub: text(row.pub) || null,
    textoPreview: text(row.texto_preview) || null,
    textoCompleto: text(row.texto_completo) || null,
    textoHash: text(row.texto_hash),
    status: publicacaoStatus(row.status),
    decisaoTratamento: publicacaoDecisao(row.decisao_tratamento),
    classificacaoIa: recordValue(row.classificacao_ia),
    confiancaIa: row.confianca_ia === null || row.confianca_ia === undefined ? null : Number(row.confianca_ia),
    sugestaoIa: text(row.sugestao_ia) || null,
    tarefaId: text(row.tarefa_id) || null,
    tratadoPor: tratadoPor ? maps.responsaveis.get(tratadoPor) ?? tratadoPor : null,
    tratadoEm: text(row.tratado_em) || null,
    motivoTratamento: text(row.motivo_tratamento) || null,
    conteudoRemovidoEm: text(row.conteudo_removido_em) || null,
    clienteNome: processoBase?.clienteNome ?? null,
    carteiraNome: processoBase?.carteiraNome ?? null,
    responsavelNome: processoBase?.responsavelNome ?? null,
    processoTitulo: processoBase?.titulo ?? null,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  }
}

function publicacaoSortValue(row: GkitJurPublicacao, sort: string) {
  if (sort === 'processo') return row.numeroCnj
  if (sort === 'fonte') return row.fonte
  if (sort === 'status') return row.status
  if (sort === 'tratado_em') return row.tratadoEm || ''
  if (sort === 'created_at') return row.createdAt
  return row.dataDisponibilizacao || row.dataPublicacao || row.createdAt
}

function matchesPublicacaoFilters(row: GkitJurPublicacao, filters: GkitJurPublicacaoFilters) {
  if (filters.status && row.status !== filters.status) return false
  if (filters.fonte && row.fonte !== filters.fonte) return false
  if (filters.q) {
    const haystack = normalizeSearch([
      row.numeroCnj,
      row.fonte,
      row.jornal,
      row.termo,
      row.origemOrgao,
      row.textoPreview,
      row.textoCompleto,
      row.clienteNome,
      row.carteiraNome,
      row.responsavelNome,
      row.processoTitulo,
      row.processoBaseStatus,
      row.processoBaseStatusMonitoramento,
      row.motivoTratamento,
    ].filter(Boolean).join(' '))
    if (!haystack.includes(normalizeSearch(filters.q))) return false
  }
  return true
}

function emptyPublicacoesData(filters: GkitJurPublicacaoFilters, filterOptions: Awaited<ReturnType<typeof getFilterOptions>>): GkitJurPublicacoesData {
  return {
    filterOptions: {
      ...filterOptions,
      fontes: [],
      statuses: gkitJurPublicacaoStatusOptions,
    },
    filters,
    metrics: {
      total: 0,
      pendentes: 0,
      triadasIa: 0,
      emTratamento: 0,
      tratadas: 0,
      dispensadas: 0,
      erros: 0,
      semProcesso: 0,
      foraOperacao: 0,
      naoLocalizadas: 0,
      encerradasOuArquivadas: 0,
      vinculadasAtivas: 0,
    },
    pagination: {
      currentPage: filters.page,
      from: 0,
      pageSize: PAGE_SIZE,
      to: 0,
      total: 0,
      totalPages: 1,
    },
    publicacoes: [],
  }
}

export async function listGkitJurPublicacoes(filters: GkitJurPublicacaoFilters = buildGkitJurPublicacaoFilters()): Promise<GkitJurPublicacoesData> {
  const from = (filters.page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE
  const filterOptions = await getFilterOptions()
  const scopedProcessRows = await resolvePublicationProcessScope(filters)
  const scopedProcessIds = scopedProcessRows
    ? scopedProcessRows.map((row) => text(row.id)).filter(Boolean)
    : null

  let publicacoesQuery = admin()
    .schema('gkit_jur')
    .from('publicacoes_monitoradas')
    .select('id,processo_id,numero_cnj_limpo,fonte,fonte_evento_id,data_disponibilizacao,data_publicacao,jornal,termo,origem_orgao,arq,pub,texto_preview,texto_completo,texto_hash,status,decisao_tratamento,classificacao_ia,confianca_ia,sugestao_ia,tarefa_id,tratado_por,tratado_em,motivo_tratamento,conteudo_removido_em,created_at,updated_at')

  if (scopedProcessIds) publicacoesQuery = scopedProcessIds.length ? publicacoesQuery.in('processo_id', scopedProcessIds) : null
  if (filters.status && publicacoesQuery) publicacoesQuery = publicacoesQuery.eq('status', filters.status)
  if (filters.fonte && publicacoesQuery) publicacoesQuery = publicacoesQuery.eq('fonte', filters.fonte)

  const [publicacoesResult, fontesResult] = await Promise.all([
    publicacoesQuery
      ? publicacoesQuery
        .order('data_disponibilizacao', { ascending: filters.dir === 'asc', nullsFirst: false })
        .order('created_at', { ascending: filters.dir === 'asc' })
        .limit(1000)
      : Promise.resolve({ data: [], error: null }),
    admin()
      .schema('gkit_jur')
      .from('publicacoes_monitoradas')
      .select('fonte')
      .limit(5000),
  ])

  const missingTable = [publicacoesResult.error, fontesResult.error]
    .some((error) => error && ['42P01', 'PGRST205'].includes(text(error.code)))
  if (missingTable) return emptyPublicacoesData(filters, filterOptions)
  if (publicacoesResult.error) throw new Error(publicacoesResult.error.message)
  if (fontesResult.error) throw new Error(fontesResult.error.message)

  const rows = (publicacoesResult.data ?? []) as Array<Record<string, unknown>>
  const processoIds = [...new Set(rows.map((row) => text(row.processo_id)).filter(Boolean))]
  const publicationCnjs = [...new Set(rows.map((row) => text(row.numero_cnj_limpo)).filter(Boolean))]
  const treatedUserIds = [...new Set(rows.map((row) => text(row.tratado_por)).filter(Boolean))]
  const scopedRowsById = new Map((scopedProcessRows ?? []).map((row) => [String(row.id), row]))
  const missingProcessIds = scopedProcessRows ? processoIds.filter((id) => !scopedRowsById.has(id)) : processoIds
  const loadedRows = scopedProcessRows
    ? processoIds.map((id) => scopedRowsById.get(id)).filter(Boolean) as Array<Record<string, unknown>>
    : []
  const processosResult = missingProcessIds.length
    ? await admin()
      .schema('gkit_jur')
      .from('processos')
      .select(PROCESS_LIST_SELECT)
      .in('id', missingProcessIds)
    : { data: [], error: null }
  if (processosResult.error) throw new Error(processosResult.error.message)

  const processRowsById = [...loadedRows, ...((processosResult.data ?? []) as Array<Record<string, unknown>>)]
  const loadedCnjs = new Set(processRowsById.map((row) => text(row.numero_cnj_limpo)).filter(Boolean))
  const missingProcessCnjs = publicationCnjs.filter((cnj) => !loadedCnjs.has(cnj))
  const processosByCnjResult = missingProcessCnjs.length
    ? await admin()
      .schema('gkit_jur')
      .from('processos')
      .select(PROCESS_LIST_SELECT)
      .in('numero_cnj_limpo', missingProcessCnjs)
    : { data: [], error: null }
  if (processosByCnjResult.error) throw new Error(processosByCnjResult.error.message)

  const processRows = [
    ...new Map([
      ...processRowsById,
      ...((processosByCnjResult.data ?? []) as Array<Record<string, unknown>>),
    ].map((row) => [String(row.id), row])).values(),
  ]
  const lookupRows = [
    ...processRows,
    ...treatedUserIds.map((id) => ({ id: `treated-${id}`, responsavel_id: id })),
  ]
  const maps = await lookupMaps(lookupRows)
  const processoMap = new Map<string, GkitJurProcessListItem>()
  const processoCnjMap = new Map<string, GkitJurProcessListItem>()
  const rawProcessRows = new Map<string, Record<string, unknown>>()
  processRows.forEach((row) => {
    const mappedProcess = mapProcesso(row, maps)
    rawProcessRows.set(String(row.id), row)
    processoMap.set(String(row.id), mappedProcess)
    const cnj = text(row.numero_cnj_limpo)
    if (cnj) processoCnjMap.set(cnj, mappedProcess)
  })

  const mapped = rows
    .map((row) => mapPublicacao(row, processoMap, processoCnjMap, maps))
    .filter((row) => {
      const raw = row.processoId ? rawProcessRows.get(row.processoId) : null
      if (filters.carteiraId && (!raw || text(raw.carteira_id) !== filters.carteiraId)) return false
      if (filters.responsavelId && (!raw || text(raw.responsavel_id) !== filters.responsavelId)) return false
      if (filters.tribunal && (!raw || text(raw.tribunal_sigla) !== filters.tribunal)) return false
      return matchesPublicacaoFilters(row, filters)
    })
    .sort((a, b) => {
      const left = publicacaoSortValue(a, filters.sort)
      const right = publicacaoSortValue(b, filters.sort)
      const result = String(left).localeCompare(String(right), 'pt-BR', { numeric: true })
      return filters.dir === 'asc' ? result : -result
    })

  const total = mapped.length
  const fontes = [...new Set(((fontesResult.data ?? []) as Array<Record<string, unknown>>)
    .map((row) => text(row.fonte))
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const metrics = {
    total,
    pendentes: mapped.filter((item) => item.status === 'pendente').length,
    triadasIa: mapped.filter((item) => item.status === 'triada_ia').length,
    emTratamento: mapped.filter((item) => item.status === 'em_tratamento').length,
    tratadas: mapped.filter((item) => item.status === 'tratada').length,
    dispensadas: mapped.filter((item) => item.status === 'dispensada').length,
    erros: mapped.filter((item) => item.status === 'erro').length,
    semProcesso: mapped.filter((item) => !item.processoId).length,
    foraOperacao: mapped.filter((item) => !item.processoId && Boolean(item.processoBaseId)).length,
    naoLocalizadas: mapped.filter((item) => !item.processoId && !item.processoBaseId).length,
    encerradasOuArquivadas: mapped.filter((item) => !item.processoId && ['arquivado', 'encerrado'].includes(item.processoBaseStatus ?? '')).length,
    vinculadasAtivas: mapped.filter((item) => Boolean(item.processoId)).length,
  }

  return {
    filterOptions: {
      ...filterOptions,
      fontes: fontes.map((fonte) => ({ label: fonte, value: fonte })),
      statuses: gkitJurPublicacaoStatusOptions,
    },
    filters,
    metrics,
    pagination: {
      currentPage: filters.page,
      from: total ? from + 1 : 0,
      pageSize: PAGE_SIZE,
      to: Math.min(to, total),
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    },
    publicacoes: mapped.slice(from, to),
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
      const ownerDiff = compareText(a.responsavelNome || 'Sem responsável', b.responsavelNome || 'Sem responsável')
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

async function countInboxPublicacoes() {
  const result = await admin()
    .schema('gkit_jur')
    .from('publicacoes_monitoradas')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pendente', 'triada_ia', 'em_tratamento'])

  if (result.error && ['42P01', 'PGRST205'].includes(text(result.error.code))) return 0
  if (result.error) throw new Error(result.error.message)
  return result.count ?? 0
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

  const [processItems, tarefaItems, pendenciaItems, agenteItems, publicacoesPendentes, formData] = await Promise.all([
    listInboxProcessItems(),
    listInboxTarefaItems(),
    listInboxPendenciaItems(),
    listInboxAgenteItems(),
    countInboxPublicacoes(),
    getGkitJurFormData(),
  ])

  const allItems = applyInboxFilters(sortInboxItems([...tarefaItems, ...processItems, ...pendenciaItems, ...agenteItems], filters.ordenacao), filters)
  const tarefas = filterInboxItems(allItems, 'tarefas')
  const criticos = filterInboxItems(allItems, 'criticos')
  const pendencias = filterInboxItems(allItems, 'pendencias')
  const automacao = filterInboxItems(allItems, 'automacao')
  const semRetorno = filterInboxItems(allItems, 'sem-retorno')
  const actionPriorityWeight: Record<GkitJurInboxPrioridade, number> = { critica: 4, alta: 3, media: 2, baixa: 1 }
  const proximasAcoes = [
    {
      title: 'Tratar publicacoes',
      description: 'Publicacoes e intimacoes ficam em uma caixa propria: IA sugere, humano confirma e registra a decisao.',
      href: '/modulos/gkit-jur/publicacoes',
      label: 'Abrir publicacoes',
      priority: (publicacoesPendentes >= 100 ? 'critica' : publicacoesPendentes ? 'alta' : 'baixa') as GkitJurInboxPrioridade,
      count: publicacoesPendentes,
    },
    {
      title: 'Executar tarefas abertas',
      description: 'Prazos e providencias ja viraram tarefa operacional. Comece pelas vencidas ou criticas.',
      href: '/modulos/gkit-jur/inbox?fila=tarefas',
      label: 'Abrir tarefas',
      priority: (tarefas.some((item) => item.prioridade === 'critica') ? 'critica' : tarefas.length ? 'alta' : 'baixa') as GkitJurInboxPrioridade,
      count: tarefas.length,
    },
    {
      title: 'Sanear processos sem dono',
      description: 'Corrija cliente, carteira e responsavel antes de ligar prazo, publicacao ou automacao ao processo.',
      href: '/modulos/gkit-jur/pendencias',
      label: 'Abrir saneamento',
      priority: (pendencias.some((item) => item.prioridade === 'critica' || item.prioridade === 'alta') ? 'alta' : pendencias.length ? 'media' : 'baixa') as GkitJurInboxPrioridade,
      count: pendencias.length,
    },
    {
      title: 'Revisar automacoes pendentes',
      description: 'Falhas, validacoes e execucoes paradas entram aqui para intervencao humana.',
      href: '/modulos/gkit-jur/agente',
      label: 'Abrir agente',
      priority: (automacao.some((item) => item.prioridade === 'critica') ? 'critica' : automacao.length ? 'alta' : 'baixa') as GkitJurInboxPrioridade,
      count: automacao.length,
    },
    {
      title: 'Acompanhar processos sem movimentacao',
      description: 'Use quando nao houver tarefa ou publicacao mais urgente; e um recorte de monitoramento.',
      href: '/modulos/gkit-jur/processos?sort=ultima_movimentacao_em&dir=asc',
      label: 'Ver processos',
      priority: (semRetorno.some((item) => item.score >= 75) ? 'media' : semRetorno.length ? 'baixa' : 'baixa') as GkitJurInboxPrioridade,
      count: semRetorno.length,
    },
  ].sort((a, b) => {
    const priorityDiff = actionPriorityWeight[b.priority] - actionPriorityWeight[a.priority]
    if (priorityDiff !== 0) return priorityDiff
    return b.count - a.count
  })

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
      publicacoes: publicacoesPendentes,
    },
    items: filterInboxItems(allItems, selected).slice(0, INBOX_ITEMS_LIMIT),
    proximasAcoes: proximasAcoes.length ? proximasAcoes : [
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

function emptyReadinessCounts(): Record<GkitJurNivelProntidao, number> {
  return {
    sem_base: 0,
    capa: 0,
    parcial: 0,
    pronto: 0,
    desatualizado: 0,
    erro: 0,
  }
}

async function getGkitJurLabReadiness() {
  const result = await admin()
    .schema('gkit_jur')
    .from('processos_resumos')
    .select('nivel_prontidao')
    .limit(5000)

  if (result.error) throw new Error(result.error.message)

  const counts = emptyReadinessCounts()
  for (const row of (result.data ?? []) as Array<Record<string, unknown>>) {
    counts[nivelProntidao(row.nivel_prontidao)] += 1
  }
  return counts
}

async function getGkitJurLabSmartSummary(totalAtivos: number): Promise<GkitJurLabData['smartSummary']> {
  const result = await admin()
    .schema('gkit_jur')
    .from('processos_resumos')
    .select('metadata,updated_at')
    .limit(5000)

  if (result.error) throw new Error(result.error.message)

  let resumosInteligentes = 0
  let precisaRevisaoHumana = 0
  let ultimaGeracaoEm: string | null = null

  for (const row of (result.data ?? []) as Array<Record<string, unknown>>) {
    const metadata = recordValue(row.metadata)
    const inteligente = recordValue(metadata.resumoInteligente)
    const updatedAt = text(row.updated_at) || null
    const hasSmartSummary = Boolean(Object.keys(inteligente).length)

    if (hasSmartSummary) {
      resumosInteligentes += 1
      if (Boolean(inteligente.precisaRevisaoHumana)) precisaRevisaoHumana += 1
    }

    if (updatedAt && (!ultimaGeracaoEm || Date.parse(updatedAt) > Date.parse(ultimaGeracaoEm))) {
      ultimaGeracaoEm = updatedAt
    }
  }

  return {
    coberturaPercentual: totalAtivos ? Math.round((resumosInteligentes / totalAtivos) * 100) : 0,
    pendentesResumo: Math.max(0, totalAtivos - resumosInteligentes),
    precisaRevisaoHumana,
    resumosInteligentes,
    totalAtivos,
    ultimaGeracaoEm,
  }
}

async function listGkitJurLabBriefings(): Promise<GkitJurLabData['briefings']> {
  const resumoResult = await admin()
    .schema('gkit_jur')
    .from('processos_resumos')
    .select('processo_id,nivel_prontidao,fase_processual,resumo_operacional,riscos_alertas,proximas_acoes_sugeridas,updated_at')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(8)

  if (resumoResult.error) throw new Error(resumoResult.error.message)

  const resumoRows = (resumoResult.data ?? []) as Array<Record<string, unknown>>
  const processoIds = resumoRows.map((row) => text(row.processo_id)).filter(Boolean)
  if (!processoIds.length) return []

  const processosResult = await admin()
    .schema('gkit_jur')
    .from('processos')
    .select('id,numero_cnj,numero_cnj_limpo,cliente_nome,titulo')
    .in('id', processoIds)

  if (processosResult.error) throw new Error(processosResult.error.message)

  const processoMap = new Map(((processosResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [text(row.id), row]))

  return resumoRows.map((row) => {
    const processoId = text(row.processo_id)
    const processo = processoMap.get(processoId)
    return {
      processoId,
      numeroCnj: formatCnj(text(processo?.numero_cnj, text(processo?.numero_cnj_limpo))),
      clienteNome: text(processo?.cliente_nome) || text(processo?.titulo) || null,
      faseProcessual: text(row.fase_processual) || null,
      nivelProntidao: nivelProntidao(row.nivel_prontidao),
      resumoOperacional: text(row.resumo_operacional) || null,
      riscosAlertas: stringList(row.riscos_alertas).slice(0, 3),
      proximasAcoesSugeridas: stringList(row.proximas_acoes_sugeridas).slice(0, 3),
      updatedAt: text(row.updated_at) || null,
    }
  })
}

export async function getGkitJurLab(): Promise<GkitJurLabData> {
  const [inbox, metrics, readiness, briefings] = await Promise.all([
    getGkitJurInbox(),
    getGkitJurDashboardMetrics(),
    getGkitJurLabReadiness(),
    listGkitJurLabBriefings(),
  ])
  const smartSummary = await getGkitJurLabSmartSummary(metrics.processosAtivos)

  return {
    inbox,
    metrics,
    readiness,
    smartSummary,
    briefings,
  }
}

function agentStatus(value: unknown): GkitJurAgenteExecucaoStatus {
  const current = text(value, 'pendente')
  if (['pendente', 'em_execucao', 'sucesso', 'falha', 'precisa_intervencao', 'aguardando_validacao', 'cancelada'].includes(current)) {
    return current as GkitJurAgenteExecucaoStatus
  }
  return 'pendente'
}

async function getGkitJurAgenteMonitoramento() {
  const processosResult = await admin()
    .schema('gkit_jur')
    .from('processos')
    .select('id,numero_cnj,numero_cnj_limpo,titulo,cliente_nome,updated_at')
    .eq('status', DEFAULT_PROCESS_STATUS)
    .order('updated_at', { ascending: false })
    .limit(2000)

  if (processosResult.error) throw new Error(processosResult.error.message)

  const processos = (processosResult.data ?? []) as Array<Record<string, unknown>>
  const processoIds = processos.map((row) => text(row.id)).filter(Boolean)
  const resumoMap = new Map<string, Record<string, unknown>>()

  for (let index = 0; index < processoIds.length; index += 100) {
    const ids = processoIds.slice(index, index + 100)
    if (!ids.length) continue
    const resumoResult = await admin()
      .schema('gkit_jur')
      .from('processos_resumos')
      .select('processo_id,metadata,modelo_versao,fonte_resumo,updated_at,gerado_em,status_resumo')
      .in('processo_id', ids)

    if (resumoResult.error) throw new Error(resumoResult.error.message)
    for (const row of (resumoResult.data ?? []) as Array<Record<string, unknown>>) {
      resumoMap.set(text(row.processo_id), row)
    }
  }

  let resumosInteligentes = 0
  let precisaRevisaoHumana = 0
  let baixaConfianca = 0
  let erroGeracaoIa = 0
  let fonteOpenAi = 0
  let fonteLocal = 0
  let desatualizados = 0
  let ultimaGeracaoEm: string | null = null
  const fila: GkitJurAgenteData['monitoramento']['fila'] = []

  for (const processo of processos) {
    const processoId = text(processo.id)
    const resumo = resumoMap.get(processoId)
    const metadata = recordValue(resumo?.metadata)
    const inteligente = recordValue(metadata.resumoInteligente)
    const processoUpdatedAt = text(processo.updated_at) || null
    const resumoUpdatedAt = text(resumo?.updated_at) || null
    const stale = Boolean(
      processoUpdatedAt
      && resumoUpdatedAt
      && Number.isFinite(Date.parse(processoUpdatedAt))
      && Number.isFinite(Date.parse(resumoUpdatedAt))
      && Date.parse(processoUpdatedAt) > Date.parse(resumoUpdatedAt),
    )

    if (resumoUpdatedAt && (!ultimaGeracaoEm || Date.parse(resumoUpdatedAt) > Date.parse(ultimaGeracaoEm))) {
      ultimaGeracaoEm = resumoUpdatedAt
    }

    const hasSmartSummary = Boolean(Object.keys(inteligente).length)
    const nivelConfianca = text(inteligente.nivelConfianca)
    const fonte = text(inteligente.fonte) || text(resumo?.fonte_resumo) || null
    const hasError = Boolean(text(inteligente.erroGeracaoIa))
    const needsReview = Boolean(inteligente.precisaRevisaoHumana)

    if (hasSmartSummary) {
      resumosInteligentes += 1
      if (fonte === 'openai') fonteOpenAi += 1
      else fonteLocal += 1
      if (needsReview) precisaRevisaoHumana += 1
      if (nivelConfianca === 'baixo') baixaConfianca += 1
      if (hasError) erroGeracaoIa += 1
      if (stale) desatualizados += 1
    }

    const motivo = !hasSmartSummary
      ? 'Sem resumo inteligente'
      : stale
        ? 'Resumo mais antigo que o processo'
        : hasError
          ? 'Falha na geração por IA'
          : nivelConfianca === 'baixo'
            ? 'Baixa confiança'
            : needsReview
              ? 'Aguardando revisão humana'
              : null

    if (motivo) {
      fila.push({
        processoId,
        numeroCnj: formatCnj(text(processo.numero_cnj, text(processo.numero_cnj_limpo))),
        titulo: text(processo.titulo) || null,
        clienteNome: text(processo.cliente_nome) || null,
        faseAtual: text(inteligente.faseAtual) || null,
        fonte,
        nivelConfianca: ['alto', 'medio', 'baixo'].includes(nivelConfianca) ? nivelConfianca as 'alto' | 'medio' | 'baixo' : null,
        precisaRevisaoHumana: needsReview,
        motivo,
        resumoUpdatedAt,
        processoUpdatedAt,
      })
    }
  }

  const totalAtivos = processos.length

  return {
    coberturaPercentual: totalAtivos ? Math.round((resumosInteligentes / totalAtivos) * 100) : 0,
    erroGeracaoIa,
    fonteLocal,
    fonteOpenAi,
    modeloConfigurado: text(process.env.GKIT_JUR_AI_MODEL, 'gpt-5.1-mini'),
    openAiConfigurado: Boolean(text(process.env.OPENAI_API_KEY)),
    pendentesResumo: Math.max(0, totalAtivos - resumosInteligentes),
    precisaRevisaoHumana,
    resumosInteligentes,
    totalAtivos,
    baixaConfianca,
    desatualizados,
    fila: fila.slice(0, 12),
    ultimaGeracaoEm,
  }
}

export async function getGkitJurAgenteData(): Promise<GkitJurAgenteData> {
  const [carteirasResult, fontesResult, receitasResult, execucoesResult, monitoramento] = await Promise.all([
    admin().schema('core').from('carteiras').select('id,nome').eq('status', 'ativo').order('nome', { ascending: true }),
    admin().schema('gkit_jur').from('agente_fontes').select('id,carteira_id,nome,tipo,url_base,exige_captcha,exige_2fa,ativo').order('created_at', { ascending: false }).limit(100),
    admin().schema('gkit_jur').from('agente_receitas').select('id,fonte_id,carteira_id,nome,descricao,tipo_coleta,periodicidade,script_key,tipo_arquivo_esperado,ativo').order('created_at', { ascending: false }).limit(100),
    admin().schema('gkit_jur').from('agente_execucoes').select('id,receita_id,fonte_id,carteira_id,status,iniciado_em,finalizado_em,erro_mensagem,tentativas,created_at').order('created_at', { ascending: false }).limit(50),
    getGkitJurAgenteMonitoramento(),
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
    monitoramento,
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

export const gkitJurPublicacaoStatusOptions: GkitJurSelectOption[] = [
  { label: 'Pendente', value: 'pendente' },
  { label: 'Triada por IA', value: 'triada_ia' },
  { label: 'Em tratamento', value: 'em_tratamento' },
  { label: 'Tratada', value: 'tratada' },
  { label: 'Dispensada', value: 'dispensada' },
  { label: 'Duplicada', value: 'duplicada' },
  { label: 'Erro', value: 'erro' },
]

export const gkitJurPublicacaoDecisaoOptions: GkitJurSelectOption[] = [
  { label: 'Gerar prazo', value: 'gerar_prazo' },
  { label: 'Gerar tarefa', value: 'gerar_tarefa' },
  { label: 'Registrar ciencia', value: 'registrar_ciencia' },
  { label: 'Vincular documento', value: 'vincular_documento' },
  { label: 'Atualizar resumo', value: 'atualizar_resumo' },
  { label: 'Dispensar sem acao', value: 'dispensar_sem_acao' },
  { label: 'Marcar duplicada', value: 'marcar_duplicada' },
  { label: 'Revisar cadastro do processo', value: 'revisar_cadastro_processo' },
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

export async function getGkitJurEtiquetasData(): Promise<GkitJurEtiquetasData> {
  const etiquetas = await listGkitJurEtiquetas(false)

  return {
    etiquetas,
    metrics: {
      ativas: etiquetas.filter((etiqueta) => etiqueta.ativo).length,
      inativas: etiquetas.filter((etiqueta) => !etiqueta.ativo).length,
      total: etiquetas.length,
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
