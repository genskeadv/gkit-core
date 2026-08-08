import { GkitMoneyPage } from '@/features/gkit-money/GkitMoneyPage'
import { requireModuleAccess } from '@/lib/auth/platform'

export default async function GkitMoneyRoute() {
  await requireModuleAccess('gkit-flex', '/modulos/gkit-money')

  return <GkitMoneyPage />
}
