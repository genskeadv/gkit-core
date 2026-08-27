import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { buildCicloListFilters, CicloGenericList, CicloListKpis, CicloSection, CicloShell } from '@/features/ciclo/components'
import { listCicloRegularidadeRows, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloRegularidadePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireCicloContext()
  const rows = await listCicloRegularidadeRows(context)
  const canImportReceita = canAccess(context.permissions, 'gkit_flex.comissoes.write')

  return (
    <CicloShell
      active="regularidade"
      eyebrow="Governanca"
      title="Regularidade"
      description="Conformidade operacional por cliente, carteira, administradora e risco."
      actions={canImportReceita ? <Link className="button" href="/modulos/gkit-flex">Importar receita</Link> : null}
      usuario={context.usuario}
    >
      <CicloSection
        className="ciclo-clientes-summary"
        eyebrow="Resumo"
        title="Conformidade operacional"
        description="Distribuição da regularidade por cliente, risco e acompanhamento."
      >
        <CicloListKpis rows={rows} secondaryLabel="Saudaveis" />
        <CicloGenericList
          title="Regularidade por cliente"
          categoryLabel="Carteira"
          description="Percentual de regularidade e indicadores de risco."
          detailHrefBase="/modulos/gkit-ciclo/regularidade/clientes"
          emptyLabel="Nenhum cliente encontrado para regularidade."
          filters={buildCicloListFilters(params)}
          groupBy="carteira"
          groupItemLabel="cliente(s)"
          rows={rows}
          surface
        />
      </CicloSection>
    </CicloShell>
  )
}
