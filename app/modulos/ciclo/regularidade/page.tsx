import { CicloGenericList, CicloListKpis, CicloShell } from '@/features/ciclo/components'
import { listCicloRegularidadeRows, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloRegularidadePage() {
  const context = await requireCicloContext()
  const rows = await listCicloRegularidadeRows(context)

  return (
    <CicloShell
      active="regularidade"
      eyebrow="Governanca"
      title="Regularidade"
      description="Conformidade operacional por cliente, carteira, administradora e risco."
      usuario={context.usuario}
    >
      <CicloListKpis rows={rows} secondaryLabel="Saudaveis" />
      <CicloGenericList
        title="Regularidade por cliente"
        description="Percentual de regularidade e indicadores de risco."
        detailHrefBase="/modulos/ciclo/clientes"
        emptyLabel="Nenhum cliente encontrado para regularidade."
        rows={rows}
      />
    </CicloShell>
  )
}
