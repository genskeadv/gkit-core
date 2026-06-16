import { createIntrComissaoAction } from '@/features/fix/actions'
import { IntrComissaoForm } from '@/features/fix/components'
import { getIntrFormData, requireIntrContext } from '@/features/fix/queries'

import { FixShell } from '@/features/fix/components'
export default async function NovaIntrComissaoPage() {
  const context = await requireIntrContext()
  const formData = await getIntrFormData()

  return (
    <FixShell
      active="comissoes"
      title="Nova comissao"
      description="Lance comissao por colaborador, cliente, categoria e competencia."
      usuario={context.usuario}
    >
      <IntrComissaoForm action={createIntrComissaoAction} formData={formData} />
    </FixShell>
  )
}
