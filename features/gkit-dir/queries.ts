import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'
import { buildClienteListFilters, filterAndSortClientes } from '@/features/ciclo/clientes-list'
import { getCicloData } from '@/features/ciclo/queries'

export type GkitDirSearchParams = {
  carteira?: string
  dir?: string
  q?: string
  sort?: string
  tipo?: string
}

export async function requireGkitDirContext(target = '/modulos/gkit-dir') {
  const context = await requireModuleAccess('gkit-dir', target)

  if (!canAccess(context.permissions, 'gkit_dir.clientes.read')) {
    redirect('/plataforma')
  }

  return context
}

export async function getGkitDirData(context: Awaited<ReturnType<typeof requireGkitDirContext>>, params?: GkitDirSearchParams) {
  const data = await getCicloData(context)
  const filters = buildClienteListFilters(params)
  const clientes = filterAndSortClientes(data.clientes, filters)
  const carteiraOptions = Array.from(new Set(data.clientes.map((cliente) => cliente.carteira).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))

  return {
    clientes,
    databaseReady: data.databaseReady,
    filters,
    options: {
      carteiras: carteiraOptions,
    },
    resumo: {
      total: data.clientes.length,
      filtrados: clientes.length,
      carteiras: carteiraOptions.length,
      ativos: data.clientes.filter((cliente) => cliente.status === 'ativo').length,
      implantacao: data.clientes.filter((cliente) => cliente.status === 'novo' || cliente.status === 'implantacao').length,
    },
  }
}
