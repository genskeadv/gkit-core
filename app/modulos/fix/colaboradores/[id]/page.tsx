import { updateIntrColaboradorAction } from '@/features/fix/actions'
import { IntrColaboradorForm } from '@/features/fix/components'
import { getIntrColaborador, getIntrFormData, requireIntrContext } from '@/features/fix/queries'

import { FixShell } from '@/features/fix/components'
export default async function EditarIntrColaboradorPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireIntrContext()
  const { id } = await params
  const [colaborador, formData] = await Promise.all([
    getIntrColaborador(id),
    getIntrFormData(),
  ])

  return (
    <FixShell
      active="colaboradores"
      title={colaborador.nome}
      description="Edite dados cadastrais, alocacao, gestor e custos mensais."
      usuario={context.usuario}
    >
      <IntrColaboradorForm action={updateIntrColaboradorAction} colaborador={colaborador} formData={formData} />
    </FixShell>
  )
}
