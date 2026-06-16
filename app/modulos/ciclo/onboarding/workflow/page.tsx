import { CicloOnboardingWorkflowConfig, CicloShell } from '@/features/ciclo/components'
import { listCicloOnboardingWorkflowAtividades, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloOnboardingWorkflowPage() {
  const context = await requireCicloContext()
  const atividades = await listCicloOnboardingWorkflowAtividades()

  return (
    <CicloShell
      active="onboarding"
      eyebrow="Operacao"
      title="Workflow de onboarding"
      description="Cadastro das atividades de recepcao de clientes, com ordem, descricao e responsavel padrao."
      usuario={context.usuario}
    >
      <CicloOnboardingWorkflowConfig atividades={atividades} />
    </CicloShell>
  )
}
