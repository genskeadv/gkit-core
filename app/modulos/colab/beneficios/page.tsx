import { ColabBenefits, ColabShell } from '@/features/colab/components'
import { getColabData, requireColabContext } from '@/features/colab/queries'

export default async function ColabBeneficiosPage() {
  const context = await requireColabContext()
  const data = await getColabData(context.usuario.email)

  return (
    <ColabShell
      active="beneficios"
      title="Benefícios"
      description="Benefícios vinculados ao colaborador logado, com status, provedor e valor de referência."
      usuario={context.usuario}
    >
      <ColabBenefits data={data} />
    </ColabShell>
  )
}
