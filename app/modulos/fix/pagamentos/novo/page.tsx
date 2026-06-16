import { createIntrPagamentoAction } from '@/features/fix/actions'
import { IntrPagamentoForm } from '@/features/fix/components'
import { getIntrFormData, requireIntrContext } from '@/features/fix/queries'

import { FixShell } from '@/features/fix/components'
export default async function NovoIntrPagamentoPage() {
  const context = await requireIntrContext()
  const formData = await getIntrFormData()

  return (
    <FixShell
      active="pagamentos"
      title="Novo pagamento"
      description="Cadastre pagamento por colaborador, competencia, valores e status."
      usuario={context.usuario}
    >
      <IntrPagamentoForm action={createIntrPagamentoAction} formData={formData} />
    </FixShell>
  )
}
