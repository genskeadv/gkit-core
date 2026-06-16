import { updateIntrComissaoTipoAction } from '@/features/fix/actions'
import { IntrComissaoTipoForm } from '@/features/fix/components'
import { getIntrComissaoTipo, requireIntrContext } from '@/features/fix/queries'

import { FixShell } from '@/features/fix/components'
export default async function EditarIntrTipoComissaoPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, context] = await Promise.all([params, requireIntrContext()])
  const tipo = await getIntrComissaoTipo(id)

  return (
    <FixShell
      active="tiposComissao"
      title={tipo.nome}
      description="Edite percentual e categoria usada no calculo automatico da importação de receitas."
      usuario={context.usuario}
    >
      <IntrComissaoTipoForm action={updateIntrComissaoTipoAction} tipo={tipo} />
    </FixShell>
  )
}
