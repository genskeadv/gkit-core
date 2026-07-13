import { updateCicloAlertaAction } from '@/features/ciclo/actions'
import { CicloAlertaForm, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloAlerta, getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function EditarAlertaPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCicloContext()
  const { id } = await params
  const [alerta, formData] = await Promise.all([
    getCicloAlerta(id, context),
    getCicloDocumentoFormData(context),
  ])

  return (
    <CicloShell
      active="alertas"
      eyebrow="Fila operacional"
      title={alerta.titulo}
      description="Edição de status, severidade e vencimento do alerta."
      usuario={context.usuario}
    >
      <CicloSection
        eyebrow="Edição"
        title="Dados do alerta"
        description="Atualize status, severidade, vencimento e contexto operacional."
      >
        <CicloAlertaForm action={updateCicloAlertaAction} alerta={alerta} formData={formData} />
      </CicloSection>
    </CicloShell>
  )
}
