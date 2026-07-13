import { updateCicloOcorrenciaAction } from '@/features/ciclo/actions'
import { CicloOcorrenciaForm, CicloSection, CicloShell } from '@/features/ciclo/components'
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
      eyebrow="Operação"
      title={ocorrencia.titulo}
      description="Edição de ocorrência, impacto, responsável e status operacional."
      usuario={context.usuario}
    >
      <CicloSection
        eyebrow="Edição"
        title="Dados da ocorrência"
        description="Atualize impacto, status, responsável e acompanhamento operacional."
      >
        <CicloOcorrenciaForm action={updateCicloOcorrenciaAction} formData={formData} ocorrencia={ocorrencia} />
      </CicloSection>
    </CicloShell>
  )
}
