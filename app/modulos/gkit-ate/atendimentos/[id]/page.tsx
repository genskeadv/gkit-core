import { canAccess } from '@/lib/auth/permissions'
import { createGkitAteTarefaAction } from '@/features/gkit-ate/actions'
import { GkitAteAtendimentoDetailView, GkitAteHealthNotice, GkitAteSection, GkitAteShell } from '@/features/gkit-ate/components'
import { getGkitAteAtendimento, getGkitAteHealth, requireGkitAteContext } from '@/features/gkit-ate/queries'

export default async function GkitAteAtendimentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const context = await requireGkitAteContext()
  const { id } = await params
  const [health, atendimento] = await Promise.all([getGkitAteHealth(), getGkitAteAtendimento(id)])
  const canWrite = canAccess(context.permissions, 'gkit_ate.tarefas.write')

  return (
    <GkitAteShell
      active="atendimentos"
      title="Detalhe do atendimento"
      description="Registro ASTREA e tarefas operacionais vinculadas."
      usuario={context.usuario}
    >
      <GkitAteHealthNotice health={health} />
      <GkitAteSection title="Atendimento ASTREA">
        <GkitAteAtendimentoDetailView action={createGkitAteTarefaAction} atendimento={atendimento} canWrite={canWrite} />
      </GkitAteSection>
    </GkitAteShell>
  )
}
