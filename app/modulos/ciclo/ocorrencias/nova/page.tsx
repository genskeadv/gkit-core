import { createCicloOcorrenciaAction } from '@/features/ciclo/actions'
import { CicloOcorrenciaForm, CicloShell } from '@/features/ciclo/components'
import { getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function NovaOcorrenciaPage() {
  const context = await requireCicloContext()
  const formData = await getCicloDocumentoFormData(context)

  return (
    <CicloShell
      active="ocorrencias"
      eyebrow="Operacao"
      title="Nova ocorrencia"
      description="Registro do dia a dia com impacto, responsavel, prazo e alerta de acompanhamento."
      usuario={context.usuario}
    >
      <CicloOcorrenciaForm action={createCicloOcorrenciaAction} formData={formData} />
    </CicloShell>
  )
}
