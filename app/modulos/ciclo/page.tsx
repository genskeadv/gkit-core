import {
  CicloAlertList,
  CicloDocumentSignal,
  CicloKpis,
  CicloPriorityList,
  CicloReadinessCard,
  CicloShell,
} from '@/features/ciclo/components'
import { getCicloData, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloPage() {
  const context = await requireCicloContext()
  const data = await getCicloData(context)

  return (
    <CicloShell
      active="cockpit"
      eyebrow="Cockpit Ciclo"
      title="Saúde Operacional"
      description="Acompanhe clientes, regularidade documental, risco e alertas do cadastro mestre."
      usuario={context.usuario}
    >
      <CicloReadinessCard data={data} />
      <CicloKpis data={data} />
      <CicloDocumentSignal documentos={data.documentos} />
      <section className="ciclo-split-grid">
        <CicloPriorityList clientes={data.clientes} />
        <CicloAlertList alertas={data.alertas} />
      </section>
    </CicloShell>
  )
}
