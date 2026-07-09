import { GkitJurLabPage, GkitJurLabShell } from '@/features/gkit-jur/components'
import { getGkitJurLab, requireGkitJurContext } from '@/features/gkit-jur/queries'
import { moduleTarget, type ModuleSearchParams } from '@/lib/auth/platform'

export default async function GkitJurLabRoute({
  searchParams,
}: {
  searchParams?: Promise<ModuleSearchParams>
}) {
  const params = await searchParams
  const [context, data] = await Promise.all([
    requireGkitJurContext(moduleTarget('/modulos/gkit-jur/lab', params)),
    getGkitJurLab(),
  ])

  return (
    <GkitJurLabShell usuario={context.usuario}>
      <GkitJurLabPage data={data} />
    </GkitJurLabShell>
  )
}
