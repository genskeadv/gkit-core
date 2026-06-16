import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateFlexExtratoLancamentoAction } from '@/features/flex/actions'
import { FlexDespesaLancamentoForm, FlexShell } from '@/features/flex/components'
import { getFlexExtratoLancamento, getFlexFormData, requireFlexContext } from '@/features/flex/queries'

export default async function EditarFlexDespesaPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.financeiro.write')) redirect('/modulos/flex/financeiro/despesas')
  const { id } = await params
  const [lancamento, formData] = await Promise.all([getFlexExtratoLancamento(id), getFlexFormData()])

  return (
    <FlexShell
      active="despesas"
      title="Editar despesa"
      description="Classifique o lançamento, ajuste os dados e decida se ele entra na previsão mensal."
      usuario={context.usuario}
    >
      <FlexDespesaLancamentoForm action={updateFlexExtratoLancamentoAction} formData={formData} lancamento={lancamento} />
    </FlexShell>
  )
}
