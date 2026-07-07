import { createHash } from 'node:crypto'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { refreshGkitJurProcessSummary } from './summary-service'

export type GkitJurSyncProcessRow = {
  carteira_id: string | null
  id: string
  numero_cnj: string
  numero_cnj_limpo: string
  responsavel_id: string | null
  tribunal_alias: string
}

type SyncOneResult = {
  erroCodigo: string | null
  httpStatus: number | null
  status: 'sucesso' | 'erro' | 'sem_resultado'
  tarefasGeradas: number
  transient: boolean
  movimentosRecebidos: number
  movimentosNovos: number
}

type SyncBatchResult = {
  processos: number
  selecionados: number
  sucesso: number
  semResultado: number
  erro: number
  finalizado: boolean
  tarefasGeradas: number
  movimentosRecebidos: number
  movimentosNovos: number
}

type MovementTaskRule = {
  id: string
  codigo_movimento: number | null
  nome: string
  termos: string[]
  tipo_tarefa: string
  prioridade: string
  titulo_template: string
  descricao_template: string | null
  prazo_dias: number | null
}

const DEFAULT_DATAJUD_BASE_URL = 'https://api-publica.datajud.cnj.jus.br'
const DEFAULT_DATAJUD_REQUEST_TIMEOUT_MS = 22_000
const MAX_DATAJUD_REQUEST_TIMEOUT_MS = 45_000
const INTEGRATION_TASK_ORIGIN = 'integracao_movimentacao'
const LEGACY_TASK_ORIGINS = ['datajud_movimentacao', 'aasp_movimentacao']
const MOVEMENT_INSERT_CHUNK_SIZE = 25
const MOVEMENT_LOOKUP_CHUNK_SIZE = 25
const MOVEMENT_RETENTION_KEEP_RECENT = Number(process.env.GKIT_JUR_MOVEMENT_RETENTION_KEEP_RECENT ?? '30')
const MOVEMENT_RETENTION_BATCH_SIZE = Number(process.env.GKIT_JUR_MOVEMENT_RETENTION_BATCH_SIZE ?? '1000')

function admin() {
  return createSupabaseAdminClient() as any
}

