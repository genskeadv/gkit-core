import { updateCicloAtaAction } from '@/features/ciclo/actions'
import { CicloAtaForm, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloAta, getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function EditarAtaPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCicloContext()
  const { id } = await params
  const [ata, formData] = await Promise.all([
    getCicloAta(id, context),
    getCicloDocumentoFormData(context),
  ])

  return (
    <CicloShell
      active="documentos"
      eyebrow="Documentos"
      title={ata.tipo ?? 'Ata'}
      description="Edição de tipo, validade, status e observações da ata."
      usuario={context.usuario}
    >
      <CicloSection
        eyebrow="Edição"
        title="Dados da ata"
        description="Atualize tipo, assembleia, validade, status e observações."
      >
        <CicloAtaForm action={updateCicloAtaAction} ata={ata} formData={formData} />
      </CicloSection>
    </CicloShell>
  )
}
