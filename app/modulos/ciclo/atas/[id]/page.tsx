import { updateCicloAtaAction } from '@/features/ciclo/actions'
import { CicloAtaForm, CicloShell } from '@/features/ciclo/components'
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
      active="atas"
      eyebrow="Documentos juridicos"
      title={ata.tipo ?? 'Ata'}
      description="Edicao de tipo, validade, status e observacoes da ata."
      usuario={context.usuario}
    >
      <CicloAtaForm action={updateCicloAtaAction} ata={ata} formData={formData} />
    </CicloShell>
  )
}
