import { createIntrTimeAction } from '@/features/intr/actions'
import { IntrShell, IntrTimeForm } from '@/features/intr/components'
import { requireIntrContext } from '@/features/intr/queries'

export default async function NovoIntrTimePage() {
  const context = await requireIntrContext()

  return (
    <IntrShell
      active="times"
      title="Novo time"
      description="Cadastre uma equipe operacional para agrupar colaboradores."
      usuario={context.usuario}
    >
      <IntrTimeForm action={createIntrTimeAction} />
    </IntrShell>
  )
}
