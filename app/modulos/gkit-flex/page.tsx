import { requireModuleAccess } from '@/lib/auth/platform'
import { DashboardHome } from '@/features/gkit-flex/dashboard/DashboardHome'
import { AppFrame } from '@/features/gkit-flex/ui/AppFrame'

export default async function GkitFlexPage() {
  await requireModuleAccess('gkit-flex', '/modulos/gkit-flex')

  return (
    <AppFrame>
      <DashboardHome />
    </AppFrame>
  )
}
