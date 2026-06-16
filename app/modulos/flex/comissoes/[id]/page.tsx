import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateFlexComissaoAction } from '@/features/flex/actions'
import { FlexComissaoForm, FlexShell } from '@/features/flex/components'
import { getFlexComissao, getFlexFormData, requireFlexContext } from '@/features/flex/queries'

export default async function EditarFlexComissaoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.comissoes.write')) redirect('/modulos/flex/comissoes')
  const { id } = await params
  const [comissao, formData] = await Promise.all([getFlexComissao(id), getFlexFormData()])

  return (
    <FlexShell active="comissoes" title="Editar comissão" description="Atualize dados, status e observações da comissão." usuario={context.usuario}>
      <FlexComissaoForm action={updateFlexComissaoAction} comissao={comissao} formData={formData} />
    </FlexShell>
  )
}
