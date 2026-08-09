import Link from 'next/link'
import { buildCicloListFilters, CicloOnboardingOverview, CicloSection, CicloShell } from '@/features/ciclo/components'
import { listCicloOnboardingRows, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloOnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireCicloContext()
  const rows = await listCicloOnboardingRows()

  return (
    <CicloShell
      active="onboarding"
      eyebrow="Operacao"
      title="Onboarding"
      description="Fila de implantação de clientes, progresso e checklist operacional."
      actions={<Link className="button secondary" href="/modulos/gkit-ciclo/onboarding/workflow">Workflow</Link>}
      usuario={context.usuario}
    >
      <CicloSection
        eyebrow="Resumo"
        title="Implantacoes"
        description="Status dos clientes em onboarding e pontos que exigem acompanhamento."
      >
        <CicloOnboardingOverview filters={buildCicloListFilters(params)} rows={rows} />
      </CicloSection>
    </CicloShell>
  )
}
