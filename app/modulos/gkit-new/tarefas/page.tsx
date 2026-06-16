import { GkitNewHealthNotice, GkitNewList, GkitNewSection, GkitNewShell } from '@/features/gkit-new/components'
import { getGkitNewHealth, listGkitNewTarefas, requireGkitNewContext, tarefaRows } from '@/features/gkit-new/queries'

export default async function GkitNewTarefasPage() {
  const context = await requireGkitNewContext()
  const [health, tarefas] = await Promise.all([getGkitNewHealth(), listGkitNewTarefas()])

  return (
    <GkitNewShell
      active="tarefas"
      title="Tarefas"
      description="Acompanhamento de tarefas geradas pelo workflow das oportunidades."
      usuario={context.usuario}
    >
      <GkitNewHealthNotice health={health} />
      <GkitNewSection title="Tarefas do workflow" description="Pendentes podem ser concluídas pelo operador ou canceladas por encerramento antecipado.">
        <GkitNewList empty="Nenhuma tarefa operacional disponivel." rows={tarefaRows(tarefas)} />
      </GkitNewSection>
    </GkitNewShell>
  )
}
