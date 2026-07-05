import { requireModuleAccess } from '@/lib/auth/platform'
import { ReceitasPage } from '@/features/gkit-flex/receitas/ReceitasPage'
import { AppFrame } from '@/features/gkit-flex/ui/AppFrame'

type PageSearchParams = {
  competencia?: string | string[]
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function GkitFlexReceitasPage({ searchParams }: { searchParams?: Promise<PageSearchParams> }) {
  const params = await searchParams
  const context = await requireModuleAccess('gkit-flex', '/modulos/gkit-flex/receitas')

  return (
    <AppFrame usuario={context.usuario}>
      <ReceitasPage competencia={firstParam(params?.competencia)} />
    </AppFrame>
  )
}
