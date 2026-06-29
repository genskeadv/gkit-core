import { requireModuleAccess } from '@/lib/auth/platform'
import { CommissionsPage } from '@/features/gkit-flex/comissoes/CommissionsPage'
import { AppFrame } from '@/features/gkit-flex/ui/AppFrame'

export default async function GkitFlexComissoesPage() {
  const context = await requireModuleAccess('gkit-flex', '/modulos/gkit-flex/comissoes')

  return (
    <AppFrame usuario={context.usuario}>
      <CommissionsPage />
    </AppFrame>
  )
}
