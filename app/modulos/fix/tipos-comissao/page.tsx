import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { FixShell, IntrGenericList, IntrListKpis } from '@/features/fix/components'
import { listIntrComissaoTipoRows, requireIntrContext } from '@/features/fix/queries'

export default async function FixTiposComissaoPage() {
  const context = await requireIntrContext()
  const rows = await listIntrComissaoTipoRows()
  const canWrite = canAccess(context.permissions, 'intr.comissoes.write')

  return (
    <FixShell
      active="tiposComissao"
      title="Tipos de comissão"
      description="Regras percentuais usadas pela receita importada para calcular e distribuir comissões."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/fix/tipos-comissao/novo">Novo tipo</Link> : null}
    >
      <IntrListKpis rows={rows} totalLabel="Tipos" />
      <IntrGenericList
        title="Regras cadastradas"
        description="A categoria da receita importada deve bater com a categoria ou o nome do tipo."
        editHrefBase={canWrite ? '/modulos/fix/tipos-comissao' : undefined}
        empty="Nenhum tipo de comissão cadastrado."
        rows={rows}
      />
    </FixShell>
  )
}
