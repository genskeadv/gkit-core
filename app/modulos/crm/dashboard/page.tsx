import { CrmActions, CrmFunnel, CrmKpis, CrmRanking, CrmSection, CrmShell } from '@/features/crm/components'
import { getCrmData, requireCrmContext } from '@/features/crm/queries'

export default async function CrmDashboardPage() {
  const context = await requireCrmContext()
  const data = await getCrmData(context)

  return (
    <CrmShell
      active="dashboard"
      eyebrow="Gestão CRM"
      title="Dashboard comercial"
      description="Visão executiva do pipeline, conversão, propostas e próximas ações comerciais."
      usuario={context.usuario}
    >
      <CrmSection
        eyebrow="Indicadores"
        title="Visão executiva"
        description="Pipeline, receita provável, conversão, follow-ups e propostas em aberto."
      >
        <CrmKpis data={data} />
      </CrmSection>
      <section className="crm-split-grid">
        <CrmSection title="Funil comercial" description="Volume e valor por etapa do processo comercial.">
          <CrmFunnel oportunidades={data.oportunidades} />
        </CrmSection>
        <CrmSection title="Acoes recomendadas" description="Follow-ups e movimentos que merecem prioridade.">
          <CrmActions oportunidades={data.oportunidades} />
        </CrmSection>
      </section>
      <CrmSection title="Ranking de oportunidades" description="Priorizacao por score comercial e valor previsto.">
        <CrmRanking oportunidades={data.oportunidades} />
      </CrmSection>
    </CrmShell>
  )
}
