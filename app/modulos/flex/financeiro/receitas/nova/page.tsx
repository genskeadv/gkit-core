import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createFlexReceitaAction } from '@/features/flex/actions'
import { FlexReceitaForm, FlexShell } from '@/features/flex/components'
import { getFlexFormData, requireFlexContext } from '@/features/flex/queries'

export default async function NovaFlexReceitaPage() {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.importacoes.write')) redirect('/modulos/flex/financeiro/receitas')
  const formData = await getFlexFormData()

  return (
    <FlexShell
      active="receitas"
      title="Nova receita"
      description="Cadastre uma receita manual para ajustes pontuais fora da importação Omie."
      usuario={context.usuario}
    >
      <FlexReceitaForm action={createFlexReceitaAction} formData={formData} />
    </FlexShell>
  )
}
