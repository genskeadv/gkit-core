import { createIntrPagamentoAgendaAction } from '@/features/intr/actions'
import { IntrPagamentoAgendaForm, IntrShell } from '@/features/intr/components'
import { getIntrFormData, requireIntrContext } from '@/features/intr/queries'

export default async function NovaIntrPagamentoAgendaPage() {
  const context = await requireIntrContext()
  const formData = await getIntrFormData()

  return (
    <IntrShell
      active="pagamentos"
      title="Nova agenda"
      description="Cadastre uma regra recorrente para gerar pagamentos previstos."
      usuario={context.usuario}
    >
      <IntrPagamentoAgendaForm action={createIntrPagamentoAgendaAction} formData={formData} />
    </IntrShell>
  )
}
