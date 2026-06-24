import Link from 'next/link'
import { FlexList, FlexSection, FlexShell } from '@/features/flex/components'
import {
  getFlexCompetenciaOperacional,
  listFlexCompetenciaOptions,
  listFlexPrevisaoComissoesPagamentos,
  listFlexPrevisoesDespesas,
  requireFlexContext,
} from '@/features/flex/queries'

function parseMoneyValue(value: string) {
  const normalized = value.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })
}

export default async function FlexPrevisaoPage({
  searchParams,
}: {
  searchParams?: Promise<{ competencia?: string }>
}) {
  const params = await searchParams
  const context = await requireFlexContext()
  const [competenciaAtual, competencias] = await Promise.all([getFlexCompetenciaOperacional(), listFlexCompetenciaOptions()])
  const competencia = params?.competencia && /^\d{4}-\d{2}$/.test(params.competencia) ? params.competencia : competenciaAtual.competenciaMes
  const [previsoes, comissoes] = await Promise.all([
    listFlexPrevisoesDespesas(competencia),
    listFlexPrevisaoComissoesPagamentos(competencia),
  ])
  const rows = [...previsoes, ...comissoes]
  const totalPrevisoes = rows.reduce((sum, row) => sum + parseMoneyValue(row.value), 0)

  return (
    <FlexShell
      active="previsao"
      title="Previsão"
      description="Base mensal recorrente, comissões aprovadas e pagamentos previstos para validação do caixa."
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
          action={<span className="suite-pill primary">Total {formatMoney(totalPrevisoes)}</span>}
          className="flex-previsoes-panel"
          eyebrow="Planejamento"
          title="Previsão de despesas"
          description="Base recorrente e comissões aprovadas para pagamento na competência."
        >
          <FlexList bare rows={rows} empty="Nenhuma previsão mensal cadastrada." />
        </FlexSection>
      </div>
    </FlexShell>
  )
}
