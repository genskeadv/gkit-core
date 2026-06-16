import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { updateFlexReceitaMapeamentoAction } from '@/features/flex/actions'
import { FlexReceitaMapeamentoForm, FlexShell } from '@/features/flex/components'
import { getFlexFormData, getFlexReceitaMapeamento, requireFlexContext } from '@/features/flex/queries'

export default async function EditarFlexReceitaMapeamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.comissoes.write')) redirect('/modulos/flex/comissoes/mapeamentos')
  const { id } = await params
  const [formData, mapeamento] = await Promise.all([
    getFlexFormData(),
    getFlexReceitaMapeamento(id),
  ])

  return (
    <FlexShell
      active="comissoesMapeamentos"
      title="Editar mapeamento Omie"
      description="Ajuste o destino usado para preencher receitas antes da apuração."
      usuario={context.usuario}
    >
      <FlexReceitaMapeamentoForm action={updateFlexReceitaMapeamentoAction} formData={formData} mapeamento={mapeamento} />
    </FlexShell>
  )
}
