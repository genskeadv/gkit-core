import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { runGkitJurSync, type GkitJurSyncRunResult } from '@/features/gkit-jur/sync-runner'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const JOB_KEY = 'gkit_jur_nightly_sync'
const CRON_SCHEDULE = '0 6 * * *'
const LOCK_TTL_MS = 30 * 60 * 1000

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
  const schedule = request.headers.get('x-vercel-cron-schedule') ?? CRON_SCHEDULE

  try {
    const acquired = await acquireLock(token, schedule)

    if (!acquired) {
      return NextResponse.json(
        {
          message: 'Sincronizacao do GKIT Jur ja esta em andamento.',
          status: 'running',
          success: false,
        },
        { status: 409 },
      )
    }

    const result = await runGkitJurSync({
      aaspDiferencial: true,
      dataJudBatchLimit: positiveInt(process.env.GKIT_JUR_CRON_DATAJUD_LIMIT, 25, 25),
      maxDataJudBatches: positiveInt(process.env.GKIT_JUR_CRON_DATAJUD_BATCHES, 30, 100),
      provider: 'redundante',
      timeBudgetMs: positiveInt(process.env.GKIT_JUR_CRON_TIME_BUDGET_MS, 270_000, 290_000),
    })

    await releaseLock(token, result)

    return NextResponse.json({
      result,
      schedule,
      success: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado na sincronizacao agendada.'

    try {
      await releaseLock(token, null, message)
    } catch {
      // A falha principal ja sera retornada; a trava expira automaticamente.
    }

    return NextResponse.json({ error: message, success: false }, { status: 500 })
  }
}
