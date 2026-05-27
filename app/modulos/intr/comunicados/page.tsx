import { IntrGenericList, IntrListKpis, IntrShell } from '@/features/intr/components'
import { listIntrComunicadoRows, requireIntrContext } from '@/features/intr/queries'

export default async function IntrComunicadosPage() {
  const context = await requireIntrContext()
  const rows = await listIntrComunicadoRows()

  return (
    <IntrShell
      active="comunicados"
      title="Comunicados"
      description="Comunicacoes internas, publico, canal e data de publicacao."
      usuario={context.usuario}
    >
      <IntrListKpis rows={rows} totalLabel="Comunicados" />
      <IntrGenericList
        title="Comunicados publicados"
        description="Area preparada para listar comunicados internos do Intr."
        empty="Nenhum comunicado encontrado nas views do Intr."
        rows={rows}
      />
    </IntrShell>
  )
}
