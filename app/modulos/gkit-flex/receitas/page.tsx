import { requireModuleAccess } from '@/lib/auth/platform'
import { CommissionUploader } from '@/features/gkit-flex/comissoes/CommissionUploader'
import { AppFrame } from '@/features/gkit-flex/ui/AppFrame'

export default async function GkitFlexReceitasPage() {
  const context = await requireModuleAccess('gkit-flex', '/modulos/gkit-flex/receitas')

  return (
    <AppFrame usuario={context.usuario}>
      <CommissionUploader />
    </AppFrame>
  )
}
