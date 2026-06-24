import { abrirFlexProximaCompetenciaAction, recalcularFlexFechamentoAction } from '@/features/flex/actions'
import { FlexCompetenciaForm, FlexList, FlexSection, FlexShell } from '@/features/flex/components'
import { getFlexCompetenciaOperacional, listFlexCompetenciaOptions, listFlexFechamentos, requireFlexContext } from '@/features/flex/queries'

export default async function FlexFechamentosPage() {
  const context = await requireFlexContext()
  const [rows, competenciaAtual, competencias] = await Promise.all([listFlexFechamentos(), getFlexCompetenciaOperacional(), listFlexCompetenciaOptions()])

  return (
    <FlexShell active="fechamentos" title="Fechamentos" description="Competências mensais consolidadas com checklist de pendências." usuario={context.usuario}>
      <FlexSection
        action={(
          <form action={abrirFlexProximaCompetenciaAction}>
            <button className="button secondary" type="submit">Abrir próxima</button>
          </form>
        )}
        eyebrow="Competência"
        title={`Preparar ${competenciaAtual.label}`}
        description={`Competência operacional em status ${competenciaAtual.status}. Recalcule antes de decidir pelo fechamento.`}
      >
        <FlexCompetenciaForm
          action={recalcularFlexFechamentoAction}
          button="Recalcular competência"
          competencias={competencias}
          defaultCompetencia={competenciaAtual.competenciaMes}
          description="Consolida receitas, despesas, comissões, pagamentos e pendências."
          title="Recalcular fechamento"
        />
      </FlexSection>
      <FlexSection eyebrow="Histórico" title="Fechamentos gerados" description="Acesse checklist, totais e status de cada competência.">
        <FlexList rows={rows} empty="Nenhum fechamento recalculado." />
      </FlexSection>
    </FlexShell>
  )
}
