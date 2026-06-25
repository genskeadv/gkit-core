import { moduleTarget, type ModuleSearchParams } from '@/lib/auth/platform'
import { GkitDirPage, GkitDirShell } from '@/features/gkit-dir/components'
import { getGkitDirData, requireGkitDirContext } from '@/features/gkit-dir/queries'

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

export default async function GkitDirRoute({ searchParams }: { searchParams?: Promise<ModuleSearchParams> }) {
  const params = await searchParams
  const context = await requireGkitDirContext(moduleTarget('/modulos/gkit-dir', params))
  const data = await getGkitDirData(context, {
    carteira: param(params?.carteira),
    dir: param(params?.dir),
    q: param(params?.q),
    sort: param(params?.sort),
    tipo: param(params?.tipo),
  })

  return (
    <GkitDirShell usuario={context.usuario}>
      <GkitDirPage {...data} />
    </GkitDirShell>
  )
}
