import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import { gerarPagamentosComissoesAprovadasAction } from '@/features/fix/actions'
import { FixShell } from '@/features/fix/components'
import { IntrComissaoOperationalList, IntrComissaoWorkflowActions } from '@/features/fix/components'
import { listIntrComissaoRows, requireIntrContext } from '@/features/fix/queries'

export default async function FixComissoesPage() {
  const context = await requireIntrContext()
  const rows = await listIntrComissaoRows()
  const canWrite = canAccess(context.permissions, 'intr.comissoes.write')

  return (
    <FixShell
      active="comissoes"
      title="Comissões"
      description="Comissões calculadas a partir das receitas Omie, com fluxo de aprovação antes da geração dos pagamentos."
      usuario={context.usuario}
      actions={canWrite ? (
        <>
          <Link className="button secondary" href="/modulos/fix/comissoes/aprovacao">Aprovação</Link>
          <Link className="button" href="/modulos/fix/comissoes/nova">Nova comissão</Link>
        </>
      ) : null}
    >
      {canWrite ? <IntrComissaoWorkflowActions gerarPagamentosAction={gerarPagamentosComissoesAprovadasAction} /> : null}
      <IntrComissaoOperationalList rows={rows} />
    </FixShell>
  )
}
