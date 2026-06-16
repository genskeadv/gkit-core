import { IntrGenericList, IntrListKpis, FixShell } from '@/features/fix/components'
import { listFixExtratoLancamentoRows, requireIntrContext } from '@/features/fix/queries'

export default async function FixExtratoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireIntrContext()
  const { id } = await params
  const rows = await listFixExtratoLancamentoRows(id)

  return (
    <FixShell
      active="extratos"
      title="Extrato processado"
      description="Detalhamento dos lançamentos importados, com classificação, confiança e conciliação."
      usuario={context.usuario}
    >
      <IntrListKpis rows={rows} totalLabel="Lançamentos" />
      <IntrGenericList
        title="Lançamentos do extrato"
        description="Saídas e entradas do arquivo, já normalizadas pelo FIX."
        rows={rows}
        empty="Nenhum lançamento encontrado para este extrato."
      />
    </FixShell>
  )
}
