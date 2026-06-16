import { CicloGenericList, CicloListKpis, CicloSection, CicloShell } from '@/features/ciclo/components'
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
      <CicloSection
        eyebrow="Resumo"
        title="Conformidade operacional"
        description="Distribuicao da regularidade por cliente, risco e acompanhamento."
      >
        <CicloListKpis rows={rows} secondaryLabel="Saudaveis" />
      </CicloSection>
      <CicloSection
        eyebrow="Governanca"
        title="Regularidade por cliente"
        description="Percentual de regularidade e indicadores de risco."
      >
        <CicloGenericList
          title="Regularidade por cliente"
          description="Percentual de regularidade e indicadores de risco."
          detailHrefBase="/modulos/ciclo/clientes"
          emptyLabel="Nenhum cliente encontrado para regularidade."
          rows={rows}
        />
      </CicloSection>
    </CicloShell>
  )
}
