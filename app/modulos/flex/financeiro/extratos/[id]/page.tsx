import Link from 'next/link'
import { FlexList, FlexShell } from '@/features/flex/components'
import { listFlexExtratoLancamentos, requireFlexContext } from '@/features/flex/queries'

export default async function FlexExtratoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireFlexContext()
  const { id } = await params
  const rows = await listFlexExtratoLancamentos(id)

  return (
    <FlexShell
      active="extratos"
      title="Extrato processado"
      description="Lançamentos normalizados, classificação e conciliação."
      usuario={context.usuario}
      actions={<Link className="button secondary" href="/modulos/flex/financeiro/extratos">Voltar</Link>}
    >
      <FlexList rows={rows} empty="Nenhum lançamento neste extrato." title="Lançamentos" />
    </FlexShell>
  )
}
