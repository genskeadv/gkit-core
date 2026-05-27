import { ColabBenefits, ColabIntegrationStatus, ColabProfile, ColabShell } from '@/features/colab/components'
import { getColabData, requireColabContext } from '@/features/colab/queries'

export default async function ColabBeneficiosPage() {
  const context = await requireColabContext()
  const data = await getColabData(context.usuario.email)

  return (
    <ColabShell
      active="beneficios"
      title="Beneficios"
      description="Beneficios vinculados ao colaborador logado, com status, provedor e valor de referencia."
      usuario={context.usuario}
    >
      <ColabIntegrationStatus data={data} />
      <ColabProfile data={data} />
      <ColabBenefits data={data} />
    </ColabShell>
  )
}
