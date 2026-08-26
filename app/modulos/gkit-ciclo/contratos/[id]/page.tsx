import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateCicloContratoAction } from '@/features/ciclo/actions'
import { CicloContratoForm, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloContrato, getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function EditarContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCicloContext()
  if (!canAccess(context.permissions, 'ciclo.clientes.write')) redirect('/modulos/gkit-ciclo/contratos')

  const { id } = await params
  const [contrato, formData] = await Promise.all([
    getCicloContrato(id, context),
    getCicloDocumentoFormData(context),
  ])

  return (
    <CicloShell
      active="contratos"
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
