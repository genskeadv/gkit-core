import { updateIntrComissaoAction } from '@/features/intr/actions'
import { IntrComissaoForm, IntrShell } from '@/features/intr/components'
import { getIntrComissao, getIntrFormData, requireIntrContext } from '@/features/intr/queries'

export default async function EditarIntrComissaoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireIntrContext()
  const { id } = await params
  const [comissao, formData] = await Promise.all([
    getIntrComissao(id),
    getIntrFormData(),
  ])

  return (
    <IntrShell
      active="comissoes"
      title={comissao.cliente ?? 'Comissao'}
      description="Edite valores, percentual, status e observacoes da comissao."
      usuario={context.usuario}
    >
      <IntrComissaoForm action={updateIntrComissaoAction} comissao={comissao} formData={formData} />
    </IntrShell>
  )
}
