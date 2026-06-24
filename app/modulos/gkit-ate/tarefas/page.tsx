import { GkitAteHealthNotice, GkitAteList, GkitAteSection, GkitAteShell } from '@/features/gkit-ate/components'
import { getGkitAteHealth, listGkitAteTarefas, requireGkitAteContext, tarefaRows } from '@/features/gkit-ate/queries'

export default async function GkitAteTarefasPage() {
  const context = await requireGkitAteContext()
  const [health, tarefas] = await Promise.all([getGkitAteHealth(), listGkitAteTarefas()])

  return (
    <GkitAteShell
      active="tarefas"
      title="Tarefas"
      description="Tarefas vinculadas aos atendimentos consultivos."
      usuario={context.usuario}
    >
      <GkitAteHealthNotice health={health} />
      <GkitAteSection title="Fila de tarefas" description="A planilha atual nao traz tarefas; elas podem ser cadastradas no detalhe do atendimento.">
        <GkitAteList empty="Nenhuma tarefa cadastrada." rows={tarefaRows(tarefas)} />
      </GkitAteSection>
    </GkitAteShell>
  )
}
