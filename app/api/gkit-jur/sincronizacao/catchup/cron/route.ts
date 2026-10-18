import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { runGkitJurSync, type GkitJurSyncRunResult } from '@/features/gkit-jur/sync-runner'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { dailySyncCutoff, loadDailySyncQueue } from '@/features/gkit-jur/daily-sync-queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const JOB_KEY = 'gkit_jur_datajud_catchup'
const LOCK_TTL_MS = 30 * 60 * 1000
const DEFAULT_CATCHUP_LIMIT = 25
const DEFAULT_CATCHUP_TIME_BUDGET_MS = 240_000

function admin() {
  return createSupabaseAdminClient() as any
}

function positiveInt(value: unknown, fallback: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  return Boolean(secret && authHeader === `Bearer ${secret}`)
}

async function acquireLock(token: string, schedule: string) {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + LOCK_TTL_MS).toISOString()
  const metadata = {
    schedule,
    source: 'vercel_cron',
    started_at: now.toISOString(),
  }

  const insertResult = await admin().schema('gkit_jur').from('cron_locks').insert({
    expires_at: expiresAt,
    job_key: JOB_KEY,
    locked_at: now.toISOString(),
    metadata,
    token,
    updated_at: now.toISOString(),
  })

  if (!insertResult.error) return true

  if (insertResult.error.code !== '23505') {
    throw new Error(insertResult.error.message)
  }

  const updateResult = await admin()
    .schema('gkit_jur')
    .from('cron_locks')
    .update({
      expires_at: expiresAt,
      locked_at: now.toISOString(),
      metadata,
      token,
      updated_at: now.toISOString(),
    })
    .eq('job_key', JOB_KEY)
    .lt('expires_at', now.toISOString())
    .select('job_key')
    .maybeSingle()

  if (updateResult.error) throw new Error(updateResult.error.message)

  return Boolean(updateResult.data)
}

async function releaseLock(token: string, result: GkitJurSyncRunResult | null, errorMessage?: string) {
  const now = new Date().toISOString()
  const metadata = {
    error: errorMessage ?? null,
    finished_at: now,
    result,
  }

  const { error } = await admin()
    .schema('gkit_jur')
    .from('cron_locks')
    .update({
      expires_at: now,
      metadata,
      updated_at: now,
    })
    .eq('job_key', JOB_KEY)
    .eq('token', token)

  if (error) throw new Error(error.message)
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
  }

  const token = randomUUID()
  const schedule = request.headers.get('x-vercel-cron-schedule') ?? '0 10 * * *'

  try {
    const acquired = await acquireLock(token, schedule)

    if (!acquired) {
      return NextResponse.json(
        {
          message: 'Sincronização diária DataJud já está em andamento.',
          status: 'running',
          success: false,
        },
        { status: 409 },
      )
    }

    const since = dailySyncCutoff()
    const result = await runGkitJurSync({
      dailySince: since,
      dataJudConcurrency: 3,
      dataJudBatchLimit: positiveInt(process.env.GKIT_JUR_CATCHUP_DATAJUD_LIMIT, DEFAULT_CATCHUP_LIMIT, 25),
      dataJudMaxTransientErrors: positiveInt(process.env.GKIT_JUR_CATCHUP_MAX_TRANSIENT_ERRORS, 10, 10),
      maxDataJudBatches: positiveInt(process.env.GKIT_JUR_CATCHUP_DATAJUD_BATCHES, 20, 100),
      provider: 'datajud',
      timeBudgetMs: positiveInt(process.env.GKIT_JUR_CATCHUP_TIME_BUDGET_MS, DEFAULT_CATCHUP_TIME_BUDGET_MS, 260_000),
    })

    const coverage = (await loadDailySyncQueue(since)).summary
    const dailyResult = {
      ...result,
      coberturaDiaria: coverage,
      desde: since,
      finalizado: coverage.pendentesHoje === 0 && coverage.semTribunalOuCnj === 0 && coverage.semAutorizacao === 0,
    }
    await releaseLock(token, dailyResult)

    return NextResponse.json({
      result: dailyResult,
      coverage,
      schedule,
      success: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado na sincronização diária DataJud.'

    try {
      await releaseLock(token, null, message)
    } catch {
      // A falha principal ja sera retornada; a trava expira automaticamente.
    }

    return NextResponse.json({ error: message, success: false }, { status: 500 })
  }
}
