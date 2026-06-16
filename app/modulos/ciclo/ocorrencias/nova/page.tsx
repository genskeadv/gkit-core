import { createCicloOcorrenciaAction } from '@/features/ciclo/actions'
import { CicloOcorrenciaForm, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function NovaOcorrenciaPage() {
  const context = await requireCicloContext()
  const formData = await getCicloDocumentoFormData(context)

  return (
    <CicloShell
      active="ocorrencias"
      eyebrow="Operação"
      title="Nova ocorrência"
      description="Registro do dia a dia com impacto, responsável, prazo e alerta de acompanhamento."
      usuario={context.usuario}
    >
      <CicloSection
        eyebrow="Cadastro"
        title="Dados da ocorrência"
        description="Registre cliente, tipo, impacto, responsável, prazo e alerta associado."
      >
        <CicloOcorrenciaForm action={createCicloOcorrenciaAction} formData={formData} />
      </CicloSection>
    </CicloShell>
  )
}
