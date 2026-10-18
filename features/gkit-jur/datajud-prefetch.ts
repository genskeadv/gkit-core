export type DataJudSearchResult = {
  requestPayload: Record<string, any>
  response: Response
  responseBody: Record<string, any> | null
}

type Candidate = { id: string; numero_cnj_limpo: string; tribunal_alias: string }

export async function prefetchDailyDataJud(
  rows: Candidate[],
  search: (alias: string, numbers: string[]) => Promise<DataJudSearchResult>,
) {
  const groups = new Map<string, Candidate[]>()
  for (const row of rows) groups.set(row.tribunal_alias, [...(groups.get(row.tribunal_alias) ?? []), row])
  const cached = new Map<string, DataJudSearchResult>()
  // At most three simultaneous requests, including portfolios with many courts.
  const batches = [...groups.entries()].filter(([, items]) => items.length > 1)
    .sort((a, b) => b[1].length - a[1].length).slice(0, 3)
  await Promise.all(batches.map(async ([alias, items]) => {
    try {
      const result = await search(alias, [...new Set(items.map((item) => item.numero_cnj_limpo))])
      if (!result.response.ok) return
      const body = result.responseBody
      if (body?.timed_out || Number(body?._shards?.failed ?? 0) > 0) return
      const hits = body?.hits?.hits
      if (!Array.isArray(hits) || !hits.length) return
      const total = typeof body?.hits?.total === 'number' ? body.hits.total : body?.hits?.total?.value
      // A truncated result cannot prove that a missing CNJ has no records.
      if (typeof total !== 'number' || total > hits.length || body?.hits?.total?.relation === 'gte') return
      const exact = (hit: Record<string, any>) => String(hit?._source?.numeroProcesso ?? '').replace(/\D/g, '')
      if (!items.some((item) => hits.some((hit) => exact(hit) === item.numero_cnj_limpo))) return
      for (const item of items) {
        const matches = hits.filter((hit) => exact(hit) === item.numero_cnj_limpo)
          .sort((a, b) => Number(b?._source?.grau === 'G1') - Number(a?._source?.grau === 'G1'))
        cached.set(item.id, { ...result,
          // Per-case audit records must not expose other portfolios' CNJs.
          requestPayload: { size: result.requestPayload.size, consulta_em_lote: true,
            query: { terms: { numeroProcesso: [item.numero_cnj_limpo] } } },
          responseBody: { ...body,
          hits: { ...body?.hits, hits: matches, total: { value: matches.length, relation: 'eq' } },
        } })
      }
    } catch {
      // Individual requests remain the fallback for an unavailable bulk search.
    }
  }))
  return cached
}
