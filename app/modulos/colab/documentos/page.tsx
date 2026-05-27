import { ColabDocuments, ColabIntegrationStatus, ColabProfile, ColabShell } from '@/features/colab/components'
import { getColabData, requireColabContext } from '@/features/colab/queries'

export default async function ColabDocumentosPage() {
  const context = await requireColabContext()
  const data = await getColabData(context.usuario.email)

  return (
    <ColabShell
      active="documentos"
      title="Documentos"
      description="Demonstrativos, comprovantes e resumos associados ao colaborador."
      usuario={context.usuario}
    >
      <ColabIntegrationStatus data={data} />
      <ColabProfile data={data} />
      <ColabDocuments data={data} />
    </ColabShell>
  )
}
