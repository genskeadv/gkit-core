import { GkitJurProcessesCockpitPage, GkitJurShell } from '@/features/gkit-jur/components'
import { getGkitJurProcessCockpitData, requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurProcessosRoute() {
  const [context, data] = await Promise.all([
    requireGkitJurContext('/modulos/gkit-jur/processos'),
    getGkitJurProcessCockpitData(),
  ])

  return (
    <GkitJurShell
      active="processos"
      description="Cockpit de acompanhamento e saneamento dos processos juridicos."
      title="Processos"
      usuario={context.usuario}
    >
      <GkitJurProcessesCockpitPage data={data} />
    </GkitJurShell>
  )
}
