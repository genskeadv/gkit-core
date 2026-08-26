import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { buildCicloListFilters, CicloGenericList, CicloListKpis, CicloSection, CicloShell } from '@/features/ciclo/components'
import { listCicloContratoRows, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloContratosPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireCicloContext()
  const rows = await listCicloContratoRows(context)
  const canWrite = canAccess(context.permissions, 'ciclo.clientes.write')

  return (
    <CicloShell
      active="contratos"
      eyebrow="Documentos"
      title="Contratos"
      description="Contratos, vigências, valores e reajustes vinculados aos clientes."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/gkit-ciclo/contratos/novo">Novo contrato</Link> : null}
    >
      <CicloSection
        eyebrow="Resumo"
        title="Contratos da carteira"
        description="Volume e situação dos contratos vinculados aos clientes."
      >
        <CicloListKpis rows={rows} />
      </CicloSection>
      <CicloSection
        eyebrow="Documentos"
        hideHeader
        title="Lista de contratos"
        description="Contratos, vigências, valores e reajustes vinculados aos clientes."
      >
        <CicloGenericList
          title="Lista de contratos"
          description="Contratos cadastrados no schema Ciclo."
          detailHrefBase={canWrite ? '/modulos/gkit-ciclo/contratos' : undefined}
          emptyLabel="Nenhum contrato encontrado."
          filters={buildCicloListFilters(params)}
          groupByCliente
          rows={rows}
        />
      </CicloSection>
    </CicloShell>
  )
}
