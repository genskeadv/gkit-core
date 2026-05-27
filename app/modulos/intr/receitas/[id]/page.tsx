import { updateIntrReceitaAction } from '@/features/intr/actions'
import { IntrReceitaForm, IntrShell } from '@/features/intr/components'
import { getIntrFormData, getIntrReceita, requireIntrContext } from '@/features/intr/queries'

export default async function EditarIntrReceitaPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireIntrContext()
  const { id } = await params
  const [receita, formData] = await Promise.all([
    getIntrReceita(id),
    getIntrFormData(),
  ])

  return (
    <IntrShell
      active="receitas"
      title={receita.cliente}
      description="Edite valor, competencia, responsavel, status e dados de origem da receita."
      usuario={context.usuario}
    >
      <IntrReceitaForm action={updateIntrReceitaAction} receita={receita} formData={formData} />
    </IntrShell>
  )
}
