import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { moduleTarget } from '@/lib/auth/platform'
import { buildClienteListFilters, filterAndSortClientes } from '@/features/ciclo/clientes-list'
import { CicloClienteList, CicloKpis, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloData, requireCicloContext } from '@/features/ciclo/queries'

type CicloClientesPageProps = {
  searchParams?: Promise<{ carteira?: string; dir?: string; q?: string; sort?: string; tipo?: string }>
}

export default async function CicloClientesPage({ searchParams }: CicloClientesPageProps) {
  const params = await searchParams
  const context = await requireCicloContext(moduleTarget('/modulos/gkit-ciclo/clientes', params))
  const data = await getCicloData(context)
  const canWrite = canAccess(context.permissions, 'ciclo.clientes.write')
  const filters = buildClienteListFilters(params)
  const carteiraOptions = Array.from(new Set(data.clientes.map((cliente) => cliente.carteira).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  const clientesFiltrados = filterAndSortClientes(data.clientes, filters)
  const exportParams = new URLSearchParams()
  if (filters.q) exportParams.set('q', filters.q)
  if (filters.tipo) exportParams.set('tipo', filters.tipo)
  if (filters.carteira) exportParams.set('carteira', filters.carteira)
  exportParams.set('sort', filters.sort)
  exportParams.set('dir', filters.dir)
  const exportHref = `/modulos/gkit-ciclo/clientes/exportar?${exportParams.toString()}`

  return (
    <CicloShell
      active="clientes"
      eyebrow="Cadastro mestre"
      title="Clientes"
      description="Base única de clientes do Ciclo, com carteira, administradora, risco e regularidade."
      usuario={context.usuario}
      actions={
        <>
          <Link className="button secondary" href={exportHref}>Exportar XLSX</Link>
          {canWrite ? <Link className="button" href="/modulos/gkit-ciclo/clientes/novo">Novo cliente</Link> : null}
        </>
      }
    >
      <CicloSection
        className="ciclo-clientes-summary"
        eyebrow="Resumo"
        title="Saúde da base"
        description="Clientes ativos, implantações, risco, alertas, score e regularidade média."
      >
        <CicloKpis data={data} />
      </CicloSection>
      <CicloSection
        eyebrow="Cadastro"
        title="Lista de clientes"
        description="Cadastro mestre com carteira, administradora, risco e regularidade."
      >
        <CicloClienteList
          canWrite={canWrite}
          carteiraOptions={carteiraOptions}
          clientes={clientesFiltrados}
          filters={filters}
          totalClientes={data.clientes.length}
        />
      </CicloSection>
    </CicloShell>
  )
}
