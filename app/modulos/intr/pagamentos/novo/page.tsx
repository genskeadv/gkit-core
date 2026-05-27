import { createIntrPagamentoAction } from '@/features/intr/actions'
import { IntrPagamentoForm, IntrShell } from '@/features/intr/components'
import { getIntrFormData, requireIntrContext } from '@/features/intr/queries'

export default async function NovoIntrPagamentoPage() {
  const context = await requireIntrContext()
  const formData = await getIntrFormData()

  return (
    <IntrShell
      active="pagamentos"
      title="Novo pagamento"
      description="Cadastre pagamento por colaborador, competencia, valores e status."
      usuario={context.usuario}
    >
      <IntrPagamentoForm action={createIntrPagamentoAction} formData={formData} />
    </IntrShell>
  )
}
