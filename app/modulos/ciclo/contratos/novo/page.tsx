import { createCicloContratoAction } from '@/features/ciclo/actions'
import { CicloContratoForm, CicloShell } from '@/features/ciclo/components'
import { getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function NovoContratoPage() {
  const context = await requireCicloContext()
  const formData = await getCicloDocumentoFormData(context)

  return (
    <CicloShell
      active="contratos"
      eyebrow="Documentos juridicos"
      title="Novo contrato"
      description="Contrato vinculado ao cliente, vigencia, valor e proximo reajuste."
      usuario={context.usuario}
    >
      <CicloContratoForm action={createCicloContratoAction} formData={formData} />
    </CicloShell>
  )
}
