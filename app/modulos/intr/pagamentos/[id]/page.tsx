import { updateIntrPagamentoAction } from '@/features/intr/actions'
import { IntrPagamentoForm, IntrShell } from '@/features/intr/components'
import { getIntrFormData, getIntrPagamento, requireIntrContext } from '@/features/intr/queries'

export default async function EditarIntrPagamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireIntrContext()
  const { id } = await params
  const [pagamento, formData] = await Promise.all([
    getIntrPagamento(id),
    getIntrFormData(),
  ])

  return (
    <IntrShell
      active="pagamentos"
      title={pagamento.descricao ?? 'Pagamento'}
      description="Edite valores, competencia, datas, status e vinculo de comissao."
      usuario={context.usuario}
    >
      <IntrPagamentoForm action={updateIntrPagamentoAction} formData={formData} pagamento={pagamento} />
    </IntrShell>
  )
}
