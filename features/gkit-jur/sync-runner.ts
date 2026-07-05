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

function positiveInt(value: unknown, fallback: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

function shouldContinue(startedAt: number, timeBudgetMs: number) {
  return Date.now() - startedAt < timeBudgetMs
}

export async function runGkitJurSync(options: GkitJurSyncRunOptions = {}): Promise<GkitJurSyncRunResult> {
  const provider = options.provider ?? 'redundante'
  const dataJudBatchLimit = positiveInt(options.dataJudBatchLimit, 25, 25)
  const maxDataJudBatches = positiveInt(options.maxDataJudBatches, 30, 100)
  const timeBudgetMs = positiveInt(options.timeBudgetMs, 270_000, 290_000)
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
      if (!shouldContinue(startedAt, timeBudgetMs)) {
        result.finalizado = false
        break
      }

      const dataJudResult = await syncGkitJurDataJudBatch({
        limit: dataJudBatchLimit,
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

      if (dataJudResult.processos < dataJudBatchLimit) break
      if (batch === maxDataJudBatches - 1) result.finalizado = false
    }
  }

  if ((provider === 'aasp' || provider === 'redundante') && shouldContinue(startedAt, timeBudgetMs)) {
    const aaspResult = await syncGkitJurAaspBatch({
      data: options.aaspData,
      diferencial: options.aaspDiferencial ?? true,
    })
    result.erro += aaspResult.erro
    result.movimentosNovos += aaspResult.movimentosNovos
    result.movimentosRecebidos += aaspResult.movimentosRecebidos
    result.processos += aaspResult.processos
    result.semResultado += aaspResult.semResultado
    result.sucesso += aaspResult.sucesso
    result.tarefasGeradas += aaspResult.tarefasGeradas
  }

  return result
}
