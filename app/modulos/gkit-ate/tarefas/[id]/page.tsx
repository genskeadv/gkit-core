import { canAccess } from '@/lib/auth/permissions'
import { completeGkitAteTarefaAction } from '@/features/gkit-ate/actions'
import { GkitAteHealthNotice, GkitAteSection, GkitAteShell, GkitAteTarefaDetail } from '@/features/gkit-ate/components'
import { getGkitAteHealth, getGkitAteTarefa, requireGkitAteContext } from '@/features/gkit-ate/queries'

export default async function GkitAteTarefaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const context = await requireGkitAteContext()
  const { id } = await params
  const [health, tarefa] = await Promise.all([getGkitAteHealth(), getGkitAteTarefa(id)])
  const canWrite = canAccess(context.permissions, 'gkit_ate.tarefas.write')

  return (
    <GkitAteShell
      active="tarefas"
      title="Detalhe da tarefa"
      description="Acompanhamento de pendencia vinculada ao atendimento."
      usuario={context.usuario}
    >
      <GkitAteHealthNotice health={health} />
      <GkitAteSection title="Tarefa">
        <GkitAteTarefaDetail action={completeGkitAteTarefaAction} canWrite={canWrite} tarefa={tarefa} />
      </GkitAteSection>
    </GkitAteShell>
  )
}
