import { updateIntrColaboradorAction } from '@/features/intr/actions'
import { IntrColaboradorForm, IntrShell } from '@/features/intr/components'
import { getIntrColaborador, getIntrFormData, requireIntrContext } from '@/features/intr/queries'

export default async function EditarIntrColaboradorPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireIntrContext()
  const { id } = await params
  const [colaborador, formData] = await Promise.all([
    getIntrColaborador(id),
    getIntrFormData(),
  ])

  return (
    <IntrShell
      active="colaboradores"
      title={colaborador.nome}
      description="Edite dados cadastrais, alocacao, gestor e custos mensais."
      usuario={context.usuario}
    >
      <IntrColaboradorForm action={updateIntrColaboradorAction} colaborador={colaborador} formData={formData} />
    </IntrShell>
  )
}
