import { completeGkitNewTarefaAction } from '@/features/gkit-new/actions'
import { GkitNewSection, GkitNewShell, GkitNewTarefaDetail } from '@/features/gkit-new/components'
import { canWriteGkitNew, getGkitNewTarefa, requireGkitNewContext } from '@/features/gkit-new/queries'

export default async function GkitNewTarefaPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireGkitNewContext()
  const { id } = await params
  const tarefa = await getGkitNewTarefa(id)
  const canWrite = canWriteGkitNew(context.permissions, 'gkit_new.tarefas.write')

  return (
    <GkitNewShell
      active="tarefas"
      title="Tarefa"
      description="Detalhe da tarefa operacional vinculada a oportunidade."
      usuario={context.usuario}
    >
      <GkitNewSection title="Detalhe da tarefa" description="Concluir tarefa atualiza o acompanhamento do Cockpit.">
        <GkitNewTarefaDetail action={completeGkitNewTarefaAction} canWrite={canWrite} tarefa={tarefa} />
      </GkitNewSection>
    </GkitNewShell>
  )
}
