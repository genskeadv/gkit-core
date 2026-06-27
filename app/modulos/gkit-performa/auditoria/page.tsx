import { moduleTarget, type ModuleSearchParams } from '@/lib/auth/platform'
import { GkitPerformaShell } from '@/features/gkit-performa/components'
import { GkitPerformaAuditPage } from '@/features/gkit-performa/audit-page'
import { requireGkitPerformaContext } from '@/features/gkit-performa/queries'

export default async function GkitPerformaAuditoriaRoute({ searchParams }: { searchParams?: Promise<ModuleSearchParams> }) {
  const params = await searchParams
  const context = await requireGkitPerformaContext(moduleTarget('/modulos/gkit-performa/auditoria', params))

  return (
    <GkitPerformaShell active="auditoria" usuario={context.usuario}>
      <GkitPerformaAuditPage />
    </GkitPerformaShell>
  )
}
