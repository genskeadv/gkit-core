import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'
import { AppFrame } from '@/features/gkit-flex/ui/AppFrame'
import { UberPage } from '@/features/gkit-flex/uber/UberPage'
import { getUberDashboard } from '@/features/gkit-flex/uber/uberPersistence'

export default async function GkitFlexUberPage() {
  const context = await requireModuleAccess('gkit-flex', '/modulos/gkit-flex/uber')
  if (!canAccess(context.permissions, 'gkit_flex.uber.read')) redirect('/modulos/gkit-flex')
  const data = await getUberDashboard()

  return (
    <AppFrame permissions={context.permissions} usuario={context.usuario}>
      <UberPage initialData={data} />
    </AppFrame>
  )
}
