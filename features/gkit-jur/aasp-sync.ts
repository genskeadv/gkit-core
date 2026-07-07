import { createHash } from 'node:crypto'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  applyMovementRetentionBestEffort,
  fetchExistingMovementHashes,
  generateTasksFromMovements,
  type GkitJurSyncProcessRow,
} from './datajud-sync'
import { refreshGkitJurProcessSummary } from './summary-service'

type AaspSyncResult = {
  processos: number
  sucesso: number
  semResultado: number
  erro: number
  finalizado: boolean
  tarefasGeradas: number
  movimentosRecebidos: number
  movimentosNovos: number
}

type AaspPublication = {
  cnjs: string[]
  dataHora: string | null
  hash: string
  raw: Record<string, any>
  text: string
}

const DEFAULT_AASP_BASE_URL = 'https://intimacaoapi.aasp.org.br'
const CNJ_PATTERN = /\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/g

function admin() {
  return createSupabaseAdminClient() as any
}

async function refreshSummaryBestEffort(processoId: string) {
  try {
    await refreshGkitJurProcessSummary(processoId)
  } catch {
    // A atualizacao de resumo nao deve invalidar a coleta da AASP.
  }
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function dateOrNull(value: unknown) {
  if (!value) return null
  const current = String(value).trim()
  const brDate = current.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  const normalized = brDate ? `${brDate[3]}-${brDate[2]}-${brDate[1]}${current.slice(10)}` : current
  const date = new Date(normalized)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (typeof value === 'number' && Number.isFinite(value)) return [String(value)]
  if (typeof value === 'bigint') return [String(value)]
  if (Array.isArray(value)) return value.flatMap(allStrings)
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).flatMap(allStrings)
  return []
}

function flattenObjects(value: unknown): Array<Record<string, any>> {
  if (Array.isArray(value)) return value.flatMap(flattenObjects)
  if (!value || typeof value !== 'object') return []
  const current = value as Record<string, any>
  if (Array.isArray(current.intimacoes)) return flattenObjects(current.intimacoes)
  const children = Object.values(current).flatMap(flattenObjects)
  return [current, ...children]
}

function extractDate(row: Record<string, any>): string | null {
  const keys = [
    'dataPublicacao',
    'DataPublicacao',
    'dataDisponibilizacao',
    'DataDisponibilizacao',
    'dataDisponibilizacao_Publicacao',
    'dataIntimacao',
    'DataIntimacao',
    'dataTratamento',
    'dataTerminoTratamento',
    'termoReferenciaData',
    'data',
    'Data',
  ]
  for (const key of keys) {
    const parsed = dateOrNull(row[key])
    if (parsed) return parsed
  }
  for (const value of Object.values(row)) {
    if (!value || typeof value !== 'object') continue
    const parsed = extractDate(value as Record<string, any>)
    if (parsed) return parsed
  }
  return null
}

function extractPublicationText(row: Record<string, any>) {
  const preferred = ['texto', 'Texto', 'publicacao', 'Publicacao', 'intimacao', 'Intimacao', 'conteudo', 'Conteudo', 'descricao', 'Descricao']
  for (const key of preferred) {
    const value = text(row[key])
    if (value) return value
  }
  return allStrings(row).sort((a, b) => b.length - a.length)[0] ?? 'Intimacao AASP'
}

