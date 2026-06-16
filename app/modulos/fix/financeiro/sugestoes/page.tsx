import { FixGerarInteligenciaForm, FixSugestoesAcionaveis, IntrListKpis, FixShell } from '@/features/fix/components'
import { aceitarFixSugestaoAction, gerarFixPrevisaoMensalAction, gerarFixSugestoesInteligentesAction, rejeitarFixSugestaoAction } from '@/features/fix/actions'
import { listFixSugestaoRows, requireIntrContext } from '@/features/fix/queries'

export default async function FixSugestoesPage() {
  const context = await requireIntrContext()
  const rows = await listFixSugestaoRows()

  return (
    <FixShell
      active="sugestoes"
      title="Sugestões inteligentes"
      description="Ajustes detectados a cada importação mensal: recorrências, divergências, comissões e classificações pendentes."
      usuario={context.usuario}
    >
      <FixGerarInteligenciaForm
        gerarPrevisaoAction={gerarFixPrevisaoMensalAction}
        gerarSugestoesAction={gerarFixSugestoesInteligentesAction}
      />
      <IntrListKpis rows={rows} totalLabel="Sugestões" />
      <FixSugestoesAcionaveis
        rows={rows}
        aceitarAction={aceitarFixSugestaoAction}
        rejeitarAction={rejeitarFixSugestaoAction}
      />
    </FixShell>
  )
}
