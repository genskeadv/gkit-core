import { createCicloContratoAction } from '@/features/ciclo/actions'
import { CicloContratoForm, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function NovoContratoPage() {
  const context = await requireCicloContext()
  const formData = await getCicloDocumentoFormData(context)

  return (
    <CicloShell
      active="documentos"
      eyebrow="Documentos"
      title="Novo contrato"
      description="Contrato vinculado ao cliente, vigência, valor e próximo reajuste."
      usuario={context.usuario}
    >
      <CicloSection
        eyebrow="Cadastro"
        title="Dados do contrato"
        description="Informe cliente, número, vigência, valor, status e próximo reajuste."
      >
        <CicloContratoForm action={createCicloContratoAction} formData={formData} />
      </CicloSection>
    </CicloShell>
  )
}
