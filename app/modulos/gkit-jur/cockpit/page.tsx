import { moduleTarget, type ModuleSearchParams } from '@/lib/auth/platform'
import { GkitJurCockpit, GkitJurShell } from '@/features/gkit-jur/components'
import { getGkitJurDashboardMetrics, requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurCockpitRoute({ searchParams }: { searchParams?: Promise<ModuleSearchParams> }) {
  const params = await searchParams
  const [context, metrics] = await Promise.all([
    requireGkitJurContext(moduleTarget('/modulos/gkit-jur/cockpit', params)),
    getGkitJurDashboardMetrics(),
  ])

  return (
    <GkitJurShell
      active="cockpit"
      description="Execucao juridica integrada: processos, prazos, agenda e documentos no mesmo fluxo operacional."
      title="Cockpit juridico"
      usuario={context.usuario}
    >
      <GkitJurCockpit metrics={metrics} />
    </GkitJurShell>
  )
}
