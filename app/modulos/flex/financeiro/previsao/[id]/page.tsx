import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateFlexPrevisaoDespesaAction } from '@/features/flex/actions'
import { FlexPrevisaoDespesaForm, FlexShell } from '@/features/flex/components'
import { getFlexFormData, getFlexPrevisaoDespesa, requireFlexContext } from '@/features/flex/queries'

export default async function EditarFlexPrevisaoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.financeiro.write')) redirect('/modulos/flex/financeiro/previsao')
  const { id } = await params
  const [previsao, formData] = await Promise.all([getFlexPrevisaoDespesa(id), getFlexFormData()])

  return (
    <FlexShell
      active="previsao"
      title="Editar previsão"
      description="Atualize a despesa planejada usada na validação mensal dos extratos."
      usuario={context.usuario}
    >
      <FlexPrevisaoDespesaForm action={updateFlexPrevisaoDespesaAction} formData={formData} previsao={previsao} />
    </FlexShell>
  )
}
