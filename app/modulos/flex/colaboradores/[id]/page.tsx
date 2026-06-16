import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateFlexColaboradorAction } from '@/features/flex/actions'
import { FlexColaboradorForm, FlexShell } from '@/features/flex/components'
import { getFlexColaborador, getFlexFormData, requireFlexContext } from '@/features/flex/queries'

export default async function EditarFlexColaboradorPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.colaboradores.write')) redirect('/modulos/flex/colaboradores')
  const { id } = await params
  const [colaborador, formData] = await Promise.all([getFlexColaborador(id), getFlexFormData()])

  return (
    <FlexShell
      active="colaboradores"
      title="Editar colaborador"
      description="Atualize o complemento financeiro-operacional vinculado ao usuario Core."
      usuario={context.usuario}
    >
      <FlexColaboradorForm action={updateFlexColaboradorAction} colaborador={colaborador} formData={formData} />
    </FlexShell>
  )
}
