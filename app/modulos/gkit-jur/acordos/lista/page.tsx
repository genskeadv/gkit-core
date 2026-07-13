import {
  updateGkitJurAcordoLembreteEmailAction,
  updateGkitJurAcordoParcelaAction,
  updateGkitJurAcordoReguaEmailAction,
  updateGkitJurAcordoStatusAction,
} from '@/features/gkit-jur/actions'
import { GkitJurAcordosPage, GkitJurShell } from '@/features/gkit-jur/components'
import { canWriteGkitJur, getGkitJurAcordosData, requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurAcordosListaRoute() {
  const [context, data] = await Promise.all([
    requireGkitJurContext('/modulos/gkit-jur/acordos/lista'),
    getGkitJurAcordosData(),
  ])

  return (
    <GkitJurShell
      active="acordos"
      description="Detalhamento operacional dos acordos cadastrados nos processos."
      title="Lista de Acordos"
      usuario={context.usuario}
    >
      <GkitJurAcordosPage
        canWrite={canWriteGkitJur(context.permissions)}
        data={data}
        updateLembreteEmailAction={updateGkitJurAcordoLembreteEmailAction}
        updateParcelaAction={updateGkitJurAcordoParcelaAction}
        updateReguaEmailAction={updateGkitJurAcordoReguaEmailAction}
        updateStatusAction={updateGkitJurAcordoStatusAction}
      />
    </GkitJurShell>
  )
}
