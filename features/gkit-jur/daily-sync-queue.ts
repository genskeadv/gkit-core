import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export type DailySyncProcess = {
  id: string
  numero_cnj: string
  numero_cnj_limpo: string
  tribunal_alias: string | null
  tribunal_sigla?: string | null
  carteira_id: string | null
  responsavel_id: string | null
  tipo_acompanhamento: string | null
  acompanhamento_autorizado_em: string | null
  ultima_sincronizacao_com_resultado_em: string | null
}

export type DailySyncAttempt = {
  processo_id: string
  status: string
  started_at: string
  finished_at: string | null
}

// Brazil has a fixed UTC-3 offset. Keep the same cutoff throughout each run.
export function dailySyncCutoff(now = new Date()) {
  const date = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return `${date}T03:00:00.000Z`
}

export function buildDailySyncQueue(processes: DailySyncProcess[], attempts: DailySyncAttempt[], now = new Date()) {
  const completed = new Set<string>()
  const latest = new Map<string, DailySyncAttempt>()
  for (const attempt of attempts) {
    if (attempt.status === 'sucesso' || attempt.status === 'sem_resultado') completed.add(attempt.processo_id)
    const previous = latest.get(attempt.processo_id)
    if (!previous || attempt.started_at > previous.started_at) latest.set(attempt.processo_id, attempt)
  }
  const authorized = processes.filter((p) => p.tipo_acompanhamento !== 'cliente_mensal_outro_escritorio' || p.acompanhamento_autorizado_em)
  const eligible = authorized.filter((p) => p.tribunal_alias && p.numero_cnj_limpo?.length === 20)
  const pending = eligible.filter((p) => !completed.has(p.id))
  const ready = pending.filter((p) => {
    const attempt = latest.get(p.id)
    // Retry failed queries hourly; never let an unavailable court starve unattempted cases.
    return !attempt || now.getTime() - Date.parse(attempt.finished_at ?? attempt.started_at) >= 60 * 60 * 1000
  }).sort((a, b) => {
    const attemptedOrder = Number(latest.has(a.id)) - Number(latest.has(b.id))
    if (attemptedOrder) return attemptedOrder
    return (a.ultima_sincronizacao_com_resultado_em ?? '').localeCompare(b.ultima_sincronizacao_com_resultado_em ?? '') || a.id.localeCompare(b.id)
  })
  return {
    ready,
    summary: {
      ativosMonitorados: processes.length,
      concluidosHoje: eligible.length - pending.length,
      pendentesHoje: pending.length,
      aguardandoNovaTentativa: pending.length - ready.length,
      semTribunalOuCnj: authorized.length - eligible.length,
      semAutorizacao: processes.length - authorized.length,
    },
  }
}

export async function loadDailySyncQueue(since: string, now = new Date()) {
  const db = createSupabaseAdminClient().schema('gkit_jur') as any
  const processes: DailySyncProcess[] = []
  const attempts: DailySyncAttempt[] = []
  // Page both sources: PostgREST caps responses at 1,000 rows.
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('processos')
      .select('id,numero_cnj,numero_cnj_limpo,tribunal_alias,tribunal_sigla,carteira_id,responsavel_id,tipo_acompanhamento,acompanhamento_autorizado_em,ultima_sincronizacao_com_resultado_em')
      .eq('status', 'ativo').eq('status_monitoramento', 'monitorando')
      .order('id').range(offset, offset + 999)
    if (error) throw new Error(error.message)
    processes.push(...data)
    if (data.length < 1000) break
  }
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('sincronizacoes')
      .select('processo_id,status,started_at,finished_at')
      .eq('provedor', 'datajud').gte('started_at', since)
      .order('started_at').order('id').range(offset, offset + 999)
    if (error) throw new Error(error.message)
    attempts.push(...data)
    if (data.length < 1000) break
  }
  return buildDailySyncQueue(processes, attempts, now)
}
