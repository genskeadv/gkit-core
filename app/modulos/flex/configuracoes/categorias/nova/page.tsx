import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createFlexCategoriaAction } from '@/features/flex/actions'
import { FlexCategoriaForm, FlexShell } from '@/features/flex/components'
import { requireFlexContext } from '@/features/flex/queries'

export default async function NovaFlexCategoriaPage() {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.configuracoes.write')) redirect('/modulos/flex/configuracoes/categorias')

  return (
    <FlexShell active="categorias" title="Nova categoria" description="Cadastre uma categoria financeira do Flex." usuario={context.usuario}>
      <FlexCategoriaForm action={createFlexCategoriaAction} />
    </FlexShell>
  )
}
