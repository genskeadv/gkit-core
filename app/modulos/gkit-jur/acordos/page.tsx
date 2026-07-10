import { GkitJurAcordosCockpitPage, GkitJurShell } from '@/features/gkit-jur/components'
import { getGkitJurAcordosData, requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurAcordosRoute() {
  const [context, data] = await Promise.all([
    requireGkitJurContext('/modulos/gkit-jur/acordos'),
    getGkitJurAcordosData(),
  ])

  return (
    <GkitJurShell
      active="acordos"
      description="Controle parcelas, vencimentos e quebras de acordos cadastrados nos processos."
      title="Acordos Judiciais"
      usuario={context.usuario}
    >
      <GkitJurAcordosCockpitPage data={data} />
    </GkitJurShell>
  )
}
