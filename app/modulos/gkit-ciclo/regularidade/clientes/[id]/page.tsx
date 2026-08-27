import Link from 'next/link'
import { CicloClienteIntegralCockpit, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloClienteIntegral, getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloRegularidadeClientePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCicloContext()
  const { id } = await params
  const [detail, formData] = await Promise.all([
    getCicloClienteIntegral(id, context),
    getCicloDocumentoFormData(context),
  ])

  return (
    <CicloShell
      active="regularidade"
      eyebrow="Regularidade"
      title="Dashboard do cliente"
      description="Pontualidade, pagamentos, conformidade e alertas operacionais."
      actions={<Link className="button secondary" href="/modulos/gkit-ciclo/regularidade">Voltar</Link>}
      usuario={context.usuario}
    >
      <CicloSection hideHeader title="Dashboard do cliente">
        <CicloClienteIntegralCockpit clientes={formData.clientes} detail={detail} />
      </CicloSection>
    </CicloShell>
  )
}
