import Link from 'next/link'
import { FlexKpis, FlexList, FlexQuickLinks, FlexSection, FlexShell } from '@/features/flex/components'
import { getFlexDashboardData, getFlexFinanceiroResumo, requireFlexContext } from '@/features/flex/queries'

const primaryActions = [
  {
    href: '/modulos/flex/financeiro/receitas',
    title: 'Receitas',
    description: 'Registre entradas e mantenha a base financeira atualizada.',
    label: 'Receitas',
    meta: 'Entrada operacional',
  },
  {
    href: '/modulos/flex/financeiro/previsao',
    title: 'Previsão',
    description: 'Acompanhe planejamento mensal, datas previstas e pagamentos fixos.',
    label: 'Calendário',
    meta: 'Previsto',
  },
  {
    href: '/modulos/flex/financeiro/despesas',
    title: 'Despesas',
    description: 'Valide as despesas realizadas do mês contra a previsão.',
    label: 'Despesas',
    meta: 'Realizado',
  },
  {
    href: '/modulos/flex/colaboradores',
    title: 'Colaboradores',
    description: 'Revise pessoas, times e vínculos que sustentam o cálculo.',
    label: 'Base',
    meta: 'Colab integrado',
  },
  {
    href: '/modulos/flex/comissoes',
    title: 'Comissões',
    description: 'Calcule, confira e aprove valores por competência.',
    label: 'Remuneração',
    meta: 'Aprovação',
  },
]

export default async function FlexPage() {
  const context = await requireFlexContext()
  const [data, financeiro] = await Promise.all([getFlexDashboardData(), getFlexFinanceiroResumo()])
  const tarefas = data.pendencias

  return (
    <FlexShell
      active="cockpit"
      title="Cockpit"
      description="Acompanhamento diário da operação financeira, colaboradores e comissões."
      usuario={context.usuario}
      actions={<Link className="button" href="/modulos/flex/financeiro">Abrir gestão</Link>}
    >
      <FlexSection
        className="flex-command-panel"
        title="Cockpit operacional"
        description="Indicadores e atalhos por operação."
      >
        <div className="flex-command-grid">
          <FlexKpis data={data} />
          <FlexQuickLinks items={primaryActions} />
        </div>
      </FlexSection>

      <FlexSection className="flex-compact-panel" title="Situação financeira" description="Receitas, despesas e pendências em aberto.">
        <FlexKpis data={financeiro} />
      </FlexSection>

      {tarefas.length || financeiro.pendencias.length ? (
        <section className="flex-cockpit-columns">
          <FlexList rows={tarefas} empty="Nenhuma tarefa operacional no momento." title="Tarefas do operador" />
          <FlexList rows={financeiro.pendencias} empty="Nenhuma pendência financeira." title="Pendências financeiras" />
        </section>
      ) : null}
    </FlexShell>
  )
}
