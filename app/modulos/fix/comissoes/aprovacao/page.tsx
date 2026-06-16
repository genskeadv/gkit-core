import Link from 'next/link'
import { canAccess } from '@/lib/auth/permissions'
import {
  aprovarFixComissaoAction,
  aprovarFixComissoesCompetenciaAction,
  devolverFixComissaoParaAprovacaoAction,
  gerarPagamentosComissoesAprovadasAction,
  rejeitarFixComissaoAction,
} from '@/features/fix/actions'
import {
  FixComissaoAprovacaoActions,
  FixComissaoAprovacaoList,
  FixShell,
} from '@/features/fix/components'
import {
  listFixComissoesAprovacaoRows,
  requireIntrContext,
} from '@/features/fix/queries'

export default async function FixComissoesAprovacaoPage() {
  const context = await requireIntrContext()
  const rows = await listFixComissoesAprovacaoRows()
  const canWrite = canAccess(context.permissions, 'intr.comissoes.write')

  return (
    <FixShell
      active="comissoes"
      title="Aprovação de comissões"
      description="Aprove, rejeite ou devolva comissões calculadas. Pagamentos só nascem após aprovação."
      usuario={context.usuario}
      actions={<Link className="button secondary" href="/modulos/fix/comissoes">Voltar</Link>}
    >
      {canWrite ? (
        <FixComissaoAprovacaoActions
          aprovarCompetenciaAction={aprovarFixComissoesCompetenciaAction}
          gerarPagamentosAction={gerarPagamentosComissoesAprovadasAction}
        />
      ) : null}
      <FixComissaoAprovacaoList
        aprovarAction={aprovarFixComissaoAction}
        canWrite={canWrite}
        devolverAction={devolverFixComissaoParaAprovacaoAction}
        rejeitarAction={rejeitarFixComissaoAction}
        rows={rows}
      />
    </FixShell>
  )
}
