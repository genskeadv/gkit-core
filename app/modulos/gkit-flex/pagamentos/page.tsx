import { requireModuleAccess } from '@/lib/auth/platform'
import { AccountsPayablePage } from '@/features/gkit-flex/contas-pagar/AccountsPayablePage'
import { AppFrame } from '@/features/gkit-flex/ui/AppFrame'

export default async function GkitFlexPagamentosPage() {
  const context = await requireModuleAccess('gkit-flex', '/modulos/gkit-flex/pagamentos')

  return (
    <AppFrame permissions={context.permissions} usuario={context.usuario}>
      <AccountsPayablePage />
    </AppFrame>
  )
}
