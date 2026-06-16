import { redirect } from 'next/navigation'
import { updateFlexReceitaClassificacaoAction } from '@/features/flex/actions'
import { FlexReceitaClassificacaoForm, FlexShell } from '@/features/flex/components'
import { getFlexFormData, getFlexReceita, requireFlexContext } from '@/features/flex/queries'
import { canAccess } from '@/lib/auth/permissions'

export default async function EditarFlexReceitaPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireFlexContext()
  if (!canAccess(context.permissions, 'flex.financeiro.write')) redirect('/modulos/flex/financeiro?pendencias=receitas')
  const { id } = await params
  const [formData, receita] = await Promise.all([
    getFlexFormData(),
    getFlexReceita(id),
  ])

  return (
    <FlexShell
      active="receitas"
      title="Ajustar receita"
      description="Complete categoria e destino operacional para retirar a receita da fila de Gestão."
      usuario={context.usuario}
    >
      <FlexReceitaClassificacaoForm action={updateFlexReceitaClassificacaoAction} formData={formData} receita={receita} />
    </FlexShell>
  )
}
