import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import {
  cicloDriveDocumentTitle,
  parseCicloDrivePath,
} from '@/features/ciclo/drive-catalog'
import { cleanEnvValue } from '@/lib/supabase/env'

type RcloneEntry = {
  ID?: string
  IsDir?: boolean
  MimeType?: string
  ModTime?: string
  Name?: string
  Path?: string
  Size?: number
  [key: string]: unknown
}

type ClienteRow = {
  id: string
  carteira_id: string | null
  cnpj_normalizado?: string | null
  documento?: string | null
  nome?: string | null
  nome_fantasia?: string | null
  razao_social?: string | null
}

type DocumentoRow = {
  arquivo_url: string | null
  data_renovacao: string | null
  id: string
  cliente_id: string
  tipo_documento: string
  status: string | null
  validado: boolean | null
}

type CatalogCandidate = {
  arquivoUrl: string | null
  cliente: ClienteRow | null
  documentoId: string | null
  entry: RcloneEntry
  expiresAt: string | null
  parseErrors: string[]
  parseStatus: 'catalogado' | 'fora_padrao' | 'sem_cliente'
  parsed: ReturnType<typeof parseCicloDrivePath>
  path: string
  shouldApply: boolean
  status: 'pendente' | 'recebido' | 'validado' | 'vencido'
}

type AnySupabaseClient = any

const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [key, ...rest] = arg.slice(2).split('=')
      return [key, rest.join('=') || 'true']
    }),
)

const remoteRoot = args.get('remote') ?? ''
const fromFile = args.get('from-file') ?? ''
const rcloneBin = args.get('rclone') ?? 'rclone'
const apply = args.has('apply')
const validateFound = args.has('validar-encontrados')
const useRcloneLink = args.has('use-rclone-link')

async function main() {
  if (!remoteRoot && !fromFile) {
    throw new Error('Informe --remote=gdrive:pasta ou --from-file=varredura.json.')
  }

  const entries = fromFile ? readEntriesFromFile(fromFile) : listRcloneEntries(remoteRoot)
  const files = entries.filter((entry) => !entry.IsDir)
  const supabase = createSupabaseClient()
  const clientes = await loadClientes(supabase)
  const clientesByDocumento = new Map(clientes.map((cliente) => [onlyDigits(cliente.cnpj_normalizado ?? cliente.documento), cliente]))
  const existingDocumentos = await loadDocumentos(supabase, clientes.map((cliente) => cliente.id))
  const existingByKey = new Map(existingDocumentos.map((documento) => [
    documentoKey(documento.cliente_id, documento.tipo_documento),
    documento,
  ]))

  const candidates = files.map((entry): CatalogCandidate => {
    const path = String(entry.Path ?? entry.Name ?? '')
    const parsed = parseCicloDrivePath(path)
    const cliente = parsed.documentoCliente ? clientesByDocumento.get(parsed.documentoCliente) ?? null : null
    const parseStatus = !parsed.ok ? 'fora_padrao' : cliente ? 'catalogado' : 'sem_cliente'
    const existing = cliente && parsed.tipoDocumento
      ? existingByKey.get(documentoKey(cliente.id, parsed.tipoDocumento))
      : null
    const expiresAt = parsed.semVencimento ? null : parsed.dataVencimento
    const expired = expiresAt ? new Date(`${expiresAt}T23:59:59.999Z`).getTime() < Date.now() : false
    const status = expired
      ? 'vencido'
      : validateFound
        ? 'validado'
        : existing?.status === 'validado'
          ? 'validado'
          : 'recebido'

    return {
      arquivoUrl: buildArquivoUrl(entry, path) ?? existing?.arquivo_url ?? null,
      cliente,
      documentoId: existing?.id ?? null,
      entry,
      expiresAt: expiresAt ?? null,
      parseErrors: parsed.errors,
      parseStatus,
      parsed,
      path,
      shouldApply: parseStatus === 'catalogado',
      status,
    }
  })

  const selected = selectLatestCandidates(candidates)
  const selectedPaths = new Set(selected.map((candidate) => candidate.path))
  const appliedCandidates = candidates.map((candidate) => ({
    ...candidate,
    shouldApply: candidate.shouldApply && selectedPaths.has(candidate.path),
  }))

  if (!apply) {
    printSummary(appliedCandidates, true)
    return
  }

  const syncRunId = await createSyncRun(supabase, remoteRoot || fromFile, false, files.length)

  try {
    await upsertCatalogRows(supabase, syncRunId, remoteRoot || fromFile, appliedCandidates)
    await applyDocumentoUpdates(supabase, appliedCandidates)
    await finishSyncRun(supabase, syncRunId, 'concluido', appliedCandidates)
    printSummary(appliedCandidates, false)
  } catch (error) {
    await finishSyncRun(supabase, syncRunId, 'falhou', appliedCandidates, errorMessage(error))
    throw error
  }
}

function readEntriesFromFile(path: string) {
  return JSON.parse(readFileSync(path, 'utf8')) as RcloneEntry[]
}

