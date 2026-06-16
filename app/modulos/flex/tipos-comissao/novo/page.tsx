import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createFlexTipoComissaoAction } from '@/features/flex/actions'
import { FlexShell, FlexTipoComissaoForm } from '@/features/flex/components'
import { getFlexFormData, requireFlexContext } from '@/features/flex/queries'

export default async function NovoFlexTipoComissaoPage() {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.comissoes.write')) redirect('/modulos/flex/tipos-comissao')
  const formData = await getFlexFormData()

  return (
    <FlexShell active="tiposComissao" title="Novo tipo de comissão" description="Configure percentual, escopo e categoria da comissão." usuario={context.usuario}>
      <FlexTipoComissaoForm action={createFlexTipoComissaoAction} formData={formData} />
    </FlexShell>
  )
}
