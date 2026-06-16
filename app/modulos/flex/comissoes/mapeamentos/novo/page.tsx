import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createFlexReceitaMapeamentoAction } from '@/features/flex/actions'
import { FlexReceitaMapeamentoForm, FlexShell } from '@/features/flex/components'
import { getFlexFormData, requireFlexContext } from '@/features/flex/queries'

export default async function NovoFlexReceitaMapeamentoPage() {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.comissoes.write')) redirect('/modulos/flex/comissoes/mapeamentos')
  const formData = await getFlexFormData()

  return (
    <FlexShell
      active="comissoesMapeamentos"
      title="Novo mapeamento Omie"
      description="Defina o destino operacional do vendedor informado na receita Omie."
      usuario={context.usuario}
    >
      <FlexReceitaMapeamentoForm action={createFlexReceitaMapeamentoAction} formData={formData} />
    </FlexShell>
  )
}
