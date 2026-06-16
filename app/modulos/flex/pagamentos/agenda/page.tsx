import Link from 'next/link'
import { FlexList, FlexSection, FlexShell } from '@/features/flex/components'
import { listFlexPagamentoAgendas, requireFlexContext } from '@/features/flex/queries'

export default async function FlexPagamentoAgendaPage() {
  const context = await requireFlexContext()
  const rows = await listFlexPagamentoAgendas()

  return (
    <FlexShell
      active="pagamentoAgenda"
      title="Agenda de pagamentos"
      description="Regras recorrentes para geracao mensal de pagamentos."
      usuario={context.usuario}
      actions={<Link className="button" href="/modulos/flex/pagamentos/agenda/nova">Nova agenda</Link>}
    >
      <FlexSection eyebrow="Recorrência" title="Agendas cadastradas" description="Regras que geram pagamentos previstos todos os meses.">
        <FlexList rows={rows} empty="Nenhuma agenda registrada." />
      </FlexSection>
    </FlexShell>
  )
}
