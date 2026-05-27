import {
  CrmActions,
  CrmFunnel,
  CrmKpis,
  CrmRanking,
  CrmReadinessCard,
  CrmSemaforo,
  CrmShell,
} from '@/features/crm/components'
import { getCrmData, requireCrmContext } from '@/features/crm/queries'

export default async function CrmPage() {
  const context = await requireCrmContext()
  const data = await getCrmData(context)

  return (
    <CrmShell
      active="cockpit"
      eyebrow="Cockpit CRM"
      title="Cockpit Comercial"
      description="Priorize oportunidades por valor, probabilidade, tempo parado e próxima ação."
      usuario={context.usuario}
    >
      <CrmReadinessCard data={data} />
      <CrmKpis data={data} />
      <CrmSemaforo oportunidades={data.oportunidades} />

      <section className="crm-split-grid">
        <CrmFunnel oportunidades={data.oportunidades} />
        <CrmActions oportunidades={data.oportunidades} />
      </section>

      <CrmRanking oportunidades={data.oportunidades} />
    </CrmShell>
  )
}
