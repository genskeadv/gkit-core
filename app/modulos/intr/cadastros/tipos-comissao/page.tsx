import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { IntrGenericList, IntrListKpis, IntrShell } from '@/features/intr/components'
import { listIntrComissaoTipoRows, requireIntrContext } from '@/features/intr/queries'

export default async function IntrTiposComissaoPage() {
  const context = await requireIntrContext()
  const rows = await listIntrComissaoTipoRows()
  const canWrite = canAccess(context.permissions, 'intr.comissoes.write')

  return (
    <IntrShell
      active="cadastros"
      title="Tipos de comissao"
      description="Percentuais usados pela importacao de receitas para calcular e distribuir comissoes."
      usuario={context.usuario}
    >
      {canWrite ? (
        <div className="form-actions">
          <Link className="button secondary" href="/modulos/intr/cadastros">Cadastros</Link>
          <Link className="button" href="/modulos/intr/cadastros/tipos-comissao/novo">Novo tipo</Link>
        </div>
      ) : null}
      <IntrListKpis rows={rows} totalLabel="Tipos" />
      <IntrGenericList
        title="Regras cadastradas"
        description="A categoria da receita importada deve bater com a categoria ou o nome do tipo."
        editHrefBase={canWrite ? '/modulos/intr/cadastros/tipos-comissao' : undefined}
        empty="Nenhum tipo de comissao cadastrado."
        rows={rows}
      />
    </IntrShell>
  )
}
