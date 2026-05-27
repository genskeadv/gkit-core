import { updateCicloOcorrenciaAction } from '@/features/ciclo/actions'
import { CicloOcorrenciaForm, CicloShell } from '@/features/ciclo/components'
import { getCicloDocumentoFormData, getCicloOcorrencia, requireCicloContext } from '@/features/ciclo/queries'

export default async function EditarOcorrenciaPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCicloContext()
  const { id } = await params
  const [ocorrencia, formData] = await Promise.all([
    getCicloOcorrencia(id, context),
    getCicloDocumentoFormData(context),
  ])

  return (
    <CicloShell
      active="ocorrencias"
      eyebrow="Operacao"
      title={ocorrencia.titulo}
      description="Edicao de ocorrencia, impacto, responsavel e status operacional."
      usuario={context.usuario}
    >
      <CicloOcorrenciaForm action={updateCicloOcorrenciaAction} formData={formData} ocorrencia={ocorrencia} />
    </CicloShell>
  )
}
