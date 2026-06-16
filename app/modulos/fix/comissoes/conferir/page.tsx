import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { updateIntrComissaoStatusAction } from '@/features/fix/actions'
import { IntrComissaoDetailList, IntrListKpis } from '@/features/fix/components'
import { listIntrComissaoDetalheRows, requireIntrContext } from '@/features/fix/queries'

import { FixShell } from '@/features/fix/components'
export default async function ConferirIntrComissoesPage({
  searchParams,
}: {
  searchParams: Promise<{ colaborador?: string; tipo?: string }>
}) {
  const filters = await searchParams
  const context = await requireIntrContext()
  const rows = await listIntrComissaoDetalheRows({ colaborador: filters.colaborador, tipo: filters.tipo })
  const canWrite = canAccess(context.permissions, 'intr.comissoes.write')

  return (
    <FixShell
      active="comissoes"
      title="Conferir comissoes"
      description={filters.tipo ? `Lancamentos detalhados de ${filters.tipo}.` : 'Lancamentos detalhados de comissao.'}
      usuario={context.usuario}
      actions={<Link className="button" href="/modulos/fix/comissoes">Voltar</Link>}
    >
      <IntrListKpis rows={rows} totalLabel="Lancamentos" />
      <IntrComissaoDetailList
        canWrite={canWrite}
        rows={rows}
        statusAction={updateIntrComissaoStatusAction}
      />
    </FixShell>
  )
}
