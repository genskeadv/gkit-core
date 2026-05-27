import { updateCicloDocumentoAction } from '@/features/ciclo/actions'
import { CicloDocumentoForm, CicloShell } from '@/features/ciclo/components'
import { getCicloDocumento, getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function EditarDocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCicloContext()
  const { id } = await params
  const [documento, formData] = await Promise.all([
    getCicloDocumento(id, context),
    getCicloDocumentoFormData(context),
  ])

  return (
    <CicloShell
      active="documentos"
      eyebrow="Regularidade documental"
      title={documento.titulo ?? documento.tipo_documento}
      description="Edicao de documento, vencimento, status e validacao."
      usuario={context.usuario}
    >
      <CicloDocumentoForm action={updateCicloDocumentoAction} documento={documento} formData={formData} />
    </CicloShell>
  )
}
