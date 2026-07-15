import { GkitJurNovoJurPage } from '@/features/gkit-jur/novo-jur'
import { getGkitJurCockpitUnicoData, requireGkitJurContext } from '@/features/gkit-jur/queries'
import { moduleTarget, type ModuleSearchParams } from '@/lib/auth/platform'

export default async function GkitJurNovoJurRoute({
  searchParams,
}: {
  searchParams?: Promise<ModuleSearchParams>
}) {
  const params = await searchParams
  const context = await requireGkitJurContext(moduleTarget('/modulos/gkit-jur/novo-jur', params))
  const data = await getGkitJurCockpitUnicoData()
  const area = typeof params?.area === 'string' ? params.area : undefined

  return <GkitJurNovoJurPage data={data} initialArea={area} usuario={context.usuario} />
}
