import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateFlexTimeAction } from '@/features/flex/actions'
import { FlexShell, FlexTimeForm } from '@/features/flex/components'
import { getFlexTime, requireFlexContext } from '@/features/flex/queries'

export default async function EditarFlexTimePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.colaboradores.write')) redirect('/modulos/flex/times')
  const { id } = await params
  const time = await getFlexTime(id)

  return (
    <FlexShell active="times" title={time.nome} description="Edite nome, descricao e status do time." usuario={context.usuario}>
      <FlexTimeForm action={updateFlexTimeAction} time={time} />
    </FlexShell>
  )
}
