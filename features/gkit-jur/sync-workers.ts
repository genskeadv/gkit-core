export async function runBoundedSyncWorkers<T>(options: {
  items: T[]
  concurrency?: number
  shouldContinue: () => boolean
  run: (item: T) => Promise<void>
}) {
  let cursor = 0
  const attempted: T[] = []
  const worker = async () => {
    while (cursor < options.items.length && options.shouldContinue()) {
      const item = options.items[cursor++]
      attempted.push(item)
      await options.run(item)
    }
  }
  const concurrency = Number.isFinite(options.concurrency)
    ? Math.max(1, Math.min(Math.floor(options.concurrency!), 3)) : 1
  // A rejected worker must not release the cron lock while others still write.
  const workers = await Promise.allSettled(Array.from({ length: concurrency }, worker))
  const failure = workers.find((worker) => worker.status === 'rejected')
  if (failure?.status === 'rejected') throw failure.reason
  return { attempted, finalizado: cursor === options.items.length }
}
