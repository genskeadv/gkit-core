import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createFlexComissaoAction } from '@/features/flex/actions'
import { FlexComissaoForm, FlexShell } from '@/features/flex/components'
import { getFlexFormData, requireFlexContext } from '@/features/flex/queries'

export default async function NovaFlexComissaoPage() {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.comissoes.write')) redirect('/modulos/flex/comissoes')
  const formData = await getFlexFormData()

  return (
    <FlexShell active="comissoes" title="Nova comissão" description="Registre uma comissão manual ou ajuste aprovado." usuario={context.usuario}>
      <FlexComissaoForm action={createFlexComissaoAction} formData={formData} />
    </FlexShell>
  )
}
