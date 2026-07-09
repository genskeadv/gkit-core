import { createHash } from 'node:crypto'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export type PublicationInboxInput = {
  arq?: string | null
  classificacaoIa?: Record<string, unknown>
  confiancaIa?: number | null
  dataDisponibilizacao?: string | null
  dataPublicacao?: string | null
  fonte: string
  fonteEventoId?: string | null
  jornal?: string | null
  numeroCnjLimpo: string
  origemOrgao?: string | null
  processoId?: string | null
  pub?: string | null
  rawPayload?: Record<string, unknown> | null
  sugestaoIa?: string | null
  termo?: string | null
  texto: string
}

function admin() {
  return createSupabaseAdminClient() as any
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function normalizeContent(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function dateOnly(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isFinite(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  const brDate = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  return brDate ? `${brDate[3]}-${brDate[2]}-${brDate[1]}` : null
}

function preview(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 600) || null
}

function missingTable(error: unknown) {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {}
  return ['42P01', 'PGRST205'].includes(text(record.code))
}

export async function insertPublicationInboxItemsBestEffort(inputs: PublicationInboxInput[]) {
  const rows = inputs
    .map((input) => {
      const numeroCnjLimpo = onlyDigits(input.numeroCnjLimpo)
      const normalizedText = normalizeContent(input.texto)
      if (!numeroCnjLimpo || !normalizedText) return null
      const textoHash = hash({ numeroCnjLimpo, texto: normalizedText })
      return {
        arq: text(input.arq) || null,
        classificacao_ia: input.classificacaoIa ?? {},
        confianca_ia: input.confiancaIa ?? null,
        data_disponibilizacao: dateOnly(input.dataDisponibilizacao),
        data_publicacao: dateOnly(input.dataPublicacao),
        fonte: text(input.fonte, 'integracao'),
        fonte_evento_id: text(input.fonteEventoId) || null,
        jornal: text(input.jornal) || null,
        numero_cnj_limpo: numeroCnjLimpo,
        origem_orgao: text(input.origemOrgao) || null,
        payload_hash: input.rawPayload ? hash(input.rawPayload) : null,
        processo_id: text(input.processoId) || null,
        pub: text(input.pub) || null,
        raw_payload: input.rawPayload ?? null,
        status: 'pendente',
        sugestao_ia: text(input.sugestaoIa) || null,
        termo: text(input.termo) || null,
        texto_completo: input.texto,
        texto_hash: textoHash,
        texto_preview: preview(input.texto),
        updated_at: new Date().toISOString(),
      }
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))

  if (!rows.length) return { inserted: 0, skipped: 0 }

  try {
    let inserted = 0
    let skipped = 0
    const groups = new Map<string, typeof rows>()
    for (const row of rows) {
      const key = row.fonte
      const group = groups.get(key) ?? []
      group.push(row)
      groups.set(key, group)
    }

    for (const [fonte, group] of groups.entries()) {
      const hashes = [...new Set(group.map((row) => row.texto_hash))]
      const existingResult = await admin()
        .schema('gkit_jur')
        .from('publicacoes_monitoradas')
        .select('numero_cnj_limpo,texto_hash')
        .eq('fonte', fonte)
        .in('texto_hash', hashes)

      if (existingResult.error) {
        if (missingTable(existingResult.error)) return { inserted, skipped: rows.length }
        throw new Error(existingResult.error.message)
      }

      const existing = new Set(((existingResult.data ?? []) as Array<Record<string, unknown>>)
        .map((row) => `${text(row.numero_cnj_limpo)}:${text(row.texto_hash)}`))
      const fresh = group.filter((row) => !existing.has(`${row.numero_cnj_limpo}:${row.texto_hash}`))
      skipped += group.length - fresh.length

      if (!fresh.length) continue
      const insertResult = await admin().schema('gkit_jur').from('publicacoes_monitoradas').insert(fresh)
      if (insertResult.error) {
        if (missingTable(insertResult.error)) return { inserted, skipped: rows.length }
        throw new Error(insertResult.error.message)
      }
      inserted += fresh.length
    }

    return { inserted, skipped }
  } catch {
    return { inserted: 0, skipped: rows.length }
  }
}
