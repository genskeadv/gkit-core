import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createFlexPagamentoAgendaAction } from '@/features/flex/actions'
import { FlexPagamentoAgendaForm, FlexShell } from '@/features/flex/components'
import { getFlexFormData, requireFlexContext } from '@/features/flex/queries'

export default async function NovaFlexPagamentoAgendaPage() {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.pagamentos.write')) redirect('/modulos/flex/pagamentos/agenda')
  const formData = await getFlexFormData()

  return (
    <FlexShell active="pagamentoAgenda" title="Nova agenda" description="Cadastre uma regra recorrente de pagamento." usuario={context.usuario}>
      <FlexPagamentoAgendaForm action={createFlexPagamentoAgendaAction} formData={formData} />
    </FlexShell>
  )
}
