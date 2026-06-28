import { requireModuleAccess } from '@/lib/auth/platform'
import { CommissionUploader } from '@/features/gkit-flex/comissoes/CommissionUploader'
import { AppFrame } from '@/features/gkit-flex/ui/AppFrame'

export default async function GkitFlexReceitasPage() {
  await requireModuleAccess('gkit-flex', '/modulos/gkit-flex/receitas')

  return (
    <AppFrame>
      <CommissionUploader />
    </AppFrame>
  )
}
