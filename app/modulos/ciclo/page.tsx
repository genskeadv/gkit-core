import {
  createCicloClienteAction,
  createCicloOcorrenciaAction,
  startCicloOnboardingAction,
  updateCicloCockpitDocumentacaoAction,
} from '@/features/ciclo/actions'
import { CicloCockpit } from '@/features/ciclo/cockpit'
import { CicloShell } from '@/features/ciclo/components'
import { getCicloCockpitData, requireCicloContext } from '@/features/ciclo/queries'
import { moduleTarget } from '@/lib/auth/platform'

type CockpitPanel = 'cliente' | 'onboarding' | 'documentacao' | 'ocorrencia'

function initialPanel(value: string | string[] | undefined): CockpitPanel | null {
  const panel = Array.isArray(value) ? value[0] : value
  if (panel === 'cliente' || panel === 'onboarding' || panel === 'documentacao' || panel === 'ocorrencia') return panel
  return null
}

export default async function CicloPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireCicloContext(moduleTarget('/modulos/ciclo', params))
  const data = await getCicloCockpitData(context)

  return (
    <CicloShell
      active="cockpit"
      eyebrow="GKIT Ciclo"
      title="Fluxo operacional"
      description="Execucao diaria do Ciclo, organizada na ordem natural da rotina de acompanhamento."
      usuario={context.usuario}
    >
      <CicloCockpit
        createClienteAction={createCicloClienteAction}
        createOcorrenciaAction={createCicloOcorrenciaAction}
        data={data}
        initialPanel={initialPanel(params?.panel)}
        startOnboardingAction={startCicloOnboardingAction}
        updateDocumentacaoAction={updateCicloCockpitDocumentacaoAction}
      />
    </CicloShell>
  )
}
