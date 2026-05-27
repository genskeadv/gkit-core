import { ColabCommissions, ColabFinancialSummary, ColabIntegrationStatus, ColabProfile, ColabShell } from '@/features/colab/components'
import { getColabData, requireColabContext } from '@/features/colab/queries'

export default async function ColabComissoesPage() {
  const context = await requireColabContext()
  const data = await getColabData(context.usuario.email)

  return (
    <ColabShell
      active="comissoes"
      title="Comissoes"
      description="Resumo de comissoes e valores variaveis vinculados ao Intr."
      usuario={context.usuario}
    >
      <ColabIntegrationStatus data={data} />
      <ColabProfile data={data} />
      <ColabFinancialSummary data={data} />
      <ColabCommissions data={data} />
    </ColabShell>
  )
}
