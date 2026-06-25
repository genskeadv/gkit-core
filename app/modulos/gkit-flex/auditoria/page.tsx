import { requireModuleAccess } from '@/lib/auth/platform'
import { AuditPage } from '@/features/gkit-flex/auditoria/AuditPage'
import { AppFrame } from '@/features/gkit-flex/ui/AppFrame'

export default async function GkitFlexAuditoriaPage() {
  await requireModuleAccess('gkit-flex', '/modulos/gkit-flex/auditoria')

  return (
    <AppFrame>
      <AuditPage />
    </AppFrame>
  )
}
