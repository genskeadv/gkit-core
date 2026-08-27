import { completeGkliAtendeTaskAction, startGkliAtendeTaskAction } from '@/features/gkli-atende/actions'
import { GkliAtendePage } from '@/features/gkli-atende/components'
import { canWriteGkliAtende, getGkliAtendeData, requireGkliAtendeContext } from '@/features/gkli-atende/queries'
import { moduleTarget } from '@/lib/auth/platform'
import type { ModuleSearchParams } from '@/lib/auth/platform'

export default async function GkliAtendeRoute({ searchParams }: { searchParams?: ModuleSearchParams }) {
  const context = await requireGkliAtendeContext(moduleTarget('/modulos/gkli-atende', searchParams))
  const data = await getGkliAtendeData(context.usuario)

  return (
    <GkliAtendePage
      data={data}
      usuario={context.usuario}
      canWrite={canWriteGkliAtende(context.permissions)}
      startTaskAction={startGkliAtendeTaskAction}
      completeTaskAction={completeGkliAtendeTaskAction}
    />
  )
}