async function refreshSummaryBestEffort(processoId: string) {
  try {
    await refreshGkitJurProcessSummary(processoId)
  } catch {
    // O resumo operacional nao deve invalidar a sincronizacao de origem.
  }
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numberOrNull(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function positiveInt(value: unknown, fallback: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

function dateOrNull(value: unknown) {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

function normalizeForMatch(value: unknown) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function dataJudConfig() {
  const baseUrl = text(process.env.DATAJUD_BASE_URL, DEFAULT_DATAJUD_BASE_URL).replace(/\/+$/, '')
  const apiKey = text(process.env.DATAJUD_API_KEY)
  const requestTimeoutMs = positiveInt(
    process.env.GKIT_JUR_DATAJUD_REQUEST_TIMEOUT_MS ?? process.env.DATAJUD_REQUEST_TIMEOUT_MS,
    DEFAULT_DATAJUD_REQUEST_TIMEOUT_MS,
    MAX_DATAJUD_REQUEST_TIMEOUT_MS,
  )
  if (!apiKey) {
    throw new Error('DATAJUD_API_KEY não configurada no ambiente.')
  }
  return { apiKey, baseUrl, requestTimeoutMs }
}

function dataJudSearchPayload(numeroCnjLimpo: string) {
  return {
    query: {
      bool: {
        minimum_should_match: 1,
        should: [
          { term: { numeroProcesso: numeroCnjLimpo } },
          { match: { numeroProcesso: numeroCnjLimpo } },
        ],
      },
    },
    size: 1,
  }
}

async function fetchDataJudProcess(row: GkitJurSyncProcessRow) {
  const { apiKey, baseUrl, requestTimeoutMs } = dataJudConfig()
  const requestPayload = dataJudSearchPayload(row.numero_cnj_limpo)
  const response = await fetch(`${baseUrl}/${row.tribunal_alias}/_search`, {
    body: JSON.stringify(requestPayload),
    headers: {
      Authorization: `APIKey ${apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    signal: AbortSignal.timeout(requestTimeoutMs),
  })

  const responseBody = await response.json().catch(() => null) as Record<string, any> | null
  return { requestPayload, response, responseBody }
}

function hitTotal(responseBody: Record<string, any> | null) {
  const total = responseBody?.hits?.total
  if (typeof total === 'number') return total
  return Number(total?.value ?? 0)
}

function firstHit(responseBody: Record<string, any> | null) {
  return responseBody?.hits?.hits?.[0] ?? null
}

function dataJudErrorMessage(responseBody: Record<string, any> | null, fallback: string) {
  const error = responseBody?.error
  if (typeof error === 'string') return error || fallback
  if (!error || typeof error !== 'object') return fallback

  const rootCause = Array.isArray(error.root_cause)
    ? error.root_cause
      .map((item: Record<string, any>) => [text(item.type), text(item.reason)].filter(Boolean).join(': '))
      .find(Boolean)
    : ''
  const causedBy = error.caused_by && typeof error.caused_by === 'object'
    ? [text(error.caused_by.type), text(error.caused_by.reason)].filter(Boolean).join(': ')
    : ''

  return text(error.reason)
    || rootCause
    || causedBy
    || text(error.type)
    || fallback
}

function isTransientDataJudError(message: string, httpStatus: number | null) {
  if (httpStatus && ([408, 409, 425, 429].includes(httpStatus) || httpStatus >= 500)) return true
  return /fetch failed|timeout|aborted|es_rejected_execution|too many requests|request-uri too large|bad request/i.test(message)
}

function movementHash(movimento: Record<string, any>) {
  const stablePayload = {
    codigo: movimento.codigo ?? null,
    dataHora: movimento.dataHora ?? null,
    nome: movimento.nome ?? null,
    orgaoJulgador: movimento.orgaoJulgador ?? null,
    complementosTabelados: movimento.complementosTabelados ?? null,
  }
  return createHash('sha256').update(JSON.stringify(stablePayload)).digest('hex')
}

function buildMovimentacoes(processoId: string, movimentos: unknown[]) {
  const unique = new Map<string, Record<string, any>>()

  for (const movimento of movimentos) {
    if (!movimento || typeof movimento !== 'object') continue
    const typedMovimento = movimento as Record<string, any>
    unique.set(movementHash(typedMovimento), typedMovimento)
  }

  return [...unique.values()]
    .map((movimento) => {
      const orgao = movimento.orgaoJulgador && typeof movimento.orgaoJulgador === 'object'
        ? movimento.orgaoJulgador as Record<string, any>
        : {}
      return {
        processo_id: processoId,
        codigo: numberOrNull(movimento.codigo),
        nome: text(movimento.nome, movimento.codigo ? `Movimento ${movimento.codigo}` : 'Movimento DataJud'),
        data_hora: dateOrNull(movimento.dataHora),
        orgao_codigo: numberOrNull(orgao.codigo),
        orgao_nome: text(orgao.nome) || null,
        complementos_tabelados: Array.isArray(movimento.complementosTabelados) ? movimento.complementosTabelados : [],
        raw_movimento: movimento,
        hash_movimento: movementHash(movimento),
        origem: 'datajud',
        relevante: false,
        gera_alerta: false,
      }
    })
}

async function insertMovimentacoesInChunks(movimentos: Array<Record<string, any>>) {
  for (let from = 0; from < movimentos.length; from += MOVEMENT_INSERT_CHUNK_SIZE) {
    const insertResult = await admin()
      .schema('gkit_jur')
      .from('movimentacoes')
      .insert(movimentos.slice(from, from + MOVEMENT_INSERT_CHUNK_SIZE))

    if (insertResult.error) throw new Error(insertResult.error.message)
  }
}

export async function fetchExistingMovementHashes(processoId: string, hashes: string[]) {
  const existingHashes = new Set<string>()

  for (let from = 0; from < hashes.length; from += MOVEMENT_LOOKUP_CHUNK_SIZE) {
    const chunk = hashes.slice(from, from + MOVEMENT_LOOKUP_CHUNK_SIZE)
    const [activeResult, archivedResult] = await Promise.all([
      admin()
        .schema('gkit_jur')
        .from('movimentacoes')
        .select('hash_movimento')
        .eq('processo_id', processoId)
        .in('hash_movimento', chunk),
      admin()
        .schema('gkit_jur')
        .from('movimentacoes_arquivo')
        .select('hash_movimento')
        .eq('processo_id', processoId)
        .in('hash_movimento', chunk),
    ])

    if (activeResult.error) throw new Error(activeResult.error.message)
    if (archivedResult.error) throw new Error(archivedResult.error.message)

    for (const item of (activeResult.data ?? []) as Array<Record<string, unknown>>) {
      existingHashes.add(text(item.hash_movimento))
    }
    for (const item of (archivedResult.data ?? []) as Array<Record<string, unknown>>) {
      existingHashes.add(text(item.hash_movimento))
    }
  }

  return existingHashes
}

export async function applyMovementRetentionBestEffort(processoId: string) {
  if (!Number.isFinite(MOVEMENT_RETENTION_KEEP_RECENT) || MOVEMENT_RETENTION_KEEP_RECENT < 1) return

  try {
    await admin()
      .schema('gkit_jur')
      .rpc('aplicar_retencao_movimentacoes', {
        p_batch_size: Number.isFinite(MOVEMENT_RETENTION_BATCH_SIZE) ? MOVEMENT_RETENTION_BATCH_SIZE : 1000,
        p_dry_run: false,
        p_keep_recent: MOVEMENT_RETENTION_KEEP_RECENT,
        p_processo_id: processoId,
      })
  } catch {
    // A retencao nao deve invalidar a sincronizacao do processo.
  }
}

function renderTemplate(template: string, input: { movimento: string; numeroCnj: string }) {
  return template
    .replaceAll('{{movimentacao}}', input.movimento)
    .replaceAll('{{numero_cnj}}', input.numeroCnj)
}

function dueDateFromDays(days: number | null) {
  if (days === null || !Number.isFinite(days)) return null
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(18, 0, 0, 0)
  return date.toISOString()
}

function movementDateKey(movimento: Record<string, any>) {
  const value = text(movimento.data_hora)
  if (!value) return 'sem-data'
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) return 'sem-data'
  return parsed.toISOString().slice(0, 10)
}

function formatGroupedMovementLabel(dateKey: string, total: number) {
  if (dateKey === 'encerramento') {
    return total === 1 ? '1 movimentação de encerramento' : `${total} movimentações de encerramento`
  }
  const dateLabel = dateKey === 'sem-data' ? 'sem data registrada' : dateKey.split('-').reverse().join('/')
  return total === 1 ? `1 movimentação em ${dateLabel}` : `${total} movimentações em ${dateLabel}`
}

function compactMovementPayload(movimento: Record<string, any>, providerLabel: string) {
  return {
    codigo: movimento.codigo ?? null,
    data_hora: movimento.data_hora ?? null,
    fonte: providerLabel,
    hash: text(movimento.hash_movimento),
    nome: text(movimento.nome, 'Movimentação DataJud'),
    origem: text(movimento.origem),
  }
}

function movementListDescription(movimentos: Array<Record<string, any>>) {
  return movimentos
    .map((movimento, index) => {
      const data = text(movimento.data_hora)
      const dateLabel = data ? new Date(data).toISOString().slice(0, 10).split('-').reverse().join('/') : 'sem data'
      return `${index + 1}. ${dateLabel} - ${text(movimento.nome, 'Movimentação DataJud')}`
    })
    .join('\n')
}

function groupedTaskDescription(rule: MovementTaskRule, row: GkitJurSyncProcessRow, dateKey: string, movimentos: Array<Record<string, any>>, providerLabel = 'DataJud') {
  const movementSummary = formatGroupedMovementLabel(dateKey, movimentos.length)
  const base = rule.descricao_template
    ? renderTemplate(rule.descricao_template, { movimento: movementSummary, numeroCnj: row.numero_cnj })
    : `Movimentações ${providerLabel} agrupadas: ${movementSummary}. Processo ${row.numero_cnj}.`

  return `${base}\n\nMovimentações do grupo:\n${movementListDescription(movimentos)}`
}

async function fetchMovementTaskRules() {
  const { data, error } = await admin()
    .schema('gkit_jur')
    .from('movimentacao_tarefa_regras')
    .select('id,nome,codigo_movimento,termos,tipo_tarefa,prioridade,titulo_template,descricao_template,prazo_dias')
    .eq('ativo', true)
    .eq('gerar_automaticamente', true)
    .limit(200)

  if (error) throw new Error(error.message)

  return ((data ?? []) as Array<Record<string, unknown>>).map((row): MovementTaskRule => ({
    id: String(row.id),
    codigo_movimento: row.codigo_movimento === null || row.codigo_movimento === undefined ? null : Number(row.codigo_movimento),
    nome: text(row.nome, 'Regra sem nome'),
    termos: Array.isArray(row.termos) ? row.termos.map((item) => normalizeForMatch(item)).filter(Boolean) : [],
    tipo_tarefa: text(row.tipo_tarefa, 'providencia_interna'),
    prioridade: text(row.prioridade, 'media'),
    titulo_template: text(row.titulo_template, 'Tratar movimentação'),
    descricao_template: text(row.descricao_template) || null,
    prazo_dias: row.prazo_dias === null || row.prazo_dias === undefined ? null : Number(row.prazo_dias),
  }))
}

function movementMatchesRule(movimento: Record<string, any>, rule: MovementTaskRule) {
  if (rule.codigo_movimento !== null && Number(movimento.codigo) === rule.codigo_movimento) return true
  if (!rule.termos.length) return false
  const nome = normalizeForMatch(movimento.nome)
  return rule.termos.some((term) => nome.includes(term))
}

function integrationTaskHash(row: GkitJurSyncProcessRow, ruleId: string, dateKey: string) {
  return `${INTEGRATION_TASK_ORIGIN}:${row.id}:${ruleId}:${dateKey}`
}

function taskSource(provider: string, providerLabel: string) {
  return { label: providerLabel, provider }
}

function closureStatusSuggestion(rule: MovementTaskRule, movimentos: Array<Record<string, any>>) {
  const content = normalizeForMatch([
    rule.nome,
    ...rule.termos,
    ...movimentos.map((movimento) => text(movimento.nome)),
  ].join(' '))

  const closingTerms = [
    'transito em julgado',
    'arquivado definitivamente',
    'arquivamento definitivo',
    'arquivado provisoriamente',
    'arquivamento provisorio',
  ]

  if (!closingTerms.some((term) => content.includes(term))) return null

  return {
    status: 'encerrado',
    status_monitoramento: 'pausado',
    motivo: 'Movimentacao indica transito em julgado ou arquivamento. Validar baixa operacional e encerrar o monitoramento.',
  }
}

function mergeTaskSources(currentSources: unknown, nextSource: { label: string; provider: string }) {
  const sources = Array.isArray(currentSources)
    ? currentSources.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : []
  const mapped = new Map<string, { label: string; provider: string }>()
  for (const source of sources) {
    const provider = text(source.provider)
    if (!provider) continue
    mapped.set(provider, {
      label: text(source.label, provider),
      provider,
    })
  }
  mapped.set(nextSource.provider, nextSource)
  return [...mapped.values()]
}

export async function generateTasksFromMovements(
  row: GkitJurSyncProcessRow,
  movimentos: Array<Record<string, any>>,
  options: { provider?: 'datajud' | 'aasp'; providerLabel?: string } = {},
) {
  if (!movimentos.length) return 0

  const provider = options.provider ?? 'datajud'
  const providerLabel = options.providerLabel ?? 'DataJud'
  const rules = await fetchMovementTaskRules()
  if (!rules.length) return 0

  const taskGroups = new Map<string, {
    dateKey: string
    legacyHashes: string[]
    movimentos: Array<Record<string, any>>
    origemHash: string
    rule: MovementTaskRule
  }>()
  const matchedHashes: string[] = []

  for (const movimento of movimentos) {
    const matchedRules = rules.filter((rule) => movementMatchesRule(movimento, rule))
    for (const rule of matchedRules) {
      const dateKey = closureStatusSuggestion(rule, [movimento]) ? 'encerramento' : movementDateKey(movimento)
      const origemHash = integrationTaskHash(row, rule.id, dateKey)
      const group = taskGroups.get(origemHash) ?? {
        dateKey,
        legacyHashes: LEGACY_TASK_ORIGINS.map((origin) => `${origin}:${row.id}:${rule.id}:${dateKey}`),
        movimentos: [],
        origemHash,
        rule,
      }
      group.movimentos.push(movimento)
      taskGroups.set(origemHash, group)
      matchedHashes.push(text(movimento.hash_movimento))
    }
  }

  if (!taskGroups.size) return 0

  const hashes = [...new Set([...taskGroups.keys(), ...[...taskGroups.values()].flatMap((group) => group.legacyHashes)])]
  const existingResult = await admin()
    .schema('gkit_jur')
    .from('tarefas')
    .select('id,origem,origem_hash,payload,status')
    .in('origem', [INTEGRATION_TASK_ORIGIN, ...LEGACY_TASK_ORIGINS])
    .in('origem_hash', hashes)

  if (existingResult.error) throw new Error(existingResult.error.message)

  const existingTasks = new Map(((existingResult.data ?? []) as Array<Record<string, unknown>>).map((item) => [text(item.origem_hash), item]))
  const newTasks: Array<Record<string, any>> = []
  const updates: Array<PromiseLike<unknown>> = []

  for (const group of taskGroups.values()) {
    const movementSummary = formatGroupedMovementLabel(group.dateKey, group.movimentos.length)
    const title = renderTemplate(group.rule.titulo_template, { movimento: movementSummary, numeroCnj: row.numero_cnj })
    const payloadMovimentos = group.movimentos.map((movimento) => compactMovementPayload(movimento, providerLabel))
    const nextSource = taskSource(provider, providerLabel)
    const sugestaoStatus = closureStatusSuggestion(group.rule, group.movimentos)
    const payload = {
      data_movimentacao: group.dateKey,
      fontes: [nextSource],
      regra_id: group.rule.id,
      regra_nome: group.rule.nome,
      movimentacao_hashes: payloadMovimentos.map((movimento) => movimento.hash),
      movimentacoes: payloadMovimentos,
      ...(sugestaoStatus ? { sugestao_status: sugestaoStatus } : {}),
    }
    const existingTask = existingTasks.get(group.origemHash)
      ?? group.legacyHashes.map((hash) => existingTasks.get(hash)).find(Boolean)

    if (!existingTask) {
      newTasks.push({
        processo_id: row.id,
        carteira_id: row.carteira_id,
        responsavel_id: row.responsavel_id,
        tipo: group.rule.tipo_tarefa,
        titulo: title,
        descricao: groupedTaskDescription(group.rule, row, group.dateKey, group.movimentos, providerLabel),
        prioridade: group.rule.prioridade,
        prazo_at: dueDateFromDays(group.rule.prazo_dias),
        origem: INTEGRATION_TASK_ORIGIN,
        origem_id: group.origemHash,
        origem_hash: group.origemHash,
        payload,
      })
      continue
    }

    const currentPayload = existingTask.payload && typeof existingTask.payload === 'object'
      ? existingTask.payload as Record<string, any>
      : {}
    const currentMovimentos = Array.isArray(currentPayload.movimentacoes) ? currentPayload.movimentacoes : []
    const currentHashes = new Set(currentMovimentos.map((movimento: Record<string, any>) => text(movimento.hash)).filter(Boolean))
    const missingMovimentos = payloadMovimentos.filter((movimento) => !currentHashes.has(movimento.hash))

    const shouldCanonicalize = text(existingTask.origem) !== INTEGRATION_TASK_ORIGIN || text(existingTask.origem_hash) !== group.origemHash

    if ((missingMovimentos.length || shouldCanonicalize) && ['aberta', 'em_andamento', 'aguardando_terceiro'].includes(text(existingTask.status, 'aberta'))) {
      const mergedMovimentos = [...currentMovimentos, ...missingMovimentos]
      updates.push(admin()
        .schema('gkit_jur')
        .from('tarefas')
        .update({
          descricao: groupedTaskDescription(group.rule, row, group.dateKey, mergedMovimentos),
          origem: INTEGRATION_TASK_ORIGIN,
          origem_hash: group.origemHash,
          origem_id: group.origemHash,
          payload: {
            ...currentPayload,
            ...payload,
            fontes: mergeTaskSources(currentPayload.fontes, nextSource),
            movimentacao_hashes: mergedMovimentos.map((movimento: Record<string, any>) => text(movimento.hash)).filter(Boolean),
            movimentacoes: mergedMovimentos,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingTask.id))
    }
  }

  if (newTasks.length) {
    const insertResult = await admin().schema('gkit_jur').from('tarefas').insert(newTasks)
    if (insertResult.error) throw new Error(insertResult.error.message)
  }

  const updateResults = await Promise.all(updates)
  for (const result of updateResults as Array<{ error?: { message: string } | null }>) {
    if (result.error) throw new Error(result.error.message)
  }

  const relevantHashes = [...new Set(matchedHashes.filter(Boolean))]
  if (relevantHashes.length) {
    const updateResult = await admin()
      .schema('gkit_jur')
      .from('movimentacoes')
      .update({ alerta_gerado: true, gera_alerta: true, relevante: true })
      .eq('processo_id', row.id)
      .in('hash_movimento', relevantHashes)

    if (updateResult.error) throw new Error(updateResult.error.message)
  }

  return newTasks.length
}

function processUpdatePayload(hit: Record<string, any>, movimentos: Array<{ data_hora: string | null }>) {
  const source = hit._source ?? {}
  const classe = source.classe ?? {}
  const sistema = source.sistema ?? {}
  const formato = source.formato ?? {}
  const orgao = source.orgaoJulgador ?? {}
  const ultimaMovimentacao = movimentos
    .map((movimento) => movimento.data_hora)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null

  const payload: Record<string, any> = {
    assuntos: Array.isArray(source.assuntos) ? source.assuntos : [],
    classe_codigo: numberOrNull(classe.codigo),
    classe_nome: text(classe.nome) || null,
    data_ajuizamento: dateOrNull(source.dataAjuizamento),
    data_hora_ultima_atualizacao_datajud: dateOrNull(source.dataHoraUltimaAtualizacao),
    datajud_id: text(hit._id, text(source.id)) || null,
    datajud_index: text(hit._index) || null,
    datajud_score: numberOrNull(hit._score),
    formato_codigo: numberOrNull(formato.codigo),
    formato_nome: text(formato.nome) || null,
    grau: text(source.grau) || null,
    metadata_datajud: {
      '@timestamp': source['@timestamp'] ?? null,
      fonte: 'datajud',
      ultima_consulta_em: new Date().toISOString(),
    },
    nivel_sigilo: numberOrNull(source.nivelSigilo),
    orgao_julgador_codigo: numberOrNull(orgao.codigo),
    orgao_julgador_codigo_municipio_ibge: numberOrNull(orgao.codigoMunicipioIBGE),
    orgao_julgador_nome: text(orgao.nome) || null,
    sistema_codigo: numberOrNull(sistema.codigo),
    sistema_nome: text(sistema.nome) || null,
    status_monitoramento: 'monitorando',
    ultima_sincronizacao_em: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (ultimaMovimentacao) payload.ultima_movimentacao_em = ultimaMovimentacao

  return payload
}

async function insertSyncLog(input: {
  erroCodigo?: string | null
  erroMensagem?: string | null
  finishedAt: string
  httpStatus?: number | null
  processoId: string
  provider?: string
  requestPayload: Record<string, any>
  responseMetadata: Record<string, any>
  row: GkitJurSyncProcessRow
  startedAt: string
  status: 'sucesso' | 'erro' | 'sem_resultado' | 'parcial' | 'timeout'
  totalMovimentacoesNovas: number
  totalMovimentacoesRecebidas: number
  totalResultados: number
}) {
  const { error } = await admin().schema('gkit_jur').from('sincronizacoes').insert({
    erro_codigo: input.erroCodigo ?? null,
    erro_mensagem: input.erroMensagem ?? null,
    finished_at: input.finishedAt,
    http_status: input.httpStatus ?? null,
    numero_cnj_limpo: input.row.numero_cnj_limpo,
    processo_id: input.processoId,
    provedor: input.provider ?? 'datajud',
    request_payload: input.requestPayload,
    response_metadata: input.responseMetadata,
    started_at: input.startedAt,
    status: input.status,
    total_movimentacoes_novas: input.totalMovimentacoesNovas,
    total_movimentacoes_recebidas: input.totalMovimentacoesRecebidas,
    total_resultados: input.totalResultados,
    tribunal_alias: input.row.tribunal_alias,
  })
  if (error) throw new Error(error.message)
}

async function syncOneProcess(row: GkitJurSyncProcessRow): Promise<SyncOneResult> {
  const startedAt = new Date().toISOString()
  let requestPayload: Record<string, any> = dataJudSearchPayload(row.numero_cnj_limpo)

  try {
    const { requestPayload: payload, response, responseBody } = await fetchDataJudProcess(row)
    requestPayload = payload
    const totalResultados = hitTotal(responseBody)
    const hit = firstHit(responseBody)

    if (!response.ok) {
      const message = dataJudErrorMessage(responseBody, response.statusText)
      throw Object.assign(new Error(message), { httpStatus: response.status })
    }

    if (!hit) {
      const now = new Date().toISOString()
      await admin().schema('gkit_jur').from('processos').update({
        status_monitoramento: 'monitorando',
        ultima_sincronizacao_em: now,
        updated_at: now,
      }).eq('id', row.id)
      await insertSyncLog({
        finishedAt: now,
        httpStatus: response.status,
        processoId: row.id,
        requestPayload,
        responseMetadata: { total: totalResultados },
        row,
        startedAt,
        status: 'sem_resultado',
        totalMovimentacoesNovas: 0,
        totalMovimentacoesRecebidas: 0,
        totalResultados,
      })
      await applyMovementRetentionBestEffort(row.id)
      await refreshSummaryBestEffort(row.id)
      return { erroCodigo: null, httpStatus: response.status, status: 'sem_resultado', tarefasGeradas: 0, transient: false, movimentosRecebidos: 0, movimentosNovos: 0 }
    }

    const source = hit._source ?? {}
    const movimentos = buildMovimentacoes(row.id, Array.isArray(source.movimentos) ? source.movimentos : [])
    const hashes = movimentos.map((movimento) => movimento.hash_movimento)
    const existingHashes = hashes.length ? await fetchExistingMovementHashes(row.id, hashes) : new Set<string>()
    const novos = movimentos.filter((movimento) => !existingHashes.has(movimento.hash_movimento))

    if (novos.length) {
      await insertMovimentacoesInChunks(novos)
    }

    const tarefasGeradas = await generateTasksFromMovements(row, novos)

    const updateResult = await admin().schema('gkit_jur').from('processos').update(processUpdatePayload(hit, movimentos)).eq('id', row.id)
    if (updateResult.error) throw new Error(updateResult.error.message)

    const finishedAt = new Date().toISOString()
    await insertSyncLog({
      finishedAt,
      httpStatus: response.status,
      processoId: row.id,
      requestPayload,
      responseMetadata: {
        datajud_id: text(hit._id, text(source.id)) || null,
        index: text(hit._index) || null,
        took: responseBody?.took ?? null,
        total: totalResultados,
      },
      row,
      startedAt,
      status: 'sucesso',
      totalMovimentacoesNovas: novos.length,
      totalMovimentacoesRecebidas: movimentos.length,
      totalResultados,
    })

    await applyMovementRetentionBestEffort(row.id)
    await refreshSummaryBestEffort(row.id)

    return { erroCodigo: null, httpStatus: response.status, status: 'sucesso', tarefasGeradas, transient: false, movimentosRecebidos: movimentos.length, movimentosNovos: novos.length }
  } catch (error) {
    const finishedAt = new Date().toISOString()
    const message = error instanceof Error ? error.message : 'Erro desconhecido na consulta DataJud.'
    const httpStatus = typeof (error as { httpStatus?: unknown }).httpStatus === 'number'
      ? (error as { httpStatus: number }).httpStatus
      : null
    const isTransient = isTransientDataJudError(message, httpStatus)

    await admin().schema('gkit_jur').from('processos').update({
      status_monitoramento: isTransient ? 'monitorando' : 'erro',
      ultima_sincronizacao_em: finishedAt,
      updated_at: finishedAt,
    }).eq('id', row.id)

    const erroCodigo = httpStatus ? `HTTP_${httpStatus}` : isTransient ? 'DATAJUD_TRANSIENT_ERROR' : 'DATAJUD_ERROR'

    await insertSyncLog({
      erroCodigo,
      erroMensagem: message,
      finishedAt,
      httpStatus,
      processoId: row.id,
      requestPayload,
      responseMetadata: {},
      row,
      startedAt,
      status: httpStatus === 408 || isTransient ? 'timeout' : 'erro',
      totalMovimentacoesNovas: 0,
      totalMovimentacoesRecebidas: 0,
      totalResultados: 0,
    })

    await refreshSummaryBestEffort(row.id)

    return { erroCodigo, httpStatus, status: 'erro', tarefasGeradas: 0, transient: isTransient, movimentosRecebidos: 0, movimentosNovos: 0 }
  }
}

export async function syncGkitJurDataJudBatch(options: {
  limit: number
  maxTransientErrors?: number
  processoId?: string
  shouldContinue?: () => boolean
  tribunal?: string
}): Promise<SyncBatchResult> {
  const limit = Math.max(1, Math.min(options.limit, 25))
  const maxTransientErrors = Math.max(1, Math.min(options.maxTransientErrors ?? 4, 10))
  let candidateResult = await admin()
    .schema('gkit_jur')
    .rpc('proximos_processos_sync', {
      p_limit: limit,
      p_processo_id: options.processoId ?? null,
      p_tribunal: options.tribunal ?? null,
    })

  if (candidateResult.error?.code === 'PGRST202') {
    let fallbackQuery = admin()
      .schema('gkit_jur')
      .from('processos')
      .select('id,numero_cnj,numero_cnj_limpo,tribunal_alias,carteira_id,responsavel_id')
      .eq('status', 'ativo')
      .not('tribunal_alias', 'is', null)
      .order('ultima_sincronizacao_em', { ascending: true, nullsFirst: true })
      .limit(limit)

    if (options.processoId) fallbackQuery = fallbackQuery.eq('id', options.processoId)
    else fallbackQuery = fallbackQuery.eq('status_monitoramento', 'monitorando')
    if (options.tribunal) fallbackQuery = fallbackQuery.eq('tribunal_sigla', options.tribunal)

    candidateResult = await fallbackQuery
  }

  const { data, error } = candidateResult
  if (error) throw new Error(error.message)

  const rows = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    carteira_id: text(row.carteira_id) || null,
    id: String(row.id),
    numero_cnj: text(row.numero_cnj),
    numero_cnj_limpo: text(row.numero_cnj_limpo),
    responsavel_id: text(row.responsavel_id) || null,
    tribunal_alias: text(row.tribunal_alias),
  })).filter((row) => row.id && row.numero_cnj_limpo && row.tribunal_alias)

  const result: SyncBatchResult = {
    erro: 0,
    finalizado: true,
    tarefasGeradas: 0,
    movimentosNovos: 0,
    movimentosRecebidos: 0,
    processos: 0,
    selecionados: rows.length,
    semResultado: 0,
    sucesso: 0,
  }

  let transientErrors = 0
  let consecutiveTransientErrors = 0

  for (const row of rows) {
    if (options.shouldContinue && !options.shouldContinue()) {
      result.finalizado = false
      break
    }

    const sync = await syncOneProcess(row)
    result.processos += 1
    if (sync.status === 'sucesso') result.sucesso += 1
    if (sync.status === 'sem_resultado') result.semResultado += 1
    if (sync.status === 'erro') result.erro += 1
    if (sync.transient) {
      transientErrors += 1
      consecutiveTransientErrors += 1
    } else {
      consecutiveTransientErrors = 0
    }
    result.tarefasGeradas += sync.tarefasGeradas
    result.movimentosRecebidos += sync.movimentosRecebidos
    result.movimentosNovos += sync.movimentosNovos

    if (transientErrors >= maxTransientErrors || consecutiveTransientErrors >= Math.min(2, maxTransientErrors)) {
      result.finalizado = false
      break
    }
  }

  return result
}
