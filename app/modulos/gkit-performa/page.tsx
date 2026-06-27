import { moduleTarget, type ModuleSearchParams } from '@/lib/auth/platform'
import { canAccess } from '@/lib/auth/permissions'
import { GkitPerformaPage, GkitPerformaShell } from '@/features/gkit-performa/components'
import { requireGkitPerformaContext } from '@/features/gkit-performa/queries'

export default async function GkitPerformaRoute({ searchParams }: { searchParams?: Promise<ModuleSearchParams> }) {
  const params = await searchParams
  const context = await requireGkitPerformaContext(moduleTarget('/modulos/gkit-performa', params))

  return (
    <GkitPerformaShell active="performance" usuario={context.usuario}>
      <GkitPerformaPage canSave={canAccess(context.permissions, 'gkit_performa.rankings.write')} />
    </GkitPerformaShell>
  )
}
