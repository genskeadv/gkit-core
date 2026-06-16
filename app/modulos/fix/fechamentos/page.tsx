import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { recalcularFixFechamentoCompetenciaAction } from '@/features/fix/actions'
import { FixFechamentoCreatePanel, FixShell, IntrGenericList } from '@/features/fix/components'
import { listFixFechamentoGovernancaRows, requireIntrContext } from '@/features/fix/queries'

export default async function FixFechamentosPage() {
  const context = await requireIntrContext()
  const rows = await listFixFechamentoGovernancaRows()
  const canWrite = canAccess(context.permissions, 'intr.fechamentos.write')

  return (
    <FixShell
      active="fechamentos"
      title="Fechamentos"
      description="Checklist e snapshot da competência. Sem dashboard: apenas status e pendências."
      usuario={context.usuario}
      actions={<Link className="button secondary" href="/modulos/fix">Cockpit</Link>}
    >
      {canWrite ? <FixFechamentoCreatePanel action={recalcularFixFechamentoCompetenciaAction} /> : null}
      <IntrGenericList
        title="Competências"
        description="Abra uma competência para ver checklist, pendências e ações de fechamento."
        editHrefBase="/modulos/fix/fechamentos"
        empty="Nenhuma competência gerada ainda."
        rows={rows}
      />
    </FixShell>
  )
}
