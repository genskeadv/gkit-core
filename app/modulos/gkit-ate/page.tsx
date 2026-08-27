import {
  createGkitAteAtendimentoAction,
  createGkitAteAtendimentoTipoAction,
  createGkitAteTarefaAction,
  createGkitAteTarefaTipoAction,
} from '@/features/gkit-ate/actions'
import { GkitAteCockpit } from '@/features/gkit-ate/cockpit'
import { GkitAteHealthNotice, GkitAteShell } from '@/features/gkit-ate/components'
import { atendimentoAntigoRows, getGkitAteFormData, getGkitAteHealth, listGkitAteAtendimentos, requireGkitAteContext } from '@/features/gkit-ate/queries'
import { moduleTarget } from '@/lib/auth/platform'

type CockpitPanel = 'atendimento' | 'tarefa' | 'tipo-atendimento' | 'tipo-tarefa'

function creationTime(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

function initialPanel(value: string | string[] | undefined): CockpitPanel | null {
  const panel = Array.isArray(value) ? value[0] : value
  if (panel === 'atendimento' || panel === 'tarefa' || panel === 'tipo-atendimento' || panel === 'tipo-tarefa') return panel
  return null
}

export default async function GkitAtePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await requireGkitAteContext(moduleTarget('/modulos/gkit-ate', params))
  const [health, formData, atendimentos] = await Promise.all([
    getGkitAteHealth(),
    getGkitAteFormData(),
    listGkitAteAtendimentos(),
  ])
  const atendimentosAbertos = atendimentos
    .filter((item) => item.status === 'aberto')
    .sort((a, b) => creationTime(a.data_criacao) - creationTime(b.data_criacao) || a.cliente_nome.localeCompare(b.cliente_nome, 'pt-BR'))

  return (
    <GkitAteShell
      active="cockpit"
      title="Fluxo de atendimento"
      description="Execução diária do GKIT ATE, organizada na ordem natural do atendimento consultivo."
      usuario={context.usuario}
    >
      <GkitAteHealthNotice health={health} />
      <GkitAteCockpit
        createAtendimentoAction={createGkitAteAtendimentoAction}
        createAtendimentoTipoAction={createGkitAteAtendimentoTipoAction}
        createTarefaAction={createGkitAteTarefaAction}
        createTarefaTipoAction={createGkitAteTarefaTipoAction}
        formData={formData}
        initialPanel={initialPanel(params?.panel ?? params?.painel)}
        atendimentosAbertos={atendimentoAntigoRows(atendimentosAbertos)}
      />
    </GkitAteShell>
  )
}
