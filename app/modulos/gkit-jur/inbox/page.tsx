import { updateGkitJurTarefaPlanejamentoAction, updateGkitJurTarefaStatusAction } from '@/features/gkit-jur/actions'
import { GkitJurInboxPage, GkitJurShell } from '@/features/gkit-jur/components'
import { canWriteGkitJur, getGkitJurInbox, requireGkitJurContext } from '@/features/gkit-jur/queries'
import { moduleTarget, type ModuleSearchParams } from '@/lib/auth/platform'

export default async function GkitJurInboxRoute({ searchParams }: { searchParams?: Promise<ModuleSearchParams> }) {
  const params = await searchParams
  const [context, data] = await Promise.all([
    requireGkitJurContext(moduleTarget('/modulos/gkit-jur/inbox', params)),
    getGkitJurInbox(params),
  ])

  return (
    <GkitJurShell
      active="inbox"
      description="Caixa de entrada diaria do advogado, priorizada por risco, pendencias e automacoes."
      title="Inbox operacional"
      usuario={context.usuario}
    >
      <GkitJurInboxPage
        canWrite={canWriteGkitJur(context.permissions)}
        data={data}
        planejamentoAction={updateGkitJurTarefaPlanejamentoAction}
        returnTo={moduleTarget('/modulos/gkit-jur/inbox', params)}
        statusAction={updateGkitJurTarefaStatusAction}
      />
    </GkitJurShell>
  )
}
