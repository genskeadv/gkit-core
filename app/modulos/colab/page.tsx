import { ColabActionCenter, ColabCommissions, ColabFinancialSummary, ColabIntegrationStatus, ColabPayments, ColabProfile, ColabShell } from '@/features/colab/components'
import { getColabData, requireColabContext } from '@/features/colab/queries'

export default async function ColabPage() {
  const context = await requireColabContext()
  const data = await getColabData(context.usuario.email)

  return (
    <ColabShell
      active="dashboard"
      title="Portal do Colaborador"
      description="Experiência individual, sem menu lateral, com pagamentos, comissões, benefícios e reembolsos."
      usuario={context.usuario}
    >
      <ColabIntegrationStatus data={data} />
      <ColabProfile data={data} />
      <ColabFinancialSummary data={data} />
      <ColabActionCenter data={data} />
      <section className="suite-split-grid">
        <ColabPayments data={{ ...data, payments: data.payments.slice(0, 5) }} showFilters={false} />
        <ColabCommissions data={{ ...data, commissions: data.commissions.slice(0, 5) }} showFilters={false} />
      </section>
    </ColabShell>
  )
}
