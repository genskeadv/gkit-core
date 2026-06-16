import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createFlexColaboradorAction } from '@/features/flex/actions'
import { FlexColaboradorForm, FlexShell } from '@/features/flex/components'
import { getFlexFormData, requireFlexContext } from '@/features/flex/queries'

export default async function NovoFlexColaboradorPage() {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.colaboradores.write')) redirect('/modulos/flex/colaboradores')
  const formData = await getFlexFormData()

  return (
    <FlexShell
      active="colaboradores"
      title="Novo colaborador"
      description="Vincule um usuario Core ao complemento financeiro-operacional do Flex."
      usuario={context.usuario}
    >
      <FlexColaboradorForm action={createFlexColaboradorAction} formData={formData} />
    </FlexShell>
  )
}
