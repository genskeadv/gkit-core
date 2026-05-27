import { createCicloAtaAction } from '@/features/ciclo/actions'
import { CicloAtaForm, CicloShell } from '@/features/ciclo/components'
import { getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function NovaAtaPage() {
  const context = await requireCicloContext()
  const formData = await getCicloDocumentoFormData(context)

  return (
    <CicloShell
      active="atas"
      eyebrow="Documentos juridicos"
      title="Nova ata"
      description="Ata vinculada ao cliente, validade e observacoes operacionais."
      usuario={context.usuario}
    >
      <CicloAtaForm action={createCicloAtaAction} formData={formData} />
    </CicloShell>
  )
}
