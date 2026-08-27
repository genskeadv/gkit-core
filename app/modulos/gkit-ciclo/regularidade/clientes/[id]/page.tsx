import Link from 'next/link'
import { CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloCliente, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloRegularidadeClientePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCicloContext()
  const { id } = await params
  const cliente = await getCicloCliente(id, context)

  return (
    <CicloShell
      active="regularidade"
      eyebrow="Regularidade"
      title={cliente.nome}
      description="Dashboard de pontualidade, pagamentos e conformidade do cliente."
      actions={<Link className="button secondary" href="/modulos/gkit-ciclo/regularidade">Voltar</Link>}
      usuario={context.usuario}
    >
      <CicloSection hideHeader title="Dashboard do cliente">
        <div className="suite-empty-block">
          Dashboard de regularidade por cliente em preparação.
        </div>
      </CicloSection>
    </CicloShell>
  )
}
