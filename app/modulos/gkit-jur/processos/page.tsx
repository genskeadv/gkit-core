import { GkitJurProcessesPage, GkitJurShell } from '@/features/gkit-jur/components'
import { buildGkitJurProcessFilters, listGkitJurProcesses, requireGkitJurContext } from '@/features/gkit-jur/queries'
import { moduleTarget, type ModuleSearchParams } from '@/lib/auth/platform'

export default async function GkitJurProcessosRoute({
  searchParams,
}: {
  searchParams?: Promise<ModuleSearchParams>
}) {
  const params = await searchParams
  const filters = buildGkitJurProcessFilters(params)
  const [context, data] = await Promise.all([
    requireGkitJurContext(moduleTarget('/modulos/gkit-jur/processos', params)),
    listGkitJurProcesses(filters),
  ])

  return (
    <GkitJurShell active="processos" description="Lista e acompanhamento dos processos juridicos." title="Processos" usuario={context.usuario}>
      <GkitJurProcessesPage data={data} />
    </GkitJurShell>
  )
}
