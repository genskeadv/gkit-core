import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { buildDailySyncQueue, dailySyncCutoff, nextDailySyncAttempt, type DailySyncProcess, type DailySyncAttempt } from '../features/gkit-jur/daily-sync-queue'

const now = new Date('2026-10-17T15:00:00Z')
function processRow(id: string, patch: Partial<DailySyncProcess> = {}): DailySyncProcess {
  return { id, numero_cnj: '', numero_cnj_limpo: '10000000020268260100', tribunal_alias: 'api_publica_tjsp', carteira_id: null, responsavel_id: null,
    tipo_acompanhamento: 'atuacao_direta', acompanhamento_autorizado_em: null, ultima_sincronizacao_com_resultado_em: null, ...patch }
}
function attempt(processo_id: string, status: string, started_at = '2026-10-17T10:00:00Z'): DailySyncAttempt {
  return { processo_id, status, started_at, finished_at: started_at }
}

test('daily cutoff follows the Brazil date on both sides of midnight', () => {
  assert.equal(dailySyncCutoff(new Date('2026-10-17T02:59:59Z')), '2026-10-16T03:00:00.000Z')
  assert.equal(dailySyncCutoff(new Date('2026-10-17T03:00:00Z')), '2026-10-17T03:00:00.000Z')
})

test('persisted next attempt matches daily completion and hourly retries, including midnight', () => {
  assert.equal(nextDailySyncAttempt(now), '2026-10-18T03:00:00.000Z')
  assert.equal(nextDailySyncAttempt(now, true), '2026-10-17T16:00:00.000Z')
  assert.equal(nextDailySyncAttempt(new Date('2026-10-18T02:30:00Z'), true), '2026-10-18T03:00:00.000Z')
})

test('success and no-result leave the daily queue; a later failure does not undo completion', () => {
  const queue = buildDailySyncQueue(['a', 'b', 'c'].map((id) => processRow(id)), [attempt('a', 'sucesso'), attempt('b', 'sem_resultado'), attempt('a', 'timeout', '2026-10-17T14:00:00Z')], now)
  assert.deepEqual(queue.ready.map((p) => p.id), ['c'])
  assert.equal(queue.summary.concluidosHoje, 2)
})

test('recent AASP/shared timestamp does not exclude a process from DataJud coverage', () => {
  const queue = buildDailySyncQueue([processRow('a', { ultima_sincronizacao_com_resultado_em: now.toISOString() })], [], now)
  assert.equal(queue.summary.pendentesHoje, 1)
})

test('unattempted cases go before retries, and retries wait an hour', () => {
  const queue = buildDailySyncQueue(['a', 'b', 'c'].map((id) => processRow(id)), [attempt('a', 'timeout'), attempt('c', 'timeout', '2026-10-17T14:30:00Z')], now)
  assert.deepEqual(queue.ready.map((p) => p.id), ['b', 'a'])
  assert.equal(queue.summary.aguardandoNovaTentativa, 1)
  assert.equal(queue.summary.pendentesHoje, 3)
})

test('missing court and unauthorized external cases remain visible as blockers', () => {
  const queue = buildDailySyncQueue([processRow('a', { tribunal_alias: null }), processRow('b', { tipo_acompanhamento: 'cliente_mensal_outro_escritorio' }), processRow('c', { tipo_acompanhamento: 'cliente_mensal_outro_escritorio', acompanhamento_autorizado_em: now.toISOString() })], [], now)
  assert.deepEqual(queue.ready.map((p) => p.id), ['c'])
  assert.equal(queue.summary.semTribunalOuCnj, 1)
  assert.equal(queue.summary.semAutorizacao, 1)
})

test('daily workers have staggered daily slots throughout all 24 hours', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  const schedules = config.crons.filter((job: { path: string }) => job.path === '/api/gkit-jur/sincronizacao/catchup/cron')
    .map((job: { schedule: string }) => job.schedule)
  assert.equal(schedules.length, 72)
  assert.equal(new Set(schedules).size, 72)
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 20, 40]) assert.ok(schedules.includes(`${minute} ${hour} * * *`))
  }
  assert.equal(config.crons.filter((job: { path: string }) => job.path === '/api/gkit-jur/sincronizacao/cron').length, 1)
})
