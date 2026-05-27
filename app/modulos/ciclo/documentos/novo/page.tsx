import { createCicloDocumentoAction } from '@/features/ciclo/actions'
import { CicloDocumentoForm, CicloShell } from '@/features/ciclo/components'
import { getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function NovoDocumentoPage() {
  const context = await requireCicloContext()
  const formData = await getCicloDocumentoFormData(context)

  return (
    <CicloShell
      active="documentos"
      eyebrow="Regularidade documental"
      title="Novo documento"
      description="Controle documental por cliente, status, vencimento e link do arquivo."
      usuario={context.usuario}
    >
      <CicloDocumentoForm action={createCicloDocumentoAction} formData={formData} />
    </CicloShell>
  )
}
