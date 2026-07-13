import Link from 'next/link'
import { CicloOnboardingOverview, CicloSection, CicloShell } from '@/features/ciclo/components'
import { listCicloOnboardingRows, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloOnboardingPage() {
  const context = await requireCicloContext()
  const rows = await listCicloOnboardingRows()

  return (
    <CicloShell
      active="onboarding"
      eyebrow="Operacao"
      title="Onboarding"
      description="Fila de implantacao de clientes, progresso e checklist operacional."
      actions={<Link className="button secondary" href="/modulos/gkit-ciclo/onboarding/workflow">Workflow</Link>}
      usuario={context.usuario}
    >
      <CicloSection
        eyebrow="Resumo"
        title="Implantacoes"
        description="Status dos clientes em onboarding e pontos que exigem acompanhamento."
      >
        <CicloOnboardingOverview rows={rows} />
      </CicloSection>
    </CicloShell>
  )
}
