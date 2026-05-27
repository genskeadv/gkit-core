import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { recalcularIntrFechamentoAction } from '@/features/intr/actions'
import { IntrFechamentoForm, IntrGenericList, IntrListKpis, IntrShell } from '@/features/intr/components'
import { listIntrFechamentoRows, requireIntrContext } from '@/features/intr/queries'

export default async function IntrFechamentosPage() {
  const context = await requireIntrContext()
  const rows = await listIntrFechamentoRows()
  const canWrite = canAccess(context.permissions, 'intr.fechamentos.write')

  return (
    <IntrShell
      active="fechamentos"
      title="Fechamentos"
      description="Competencias, travas, pendencias e saldo operacional de fechamento."
      usuario={context.usuario}
    >
      {canWrite ? (
        <div className="form-actions">
          <Link className="button secondary" href="/modulos/intr/comissoes">Comissoes</Link>
        </div>
      ) : null}
      {canWrite ? <IntrFechamentoForm action={recalcularIntrFechamentoAction} /> : null}
      <IntrListKpis rows={rows} totalLabel="Fechamentos" />
      <IntrGenericList
        title="Competencias"
        description="Resumo dos fechamentos mensais e seus bloqueios operacionais."
        editHrefBase={canWrite ? '/modulos/intr/fechamentos' : undefined}
        empty="Nenhum fechamento encontrado nas views do Intr."
        rows={rows}
      />
    </IntrShell>
  )
}
