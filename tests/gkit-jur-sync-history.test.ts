import assert from 'node:assert/strict'
import test from 'node:test'
import { generateTasksFromMovements } from '../features/gkit-jur/datajud-sync'

test('initial catch-up handles years of movements without oversized task and alert requests', async () => {
  const originalFetch = globalThis.fetch
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://sync-regression.invalid'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-key'
  const taskBatches: number[] = []
  let markedMovements = 0
  let taskLookups = 0
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    assert.equal(url.hostname, 'sync-regression.invalid')
    // Model the proxy limit that rejected the old unbounded IN filters.
    if (url.href.length > 8000) return Response.json({ message: 'Bad Request' }, { status: 400 })
    const table = url.pathname.split('/').at(-1)
    if (request.method === 'GET') {
      if (table === 'processos') return Response.json({ id: 'case', status: 'ativo', tipo_acompanhamento: 'atuacao_genske' })
      if (table === 'movimentacao_tarefa_regras') return Response.json([{ id: 'rule', nome: 'Revisar andamento', codigo_movimento: 7,
        termos: [], tipo_tarefa: 'providencia_interna', prioridade: 'media', titulo_template: 'Revisar {{movimentacao}}', prazo_dias: null }])
      if (table === 'tarefas' && url.searchParams.has('origem_hash')) taskLookups++
      return Response.json([])
    }
    if (table === 'tarefas' && request.method === 'POST') taskBatches.push((await request.json()).length)
    if (table === 'movimentacoes' && request.method === 'PATCH') {
      markedMovements += (url.searchParams.get('hash_movimento') ?? '').slice(3, -1).split(',').length
    }
    return new Response(null, { status: 204 })
  }
  try {
    const movements = Array.from({ length: 150 }, (_, i) => ({ codigo: 7, nome: 'Andamento para revisão',
      data_hora: new Date(Date.UTC(2020, 0, i + 1)).toISOString(), hash_movimento: String(i).padStart(64, '0') }))
    const created = await generateTasksFromMovements({ id: 'case', numero_cnj: '', numero_cnj_limpo: '10000000020268260100',
      tribunal_alias: 'api_publica_tjsp', tipo_acompanhamento: 'atuacao_genske', carteira_id: null, responsavel_id: null }, movements)
    assert.equal(created, 150)
    assert.equal(taskBatches.reduce((sum, count) => sum + count, 0), 150)
    assert.ok(taskBatches.every((count) => count <= 25))
    assert.ok(taskLookups > 1)
    assert.equal(markedMovements, 150)
  } finally {
    globalThis.fetch = originalFetch
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey
  }
})
