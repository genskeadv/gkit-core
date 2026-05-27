import { updateIntrTimeAction } from '@/features/intr/actions'
import { IntrShell, IntrTimeForm } from '@/features/intr/components'
import { getIntrTime, requireIntrContext } from '@/features/intr/queries'

export default async function EditarIntrTimePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireIntrContext()
  const { id } = await params
  const time = await getIntrTime(id)

  return (
    <IntrShell
      active="times"
      title={time.nome}
      description="Edite nome, descricao e status do time."
      usuario={context.usuario}
    >
      <IntrTimeForm action={updateIntrTimeAction} time={time} />
    </IntrShell>
  )
}
