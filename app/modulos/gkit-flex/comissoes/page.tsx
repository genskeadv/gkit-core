import { requireModuleAccess } from '@/lib/auth/platform'
import { CommissionsPage } from '@/features/gkit-flex/comissoes/CommissionsPage'
import { AppFrame } from '@/features/gkit-flex/ui/AppFrame'

type PageSearchParams = {
  competencia?: string | string[]
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function GkitFlexComissoesPage({ searchParams }: { searchParams?: Promise<PageSearchParams> }) {
  const params = await searchParams
  const context = await requireModuleAccess('gkit-flex', '/modulos/gkit-flex/comissoes')

  return (
    <AppFrame usuario={context.usuario}>
      <CommissionsPage competencia={firstParam(params?.competencia)} />
    </AppFrame>
  )
}
