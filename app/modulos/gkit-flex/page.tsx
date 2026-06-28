import { requireModuleAccess } from '@/lib/auth/platform'
import { DashboardHome } from '@/features/gkit-flex/dashboard/DashboardHome'
import { AppFrame } from '@/features/gkit-flex/ui/AppFrame'

export default async function GkitFlexPage() {
  const context = await requireModuleAccess('gkit-flex', '/modulos/gkit-flex')

  return (
    <AppFrame usuario={context.usuario}>
      <DashboardHome />
    </AppFrame>
  )
}
