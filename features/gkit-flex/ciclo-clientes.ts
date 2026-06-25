import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { ClientInputRow } from './comissoes/types'

function admin() {
  return createSupabaseAdminClient() as any
}

function text(value: unknown) {
  return String(value ?? '').trim()
}

export async function getCicloClientesForComissoes(): Promise<ClientInputRow[]> {
  const supabase = admin()
  const { data: clientes, error } = await supabase
    .schema('ciclo')
    .from('clientes')
    .select('id,carteira_id,nome,nome_fantasia,razao_social,documento,cnpj_normalizado,ativo')
    .eq('ativo', true)

  if (error) {
    throw new Error(`Erro ao carregar clientes do Ciclo: ${error.message}`)
  }

  const carteiraIds = [
    ...new Set((clientes ?? []).map((cliente: Record<string, unknown>) => text(cliente.carteira_id)).filter(Boolean)),
  ]

  const carteirasResult = carteiraIds.length
    ? await supabase.schema('core').from('carteiras').select('id,nome').in('id', carteiraIds)
    : { data: [], error: null }

  if (carteirasResult.error) {
    throw new Error(`Erro ao carregar carteiras do Core: ${carteirasResult.error.message}`)
  }

  const carteiraMap = new Map<string, string>(
    (carteirasResult.data ?? []).map((carteira: Record<string, unknown>) => [text(carteira.id), text(carteira.nome)]),
  )

  return (clientes ?? []).map((cliente: Record<string, unknown>) => {
    const nome =
      text(cliente.razao_social) ||
      text(cliente.nome_fantasia) ||
      text(cliente.nome) ||
      text(cliente.id)
    const documento = text(cliente.cnpj_normalizado) || text(cliente.documento)
    const carteira = carteiraMap.get(text(cliente.carteira_id)) || 'Sem carteira'

    return {
      'Razao Social / Nome Completo': nome,
      'CNPJ/CPF': documento,
      'Vendedor padrao': carteira,
    }
  })
}
