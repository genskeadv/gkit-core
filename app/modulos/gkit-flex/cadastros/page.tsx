import { requireModuleAccess } from '@/lib/auth/platform'
import { MasterDataPage } from '@/features/gkit-flex/cadastros/MasterDataPage'
import { AppFrame } from '@/features/gkit-flex/ui/AppFrame'

export default async function GkitFlexCadastrosPage() {
  const context = await requireModuleAccess('gkit-flex', '/modulos/gkit-flex/cadastros')

  return (
    <AppFrame usuario={context.usuario}>
      <MasterDataPage />
    </AppFrame>
  )
}
