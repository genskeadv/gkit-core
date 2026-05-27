import {
  CicloAlertList,
  CicloDocumentSignal,
  CicloKpis,
  CicloPriorityList,
  CicloShell,
} from '@/features/ciclo/components'
import { getCicloData, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloDashboardPage() {
  const context = await requireCicloContext()
  const data = await getCicloData(context)

  return (
    <CicloShell
      active="dashboard"
      eyebrow="Gestao Ciclo"
      title="Dashboard operacional"
      description="Visao executiva de clientes, risco, regularidade documental e alertas."
      usuario={context.usuario}
    >
      <CicloKpis data={data} />
      <CicloDocumentSignal documentos={data.documentos} />
      <section className="ciclo-split-grid">
        <CicloPriorityList clientes={data.clientes} />
        <CicloAlertList alertas={data.alertas} />
      </section>
    </CicloShell>
  )
}
