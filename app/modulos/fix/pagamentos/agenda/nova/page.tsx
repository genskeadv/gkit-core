import { createIntrPagamentoAgendaAction } from '@/features/fix/actions'
import { IntrPagamentoAgendaForm } from '@/features/fix/components'
import { getIntrFormData, requireIntrContext } from '@/features/fix/queries'

import { FixShell } from '@/features/fix/components'
export default async function NovaIntrPagamentoAgendaPage() {
  const context = await requireIntrContext()
  const formData = await getIntrFormData()

  return (
    <FixShell
      active="pagamentos"
      title="Nova agenda"
      description="Cadastre uma regra recorrente para gerar pagamentos previstos."
      usuario={context.usuario}
    >
      <IntrPagamentoAgendaForm action={createIntrPagamentoAgendaAction} formData={formData} />
    </FixShell>
  )
}
