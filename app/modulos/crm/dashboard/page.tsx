import { CrmActions, CrmFunnel, CrmKpis, CrmRanking, CrmShell } from '@/features/crm/components'
import { getCrmData, requireCrmContext } from '@/features/crm/queries'

export default async function CrmDashboardPage() {
  const context = await requireCrmContext()
  const data = await getCrmData(context)

  return (
    <CrmShell
      active="dashboard"
      eyebrow="Gestao CRM"
      title="Dashboard comercial"
      description="Visao executiva do pipeline, conversao, propostas e proximas acoes comerciais."
      usuario={context.usuario}
    >
      <CrmKpis data={data} />
      <section className="crm-split-grid">
        <CrmFunnel oportunidades={data.oportunidades} />
        <CrmActions oportunidades={data.oportunidades} />
      </section>
      <CrmRanking oportunidades={data.oportunidades} />
    </CrmShell>
  )
}
