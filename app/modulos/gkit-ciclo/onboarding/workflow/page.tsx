import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { CicloOnboardingWorkflowConfig, CicloShell } from '@/features/ciclo/components'
import { listCicloOnboardingWorkflowAtividades, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloOnboardingWorkflowPage() {
  const context = await requireCicloContext()
  if (!canAccess(context.permissions, 'ciclo.clientes.write')) redirect('/modulos/gkit-ciclo/onboarding')

  const atividades = await listCicloOnboardingWorkflowAtividades()

  return (
    <CicloShell
      active="onboarding"
      eyebrow="Operacao"
      title="Workflow de onboarding"
      description="Cadastro das atividades de recepcao de clientes, com ordem, descrição e responsável padrão."
      usuario={context.usuario}
    >
      <CicloOnboardingWorkflowConfig atividades={atividades} />
    </CicloShell>
  )
}
