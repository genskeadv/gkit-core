import { createCicloAlertaAction } from '@/features/ciclo/actions'
import { CicloAlertaForm, CicloShell } from '@/features/ciclo/components'
import { getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function NovoAlertaPage() {
  const context = await requireCicloContext()
  const formData = await getCicloDocumentoFormData(context)

  return (
    <CicloShell
      active="alertas"
      eyebrow="Fila operacional"
      title="Novo alerta"
      description="Ponto de atencao com severidade, prazo e cliente vinculado."
      usuario={context.usuario}
    >
      <CicloAlertaForm action={createCicloAlertaAction} formData={formData} />
    </CicloShell>
  )
}