function listRcloneEntries(remote: string) {
  const result = spawnSync(rcloneBin, ['lsjson', remote, '--recursive', '--files-only'], {
    encoding: 'utf8',
    shell: false,
  })

  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(result.stderr || `rclone saiu com status ${result.status}.`)
  return JSON.parse(result.stdout) as RcloneEntry[]
}

function createSupabaseClient(): AnySupabaseClient {
  const env = { ...process.env, ...readLocalEnv() }
  const supabaseUrl = cleanEnvValue(env.NEXT_PUBLIC_SUPABASE_URL)
  const serviceRoleKey = cleanEnvValue(env.SUPABASE_SERVICE_ROLE_KEY)

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Env ausente: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as AnySupabaseClient
}

function readLocalEnv() {
  const envPath = join(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return {} as Record<string, string>

  return Object.fromEntries(
    readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => [match[1], match[2].replace(/^['"]|['"]$/g, '').trim()]),
  )
}

async function loadClientes(supabase: AnySupabaseClient) {
  const { data, error } = await supabase
    .schema('ciclo')
    .from('clientes')
    .select('id,carteira_id,nome,nome_fantasia,razao_social,documento,cnpj_normalizado')
    .eq('ativo', true)

  if (error) throw new Error(error.message)
  return (data ?? []) as ClienteRow[]
}

async function loadDocumentos(supabase: AnySupabaseClient, clienteIds: string[]) {
  const rows: DocumentoRow[] = []
  for (let index = 0; index < clienteIds.length; index += 500) {
    const chunk = clienteIds.slice(index, index + 500)
    if (!chunk.length) continue

    const { data, error } = await supabase
      .schema('ciclo')
      .from('cliente_documentos')
      .select('id,cliente_id,tipo_documento,status,validado,arquivo_url,data_renovacao')
      .in('cliente_id', chunk)

    if (error) throw new Error(error.message)
    rows.push(...((data ?? []) as DocumentoRow[]))
  }
  return rows
}

function selectLatestCandidates(candidates: CatalogCandidate[]) {
  const byDocument = new Map<string, CatalogCandidate>()

  for (const candidate of candidates) {
    if (!candidate.shouldApply || !candidate.cliente || !candidate.parsed.tipoDocumento) continue
    const key = documentoKey(candidate.cliente.id, candidate.parsed.tipoDocumento)
    const previous = byDocument.get(key)
    if (!previous || candidateRank(candidate) > candidateRank(previous)) {
      byDocument.set(key, candidate)
    }
  }

  return [...byDocument.values()]
}

function candidateRank(candidate: CatalogCandidate) {
  const modified = Date.parse(String(candidate.entry.ModTime ?? '')) || 0
  const expires = candidate.expiresAt ? Date.parse(`${candidate.expiresAt}T00:00:00.000Z`) : 0
  return Math.max(modified, expires)
}

async function createSyncRun(supabase: AnySupabaseClient, remote: string, dryRun: boolean, totalArquivos: number) {
  const { data, error } = await supabase
    .schema('ciclo')
    .from('documento_drive_sync_runs')
    .insert({
      dry_run: dryRun,
      remote_root: remote,
      status: 'em_andamento',
      total_arquivos: totalArquivos,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return String(data.id)
}

async function finishSyncRun(
  supabase: AnySupabaseClient,
  id: string,
  status: 'concluido' | 'falhou',
  candidates: CatalogCandidate[],
  error?: string,
) {
  const { error: updateError } = await supabase
    .schema('ciclo')
    .from('documento_drive_sync_runs')
    .update({
      arquivos_reconhecidos: candidates.filter((candidate) => candidate.parseStatus === 'catalogado').length,
      documentos_atualizados: candidates.filter((candidate) => candidate.shouldApply).length,
      error_message: error ?? null,
      erros: candidates.filter((candidate) => candidate.parseStatus !== 'catalogado').length,
      finished_at: new Date().toISOString(),
      fora_padrao: candidates.filter((candidate) => candidate.parseStatus === 'fora_padrao').length,
      status,
    })
    .eq('id', id)

  if (updateError) throw new Error(updateError.message)
}

async function upsertCatalogRows(
  supabase: AnySupabaseClient,
  syncRunId: string,
  remote: string,
  candidates: CatalogCandidate[],
) {
  const rows = candidates.map((candidate) => ({
    aplicacao_mensagem: candidate.shouldApply ? `Aplicado como ${candidate.status}.` : nonAppliedMessage(candidate),
    aplicado: candidate.shouldApply,
    arquivo_url: candidate.arquivoUrl,
    caminho: candidate.path,
    carteira_id: candidate.cliente?.carteira_id ?? null,
    cliente_id: candidate.cliente?.id ?? null,
    cliente_slug: candidate.parsed.clienteSlug,
    data_vencimento: candidate.expiresAt,
    documento_cliente: candidate.parsed.documentoCliente,
    documento_id: candidate.documentoId,
    drive_file_id: candidate.entry.ID ?? null,
    extensao: candidate.parsed.extensao,
    last_seen_at: new Date().toISOString(),
    mime_type: candidate.entry.MimeType ?? null,
    modificado_em: candidate.entry.ModTime ?? null,
    nome_arquivo: basename(candidate.path),
    parse_erros: candidate.parseErrors,
    parse_status: candidate.parseStatus,
    raw: candidate.entry,
    remote_root: remote,
    sem_vencimento: candidate.parsed.semVencimento,
    sync_run_id: syncRunId,
    tamanho_bytes: candidate.entry.Size ?? null,
    tipo_documento: candidate.parsed.tipoDocumento,
    updated_at: new Date().toISOString(),
    versao: candidate.parsed.versao,
  }))

  for (let index = 0; index < rows.length; index += 500) {
    const { error } = await supabase
      .schema('ciclo')
      .from('documento_drive_arquivos')
      .upsert(rows.slice(index, index + 500), { onConflict: 'remote_root,caminho' })

    if (error) throw new Error(error.message)
  }
}

async function applyDocumentoUpdates(supabase: AnySupabaseClient, candidates: CatalogCandidate[]) {
  for (const candidate of candidates.filter((item) => item.shouldApply)) {
    if (!candidate.cliente || !candidate.parsed.tipoDocumento) continue

    const validado = candidate.status === 'validado'
    const payload: Record<string, unknown> = {
      aplicavel: true,
      arquivo_url: candidate.arquivoUrl,
      carteira_id: candidate.cliente.carteira_id,
      cliente_id: candidate.cliente.id,
      drive_file_id: candidate.entry.ID ?? null,
      drive_file_mime_type: candidate.entry.MimeType ?? null,
      drive_file_name: basename(candidate.path),
      drive_file_path: candidate.path,
      drive_file_size_bytes: candidate.entry.Size ?? null,
      drive_match_confidence: 1,
      drive_modified_at: candidate.entry.ModTime ?? null,
      drive_synced_at: new Date().toISOString(),
      obrigatorio: true,
      status: candidate.status,
      tipo_documento: candidate.parsed.tipoDocumento,
      titulo: cicloDriveDocumentTitle(candidate.parsed.tipoDocumento),
      validado,
      validado_em: validado ? new Date().toISOString() : null,
    }
    if (candidate.expiresAt) payload.data_renovacao = candidate.expiresAt

    const { error } = await supabase
      .schema('ciclo')
      .from('cliente_documentos')
      .upsert(payload, { onConflict: 'cliente_id,tipo_documento' })

    if (error) throw new Error(error.message)
  }
}

function buildArquivoUrl(entry: RcloneEntry, path: string) {
  if (entry.ID) return `https://drive.google.com/file/d/${entry.ID}/view`
  if (!useRcloneLink || !remoteRoot) return null

  const result = spawnSync(rcloneBin, ['link', joinRemotePath(remoteRoot, path)], {
    encoding: 'utf8',
    shell: false,
  })
  if (result.status !== 0) return null
  return result.stdout.trim() || null
}

function joinRemotePath(remote: string, path: string) {
  return `${remote.replace(/[\\/]+$/, '')}/${path.replace(/^[\\/]+/, '')}`
}

function documentoKey(clienteId: string, tipoDocumento: string) {
  return `${clienteId}:${tipoDocumento}`
}

function nonAppliedMessage(candidate: CatalogCandidate) {
  if (candidate.parseStatus === 'fora_padrao') return `Fora do padrao: ${candidate.parseErrors.join(', ')}.`
  if (candidate.parseStatus === 'sem_cliente') return 'Cliente nao encontrado pelo CPF/CNPJ do arquivo.'
  return 'Outro arquivo mais recente foi escolhido para este documento.'
}

function printSummary(candidates: CatalogCandidate[], dryRun: boolean) {
  const summary = {
    aplicaveis: candidates.filter((candidate) => candidate.shouldApply).length,
    dryRun,
    foraPadrao: candidates.filter((candidate) => candidate.parseStatus === 'fora_padrao').length,
    reconhecidos: candidates.filter((candidate) => candidate.parseStatus === 'catalogado').length,
    semCliente: candidates.filter((candidate) => candidate.parseStatus === 'sem_cliente').length,
    totalArquivos: candidates.length,
  }

  console.log(JSON.stringify(summary, null, 2))

  const problemas = candidates
    .filter((candidate) => !candidate.shouldApply)
    .slice(0, 20)
    .map((candidate) => ({
      arquivo: candidate.path,
      motivo: nonAppliedMessage(candidate),
    }))

  if (problemas.length) console.log(JSON.stringify({ problemas }, null, 2))
}

function onlyDigits(value: string | null | undefined) {
  return String(value ?? '').replace(/\D/g, '')
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro inesperado.'
}

main().catch((error) => {
  console.error(errorMessage(error))
  process.exitCode = 1
})
