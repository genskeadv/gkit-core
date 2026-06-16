import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateFlexTipoComissaoAction } from '@/features/flex/actions'
import { FlexShell, FlexTipoComissaoForm } from '@/features/flex/components'
import { getFlexFormData, getFlexTipoComissao, requireFlexContext } from '@/features/flex/queries'

export default async function EditarFlexTipoComissaoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.comissoes.write')) redirect('/modulos/flex/tipos-comissao')
  const { id } = await params
  const [tipo, formData] = await Promise.all([getFlexTipoComissao(id), getFlexFormData()])

  return (
    <FlexShell active="tiposComissao" title={tipo.nome} description="Edite a regra percentual de comissão." usuario={context.usuario}>
      <FlexTipoComissaoForm action={updateFlexTipoComissaoAction} formData={formData} tipo={tipo} />
    </FlexShell>
  )
}
