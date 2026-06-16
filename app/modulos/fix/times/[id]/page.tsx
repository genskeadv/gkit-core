import { updateIntrTimeAction } from '@/features/fix/actions'
import { IntrTimeForm } from '@/features/fix/components'
import { getIntrTime, requireIntrContext } from '@/features/fix/queries'

import { FixShell } from '@/features/fix/components'
export default async function EditarIntrTimePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireIntrContext()
  const { id } = await params
  const time = await getIntrTime(id)

  return (
    <FixShell
      active="times"
      title={time.nome}
      description="Edite nome, descricao e status do time."
      usuario={context.usuario}
    >
      <IntrTimeForm action={updateIntrTimeAction} time={time} />
    </FixShell>
  )
}
