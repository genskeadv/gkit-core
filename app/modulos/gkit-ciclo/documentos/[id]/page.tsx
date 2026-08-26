import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateCicloDocumentoAction } from '@/features/ciclo/actions'
import { CicloDocumentoForm, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloDocumento, getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function EditarDocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCicloContext()
  if (!canAccess(context.permissions, 'ciclo.documentos.write')) redirect('/modulos/gkit-ciclo/documentos')

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
      description="Edição de documento, vencimento, status e validação."
      usuario={context.usuario}
    >
      <CicloSection
        eyebrow="Edição"
        title="Dados do documento"
        description="Atualize status, vencimento, validação e vínculo documental."
      >
        <CicloDocumentoForm action={updateCicloDocumentoAction} documento={documento} formData={formData} />
      </CicloSection>
    </CicloShell>
  )
}
