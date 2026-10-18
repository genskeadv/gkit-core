import assert from 'node:assert/strict'
import test from 'node:test'
import { prefetchDailyDataJud, type DataJudSearchResult } from '../features/gkit-jur/datajud-prefetch'

const rows = [{ id: 'a', numero_cnj_limpo: '111', tribunal_alias: 'court' }, { id: 'b', numero_cnj_limpo: '222', tribunal_alias: 'court' }]
const hit = (number: string, grau = 'G1') => ({ _source: { numeroProcesso: number, grau } })
function result(hits: any[], total = hits.length): DataJudSearchResult {
  return { requestPayload: {}, response: new Response(null, { status: 200 }), responseBody: { hits: { hits, total: { value: total, relation: 'eq' } } } }
}

test('one court request serves multiple cases and never assigns another CNJ to a case', async () => {
  let requests = 0
  const cached = await prefetchDailyDataJud(rows, async (alias, numbers) => {
    requests++; assert.equal(alias, 'court'); assert.deepEqual(numbers, ['111', '222'])
    return result([hit('222'), hit('111', 'G2'), hit('111'), hit('999')])
  })
  assert.equal(requests, 1)
  assert.deepEqual(cached.get('a')?.responseBody?.hits.hits.map((h: any) => h._source.numeroProcesso), ['111', '111'])
  assert.equal(cached.get('a')?.responseBody?.hits.hits[0]._source.grau, 'G1')
  assert.equal(cached.get('b')?.responseBody?.hits.total.value, 1)
  assert.deepEqual(cached.get('a')?.requestPayload.query.terms.numeroProcesso, ['111'])
})

test('complete exact response can report a missing case without another request', async () => {
  const cached = await prefetchDailyDataJud(rows, async () => result([hit('111')]))
  assert.equal(cached.get('b')?.responseBody?.hits.total.value, 0)
})

test('truncated, empty, malformed, or failed searches fall back to individual queries', async () => {
  for (const response of [result([hit('111')], 1000), result([]), result([hit('999')])]) {
    assert.equal((await prefetchDailyDataJud(rows, async () => response)).size, 0)
  }
  assert.equal((await prefetchDailyDataJud(rows, async () => { throw new Error('timeout') })).size, 0)
  const partial = result([hit('111')])
  partial.responseBody!.timed_out = true
  assert.equal((await prefetchDailyDataJud(rows, async () => partial)).size, 0)
})

test('limits bulk network concurrency to three courts', async () => {
  let requests = 0
  const many = Array.from({ length: 10 }, (_, i) => rows.map((r) => ({ ...r, id: `${i}-${r.id}`, tribunal_alias: `${i}` }))).flat()
  await prefetchDailyDataJud(many, async () => { requests++; return result([]) })
  assert.equal(requests, 3)
})
