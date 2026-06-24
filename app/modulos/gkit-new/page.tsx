import {
  createGkitNewClienteAction,
  createGkitNewCockpitPropostaAction,
  createGkitNewContatoAction,
  updateGkitNewAcompanhamentoAction,
} from '@/features/gkit-new/actions'
import { GkitNewCockpit } from '@/features/gkit-new/cockpit'
import { GkitNewHealthNotice, GkitNewShell } from '@/features/gkit-new/components'
import { getGkitNewFormData, getGkitNewHealth, listGkitNewOportunidades, requireGkitNewContext } from '@/features/gkit-new/queries'

type CockpitPanel = 'contato' | 'cliente' | 'proposta' | 'acompanhamento'

function initialPanel(value: string | string[] | undefined): CockpitPanel {
  const panel = Array.isArray(value) ? value[0] : value
  if (panel === 'cliente' || panel === 'proposta' || panel === 'acompanhamento') return panel
  return 'contato'
}

export default async function GkitNewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const context = await requireGkitNewContext()
  const params = await searchParams
  const [health, formData, oportunidades] = await Promise.all([
    getGkitNewHealth(),
    getGkitNewFormData(),
    listGkitNewOportunidades(),
  ])

  return (
    <GkitNewShell
      active="cockpit"
      title="Fluxo comercial"
      description="Execucao diaria do GKIT New, organizada na ordem natural do trabalho comercial."
      usuario={context.usuario}
    >
      <GkitNewHealthNotice health={health} />
      <GkitNewCockpit
        createClienteAction={createGkitNewClienteAction}
        createContatoAction={createGkitNewContatoAction}
        createPropostaAction={createGkitNewCockpitPropostaAction}
        formData={formData}
        initialPanel={initialPanel(params?.painel)}
        oportunidades={oportunidades}
        updateAcompanhamentoAction={updateGkitNewAcompanhamentoAction}
      />
    </GkitNewShell>
  )
}
