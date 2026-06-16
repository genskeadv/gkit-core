import { createIntrComissaoTipoAction } from '@/features/fix/actions'
import { IntrComissaoTipoForm } from '@/features/fix/components'
import { requireIntrContext } from '@/features/fix/queries'

import { FixShell } from '@/features/fix/components'
export default async function NovoIntrTipoComissaoPage() {
  const context = await requireIntrContext()

  return (
    <FixShell
      active="tiposComissao"
      title="Novo tipo de comissao"
      description="Cadastre percentual e categoria usada no calculo automatico da importação de receitas."
      usuario={context.usuario}
    >
      <IntrComissaoTipoForm action={createIntrComissaoTipoAction} />
    </FixShell>
  )
}
