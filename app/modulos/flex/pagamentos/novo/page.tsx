import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createFlexPagamentoAction } from '@/features/flex/actions'
import { FlexPagamentoForm, FlexShell } from '@/features/flex/components'
import { getFlexFormData, requireFlexContext } from '@/features/flex/queries'

export default async function NovoFlexPagamentoPage() {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.pagamentos.write')) redirect('/modulos/flex/pagamentos')
  const formData = await getFlexFormData()

  return (
    <FlexShell active="pagamentos" title="Novo pagamento" description="Registre um pagamento manual ou ajuste operacional." usuario={context.usuario}>
      <FlexPagamentoForm action={createFlexPagamentoAction} formData={formData} />
    </FlexShell>
  )
}
