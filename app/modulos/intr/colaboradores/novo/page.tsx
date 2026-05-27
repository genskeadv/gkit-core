import { createIntrColaboradorAction } from '@/features/intr/actions'
import { IntrColaboradorForm, IntrShell } from '@/features/intr/components'
import { getIntrFormData, requireIntrContext } from '@/features/intr/queries'

export default async function NovoIntrColaboradorPage() {
  const context = await requireIntrContext()
  const formData = await getIntrFormData()

  return (
    <IntrShell
      active="colaboradores"
      title="Novo colaborador"
      description="Cadastro de pessoa, time, gestor, vencimentos e beneficios."
      usuario={context.usuario}
    >
      <IntrColaboradorForm action={createIntrColaboradorAction} formData={formData} />
    </IntrShell>
  )
}
