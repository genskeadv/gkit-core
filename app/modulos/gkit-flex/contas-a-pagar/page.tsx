import { requireModuleAccess } from '@/lib/auth/platform'
import { AccountsPayablePage } from '@/features/gkit-flex/contas-pagar/AccountsPayablePage'
import { AppFrame } from '@/features/gkit-flex/ui/AppFrame'

export default async function GkitFlexContasAPagarPage() {
  await requireModuleAccess('gkit-flex', '/modulos/gkit-flex/contas-a-pagar')

  return (
    <AppFrame>
      <AccountsPayablePage />
    </AppFrame>
  )
}
