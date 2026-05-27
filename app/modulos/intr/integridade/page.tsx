import { IntrGenericList, IntrListKpis, IntrShell } from '@/features/intr/components'
import { listIntrIntegridadeRows, requireIntrContext } from '@/features/intr/queries'

export default async function IntrIntegridadePage() {
  const context = await requireIntrContext()
  const rows = await listIntrIntegridadeRows()

  return (
    <IntrShell
      active="integridade"
      title="Integridade"
      description="Travas, competencias e alertas que protegem o fechamento operacional."
      usuario={context.usuario}
    >
      <IntrListKpis rows={rows} totalLabel="Pontos" />
      <IntrGenericList
        title="Pontos de integridade"
        description="Competencias ou alertas que precisam de acompanhamento antes dos fechamentos."
        empty="Nenhum alerta de integridade encontrado nas views do Intr."
        rows={rows}
      />
    </IntrShell>
  )
}
