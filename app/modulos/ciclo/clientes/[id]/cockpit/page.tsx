import { CicloClienteIntegralCockpit, CicloShell } from '@/features/ciclo/components'
import { getCicloClienteIntegral, requireCicloContext } from '@/features/ciclo/queries'

export default async function CockpitClienteIntegralPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCicloContext()
  const { id } = await params
  const detail = await getCicloClienteIntegral(id, context)

  return (
    <CicloShell
      active="clientes"
      eyebrow="Cockpit Cliente Integral"
      title={detail.cliente.nome}
      description="Acompanhamento operacional completo do cliente."
      usuario={context.usuario}
    >
      <CicloClienteIntegralCockpit detail={detail} />
    </CicloShell>
  )
}
