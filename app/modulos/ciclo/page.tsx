import {
  CicloAlertList,
  CicloDocumentSignal,
  CicloKpis,
  CicloPriorityList,
  CicloQuickLinks,
  CicloSection,
  CicloShell,
} from '@/features/ciclo/components'
import { getCicloData, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloPage() {
  const context = await requireCicloContext()
  const data = await getCicloData(context)
  const quickLinks = [
    {
      href: '/modulos/ciclo/clientes',
      label: 'Base',
      title: 'Revisar clientes',
      description: 'Acompanhe carteira, administradora, risco e regularidade da base operacional.',
      meta: 'Cadastro mestre',
    },
    {
      href: '/modulos/ciclo/documentos',
      label: 'Documentos',
      title: 'Checar regularidade',
      description: 'Veja pendências, documentos obrigatórios, validações e vencimentos.',
      meta: 'Checklist documental',
    },
    {
      href: '/modulos/ciclo/alertas',
      label: 'Fila',
      title: 'Tratar alertas',
      description: 'Resolva riscos operacionais, prazos e ocorrências abertas por cliente.',
      meta: 'Prioridade diária',
    },
    {
      href: '/modulos/ciclo/onboarding',
      label: 'Implantação',
      title: 'Acompanhar onboarding',
      description: 'Controle progresso de novos clientes e checklist de entrada.',
      meta: 'Clientes novos',
    },
  ]

  return (
    <CicloShell
      active="cockpit"
      eyebrow="GKIT Ciclo"
      title="Cockpit"
      description="Acompanhamento diário de clientes, regularidade documental, risco e alertas."
      usuario={context.usuario}
    >
      <CicloSection
        className="ciclo-command-panel"
        title="Cockpit operacional"
        description="Indicadores e atalhos principais."
      >
        <div className="ciclo-command-grid">
          <CicloKpis data={data} />
          <CicloQuickLinks items={quickLinks} />
        </div>
      </CicloSection>

      <CicloSection
        className="ciclo-compact-panel"
        title="Sinal documental"
        description="Pendências, obrigatórios e validados."
      >
        <CicloDocumentSignal documentos={data.documentos} />
      </CicloSection>

      <section className="ciclo-cockpit-columns">
        <CicloSection className="ciclo-compact-panel" title="Clientes prioritários" description="Maior atenção no dia.">
          <CicloPriorityList clientes={data.clientes} />
        </CicloSection>
        <CicloSection className="ciclo-compact-panel" title="Alertas recentes" description="Prazo e severidade em aberto.">
          <CicloAlertList alertas={data.alertas} />
        </CicloSection>
      </section>
    </CicloShell>
  )
}
