import { CicloGenericList, CicloListKpis, CicloShell } from '@/features/ciclo/components'
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
      usuario={context.usuario}
    >
      <CicloListKpis rows={rows} secondaryLabel="Concluidos" />
      <CicloGenericList
        title="Fila de onboarding"
        description="Clientes em implantacao e status do checklist."
        detailHrefBase="/modulos/ciclo/onboarding"
        emptyLabel="Nenhum onboarding encontrado."
        rows={rows}
      />
    </CicloShell>
  )
}
