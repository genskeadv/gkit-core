import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'
import { buildClienteListFilters, filterAndSortClientes } from '@/features/ciclo/clientes-list'
import { getCicloData } from '@/features/ciclo/queries'

export type GkitDirSearchParams = {
  carteira?: string
  dir?: string
  pagina?: string
  q?: string
  sort?: string
  status?: string
  tipo?: string
}

export type GkitDirStatusFilter = '' | 'ativo' | 'implantacao' | 'novo' | 'pausado' | 'encerrado'

function statusValue(value?: string | null): GkitDirStatusFilter {
  if (value === 'ativo' || value === 'implantacao' || value === 'novo' || value === 'pausado' || value === 'encerrado') return value
  return ''
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
  const status = statusValue(params?.status)
  const clientes = filterAndSortClientes(data.clientes, filters)
    .filter((cliente) => !status || cliente.status === status)
  const carteiraOptions = Array.from(new Set(data.clientes.map((cliente) => cliente.carteira).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const statusOptions = Array.from(new Set(data.clientes.map((cliente) => cliente.status).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))

  return {
    clientes,
    databaseReady: data.databaseReady,
    filters: { ...filters, status },
    options: {
      carteiras: carteiraOptions,
      status: statusOptions,
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
