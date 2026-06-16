import { gerarFlexSugestoesAction, updateFlexSugestaoStatusAction } from '@/features/flex/actions'
import { FlexCompetenciaForm, FlexSection, FlexShell, FlexSugestoesList } from '@/features/flex/components'
import { listFlexCompetenciaOptions, listFlexSugestoes, requireFlexContext } from '@/features/flex/queries'

export default async function FlexSugestoesPage() {
  const context = await requireFlexContext()
  const [rows, competencias] = await Promise.all([listFlexSugestoes(), listFlexCompetenciaOptions()])

  return (
    <FlexShell
      active="sugestoes"
      title="Sugestões"
      description="Sugestões operacionais iniciais geradas a partir de lançamentos pendentes."
      usuario={context.usuario}
    >
      <FlexSection eyebrow="Inteligência" title="Gerar sugestões" description="Busque pendências recentes ou filtre por uma competência específica.">
        <FlexCompetenciaForm
          action={gerarFlexSugestoesAction}
          button="Gerar sugestões"
          competencias={competencias}
          description="Informe uma competência para filtrar ou deixe em branco para buscar pendências recentes."
          required={false}
          title="Gerar sugestões"
        />
      </FlexSection>
      <FlexSection eyebrow="Fila" title="Sugestões pendentes" description="Aceite ou rejeite sugestões antes do fechamento.">
        <FlexSugestoesList action={updateFlexSugestaoStatusAction} rows={rows} />
      </FlexSection>
    </FlexShell>
  )
}
