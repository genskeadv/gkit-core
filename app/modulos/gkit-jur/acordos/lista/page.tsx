import {
  updateGkitJurAcordoLembreteEmailAction,
  updateGkitJurAcordoParcelaAction,
  updateGkitJurAcordoReguaEmailAction,
  updateGkitJurAcordoStatusAction,
} from '@/features/gkit-jur/actions'
import { GkitJurAcordosPage, GkitJurShell } from '@/features/gkit-jur/components'
import { buildGkitJurAcordosFilters, canWriteGkitJur, getGkitJurAcordosData, requireGkitJurContext } from '@/features/gkit-jur/queries'
import { moduleTarget, type ModuleSearchParams } from '@/lib/auth/platform'

export default async function GkitJurAcordosListaRoute({
  searchParams,
}: {
  searchParams?: Promise<ModuleSearchParams>
}) {
  const params = await searchParams
  const filters = buildGkitJurAcordosFilters(params)
  const [context, data] = await Promise.all([
    requireGkitJurContext(moduleTarget('/modulos/gkit-jur/acordos/lista', params)),
    getGkitJurAcordosData(filters),
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
