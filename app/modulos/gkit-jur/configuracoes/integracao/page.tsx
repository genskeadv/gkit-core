import { GkitJurIntegracaoPage, GkitJurShell } from '@/features/gkit-jur/components'
import { syncGkitJurDataJudAction } from '@/features/gkit-jur/actions'
import { canSyncGkitJur, getGkitJurIntegracaoData, requireGkitJurContext } from '@/features/gkit-jur/queries'
import type { GkitJurIntegracaoSyncFeedback } from '@/features/gkit-jur/types'

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function numberParam(value: string | string[] | undefined) {
  const parsed = Number.parseInt(one(value), 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function syncFeedback(params?: Record<string, string | string[] | undefined>): GkitJurIntegracaoSyncFeedback {
  if (one(params?.sync) !== 'ok') return null
  return {
    erros: numberParam(params?.erros),
    novas: numberParam(params?.novas),
    processos: numberParam(params?.processos),
    semResultado: numberParam(params?.sem_resultado),
    tarefas: numberParam(params?.tarefas),
  }
}

export default async function GkitJurIntegracaoRoute({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const [context, data] = await Promise.all([
    requireGkitJurContext('/modulos/gkit-jur/configuracoes/integracao'),
    getGkitJurIntegracaoData(),
  ])

  return (
    <GkitJurShell
      active="configuracoes"
      description="Conexao, provedores, fila e execucoes da integracao juridica."
      title="Integracao juridica"
      usuario={context.usuario}
    >
      <GkitJurIntegracaoPage
        canSync={canSyncGkitJur(context.permissions)}
        data={data}
        feedback={syncFeedback(params)}
        syncAction={syncGkitJurDataJudAction}
      />
    </GkitJurShell>
  )
}
