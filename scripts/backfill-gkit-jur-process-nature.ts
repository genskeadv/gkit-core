import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { classifyGkitJurProcessNature } from '@/features/gkit-jur/process-nature'

type ProcessRow = {
  assuntos: unknown
  classe_codigo: unknown
  classe_nome: unknown
  id: string
  metadata_datajud: unknown
  natureza_operacional: string | null
  numero_cnj: string | null
  titulo: string | null
}

function readLocalEnv() {
  const env: Record<string, string> = {}
  const envPath = join(process.cwd(), '.env.local')

  try {
    const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
    for (const line of lines) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (match) env[match[1]] = match[2].trim()
    }
  } catch {
    // createSupabaseAdminClient emits the actionable env error.
  }

  return env
}

function applyLocalEnv() {
  for (const [key, value] of Object.entries(readLocalEnv())) {
    process.env[key] = value
  }
}

function argValue(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

function positiveInt(value: string, fallback: number, max: number) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function increment(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1
}

async function main() {
  applyLocalEnv()

  const apply = hasFlag('apply')
  const includeInactive = hasFlag('include-inactive')
  const refreshAll = hasFlag('all')
  const limit = positiveInt(argValue('limit'), 250, 2000)
  const supabase = createSupabaseAdminClient() as any

  let query = supabase
    .schema('gkit_jur')
    .from('processos')
    .select('id,numero_cnj,titulo,classe_codigo,classe_nome,assuntos,metadata_datajud,natureza_operacional,status,updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (!includeInactive) query = query.eq('status', 'ativo')
  if (!refreshAll) {
    query = query.or('natureza_operacional.is.null,natureza_operacional.eq.nao_classificado')
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as ProcessRow[]
  const now = new Date().toISOString()
  const summary = {
    applied: apply,
    byConfidence: {} as Record<string, number>,
    byNature: {} as Record<string, number>,
    errors: [] as Array<{ error: string; id: string }>,
    limit,
    planned: 0,
    refreshAll,
    selected: rows.length,
    unchanged: 0,
    updated: 0,
    updateSamples: [] as Array<{
      confidence: string
      from: string | null
      id: string
      nature: string
      numeroCnj: string | null
    }>,
  }

  for (const row of rows) {
    const natureza = classifyGkitJurProcessNature({
      assuntos: row.assuntos,
      classeCodigo: row.classe_codigo,
      classeNome: row.classe_nome,
      metadataDataJud: row.metadata_datajud,
      titulo: row.titulo,
    })
    const current = text(row.natureza_operacional) || null
    const changed = refreshAll || current !== natureza.tipo

    increment(summary.byNature, natureza.tipo)
    increment(summary.byConfidence, natureza.confianca)

    if (!changed) {
      summary.unchanged += 1
      continue
    }

    summary.planned += 1
    if (summary.updateSamples.length < 10) {
      summary.updateSamples.push({
        confidence: natureza.confianca,
        from: current,
        id: row.id,
        nature: natureza.tipo,
        numeroCnj: row.numero_cnj,
      })
    }

    if (!apply) continue

    const result = await supabase
      .schema('gkit_jur')
      .from('processos')
      .update({
        natureza_operacional: natureza.tipo,
        natureza_operacional_confianca: natureza.confianca,
        natureza_operacional_label: natureza.label,
        natureza_operacional_sinais: {
          backfill_em: now,
          motivo: natureza.motivo,
          sinais: natureza.sinais,
          version: 1,
        },
        updated_at: now,
      })
      .eq('id', row.id)

    if (result.error) {
      summary.errors.push({ error: result.error.message, id: row.id })
      continue
    }

    summary.updated += 1
  }

  console.log(JSON.stringify(summary, null, 2))
  if (summary.errors.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
