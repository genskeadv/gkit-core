import { updateGkitJurAcordoParcelaAction, updateGkitJurAcordoStatusAction } from '@/features/gkit-jur/actions'
import { GkitJurAcordosPage, GkitJurShell } from '@/features/gkit-jur/components'
import { canWriteGkitJur, getGkitJurAcordosData, requireGkitJurContext } from '@/features/gkit-jur/queries'

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
      <GkitJurAcordosPage
        canWrite={canWriteGkitJur(context.permissions)}
        data={data}
        updateParcelaAction={updateGkitJurAcordoParcelaAction}
        updateStatusAction={updateGkitJurAcordoStatusAction}
      />
    </GkitJurShell>
  )
}
