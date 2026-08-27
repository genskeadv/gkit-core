import { CicloClienteDashboardEmpty, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloClienteDashboardPage() {
  const context = await requireCicloContext()
  const formData = await getCicloDocumentoFormData(context)

  return (
    <CicloShell
      active="clientes"
      eyebrow="Cliente"
      title="Dashboard do cliente"
      description="Selecione um cliente para acompanhar indicadores, alertas e histórico operacional."
      usuario={context.usuario}
    >
      <CicloSection hideHeader title="Dashboard do cliente">
        <CicloClienteDashboardEmpty clientes={formData.clientes} />
      </CicloSection>
    </CicloShell>
  )
}
