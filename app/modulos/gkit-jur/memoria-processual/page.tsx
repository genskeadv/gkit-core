import { bulkUpdateGkitJurProcessoEtiquetasAction, updateGkitJurProcessoEtiquetaAction } from '@/features/gkit-jur/actions'
import { GkitJurMemoriaProcessualPage, GkitJurShell } from '@/features/gkit-jur/components'
import { buildGkitJurMemoriaProcessualFilters, canWriteGkitJur, listGkitJurProcesses, requireGkitJurContext } from '@/features/gkit-jur/queries'
import { moduleTarget, type ModuleSearchParams } from '@/lib/auth/platform'

export default async function GkitJurMemoriaProcessualRoute({
  searchParams,
}: {
  searchParams?: Promise<ModuleSearchParams>
}) {
  const params = await searchParams
  const filters = buildGkitJurMemoriaProcessualFilters(params)
  const [context, data] = await Promise.all([
    requireGkitJurContext(moduleTarget('/modulos/gkit-jur/memoria-processual', params)),
    listGkitJurProcesses(filters),
  ])

  return (
    <GkitJurShell
      active="memoria_processual"
      description="Processos de clientes mensais acompanhados para ciência, risco e relatório."
      title="Memória processual"
      usuario={context.usuario}
    >
      <GkitJurMemoriaProcessualPage
        bulkEtiquetaAction={bulkUpdateGkitJurProcessoEtiquetasAction}
        canWrite={canWriteGkitJur(context.permissions)}
        data={data}
        updateEtiquetaAction={updateGkitJurProcessoEtiquetaAction}
      />
    </GkitJurShell>
  )
}
