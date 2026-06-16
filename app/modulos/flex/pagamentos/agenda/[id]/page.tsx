import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateFlexPagamentoAgendaAction } from '@/features/flex/actions'
import { FlexPagamentoAgendaForm, FlexShell } from '@/features/flex/components'
import { getFlexFormData, getFlexPagamentoAgenda, requireFlexContext } from '@/features/flex/queries'

export default async function EditarFlexPagamentoAgendaPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.pagamentos.write')) redirect('/modulos/flex/pagamentos/agenda')
  const { id } = await params
  const [agenda, formData] = await Promise.all([getFlexPagamentoAgenda(id), getFlexFormData()])

  return (
    <FlexShell active="pagamentoAgenda" title="Editar agenda" description="Atualize a regra recorrente de pagamento." usuario={context.usuario}>
      <FlexPagamentoAgendaForm action={updateFlexPagamentoAgendaAction} agenda={agenda} formData={formData} />
    </FlexShell>
  )
}
