import { ColabActionCenter, ColabCommissions, ColabFinancialSummary, ColabIntegrationStatus, ColabModuleMap, ColabPayments, ColabProfile, ColabShell } from '@/features/colab/components'
import { getColabData, requireColabContext } from '@/features/colab/queries'

export default async function ColabPage() {
  const context = await requireColabContext()
  const data = await getColabData(context.usuario.email)

  return (
    <ColabShell
      active="dashboard"
      title="Portal do Colaborador"
      description="Experiencia individual, sem menu lateral, com pagamentos, comissoes e documentos derivados do Intr."
      usuario={context.usuario}
    >
      <ColabIntegrationStatus data={data} />
      <ColabProfile data={data} />
      <ColabFinancialSummary data={data} />
      <ColabActionCenter data={data} />
      <ColabModuleMap data={data} />
      <section className="suite-split-grid">
        <ColabPayments data={{ ...data, payments: data.payments.slice(0, 5) }} />
        <ColabCommissions data={{ ...data, commissions: data.commissions.slice(0, 5) }} />
      </section>
    </ColabShell>
  )
}
