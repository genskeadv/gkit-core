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
        className="ciclo-clientes-summary"
        eyebrow="Resumo"
        title="Gestão operacional"
      >
        <CicloKpis data={data} />
        <CicloDocumentSignal documentos={data.documentos} />
        <section className="ciclo-split-grid">
          <CicloPriorityList clientes={data.clientes} />
          <CicloAlertList alertas={data.alertas} />
        </section>
      </CicloSection>
    </CicloShell>
  )
}
