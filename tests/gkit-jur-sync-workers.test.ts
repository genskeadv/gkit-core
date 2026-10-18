import assert from 'node:assert/strict'
import test from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { runBoundedSyncWorkers } from '../features/gkit-jur/sync-workers'

test('caps parallel requests at three and processes each item once', async () => {
  let active = 0
  let peak = 0
  const completed: number[] = []
  const result = await runBoundedSyncWorkers({ items: [1, 2, 3, 4, 5, 6, 7], concurrency: 99, shouldContinue: () => true,
    run: async (id) => { active++; peak = Math.max(peak, active); await setImmediate(); completed.push(id); active-- },
  })
  assert.equal(peak, 3)
  assert.deepEqual(completed.sort(), [1, 2, 3, 4, 5, 6, 7])
  assert.equal(result.finalizado, true)
})

test('budget exhaustion returns only attempted items so continuation does not skip cases', async () => {
  let budget = true
  const result = await runBoundedSyncWorkers({ items: [1, 2, 3, 4], concurrency: 2, shouldContinue: () => budget,
    run: async () => { await setImmediate(); budget = false },
  })
  assert.deepEqual(result.attempted, [1, 2])
  assert.equal(result.finalizado, false)
})

test('waits for other in-flight writes before propagating a failure', async () => {
  let writeFinished = false
  await assert.rejects(runBoundedSyncWorkers({ items: [1, 2], concurrency: 2, shouldContinue: () => true,
    run: async (id) => { if (id === 1) throw new Error('database failure'); await setImmediate(); writeFinished = true },
  }), /database failure/)
  assert.equal(writeFinished, true)
})
