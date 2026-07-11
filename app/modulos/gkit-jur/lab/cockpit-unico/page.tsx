import { GkitJurCockpitMockup } from '@/features/gkit-jur/lab-cockpit-mockup'
import { getGkitJurCockpitUnicoData, requireGkitJurContext } from '@/features/gkit-jur/queries'
import { moduleTarget, type ModuleSearchParams } from '@/lib/auth/platform'

export default async function GkitJurCockpitUnicoLabRoute({
  searchParams,
}: {
  searchParams?: Promise<ModuleSearchParams>
}) {
  const params = await searchParams
  const context = await requireGkitJurContext(moduleTarget('/modulos/gkit-jur/lab/cockpit-unico', params))
  const data = await getGkitJurCockpitUnicoData()
  const area = typeof params?.area === 'string' ? params.area : undefined

  return <GkitJurCockpitMockup data={data} initialArea={area} usuario={context.usuario} />
}
