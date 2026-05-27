import { IntrKpis, IntrShell, IntrSignals } from '@/features/intr/components'
import { getIntrData, requireIntrContext } from '@/features/intr/queries'

export default async function IntrPainelPage() {
  const context = await requireIntrContext()
  const data = await getIntrData()

  return (
    <IntrShell
      active="painel"
      title="Painel executivo"
      description="Leitura resumida do Intr com pessoas, receitas, ranking comercial e alertas."
      usuario={context.usuario}
    >
      <IntrKpis data={data} />
      <IntrSignals data={data} />
    </IntrShell>
  )
}
