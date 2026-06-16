import { abrirFlexProximaCompetenciaAction, recalcularFlexFechamentoAction } from '@/features/flex/actions'
import { FlexCompetenciaForm, FlexList, FlexSection, FlexShell } from '@/features/flex/components'
import { getFlexCompetenciaOperacional, listFlexCompetenciaOptions, listFlexFechamentos, requireFlexContext } from '@/features/flex/queries'

export default async function FlexFechamentosPage() {
  const context = await requireFlexContext()
  const [rows, competenciaAtual, competencias] = await Promise.all([listFlexFechamentos(), getFlexCompetenciaOperacional(), listFlexCompetenciaOptions()])

  return (
    <FlexShell active="fechamentos" title="Fechamentos" description="Competencias mensais consolidadas com checklist de pendencias." usuario={context.usuario}>
      <FlexSection
        action={(
          <form action={abrirFlexProximaCompetenciaAction}>
            <button className="button secondary" type="submit">Abrir proxima</button>
          </form>
        )}
        eyebrow="Competencia"
        title={`Preparar ${competenciaAtual.label}`}
        description={`Competencia operacional em status ${competenciaAtual.status}. Recalcule antes de decidir pelo fechamento.`}
      >
        <FlexCompetenciaForm
          action={recalcularFlexFechamentoAction}
          button="Recalcular competencia"
          competencias={competencias}
          defaultCompetencia={competenciaAtual.competenciaMes}
          description="Consolida receitas, despesas, comissoes, pagamentos e pendencias."
          title="Recalcular fechamento"
        />
      </FlexSection>
      <FlexSection eyebrow="Historico" title="Fechamentos gerados" description="Acesse checklist, totais e status de cada competencia.">
        <FlexList rows={rows} empty="Nenhum fechamento recalculado." />
      </FlexSection>
    </FlexShell>
  )
}
