import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { IntrGenericList, IntrListKpis, IntrShell } from '@/features/intr/components'
import { listIntrCadastroRows, requireIntrContext } from '@/features/intr/queries'

export default async function IntrCadastrosPage() {
  const context = await requireIntrContext()
  const rows = await listIntrCadastroRows()
  const canManageCommissions = canAccess(context.permissions, 'intr.comissoes.write')

  return (
    <IntrShell
      active="cadastros"
      title="Cadastros"
      description="Cadastros estruturais que sustentam pessoas, receitas, comissoes e pagamentos."
      usuario={context.usuario}
    >
      {canManageCommissions ? (
        <div className="form-actions">
          <Link className="button secondary" href="/modulos/intr/cadastros/tipos-comissao">Tipos de comissao</Link>
        </div>
      ) : null}
      <IntrListKpis rows={rows} totalLabel="Cadastros" />
      <IntrGenericList
        title="Cadastros estruturais"
        description="Mapa dos cadastros principais e disponibilidade das views de apoio."
        empty="Nenhum cadastro estrutural encontrado."
        rows={rows}
      />
    </IntrShell>
  )
}
