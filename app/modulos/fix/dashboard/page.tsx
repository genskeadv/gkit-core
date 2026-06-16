import Link from 'next/link'
import { FixResumoCards, IntrGenericList, FixShell } from '@/features/fix/components'
import { getFixFinanceiroResumo, getFixValidacaoDespesaResumo, requireIntrContext } from '@/features/fix/queries'

export default async function FixDashboardPage() {
  const context = await requireIntrContext()
  const resumo = await getFixFinanceiroResumo()
  const validacao = await getFixValidacaoDespesaResumo()

  return (
    <FixShell
      active="dashboard"
      title="Dashboard FIX"
      description="Visão gerencial do módulo financeiro. O cockpit operacional permanece focado em tarefas da competência aberta."
      usuario={context.usuario}
      actions={<Link className="button" href="/modulos/fix">Voltar ao cockpit</Link>}
    >
      <FixResumoCards cards={resumo.cards.slice(0, 4)} />
      <section className="suite-module-grid" aria-label="Atalhos gerenciais financeiros">
        <Link className="suite-module-card" href="/modulos/fix/financeiro/despesas">
          <span>Despesas</span>
          <h2>Analisar despesas</h2>
          <p>Visão por saídas, recorrências, categorias e pontos de atenção.</p>
          <strong>Abrir</strong>
        </Link>
        <Link className="suite-module-card" href="/modulos/fix/financeiro/orcamento">
          <span>Orçamento</span>
          <h2>Orçamento x realizado</h2>
          <p>Acompanhe previsões, desvios e ajustes do planejamento financeiro.</p>
          <strong>Abrir</strong>
        </Link>
        <Link className="suite-module-card" href="/modulos/fix/relatorios">
          <span>Relatórios</span>
          <h2>Relatórios de gestão</h2>
          <p>Acesse análises sintéticas e detalhadas para acompanhamento gerencial.</p>
          <strong>Abrir</strong>
        </Link>
      </section>
      <IntrGenericList
        title="Pendências que afetam a gestão"
        description="Itens operacionais que impactam a leitura gerencial do período."
        rows={validacao.pendentes.slice(0, 8)}
        empty="Nenhuma pendência de validação."
        editHrefBase="/modulos/fix/financeiro/validacao"
      />
    </FixShell>
  )
}
