import type { SupabaseClient } from '@supabase/supabase-js'

type CommissionPayable = {
  id: string
  competencia: string
  pago: boolean
  origem_execucao_id: string | null
  origem_resumo_id: string | null
}

type CommissionSummary = {
  id: string
  categoria: string
  carteira: string
}

type CommissionLaunch = {
  execucao_id: string
  cliente: string
  documento: string | null
  categoria: string
  carteira: string
  valor_recebido: number | null
}

type CicloCliente = {
  id: string
  carteira_id: string | null
  nome: string
  nome_fantasia: string | null
  razao_social: string | null
  documento: string | null
  cnpj_normalizado: string | null
  ativo: boolean
}

function text(value: unknown) {
  return String(value ?? '').trim()
}

function onlyDigits(value: unknown) {
  return text(value).replace(/\D/g, '')
}

function normalizeName(value: unknown) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function statusFromPercent(percentual: number) {
  return percentual >= 75 ? 'saudavel' : percentual >= 50 ? 'atencao' : 'critico'
}

function clienteNames(cliente: CicloCliente) {
  return [cliente.razao_social, cliente.nome_fantasia, cliente.nome].map(normalizeName).filter(Boolean)
}

function buildClienteMaps(clientes: CicloCliente[]) {
  const byDocument = new Map<string, CicloCliente>()
  const byName = new Map<string, CicloCliente>()

  for (const cliente of clientes) {
    const documento = onlyDigits(cliente.cnpj_normalizado || cliente.documento)
    if (documento && !byDocument.has(documento)) byDocument.set(documento, cliente)

    for (const name of clienteNames(cliente)) {
      if (name && !byName.has(name)) byName.set(name, cliente)
    }
  }

  return { byDocument, byName }
}

function matchCliente(row: CommissionLaunch, maps: ReturnType<typeof buildClienteMaps>) {
  const documento = onlyDigits(row.documento)
  if (documento && maps.byDocument.has(documento)) return maps.byDocument.get(documento)

  const name = normalizeName(row.cliente)
  return name ? maps.byName.get(name) : undefined
}

export async function syncCicloRegularidadePagamentos(supabase: SupabaseClient, competencia: string) {
  const { data: payables, error: payablesError } = await supabase
    .from('contas_pagar_itens')
    .select('id,competencia,pago,origem_execucao_id,origem_resumo_id')
    .eq('competencia', competencia)
    .eq('origem_tipo', 'comissao')

  if (payablesError) throw new Error(`Regularidade financeira: ${payablesError.message}`)

  const commissionPayables = ((payables ?? []) as CommissionPayable[]).filter((item) => (
    item.origem_execucao_id && item.origem_resumo_id
  ))

  if (!commissionPayables.length) return { synced: 0, matched: 0, unmatched: 0 }

  const summaryIds = [...new Set(commissionPayables.map((item) => text(item.origem_resumo_id)).filter(Boolean))]
  const executionIds = [...new Set(commissionPayables.map((item) => text(item.origem_execucao_id)).filter(Boolean))]

  const [summariesResult, launchesResult, clientesResult] = await Promise.all([
    supabase
      .from('comissao_resumos')
      .select('id,categoria,carteira')
      .in('id', summaryIds),
    supabase
      .from('comissao_lancamentos')
      .select('execucao_id,cliente,documento,categoria,carteira,valor_recebido')
      .in('execucao_id', executionIds),
    supabase
      .schema('ciclo')
      .from('clientes')
      .select('id,carteira_id,nome,nome_fantasia,razao_social,documento,cnpj_normalizado,ativo')
      .eq('ativo', true),
  ])

  if (summariesResult.error) throw new Error(`Regularidade financeira: ${summariesResult.error.message}`)
  if (launchesResult.error) throw new Error(`Regularidade financeira: ${launchesResult.error.message}`)
  if (clientesResult.error) throw new Error(`Regularidade financeira: ${clientesResult.error.message}`)

  const summaryById = new Map<string, CommissionSummary>(
    ((summariesResult.data ?? []) as CommissionSummary[]).map((summary) => [summary.id, summary]),
  )
  const launches = (launchesResult.data ?? []) as CommissionLaunch[]
  const clienteMaps = buildClienteMaps((clientesResult.data ?? []) as CicloCliente[])
  const stats = new Map<string, { cliente: CicloCliente; total: number; pagos: number; abertos: string[] }>()
  let unmatched = 0

  for (const payable of commissionPayables) {
    const summary = summaryById.get(text(payable.origem_resumo_id))
    if (!summary) continue

    const relatedLaunches = launches.filter((launch) => (
      text(launch.execucao_id) === text(payable.origem_execucao_id) &&
      text(launch.categoria) === text(summary.categoria) &&
      text(launch.carteira) === text(summary.carteira) &&
      Number(launch.valor_recebido || 0) > 0
    ))

    for (const launch of relatedLaunches) {
      const cliente = matchCliente(launch, clienteMaps)
      if (!cliente) {
        unmatched += 1
        continue
      }

      const current = stats.get(cliente.id) ?? { cliente, total: 0, pagos: 0, abertos: [] }
      current.total += 1
      if (payable.pago) {
        current.pagos += 1
      } else {
        current.abertos.push(`${summary.categoria} - ${competencia.slice(0, 7)}`)
      }
      stats.set(cliente.id, current)
    }
  }

  const rows = [...stats.values()].map(({ cliente, total, pagos, abertos }) => {
    const percentual = total ? Math.round((pagos / total) * 100) : 0
    return {
      cliente_id: cliente.id,
      carteira_id: cliente.carteira_id,
      percentual_pagamentos: percentual,
      status_pagamentos: statusFromPercent(percentual),
      pendencias_pagamentos: [...new Set(abertos)],
      origem_pagamentos: 'gkit_flex.contas_pagar',
      atualizado_pagamentos_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  })

  if (!rows.length) return { synced: 0, matched: 0, unmatched }

  const { data: existingRows, error: existingError } = await supabase
    .schema('ciclo')
    .from('regularidade_cliente')
    .select('cliente_id')
    .in('cliente_id', rows.map((row) => row.cliente_id))

  if (existingError) throw new Error(`Regularidade financeira: ${existingError.message}`)

  const existingIds = new Set((existingRows ?? []).map((row: { cliente_id: string }) => row.cliente_id))
  const updates = rows.filter((row) => existingIds.has(row.cliente_id))
  const inserts = rows.filter((row) => !existingIds.has(row.cliente_id))

  for (const row of updates) {
    const { error } = await supabase
      .schema('ciclo')
      .from('regularidade_cliente')
      .update({
        carteira_id: row.carteira_id,
        percentual_pagamentos: row.percentual_pagamentos,
        status_pagamentos: row.status_pagamentos,
        pendencias_pagamentos: row.pendencias_pagamentos,
        origem_pagamentos: row.origem_pagamentos,
        atualizado_pagamentos_em: row.atualizado_pagamentos_em,
        updated_at: row.updated_at,
      })
      .eq('cliente_id', row.cliente_id)

    if (error) throw new Error(`Regularidade financeira: ${error.message}`)
  }

  if (inserts.length) {
    const { error } = await supabase
      .schema('ciclo')
      .from('regularidade_cliente')
      .insert(inserts.map((row) => ({
        ...row,
        percentual_regularidade: 0,
        status: 'critico',
        pendencias: [],
      })))

    if (error) throw new Error(`Regularidade financeira: ${error.message}`)
  }

  return {
    synced: rows.length,
    matched: [...stats.values()].reduce((sum, item) => sum + item.total, 0),
    unmatched,
  }
}
