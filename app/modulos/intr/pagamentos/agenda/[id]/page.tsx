import { updateIntrPagamentoAgendaAction } from '@/features/intr/actions'
import { IntrPagamentoAgendaForm, IntrShell } from '@/features/intr/components'
import { getIntrFormData, getIntrPagamentoAgenda, requireIntrContext } from '@/features/intr/queries'

export default async function EditarIntrPagamentoAgendaPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireIntrContext()
  const { id } = await params
  const [agenda, formData] = await Promise.all([
    getIntrPagamentoAgenda(id),
    getIntrFormData(),
  ])

  return (
    <IntrShell
      active="pagamentos"
      title={agenda.tipo}
      description="Edite recorrencia, valor, dia previsto e vigencia da agenda."
      usuario={context.usuario}
    >
      <IntrPagamentoAgendaForm action={updateIntrPagamentoAgendaAction} agenda={agenda} formData={formData} />
    </IntrShell>
  )
}
