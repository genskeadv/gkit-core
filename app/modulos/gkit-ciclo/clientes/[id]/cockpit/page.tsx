import { CicloClienteIntegralCockpit, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloClienteIntegral, getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function CockpitClienteIntegralPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCicloContext()
  const { id } = await params
  const [detail, formData] = await Promise.all([
    getCicloClienteIntegral(id, context),
    getCicloDocumentoFormData(context),
  ])

  return (
    <CicloShell
      active="clientes"
      eyebrow="Cliente"
      title="Dashboard do cliente"
      description="Visão operacional por cliente, com alertas, semáforos e índices gráficos."
      usuario={context.usuario}
    >
      <CicloSection hideHeader title="Dashboard do cliente">
        <CicloClienteIntegralCockpit clientes={formData.clientes} detail={detail} />
      </CicloSection>
    </CicloShell>
  )
}
