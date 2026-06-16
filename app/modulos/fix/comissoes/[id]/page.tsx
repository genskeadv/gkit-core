import { updateIntrComissaoAction } from '@/features/fix/actions'
import { IntrComissaoForm } from '@/features/fix/components'
import { getIntrComissao, getIntrFormData, requireIntrContext } from '@/features/fix/queries'

import { FixShell } from '@/features/fix/components'
export default async function EditarIntrComissaoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireIntrContext()
  const { id } = await params
  const [comissao, formData] = await Promise.all([
    getIntrComissao(id),
    getIntrFormData(),
  ])

  return (
    <FixShell
      active="comissoes"
      title={comissao.cliente ?? 'Comissao'}
      description="Edite valores, percentual, status e observacoes da comissao."
      usuario={context.usuario}
    >
      <IntrComissaoForm action={updateIntrComissaoAction} comissao={comissao} formData={formData} />
    </FixShell>
  )
}
