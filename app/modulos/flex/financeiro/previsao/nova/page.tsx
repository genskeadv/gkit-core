import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createFlexPrevisaoDespesaAction } from '@/features/flex/actions'
import { FlexPrevisaoDespesaForm, FlexShell } from '@/features/flex/components'
import { getFlexFormData, requireFlexContext } from '@/features/flex/queries'

export default async function NovaFlexPrevisaoPage() {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.financeiro.write')) redirect('/modulos/flex/financeiro/previsao')
  const formData = await getFlexFormData()

  return (
    <FlexShell
      active="previsao"
      title="Nova previsão"
      description="Inclua uma despesa planejada recorrente para validação dos extratos."
      usuario={context.usuario}
    >
      <FlexPrevisaoDespesaForm action={createFlexPrevisaoDespesaAction} formData={formData} />
    </FlexShell>
  )
}
