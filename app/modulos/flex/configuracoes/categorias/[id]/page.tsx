import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateFlexCategoriaAction } from '@/features/flex/actions'
import { FlexCategoriaForm, FlexShell } from '@/features/flex/components'
import { getFlexCategoria, requireFlexContext } from '@/features/flex/queries'

export default async function EditarFlexCategoriaPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.configuracoes.write')) redirect('/modulos/flex/configuracoes/categorias')
  const { id } = await params
  const categoria = await getFlexCategoria(id)

  return (
    <FlexShell active="categorias" title={categoria.nome} description="Edite macrogrupo, tipo e status da categoria." usuario={context.usuario}>
      <FlexCategoriaForm action={updateFlexCategoriaAction} categoria={categoria} />
    </FlexShell>
  )
}
