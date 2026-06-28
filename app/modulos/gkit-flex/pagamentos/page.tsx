import { requireModuleAccess } from '@/lib/auth/platform'
import { AccountsPayablePage } from '@/features/gkit-flex/contas-pagar/AccountsPayablePage'
import { AppFrame } from '@/features/gkit-flex/ui/AppFrame'

export default async function GkitFlexPagamentosPage() {
  await requireModuleAccess('gkit-flex', '/modulos/gkit-flex/pagamentos')

  return (
    <AppFrame>
      <AccountsPayablePage />
    </AppFrame>
  )
}
