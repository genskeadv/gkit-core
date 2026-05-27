import { createIntrReceitaAction } from '@/features/intr/actions'
import { IntrReceitaForm, IntrShell } from '@/features/intr/components'
import { getIntrFormData, requireIntrContext } from '@/features/intr/queries'

export default async function NovaIntrReceitaPage() {
  const context = await requireIntrContext()
  const formData = await getIntrFormData()

  return (
    <IntrShell
      active="receitas"
      title="Nova receita"
      description="Cadastre receita por cliente, competencia, categoria e responsavel comercial."
      usuario={context.usuario}
    >
      <IntrReceitaForm action={createIntrReceitaAction} formData={formData} />
    </IntrShell>
  )
}
