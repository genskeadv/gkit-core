import Link from 'next/link'
import { FlexKpis, FlexList, FlexQuickLinks, FlexSection, FlexShell } from '@/features/flex/components'
import { getFlexFluxoCaixaCockpit, listFlexCompetenciaOptions, requireFlexContext } from '@/features/flex/queries'

const primaryActions = [
  {
    href: '/modulos/flex/financeiro/previsao',
    title: 'Previsão',
    description: 'Base de despesas recorrentes, comissões e vencimentos do mês.',
    label: 'Previsto',
    meta: 'Planejamento',
  },
  {
    href: '/modulos/flex/financeiro/despesas',
    title: 'Despesas',
    description: 'Extrato do mês classificado e vinculado à previsão.',
    label: 'Pago',
    meta: 'Realizado',
  },
  {
    href: '/modulos/flex/financeiro/validacao',
    title: 'Validação',
    description: 'Trate divergências entre previsto e realizado.',
    label: 'Conciliação',
    meta: 'Pendências',
  },
  {
    href: '/modulos/flex/financeiro',
    title: 'Gestão',
    description: 'Histórico de comissões, rotas e fechamento operacional.',
    label: 'Gestão',
    meta: 'Controle',
  },
  {
    href: '/modulos/flex/importacoes',
    title: 'Importações',
    description: 'Atualize receitas Omie e extrato OFX do Banco Inter.',
    label: 'Entrada',
    meta: 'Dados',
  },
]

export default async function FlexPage({
  searchParams,
}: {
  searchParams?: Promise<{ competencia?: string }>
}) {
  const params = await searchParams
  const context = await requireFlexContext()
  const competencia = params?.competencia && /^\d{4}-\d{2}$/.test(params.competencia) ? params.competencia : undefined
  const [fluxo, competencias] = await Promise.all([
    getFlexFluxoCaixaCockpit(competencia),
    listFlexCompetenciaOptions(),
  ])

  return (
    <FlexShell
      active="cockpit"
      title="Cockpit"
      description={`Gestão do fluxo de caixa da competência ${fluxo.label}.`}
      usuario={context.usuario}
      actions={(
        <>
          <Link className="button secondary" href={`/modulos/flex/financeiro/previsao?competencia=${fluxo.competenciaMes}`}>Abrir previsão</Link>
          <Link className="button" href={`/modulos/flex/financeiro/despesas?competencia=${fluxo.competenciaMes}`}>Abrir despesas</Link>
        </>
      )}
    >
      <FlexSection
        className="flex-command-panel flex-cashflow-panel"
        title="Fluxo de caixa"
        description="Previsto, pago no extrato, conciliado com a previsão e valores ainda em aberto."
      >
        <form className="flex-filter-bar">
          <label>
            <span>Competência</span>
            <select name="competencia" defaultValue={fluxo.competenciaMes}>
              {competencias.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}{item.meta ? ` - ${item.meta}` : ''}
                </option>
              ))}
            </select>
          </label>
          <button className="button" type="submit">Aplicar filtro</button>
        </form>
        <div className="flex-command-grid">
          <FlexKpis data={{ cards: fluxo.cards, pendencias: [], pendenciasReceitas: [], pendenciasDespesas: [] }} />
          <FlexQuickLinks items={primaryActions} />
        </div>
      </FlexSection>

      <section className="flex-cockpit-columns flex-cashflow-columns">
        <FlexList rows={fluxo.previstas} empty="Nenhuma previsão ativa para a competência." title="Previsto x pago" />
        <FlexList rows={fluxo.abertas} empty="Nada em aberto para a competência." title="Falta pagar" />
      </section>

      <FlexSection className="flex-compact-panel" title="Pagamentos do mês" description="Saídas do extrato conciliadas ou fora da previsão mensal.">
        <FlexList bare rows={fluxo.movimentos} empty="Nenhuma saída de extrato importada para a competência." />
      </FlexSection>
    </FlexShell>
  )
}
