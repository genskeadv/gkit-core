import {
  createGkitNewClienteAction,
  createGkitNewCockpitPropostaAction,
  createGkitNewContatoAction,
  updateGkitNewAcompanhamentoAction,
} from '@/features/gkit-new/actions'
import { GkitNewCockpit } from '@/features/gkit-new/cockpit'
import { GkitNewHealthNotice, GkitNewShell } from '@/features/gkit-new/components'
import {
  getGkitNewFormData,
  getGkitNewHealth,
  buildGkitNewCockpitInsights,
  listGkitNewOportunidades,
  listGkitNewTarefas,
  propostasAbertasRows,
  requireGkitNewContext,
} from '@/features/gkit-new/queries'
import { moduleTarget } from '@/lib/auth/platform'

type CockpitPanel = 'contato' | 'cliente' | 'proposta' | 'acompanhamento'

function initialPanel(value: string | string[] | undefined): CockpitPanel | null {
  const panel = Array.isArray(value) ? value[0] : value
  if (panel === 'contato' || panel === 'cliente' || panel === 'proposta' || panel === 'acompanhamento') return panel
  return null
}

export default async function GkitNewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireGkitNewContext(moduleTarget('/modulos/gkit-new', params))
  const [health, formData, oportunidades, tarefas] = await Promise.all([
    getGkitNewHealth(),
    getGkitNewFormData(),
    listGkitNewOportunidades(),
    listGkitNewTarefas(),
  ])

  return (
    <GkitNewShell
      active="cockpit"
      title="Fluxo comercial"
      description="Execução diária do GKIT New, organizada na ordem natural do trabalho comercial."
      usuario={context.usuario}
    >
      <GkitNewHealthNotice health={health} />
      <GkitNewCockpit
        createClienteAction={createGkitNewClienteAction}
        createContatoAction={createGkitNewContatoAction}
        createPropostaAction={createGkitNewCockpitPropostaAction}
        formData={formData}
        insights={buildGkitNewCockpitInsights(oportunidades, tarefas)}
        initialPanel={initialPanel(params?.panel ?? params?.painel)}
        oportunidades={oportunidades}
        propostasAbertas={propostasAbertasRows(oportunidades)}
        updateAcompanhamentoAction={updateGkitNewAcompanhamentoAction}
      />
    </GkitNewShell>
  )
}
