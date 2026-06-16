import type { CicloCliente, CicloRisco, CicloTipoCliente } from '@/features/ciclo/types'

export type ClienteSortKey = 'cliente' | 'tipo' | 'carteira' | 'regularidade' | 'risco'
export type SortDirection = 'asc' | 'desc'

export type CicloClienteListFilters = {
  carteira: string
  dir: SortDirection
  q: string
  sort: ClienteSortKey
  tipo: CicloTipoCliente | ''
}

export function tipoFilterValue(value?: string): CicloTipoCliente | '' {
  if (value === 'mensal' || value === 'pontual' || value === 'cobranca') return value
  return ''
}

export function sortValue(value?: string): ClienteSortKey {
  if (value === 'tipo' || value === 'carteira' || value === 'regularidade' || value === 'risco') return value
  return 'cliente'
}

export function sortDirection(value?: string): SortDirection {
  return value === 'desc' ? 'desc' : 'asc'
}

export function normalizeClienteSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const tipoOrder: Record<CicloTipoCliente, number> = { mensal: 1, pontual: 2, cobranca: 3 }
const riscoOrder: Record<CicloRisco, number> = { baixo: 1, medio: 2, alto: 3, critico: 4 }

function clienteSortValue(cliente: CicloCliente, sort: ClienteSortKey) {
  if (sort === 'tipo') return tipoOrder[cliente.tipoCliente]
  if (sort === 'carteira') return cliente.carteira
  if (sort === 'regularidade') return cliente.regularidade
  if (sort === 'risco') return riscoOrder[cliente.risco]
  return cliente.nome
}

export function buildClienteListFilters(params?: {
  carteira?: string | null
  dir?: string | null
  q?: string | null
  sort?: string | null
  tipo?: string | null
}): CicloClienteListFilters {
  return {
    carteira: params?.carteira ?? '',
    dir: sortDirection(params?.dir ?? undefined),
    q: params?.q?.trim() ?? '',
    sort: sortValue(params?.sort ?? undefined),
    tipo: tipoFilterValue(params?.tipo ?? undefined),
  }
}

export function filterAndSortClientes(clientes: CicloCliente[], filters: CicloClienteListFilters) {
  const searchKey = normalizeClienteSearch(filters.q)

  return clientes.filter((cliente) => {
    const matchesTipo = !filters.tipo || cliente.tipoCliente === filters.tipo
    const matchesCarteira = !filters.carteira || cliente.carteira === filters.carteira
    const matchesSearch = !searchKey || [
      cliente.nome,
      cliente.razaoSocial,
      cliente.documento,
      cliente.carteira,
      cliente.administradora,
      cliente.tipoCliente,
      cliente.risco,
    ].some((value) => normalizeClienteSearch(String(value ?? '')).includes(searchKey))

    return matchesTipo && matchesCarteira && matchesSearch
  }).sort((a, b) => {
    const left = clienteSortValue(a, filters.sort)
    const right = clienteSortValue(b, filters.sort)
    const result = typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right), 'pt-BR', { sensitivity: 'base' })

    return filters.dir === 'desc' ? -result : result
  })
}