function aaspConfig() {
  const baseUrl = text(process.env.AASP_API_BASE_URL, DEFAULT_AASP_BASE_URL).replace(/\/+$/, '')
  const chave = text(process.env.AASP_API_CHAVE)
  const escopo = text(process.env.AASP_API_ESCOPO, 'empresa').toLowerCase() === 'associado' ? 'associado' : 'empresa'
  const codigoPessoaAssociado = text(process.env.AASP_CODIGO_PESSOA_ASSOCIADO)
  if (!chave) throw new Error('AASP_API_CHAVE nao configurada no ambiente.')
  return { baseUrl, chave, codigoPessoaAssociado, escopo }
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

async function fetchAaspPublications(options: { data?: string; diferencial?: boolean }) {
  const { baseUrl, chave, codigoPessoaAssociado, escopo } = aaspConfig()
  const scopePath = escopo === 'associado' ? 'Associado' : 'Empresa'
  const params = new URLSearchParams({
    chave,
    data: options.data || todayIsoDate(),
    diferencial: String(Boolean(options.diferencial)),
  })
  if (escopo === 'empresa' && codigoPessoaAssociado) params.set('codigoPessoaAssociado', codigoPessoaAssociado)

  const requestUrl = `${baseUrl}/api/${scopePath}/intimacao/json?${params.toString()}`
  const response = await fetch(requestUrl, { method: 'GET', signal: AbortSignal.timeout(30_000) })
  const responseBody = await response.json().catch(() => null)
  return { requestPayload: { data: options.data || todayIsoDate(), diferencial: Boolean(options.diferencial), escopo }, response, responseBody }
}

function normalizeAaspPublications(responseBody: unknown): AaspPublication[] {
  const rows = flattenObjects(responseBody)
  const normalized = new Map<string, AaspPublication>()

  for (const row of rows) {
    const strings = allStrings(row).join('\n')
    const cnjs = [...new Set((strings.match(CNJ_PATTERN) ?? []).map(onlyDigits).filter((item) => item.length === 20))]
    if (!cnjs.length) continue

    const content = extractPublicationText(row)
    const dataHora = extractDate(row)
    const hash = createHash('sha256').update(JSON.stringify({ cnjs, content, dataHora: null, row })).digest('hex')
    normalized.set(hash, { cnjs, dataHora, hash, raw: row, text: content })
  }

  return [...normalized.values()]
}

async function fetchActiveProcesses(cnjs: string[]) {
  if (!cnjs.length) return new Map<string, GkitJurSyncProcessRow>()
  const { data, error } = await admin()
    .schema('gkit_jur')
    .from('processos')
    .select('id,numero_cnj,numero_cnj_limpo,tribunal_alias,tribunal_sigla,carteira_id,responsavel_id')
    .eq('status', 'ativo')
    .in('numero_cnj_limpo', cnjs)

  if (error) throw new Error(error.message)

  return new Map(((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const processo: GkitJurSyncProcessRow = {
      carteira_id: text(row.carteira_id) || null,
      id: String(row.id),
      numero_cnj: text(row.numero_cnj),
      numero_cnj_limpo: text(row.numero_cnj_limpo),
      responsavel_id: text(row.responsavel_id) || null,
      tribunal_alias: text(row.tribunal_alias, text(row.tribunal_sigla, 'aasp')),
    }
    return [processo.numero_cnj_limpo, processo]
  }))
}

function movementFromPublication(processo: GkitJurSyncProcessRow, publication: AaspPublication) {
  const label = publication.text.length > 260 ? `${publication.text.slice(0, 257)}...` : publication.text
  return {
    processo_id: processo.id,
    codigo: null,
    nome: label || 'Intimacao AASP',
    data_hora: publication.dataHora,
    orgao_codigo: null,
    orgao_nome: null,
    complementos_tabelados: [],
    raw_movimento: publication.raw,
    hash_movimento: `aasp:${publication.hash}:${processo.numero_cnj_limpo}`,
    origem: 'aasp_intimacao',
    relevante: true,
    gera_alerta: true,
  }
}

async function insertSyncLog(input: {
  erroCodigo?: string | null
  erroMensagem?: string | null
  finishedAt: string
  httpStatus?: number | null
  processo: GkitJurSyncProcessRow | null
  requestPayload: Record<string, any>
  responseMetadata: Record<string, any>
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
    numero_cnj_limpo: input.processo?.numero_cnj_limpo ?? 'aasp',
    processo_id: input.processo?.id ?? null,
    provedor: 'aasp',
    request_payload: input.requestPayload,
    response_metadata: input.responseMetadata,
    started_at: input.startedAt,
    status: input.status,
    total_movimentacoes_novas: input.totalMovimentacoesNovas,
    total_movimentacoes_recebidas: input.totalMovimentacoesRecebidas,
    total_resultados: input.totalResultados,
    tribunal_alias: input.processo?.tribunal_alias ?? 'aasp',
  })
  if (error) throw new Error(error.message)
}

