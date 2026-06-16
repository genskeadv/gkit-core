import Link from 'next/link'
import { FlexList, FlexSection, FlexShell } from '@/features/flex/components'
import {
  getFlexCompetenciaOperacional,
  listFlexCompetenciaOptions,
  listFlexPrevisaoCalendarioRows,
  listFlexPrevisoesDespesas,
  requireFlexContext,
} from '@/features/flex/queries'

export default async function FlexPrevisaoPage({
  searchParams,
}: {
  searchParams?: Promise<{ competencia?: string }>
}) {
  const params = await searchParams
  const context = await requireFlexContext()
  const [competenciaAtual, competencias] = await Promise.all([getFlexCompetenciaOperacional(), listFlexCompetenciaOptions()])
  const competencia = params?.competencia && /^\d{4}-\d{2}$/.test(params.competencia) ? params.competencia : competenciaAtual.competenciaMes
  const [previsoes, calendario] = await Promise.all([
    listFlexPrevisoesDespesas(competencia),
    listFlexPrevisaoCalendarioRows(competencia),
  ])

  return (
    <FlexShell
      active="previsao"
      title="Previsão e calendário"
      description="Planejamento mensal, pagamentos fixos e comissões previstas por data."
      usuario={context.usuario}
      actions={
        <>
          <Link className="button secondary" href="/modulos/flex/pagamentos/agenda">Revisar agendas</Link>
          <Link className="button" href="/modulos/flex/financeiro/previsao/nova">Nova previsão</Link>
        </>
      }
    >
      <div className="suite-entry-stack flex-despesas-page">
        <FlexSection eyebrow="Filtro" title="Competência" description="Selecione o mês para visualizar a previsão operacional consolidada.">
          <form className="flex-filter-bar">
            <label>
              <span>Competência</span>
              <select name="competencia" defaultValue={competencia}>
                {competencias.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}{item.meta ? ` - ${item.meta}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <button className="button" type="submit">Aplicar filtro</button>
          </form>
        </FlexSection>

        <FlexSection
          className="flex-previsoes-panel"
          eyebrow="Calendário"
          title={`Previsto para ${competencia.slice(5, 7)}/${competencia.slice(0, 4)}`}
          description="Despesas recorrentes, pagamentos fixos dos colaboradores, pagamentos gerados e comissões aprovadas."
        >
          <FlexList bare rows={calendario} empty="Nenhum item previsto para esta competência." />
        </FlexSection>

        <FlexSection
          className="flex-previsoes-panel"
          eyebrow="Planejamento"
          title="Base recorrente de despesas"
          description="Itens de orçamento recorrente usados para validar o extrato importado."
        >
          <FlexList bare rows={previsoes} empty="Nenhuma previsão mensal cadastrada." />
        </FlexSection>
      </div>
    </FlexShell>
  )
}
