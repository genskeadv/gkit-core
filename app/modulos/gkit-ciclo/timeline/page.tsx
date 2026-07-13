import { CicloGenericList, CicloListKpis, CicloSection, CicloShell } from '@/features/ciclo/components'
import { listCicloTimelineRows, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloTimelinePage() {
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
        eyebrow="Resumo"
        title="Movimentações recentes"
        description="Volume e sinais da memória operacional registrada no Ciclo."
      >
        <CicloListKpis rows={rows} secondaryLabel="Eventos" />
      </CicloSection>
      <CicloSection
        eyebrow="Histórico"
        title="Eventos recentes"
        description="Timeline operacional registrada por cliente e rotina."
      >
        <CicloGenericList
          title="Eventos recentes"
          description="Timeline operacional registrada no Ciclo."
          emptyLabel="Nenhum evento encontrado."
          rows={rows}
        />
      </CicloSection>
    </CicloShell>
  )
}
