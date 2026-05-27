import { createIntrComissaoAction } from '@/features/intr/actions'
import { IntrComissaoForm, IntrShell } from '@/features/intr/components'
import { getIntrFormData, requireIntrContext } from '@/features/intr/queries'

export default async function NovaIntrComissaoPage() {
  const context = await requireIntrContext()
  const formData = await getIntrFormData()

  return (
    <IntrShell
      active="comissoes"
      title="Nova comissao"
      description="Lance comissao por colaborador, cliente, categoria e competencia."
      usuario={context.usuario}
    >
      <IntrComissaoForm action={createIntrComissaoAction} formData={formData} />
    </IntrShell>
  )
}
