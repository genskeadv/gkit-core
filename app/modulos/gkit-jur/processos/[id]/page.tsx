import { redirect } from 'next/navigation'
import {
  createGkitJurDocumentoAction,
  createGkitJurEventoProcessoAction,
  createGkitJurTarefaAction,
  createGkitJurTarefaFromReferenceAction,
  syncGkitJurProcessNowAction,
  updateGkitJurProcessoAction,
  updateGkitJurTarefaPlanejamentoAction,
  updateGkitJurTarefaStatusAction,
} from '@/features/gkit-jur/actions'
import { GkitJurProcessDetailPage, GkitJurShell } from '@/features/gkit-jur/components'
import { canSyncGkitJur, canWriteGkitJur, getGkitJurProcessDetail, requireGkitJurContext } from '@/features/gkit-jur/queries'
import type { GkitJurProcessSyncFeedback } from '@/features/gkit-jur/types'

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function numberParam(value: string | string[] | undefined) {
  const parsed = Number.parseInt(one(value), 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function syncFeedback(params?: Record<string, string | string[] | undefined>): GkitJurProcessSyncFeedback {
  const status = one(params?.sync_processo)
  if (status !== 'ok' && status !== 'erro') return null
  return {
    erros: numberParam(params?.erros),
    mensagem: one(params?.mensagem) || null,
    novas: numberParam(params?.novas),
    processos: numberParam(params?.processos),
    semResultado: numberParam(params?.sem_resultado),
    status,
    tarefas: numberParam(params?.tarefas),
  }
}

export default async function GkitJurProcessoDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const query = await searchParams
  if (!id) redirect('/modulos/gkit-jur/processos')

  const [context, data] = await Promise.all([
    requireGkitJurContext(`/modulos/gkit-jur/processos/${id}`),
    getGkitJurProcessDetail(id),
  ])

  return (
    <GkitJurShell
      active="processos"
      description={data.processo.titulo ?? undefined}
      title={data.processo.numeroCnj}
      usuario={context.usuario}
    >
      <GkitJurProcessDetailPage
        action={updateGkitJurProcessoAction}
        canSync={canSyncGkitJur(context.permissions)}
        canWrite={canWriteGkitJur(context.permissions)}
        createDocumentoAction={createGkitJurDocumentoAction}
        createEventoAction={createGkitJurEventoProcessoAction}
        createTarefaAction={createGkitJurTarefaAction}
        createTarefaFromReferenceAction={createGkitJurTarefaFromReferenceAction}
        data={data}
        syncAction={syncGkitJurProcessNowAction}
        syncFeedback={syncFeedback(query)}
        updateTarefaPlanejamentoAction={updateGkitJurTarefaPlanejamentoAction}
        updateTarefaStatusAction={updateGkitJurTarefaStatusAction}
      />
    </GkitJurShell>
  )
}
