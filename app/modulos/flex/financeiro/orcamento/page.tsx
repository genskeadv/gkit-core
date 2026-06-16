import { gerarFlexOrcamentoAction } from '@/features/flex/actions'
import { FlexCompetenciaForm, FlexList, FlexSection, FlexShell } from '@/features/flex/components'
import { listFlexCompetenciaOptions, listFlexOrcamentos, requireFlexContext } from '@/features/flex/queries'

export default async function FlexOrcamentoPage() {
  const context = await requireFlexContext()
  const [rows, competencias] = await Promise.all([listFlexOrcamentos(), listFlexCompetenciaOptions()])

  return (
    <FlexShell
      active="orcamento"
      title="Orçamento"
      description="Previsão de despesas gerada a partir de uma competência base."
      usuario={context.usuario}
    >
      <FlexSection eyebrow="Planejamento" title="Gerar orçamento" description="Projete despesas futuras com base em uma competência realizada.">
        <FlexCompetenciaForm
          action={gerarFlexOrcamentoAction}
          button="Gerar orçamento"
          competencias={competencias}
          description="Use as despesas realizadas na competência base para projetar os próximos meses."
          fields="orcamento"
          title="Gerar previsão"
        />
      </FlexSection>
      <FlexSection eyebrow="Histórico" title="Orçamentos publicados" description="Previsões disponíveis para validação previsto x realizado.">
        <FlexList rows={rows} empty="Nenhum orçamento publicado." />
      </FlexSection>
    </FlexShell>
  )
}
