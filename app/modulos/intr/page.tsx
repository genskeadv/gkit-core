import { IntrKpis, IntrShell, IntrSignals } from '@/features/intr/components'
import { getIntrData, requireIntrContext } from '@/features/intr/queries'

export default async function IntrPage() {
  const context = await requireIntrContext()
  const data = await getIntrData()

  return (
    <IntrShell
      active="cockpit"
      title="Cockpit da Intranet"
      description="Visao consolidada de colaboradores, receitas, ranking comercial e alertas internos."
      usuario={context.usuario}
    >
      <IntrKpis data={data} />
      <IntrSignals data={data} />
    </IntrShell>
  )
}
