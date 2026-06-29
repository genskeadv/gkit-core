import { GkitJurPlaceholder, GkitJurShell } from '@/features/gkit-jur/components'
import { requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurAgendaRoute() {
  const context = await requireGkitJurContext('/modulos/gkit-jur/agenda')

  return (
    <GkitJurShell active="agenda" description="Agenda juridica para audiencias, reunioes e rotinas do dia." title="Agenda" usuario={context.usuario}>
      <GkitJurPlaceholder title="Agenda" description="Area reservada para agenda juridica, compromissos e proximas acoes." />
    </GkitJurShell>
  )
}