export async function syncGkitJurAaspBatch(options: {
  data?: string
  diferencial?: boolean
  shouldContinue?: () => boolean
}): Promise<AaspSyncResult> {
  const startedAt = new Date().toISOString()
  let requestPayload: Record<string, any> = {}
  try {
    const { requestPayload: payload, response, responseBody } = await fetchAaspPublications(options)
    requestPayload = payload
    if (!response.ok) {
      const message = typeof responseBody === 'object' && responseBody ? text((responseBody as Record<string, any>).message, response.statusText) : response.statusText
      throw Object.assign(new Error(message), { httpStatus: response.status })
    }

    const publications = normalizeAaspPublications(responseBody)
    const cnjs = [...new Set(publications.flatMap((item) => item.cnjs))]
    const processMap = await fetchActiveProcesses(cnjs)
    const movimentosByProcess = new Map<string, { processo: GkitJurSyncProcessRow; movimentos: Array<Record<string, any>> }>()

    for (const publication of publications) {
      for (const cnj of publication.cnjs) {
        const processo = processMap.get(cnj)
        if (!processo) continue
        const bucket = movimentosByProcess.get(processo.id) ?? { processo, movimentos: [] }
        bucket.movimentos.push(movementFromPublication(processo, publication))
        movimentosByProcess.set(processo.id, bucket)
      }
    }

    if (!movimentosByProcess.size) {
      const finishedAt = new Date().toISOString()
      await insertSyncLog({
        finishedAt,
        httpStatus: response.status,
        processo: null,
        requestPayload,
        responseMetadata: { publicacoes: publications.length, cnjs: cnjs.length },
        startedAt,
        status: 'sem_resultado',
        totalMovimentacoesNovas: 0,
        totalMovimentacoesRecebidas: publications.length,
        totalResultados: publications.length,
      })
      return { erro: 0, finalizado: true, movimentosNovos: 0, movimentosRecebidos: publications.length, processos: 0, semResultado: 1, sucesso: 0, tarefasGeradas: 0 }
    }

    const result: AaspSyncResult = {
      erro: 0,
      finalizado: true,
      movimentosNovos: 0,
      movimentosRecebidos: publications.length,
      processos: 0,
      semResultado: 0,
      sucesso: 0,
      tarefasGeradas: 0,
    }

    for (const { processo, movimentos } of movimentosByProcess.values()) {
      if (options.shouldContinue && !options.shouldContinue()) {
        result.finalizado = false
        break
      }

      const hashes = movimentos.map((movimento) => text(movimento.hash_movimento)).filter(Boolean)
      const existingHashes = hashes.length ? await fetchExistingMovementHashes(processo.id, hashes) : new Set<string>()
      const novos = movimentos.filter((movimento) => !existingHashes.has(text(movimento.hash_movimento)))

      if (novos.length) {
        const insertResult = await admin().schema('gkit_jur').from('movimentacoes').insert(novos)
        if (insertResult.error) throw new Error(insertResult.error.message)
      }

      const tarefasGeradas = await generateTasksFromMovements(processo, novos, { provider: 'aasp', providerLabel: 'AASP' })
      const latest = novos.map((item) => text(item.data_hora)).filter(Boolean).sort().at(-1)
      const now = new Date().toISOString()
      const updatePayload: Record<string, any> = { ultima_sincronizacao_em: now, updated_at: now }
      if (latest) updatePayload.ultima_movimentacao_em = latest
      const updateResult = await admin().schema('gkit_jur').from('processos').update(updatePayload).eq('id', processo.id)
      if (updateResult.error) throw new Error(updateResult.error.message)

      const finishedAt = new Date().toISOString()
      await insertSyncLog({
        finishedAt,
        httpStatus: response.status,
        processo,
        requestPayload,
        responseMetadata: { publicacoes: movimentos.length },
        startedAt,
        status: 'sucesso',
        totalMovimentacoesNovas: novos.length,
        totalMovimentacoesRecebidas: movimentos.length,
        totalResultados: movimentos.length,
      })

      await applyMovementRetentionBestEffort(processo.id)
      await refreshSummaryBestEffort(processo.id)

      result.movimentosNovos += novos.length
      result.processos += 1
      result.sucesso += 1
      result.tarefasGeradas += tarefasGeradas
    }

    return result
  } catch (error) {
    const finishedAt = new Date().toISOString()
    const message = error instanceof Error ? error.message : 'Erro desconhecido na consulta AASP.'
    const httpStatus = typeof (error as { httpStatus?: unknown }).httpStatus === 'number'
      ? (error as { httpStatus: number }).httpStatus
      : null
    await insertSyncLog({
      erroCodigo: httpStatus ? `HTTP_${httpStatus}` : 'AASP_ERROR',
      erroMensagem: message,
      finishedAt,
      httpStatus,
      processo: null,
      requestPayload,
      responseMetadata: {},
      startedAt,
      status: httpStatus === 408 ? 'timeout' : 'erro',
      totalMovimentacoesNovas: 0,
      totalMovimentacoesRecebidas: 0,
      totalResultados: 0,
    })
    return { erro: 1, finalizado: true, movimentosNovos: 0, movimentosRecebidos: 0, processos: 0, semResultado: 0, sucesso: 0, tarefasGeradas: 0 }
  }
}
