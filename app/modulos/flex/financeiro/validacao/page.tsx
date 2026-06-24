import { decidirFlexValidacaoItemAction, gerarFlexValidacaoAction, gerarFlexValidacaoItensAction } from '@/features/flex/actions'
import { FlexCompetenciaForm, FlexList, FlexSection, FlexShell, FlexValidacaoItensList } from '@/features/flex/components'
import { getFlexCompetenciaOperacional, listFlexCompetenciaOptions, listFlexValidacaoItensRaw, listFlexValidacoes, requireFlexContext } from '@/features/flex/queries'

function competenciaDate(value: string) {
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : undefined
}

export default async function FlexValidacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ competencia?: string }>
}) {
  const filters = await searchParams
  const competenciaAtual = await getFlexCompetenciaOperacional()
  const competencia = filters.competencia && competenciaDate(filters.competencia) ? filters.competencia : competenciaAtual.competenciaMes
  const competenciaCompleta = `${competencia}-01`
  const context = await requireFlexContext()
  const [rows, itens, competencias] = await Promise.all([
    listFlexValidacoes(competenciaCompleta),
    listFlexValidacaoItensRaw(competenciaCompleta, 'pendente'),
    listFlexCompetenciaOptions(),
  ])

  return (
    <FlexShell
      active="validacao"
      title="Validação"
      description={`Fechamento operacional de despesas da competência ${competencia}.`}
      usuario={context.usuario}
    >
      <FlexSection eyebrow="Controle" title="Validação item a item" description="Feche uma competência por vez comparando a previsão mensal com o extrato.">
        <FlexCompetenciaForm
          action={gerarFlexValidacaoItensAction}
          button="Validar despesas"
          competencias={competencias}
          defaultCompetencia={competencia}
          description="Gera somente pendências operacionais da competência selecionada."
          title="Validar competência"
        />
      </FlexSection>
      <FlexSection eyebrow="Decisões" title={`Pendências de ${competencia}`} description="Cada item exige uma decisão antes de alterar a previsão.">
        <FlexValidacaoItensList action={decidirFlexValidacaoItemAction} rows={itens} />
      </FlexSection>
      <FlexSection eyebrow="Histórico" title="Validação por categoria" description="Comparação agregada mantida para compatibilidade com orcamentos publicados.">
        <FlexCompetenciaForm
          action={gerarFlexValidacaoAction}
          button="Validar orçamento"
          competencias={competencias}
          defaultCompetencia={competencia}
          description="Marca desvios agregados acima de 5% ou R$ 50."
          title="Validar orçamento"
        />
      </FlexSection>
      <FlexSection eyebrow="Desvios" title="Validações agregadas" description={`Diferenças por categoria em ${competencia}.`}>
        <FlexList rows={rows} empty="Nenhuma validação agregada gerada para esta competência." />
      </FlexSection>
    </FlexShell>
  )
}
