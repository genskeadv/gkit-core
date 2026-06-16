import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createFlexTimeAction } from '@/features/flex/actions'
import { FlexShell, FlexTimeForm } from '@/features/flex/components'
import { requireFlexContext } from '@/features/flex/queries'

export default async function NovoFlexTimePage() {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.colaboradores.write')) redirect('/modulos/flex/times')

  return (
    <FlexShell active="times" title="Novo time" description="Cadastre uma equipe operacional do Flex." usuario={context.usuario}>
      <FlexTimeForm action={createFlexTimeAction} />
    </FlexShell>
  )
}
