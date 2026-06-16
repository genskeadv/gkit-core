import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateFlexTipoPagamentoAction } from '@/features/flex/actions'
import { FlexShell, FlexTipoPagamentoForm } from '@/features/flex/components'
import { getFlexTipoPagamento, requireFlexContext } from '@/features/flex/queries'

export default async function EditarFlexTipoPagamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.configuracoes.write')) redirect('/modulos/flex/configuracoes/tipos-pagamento')
  const { id } = await params
  const tipo = await getFlexTipoPagamento(id)

  return (
    <FlexShell active="tiposPagamento" title={tipo.nome} description="Edite codigo, nome e status do tipo de pagamento." usuario={context.usuario}>
      <FlexTipoPagamentoForm action={updateFlexTipoPagamentoAction} tipo={tipo} />
    </FlexShell>
  )
}
