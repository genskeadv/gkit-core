import { CicloOnboardingDetalhe, CicloSection, CicloShell } from '@/features/ciclo/components'
import { getCicloOnboardingDetail, requireCicloContext } from '@/features/ciclo/queries'

export default async function CicloOnboardingDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireCicloContext()
  const { id } = await params
  const detail = await getCicloOnboardingDetail(id, context)

  return (
    <CicloShell
      active="onboarding"
      eyebrow="Operação"
      title={`Onboarding: ${detail.cliente.nome}`}
      description="Checklist, documentos e passagem para cliente ativo."
      usuario={context.usuario}
    >
      <CicloSection
        eyebrow="Implantação"
        title="Checklist de onboarding"
        description="Documentos, progresso e passagem para cliente ativo."
      >
        <CicloOnboardingDetalhe detail={detail} />
      </CicloSection>
    </CicloShell>
  )
}
