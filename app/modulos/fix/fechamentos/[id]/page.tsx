import Link from 'next/link'
import {
  analisarFixFechamentoAction,
  fecharFixCompetenciaAction,
  reabrirFixCompetenciaAction,
} from '@/features/fix/actions'
import { FixFechamentoChecklistPanel, FixShell } from '@/features/fix/components'
import { getFixFechamentoGovernanca, requireIntrContext } from '@/features/fix/queries'

export default async function EditarFixFechamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireIntrContext()
  const { id } = await params
  const fechamento = await getFixFechamentoGovernanca(id)

  return (
    <FixShell
      active="fechamentos"
      title={`Fechamento ${fechamento.competenciaLabel}`}
      description="Revise o checklist, coloque a competência em análise, feche o período ou reabra administrativamente."
      usuario={context.usuario}
      actions={<Link className="button secondary" href="/modulos/fix/fechamentos">Voltar</Link>}
    >
      <FixFechamentoChecklistPanel
        analisarAction={analisarFixFechamentoAction}
        fecharAction={fecharFixCompetenciaAction}
        fechamento={fechamento}
        reabrirAction={reabrirFixCompetenciaAction}
      />
    </FixShell>
  )
}
