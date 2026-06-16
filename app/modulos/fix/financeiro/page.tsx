import Link from 'next/link'
import { FixResumoCards, IntrGenericList, FixShell } from '@/features/fix/components'
import { getFixFinanceiroResumo, getFixValidacaoDespesaResumo, requireIntrContext } from '@/features/fix/queries'

export default async function FixFinanceiroPage() {
  const context = await requireIntrContext()
  const resumo = await getFixFinanceiroResumo()
  const validacao = await getFixValidacaoDespesaResumo()

  return (
    <FixShell
      active="financeiro"
      title="Financeiro"
      description="Despesas realizadas, orçamento de despesas e validação dos desvios."
      usuario={context.usuario}
      actions={<Link className="button" href="/modulos/fix/importacoes">Nova importação</Link>}
    >
      <FixResumoCards cards={resumo.cards.slice(0, 4)} />
      <section className="suite-module-grid" aria-label="Atalhos financeiros">
        <Link className="suite-module-card" href="/modulos/fix/financeiro/despesas">
          <span>Despesas</span>
          <h2>Classificar</h2>
          <p>Revise saídas sem categoria e mantenha a base limpa.</p>
          <strong>Abrir</strong>
        </Link>
        <Link className="suite-module-card" href="/modulos/fix/financeiro/orcamento">
          <span>Orçamento</span>
          <h2>Prever</h2>
          <p>Gere orçamento a partir das despesas recorrentes.</p>
          <strong>Abrir</strong>
        </Link>
        <Link className="suite-module-card" href="/modulos/fix/financeiro/validacao">
          <span>Validação</span>
          <h2>Tratar desvios</h2>
          <p>Compare previsto x realizado e ajuste o futuro.</p>
          <strong>Abrir</strong>
        </Link>
      </section>
      <IntrGenericList
        title="Pendências de validação"
        description="Itens que exigem ação antes do fechamento da competência."
        rows={validacao.pendentes.slice(0, 8)}
        empty="Nenhuma pendência de validação."
        editHrefBase="/modulos/fix/financeiro/validacao"
      />
    </FixShell>
  )
}
