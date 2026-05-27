import { IntrGenericList, IntrListKpis, IntrShell } from '@/features/intr/components'
import { listIntrReembolsoRows, requireIntrContext } from '@/features/intr/queries'

export default async function IntrReembolsosPage() {
  const context = await requireIntrContext()
  const rows = await listIntrReembolsoRows()

  return (
    <IntrShell
      active="reembolsos"
      title="Reembolsos"
      description="Solicitacoes de reembolso por colaborador, valor, status e data."
      usuario={context.usuario}
    >
      <IntrListKpis rows={rows} totalLabel="Reembolsos" />
      <IntrGenericList
        title="Solicitacoes"
        description="Area preparada para a rotina de reembolsos do Intr."
        empty="Nenhum reembolso encontrado nas views do Intr."
        rows={rows}
      />
    </IntrShell>
  )
}
