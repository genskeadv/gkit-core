import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createFlexTipoPagamentoAction } from '@/features/flex/actions'
import { FlexShell, FlexTipoPagamentoForm } from '@/features/flex/components'
import { requireFlexContext } from '@/features/flex/queries'

export default async function NovoFlexTipoPagamentoPage() {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.configuracoes.write')) redirect('/modulos/flex/configuracoes/tipos-pagamento')

  return (
    <FlexShell active="tiposPagamento" title="Novo tipo de pagamento" description="Cadastre um tipo para pagamentos e agendas." usuario={context.usuario}>
      <FlexTipoPagamentoForm action={createFlexTipoPagamentoAction} />
    </FlexShell>
  )
}
