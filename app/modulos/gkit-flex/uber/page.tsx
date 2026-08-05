import { requireModuleAccess } from '@/lib/auth/platform'
import { AppFrame } from '@/features/gkit-flex/ui/AppFrame'
import { UberPage } from '@/features/gkit-flex/uber/UberPage'

export default async function GkitFlexUberPage() {
  const context = await requireModuleAccess('gkit-flex', '/modulos/gkit-flex/uber')

  return (
    <AppFrame usuario={context.usuario}>
      <UberPage />
    </AppFrame>
  )
}
