import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { FixShell, IntrGenericList, IntrListKpis } from '@/features/fix/components'
import { listIntrTimeRows, requireIntrContext } from '@/features/fix/queries'

export default async function FixTimesPage() {
  const context = await requireIntrContext()
  const rows = await listIntrTimeRows()
  const canWrite = canAccess(context.permissions, 'intr.times.write')

  return (
    <FixShell
      active="times"
      title="Times"
      description="Agrupamento operacional de colaboradores por equipe, gestor e custo mensal."
      usuario={context.usuario}
      actions={canWrite ? <Link className="button" href="/modulos/fix/times/novo">Novo time</Link> : null}
    >
      <IntrListKpis rows={rows} totalLabel="Times" />
      <IntrGenericList
        title="Times publicados"
        description="Resumo dos times usado no motor de remuneração variável do FIX."
        editHrefBase={canWrite ? '/modulos/fix/times' : undefined}
        empty="Nenhum time encontrado nas views do Intr."
        rows={rows}
      />
    </FixShell>
  )
}
