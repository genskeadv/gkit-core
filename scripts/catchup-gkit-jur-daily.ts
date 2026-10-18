import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

async function main() {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match) process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '')
  }
  // Local invocation of the authenticated handler: reuse its distributed lock,
  // queue, budget, and persisted run result instead of bypassing production rules.
  process.env.CRON_SECRET = randomUUID()
  const { GET } = await import('../app/api/gkit-jur/sincronizacao/catchup/cron/route')
  const { NextRequest } = await import('next/server')
  const { dailySyncCutoff, loadDailySyncQueue } = await import('../features/gkit-jur/daily-sync-queue')
  const since = dailySyncCutoff()
  console.log(JSON.stringify({ event: 'before', since, ...(await loadDailySyncQueue(since)).summary }))
  if (process.argv.includes('--status')) return
  let stopping = false
  process.on('SIGINT', () => { stopping = true })
  process.on('SIGTERM', () => { stopping = true })
  for (let batch = 1; batch <= 100; batch++) {
    if (stopping) return
    const queue = await loadDailySyncQueue(dailySyncCutoff())
    if (!queue.ready.length) {
      console.log(JSON.stringify({ event: 'finished', ...queue.summary }))
      return
    }
    const response = await GET(new NextRequest('http://localhost/api/gkit-jur/sincronizacao/catchup/cron', {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    }))
    const body = await response.json()
    console.log(JSON.stringify({ event: 'batch', batch, status: response.status, ...body }))
    if (!response.ok) throw new Error(body.error ?? body.message ?? 'Falha na recuperação diária')
    if (!body.result.processos) throw new Error('Fila pendente sem progresso; verificar configuração e orçamento de execução.')
  }
  throw new Error('Limite de lotes atingido. Execute --status antes de continuar.')
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
