import {
  CrmActions,
  CrmFunnel,
  CrmKpis,
  CrmQuickLinks,
  CrmRanking,
  CrmReadinessCard,
  CrmSection,
  CrmSemaforo,
  CrmShell,
} from '@/features/crm/components'
import { getCrmData, requireCrmContext } from '@/features/crm/queries'

export default async function CrmPage() {
  const context = await requireCrmContext()
  const data = await getCrmData(context)
  const quickLinks = [
    {
      href: '/modulos/crm/oportunidades',
      label: 'Pipeline',
      title: 'Conduzir oportunidades',
      description: 'Revise etapas, risco, valor e próxima ação de cada oportunidade aberta.',
      meta: 'funil comercial',
    },
    {
      href: '/modulos/crm/oportunidades/nova',
      label: 'Entrada',
      title: 'Nova oportunidade',
      description: 'Crie uma oportunidade ligada a cliente, contato, carteira e probabilidade.',
      meta: 'cadastro rapido',
    },
    {
      href: '/modulos/crm/atividades',
      label: 'Rotina',
      title: 'Organizar follow-ups',
      description: 'Acompanhe tarefas comerciais por prazo, conclusão e relacionamento.',
      meta: 'agenda comercial',
    },
    {
      href: '/modulos/crm/propostas',
      label: 'Propostas',
      title: 'Acompanhar propostas',
      description: 'Monitore propostas enviadas, aprovadas, recusadas ou em rascunho.',
      meta: 'status e valor',
    },
  ]

  return (
    <CrmShell
      active="cockpit"
      eyebrow="Cockpit CRM"
      title="Cockpit Comercial"
      description="Priorize oportunidades por valor, probabilidade, tempo parado e próxima ação."
      usuario={context.usuario}
    >
      <CrmReadinessCard data={data} />
      <div className="crm-cockpit-fit">
      <CrmSection
        eyebrow="Visão diária"
        title="Atalhos comerciais"
        description="Caminhos diretos para alimentar, priorizar e fechar o pipeline."
      >
        <CrmQuickLinks items={quickLinks} />
      </CrmSection>
      <CrmSection
        eyebrow="Indicadores"
        title="Saúde do pipeline"
        description="Métricas principais para entender volume, previsão, conversão e pendências."
      >
        <CrmKpis data={data} />
      </CrmSection>
      <CrmSection
        eyebrow="Priorizacao"
        title="Semaforo comercial"
        description="Leitura rápida das oportunidades quentes, em atenção e em risco."
      >
        <CrmSemaforo oportunidades={data.oportunidades} />
      </CrmSection>

      <section className="crm-split-grid">
        <CrmSection title="Funil por etapa" description="Distribuicao das oportunidades abertas por valor e fase.">
          <CrmFunnel oportunidades={data.oportunidades} />
        </CrmSection>
        <CrmSection title="Próximas ações" description="Movimentos recomendados para destravar negociações.">
          <CrmActions oportunidades={data.oportunidades} />
        </CrmSection>
      </section>

      <CrmSection title="Ranking de oportunidades" description="Lista priorizada por valor, probabilidade, etapa e tempo parado.">
        <CrmRanking oportunidades={data.oportunidades} />
      </CrmSection>
      </div>
    </CrmShell>
  )
}
