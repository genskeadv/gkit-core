import { IntrGenericList, IntrListKpis, IntrShell } from '@/features/intr/components'
import { listIntrDocumentRows, requireIntrContext } from '@/features/intr/queries'

export default async function IntrDocumentosPage() {
  const context = await requireIntrContext()
  const rows = await listIntrDocumentRows()

  return (
    <IntrShell
      active="documentos"
      title="Documentos"
      description="Documentos internos vinculados a pessoas, comunicados ou rotinas operacionais."
      usuario={context.usuario}
    >
      <IntrListKpis rows={rows} totalLabel="Documentos" />
      <IntrGenericList
        title="Documentos publicados"
        description="Area preparada para exibir documentos quando a view correspondente estiver disponivel."
        empty="Nenhum documento encontrado nas views do Intr."
        rows={rows}
      />
    </IntrShell>
  )
}
