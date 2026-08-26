import { buildCicloListFilters, CicloGenericList, CicloListKpis, CicloSection, CicloShell } from '@/features/ciclo/components'
import { listCicloTimelineRows, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloTimelinePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireCicloContext()
  const rows = await listCicloTimelineRows(context)

  return (
    <CicloShell
      active="timeline"
      eyebrow="Operação"
      title="Timeline"
      description="Memória operacional dos eventos e movimentações de clientes."
      usuario={context.usuario}
    >
      <CicloSection
        className="ciclo-clientes-summary"
        eyebrow="Resumo"
        title="Movimentações recentes"
        description="Volume e sinais da memória operacional registrada no Ciclo."
      >
        <CicloListKpis rows={rows} secondaryLabel="Eventos" />
        <CicloGenericList
          title="Eventos recentes"
          description="Timeline operacional registrada no Ciclo."
          emptyLabel="Nenhum evento encontrado."
          filters={buildCicloListFilters(params)}
          groupByCliente
          rows={rows}
          surface
        />
      </CicloSection>
    </CicloShell>
  )
}
