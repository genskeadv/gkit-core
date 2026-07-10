import { bulkUpdateGkitJurProcessoEtiquetasAction, updateGkitJurProcessoEtiquetaAction } from '@/features/gkit-jur/actions'
import { GkitJurProcessesPage, GkitJurShell } from '@/features/gkit-jur/components'
import { buildGkitJurProcessFilters, canWriteGkitJur, listGkitJurProcesses, requireGkitJurContext } from '@/features/gkit-jur/queries'
import { moduleTarget, type ModuleSearchParams } from '@/lib/auth/platform'

export default async function GkitJurProcessosListaRoute({
  searchParams,
}: {
  searchParams?: Promise<ModuleSearchParams>
}) {
  const params = await searchParams
  const filters = buildGkitJurProcessFilters(params)
  const [context, data] = await Promise.all([
    requireGkitJurContext(moduleTarget('/modulos/gkit-jur/processos/lista', params)),
    listGkitJurProcesses(filters),
  ])

  return (
    <GkitJurShell active="processos" description="Lista filtrável e manutenção operacional dos processos." title="Lista de Processos" usuario={context.usuario}>
      <GkitJurProcessesPage
        bulkEtiquetaAction={bulkUpdateGkitJurProcessoEtiquetasAction}
        canWrite={canWriteGkitJur(context.permissions)}
        data={data}
        updateEtiquetaAction={updateGkitJurProcessoEtiquetaAction}
      />
    </GkitJurShell>
  )
}
