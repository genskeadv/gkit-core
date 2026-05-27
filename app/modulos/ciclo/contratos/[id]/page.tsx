import { updateCicloContratoAction } from '@/features/ciclo/actions'
import { CicloContratoForm, CicloShell } from '@/features/ciclo/components'
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
      active="contratos"
      eyebrow="Documentos juridicos"
      title={contrato.numero_contrato ?? 'Contrato'}
      description="Edicao de vigencia, valor, status e reajuste contratual."
      usuario={context.usuario}
    >
      <CicloContratoForm action={updateCicloContratoAction} contrato={contrato} formData={formData} />
    </CicloShell>
  )
}
