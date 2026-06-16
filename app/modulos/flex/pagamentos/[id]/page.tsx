import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { conciliarFlexPagamentoAction, marcarFlexPagamentoPagoAction, updateFlexPagamentoAction } from '@/features/flex/actions'
import { FlexPagamentoForm, FlexPagamentoQuickActions, FlexSection, FlexShell } from '@/features/flex/components'
import { getFlexFormData, getFlexPagamento, requireFlexContext } from '@/features/flex/queries'

export default async function EditarFlexPagamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.pagamentos.write')) redirect('/modulos/flex/pagamentos')
  const { id } = await params
  const [pagamento, formData] = await Promise.all([getFlexPagamento(id), getFlexFormData()])

  return (
    <FlexShell active="pagamentos" title="Editar pagamento" description="Atualize, marque como pago ou concilie com extrato." usuario={context.usuario}>
      <FlexSection eyebrow="Cadastro" title="Dados do pagamento" description="Edite valores, datas e status operacional.">
        <FlexPagamentoForm action={updateFlexPagamentoAction} formData={formData} pagamento={pagamento} />
      </FlexSection>
      <FlexSection eyebrow="Ações" title="Processamento e conciliação" description="Marque pagamento realizado ou vincule a um lançamento de extrato.">
        <FlexPagamentoQuickActions
          conciliarAction={conciliarFlexPagamentoAction}
          formData={formData}
          marcarPagoAction={marcarFlexPagamentoPagoAction}
          pagamento={pagamento}
        />
      </FlexSection>
    </FlexShell>
  )
}
