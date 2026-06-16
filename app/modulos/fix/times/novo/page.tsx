import { createIntrTimeAction } from '@/features/fix/actions'
import { IntrTimeForm } from '@/features/fix/components'
import { requireIntrContext } from '@/features/fix/queries'

import { FixShell } from '@/features/fix/components'
export default async function NovoIntrTimePage() {
  const context = await requireIntrContext()

  return (
    <FixShell
      active="times"
      title="Novo time"
      description="Cadastre uma equipe operacional para agrupar colaboradores."
      usuario={context.usuario}
    >
      <IntrTimeForm action={createIntrTimeAction} />
    </FixShell>
  )
}
