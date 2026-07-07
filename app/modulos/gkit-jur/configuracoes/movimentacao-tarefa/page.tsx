import { GkitJurMovimentacaoTarefaPage, GkitJurShell } from '@/features/gkit-jur/components'
import { saveGkitJurMovimentacaoTarefaRegraAction, toggleGkitJurMovimentacaoTarefaRegraAction } from '@/features/gkit-jur/actions'
import { canConfigureGkitJur, getGkitJurMovimentacaoTarefaData, requireGkitJurContext } from '@/features/gkit-jur/queries'

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

export default async function GkitJurMovimentacaoTarefaRoute({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const [context, data] = await Promise.all([
    requireGkitJurContext('/modulos/gkit-jur/configuracoes/movimentacao-tarefa'),
    getGkitJurMovimentacaoTarefaData(),
  ])

  return (
    <GkitJurShell
      active="configuracoes"
      description="Regras de conversão de movimentações das integrações em tarefas operacionais."
      title="Movimentação para tarefa"
      usuario={context.usuario}
    >
      <GkitJurMovimentacaoTarefaPage
        canWrite={canConfigureGkitJur(context.permissions)}
        data={data}
        saved={one(params?.saved) === 'ok'}
        saveAction={saveGkitJurMovimentacaoTarefaRegraAction}
        toggleAction={toggleGkitJurMovimentacaoTarefaRegraAction}
      />
    </GkitJurShell>
  )
}
