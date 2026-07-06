import { syncGkitJurAaspBatch } from './aasp-sync'
import { syncGkitJurDataJudBatch } from './datajud-sync'

export type GkitJurSyncProvider = 'datajud' | 'aasp' | 'redundante'

export type GkitJurSyncRunResult = {
  dataJudBatches: number
  erro: number
  finalizado: boolean
  movimentosNovos: number
  movimentosRecebidos: number
  processos: number
  provider: GkitJurSyncProvider
  semResultado: number
  sucesso: number
  tarefasGeradas: number
}

export type GkitJurSyncRunOptions = {
  aaspData?: string
  aaspDiferencial?: boolean
  dataJudBatchLimit?: number
  maxDataJudBatches?: number
  provider?: GkitJurSyncProvider
  timeBudgetMs?: number
  tribunal?: string
}

const DEFAULT_TIME_BUDGET_MS = 240_000
const MAX_TIME_BUDGET_MS = 260_000
const DATAJUD_NEXT_PROCESS_RESERVE_MS = 40_000
const AASP_START_RESERVE_MS = 60_000
const AASP_NEXT_PROCESS_RESERVE_MS = 30_000

function positiveInt(value: unknown, fallback: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

function remainingBudgetMs(startedAt: number, timeBudgetMs: number) {
  return timeBudgetMs - (Date.now() - startedAt)
}

function hasBudgetFor(startedAt: number, timeBudgetMs: number, reserveMs: number) {
  return remainingBudgetMs(startedAt, timeBudgetMs) > reserveMs
}

export async function runGkitJurSync(options: GkitJurSyncRunOptions = {}): Promise<GkitJurSyncRunResult> {
  const provider = options.provider ?? 'redundante'
  const dataJudBatchLimit = positiveInt(options.dataJudBatchLimit, 25, 25)
  const maxDataJudBatches = positiveInt(options.maxDataJudBatches, 30, 100)
  const timeBudgetMs = positiveInt(options.timeBudgetMs, DEFAULT_TIME_BUDGET_MS, MAX_TIME_BUDGET_MS)
  const startedAt = Date.now()
  const result: GkitJurSyncRunResult = {
    dataJudBatches: 0,
    erro: 0,
    finalizado: true,
    movimentosNovos: 0,
    movimentosRecebidos: 0,
    processos: 0,
    provider,
    semResultado: 0,
    sucesso: 0,
    tarefasGeradas: 0,
  }

  if (provider === 'datajud' || provider === 'redundante') {
    for (let batch = 0; batch < maxDataJudBatches; batch += 1) {
      if (!hasBudgetFor(startedAt, timeBudgetMs, DATAJUD_NEXT_PROCESS_RESERVE_MS)) {
        result.finalizado = false
        break
      }

      const dataJudResult = await syncGkitJurDataJudBatch({
        limit: dataJudBatchLimit,
        shouldContinue: () => hasBudgetFor(startedAt, timeBudgetMs, DATAJUD_NEXT_PROCESS_RESERVE_MS),
        tribunal: options.tribunal,
      })

      result.dataJudBatches += 1
      result.erro += dataJudResult.erro
      result.movimentosNovos += dataJudResult.movimentosNovos
      result.movimentosRecebidos += dataJudResult.movimentosRecebidos
      result.processos += dataJudResult.processos
      result.semResultado += dataJudResult.semResultado
      result.sucesso += dataJudResult.sucesso
      result.tarefasGeradas += dataJudResult.tarefasGeradas

      if (!dataJudResult.finalizado) {
        result.finalizado = false
        break
      }

      if (dataJudResult.selecionados < dataJudBatchLimit) break
      if (batch === maxDataJudBatches - 1) result.finalizado = false
    }
  }

  if (provider === 'aasp' || provider === 'redundante') {
    if (!hasBudgetFor(startedAt, timeBudgetMs, AASP_START_RESERVE_MS)) {
      result.finalizado = false
      return result
    }

    const aaspResult = await syncGkitJurAaspBatch({
      data: options.aaspData,
      diferencial: options.aaspDiferencial ?? true,
      shouldContinue: () => hasBudgetFor(startedAt, timeBudgetMs, AASP_NEXT_PROCESS_RESERVE_MS),
    })
    result.erro += aaspResult.erro
    result.movimentosNovos += aaspResult.movimentosNovos
    result.movimentosRecebidos += aaspResult.movimentosRecebidos
    result.processos += aaspResult.processos
    result.semResultado += aaspResult.semResultado
    result.sucesso += aaspResult.sucesso
    result.tarefasGeradas += aaspResult.tarefasGeradas
    if (!aaspResult.finalizado) result.finalizado = false
  }

  return result
}
