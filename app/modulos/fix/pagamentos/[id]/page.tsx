import { updateIntrPagamentoAction } from '@/features/fix/actions'
import { IntrPagamentoForm } from '@/features/fix/components'
import { getIntrFormData, getIntrPagamento, requireIntrContext } from '@/features/fix/queries'

import { FixShell } from '@/features/fix/components'
export default async function EditarIntrPagamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireIntrContext()
  const { id } = await params
  const [pagamento, formData] = await Promise.all([
    getIntrPagamento(id),
    getIntrFormData(),
  ])

  return (
    <FixShell
      active="pagamentos"
      title={pagamento.descricao ?? 'Pagamento'}
      description="Edite valores, competencia, datas, status e vinculo de comissao."
      usuario={context.usuario}
    >
      <IntrPagamentoForm action={updateIntrPagamentoAction} formData={formData} pagamento={pagamento} />
    </FixShell>
  )
}
