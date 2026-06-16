import { createIntrColaboradorAction } from '@/features/fix/actions'
import { IntrColaboradorForm } from '@/features/fix/components'
import { getIntrFormData, requireIntrContext } from '@/features/fix/queries'

import { FixShell } from '@/features/fix/components'
export default async function NovoIntrColaboradorPage() {
  const context = await requireIntrContext()
  const formData = await getIntrFormData()

  return (
    <FixShell
      active="colaboradores"
      title="Novo colaborador"
      description="Cadastro de pessoa, time, gestor, vencimentos e beneficios."
      usuario={context.usuario}
    >
      <IntrColaboradorForm action={createIntrColaboradorAction} formData={formData} />
    </FixShell>
  )
}
