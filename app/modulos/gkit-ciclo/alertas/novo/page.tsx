import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createCicloAlertaAction } from '@/features/ciclo/actions'
import { CicloAlertaForm, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloDocumentoFormData, requireCicloContext } from '@/features/ciclo/queries'

export default async function NovoAlertaPage() {
  const context = await requireCicloContext()
  if (!canAccess(context.permissions, 'ciclo.alertas.write')) redirect('/modulos/gkit-ciclo/alertas')

  const formData = await getCicloDocumentoFormData(context)

  return (
    <CicloShell
      active="alertas"
      eyebrow="Fila operacional"
      title="Novo alerta"
      description="Ponto de atenção com severidade, prazo e cliente vinculado."
      usuario={context.usuario}
    >
      <CicloSection
        eyebrow="Cadastro"
        title="Dados do alerta"
        description="Defina cliente, tipo, severidade, prazo, status e descrição."
      >
        <CicloAlertaForm action={createCicloAlertaAction} formData={formData} />
      </CicloSection>
    </CicloShell>
  )
}
