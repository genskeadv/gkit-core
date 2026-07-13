import {
  CicloAlertList,
  CicloDocumentSignal,
  CicloKpis,
  CicloPriorityList,
  CicloSection,
  CicloShell,
} from '@/features/ciclo/components'
import { getCicloData, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloDashboardPage() {
  const context = await requireCicloContext()
  const data = await getCicloData(context)

  return (
    <CicloShell
      active="dashboard"
      eyebrow="Gestão Ciclo"
      title="Dashboard operacional"
      description="Visão executiva de clientes, risco, regularidade documental e alertas."
      usuario={context.usuario}
    >
      <CicloSection
        eyebrow="Indicadores"
        title="Visão executiva"
        description="Clientes, implantações, risco, alertas, score e regularidade documental."
      >
        <CicloKpis data={data} />
      </CicloSection>
      <CicloSection
        eyebrow="Regularidade"
        title="Sinal documental"
        description="Documentos pendentes, obrigatórios e validados na carteira."
      >
        <CicloDocumentSignal documentos={data.documentos} />
      </CicloSection>
      <section className="ciclo-split-grid">
        <CicloSection title="Clientes prioritarios" description="Ranking operacional para acompanhamento executivo.">
          <CicloPriorityList clientes={data.clientes} />
        </CicloSection>
        <CicloSection title="Alertas recentes" description="Fila aberta por risco, documentação e acompanhamento.">
          <CicloAlertList alertas={data.alertas} />
        </CicloSection>
      </section>
    </CicloShell>
  )
}
