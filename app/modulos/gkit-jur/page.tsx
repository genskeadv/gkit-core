import { moduleTarget, type ModuleSearchParams } from '@/lib/auth/platform'
import { GkitJurCockpit, GkitJurShell } from '@/features/gkit-jur/components'
import { requireGkitJurContext } from '@/features/gkit-jur/queries'

export default async function GkitJurRoute({ searchParams }: { searchParams?: Promise<ModuleSearchParams> }) {
  const params = await searchParams
  const context = await requireGkitJurContext(moduleTarget('/modulos/gkit-jur', params))

  return (
    <GkitJurShell
      active="cockpit"
      description="Execucao juridica integrada: processos, prazos, agenda e documentos no mesmo fluxo operacional."
      title="Cockpit juridico"
      usuario={context.usuario}
    >
      <GkitJurCockpit />
    </GkitJurShell>
  )
}
