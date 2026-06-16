import { updateIntrPagamentoAgendaAction } from '@/features/fix/actions'
import { IntrPagamentoAgendaForm } from '@/features/fix/components'
import { getIntrFormData, getIntrPagamentoAgenda, requireIntrContext } from '@/features/fix/queries'

import { FixShell } from '@/features/fix/components'
export default async function EditarIntrPagamentoAgendaPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireIntrContext()
  const { id } = await params
  const [agenda, formData] = await Promise.all([
    getIntrPagamentoAgenda(id),
    getIntrFormData(),
  ])

  return (
    <FixShell
      active="pagamentos"
      title={agenda.tipo}
      description="Edite recorrencia, valor, dia previsto e vigencia da agenda."
      usuario={context.usuario}
    >
      <IntrPagamentoAgendaForm action={updateIntrPagamentoAgendaAction} agenda={agenda} formData={formData} />
    </FixShell>
  )
}
