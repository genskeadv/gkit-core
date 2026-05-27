import { CicloGenericList, CicloListKpis, CicloShell } from '@/features/ciclo/components'
import { listCicloTimelineRows, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloTimelinePage() {
  const context = await requireCicloContext()
  const rows = await listCicloTimelineRows(context)

  return (
    <CicloShell
      active="timeline"
      eyebrow="Operacao"
      title="Timeline"
      description="Memoria operacional dos eventos e movimentacoes de clientes."
      usuario={context.usuario}
    >
      <CicloListKpis rows={rows} secondaryLabel="Eventos" />
      <CicloGenericList
        title="Eventos recentes"
        description="Timeline operacional registrada no Ciclo."
        emptyLabel="Nenhum evento encontrado."
        rows={rows}
      />
    </CicloShell>
  )
}
