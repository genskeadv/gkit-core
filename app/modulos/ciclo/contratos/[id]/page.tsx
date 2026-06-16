import { updateCicloContratoAction } from '@/features/ciclo/actions'
import { CicloContratoForm, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloContrato, getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function EditarContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCicloContext()
  const { id } = await params
  const [contrato, formData] = await Promise.all([
    getCicloContrato(id, context),
    getCicloDocumentoFormData(context),
  ])

  return (
    <CicloShell
      active="documentos"
      eyebrow="Documentos"
      title={contrato.numero_contrato ?? 'Contrato'}
      description="Edição de vigência, valor, status e reajuste contratual."
      usuario={context.usuario}
    >
      <CicloSection
        eyebrow="Edição"
        title="Dados do contrato"
        description="Atualize vigência, valor, status, reajuste e observações contratuais."
      >
        <CicloContratoForm action={updateCicloContratoAction} contrato={contrato} formData={formData} />
      </CicloSection>
    </CicloShell>
  )
}
