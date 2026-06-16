import { FixResumoCards, FixShell, FixValidacaoDespesasList, IntrGenericList } from '@/features/fix/components'
import {
  atualizarFixOrcamentoFuturoPorValidacaoAction,
  gerarFixValidacaoDespesasAction,
  ignorarFixValidacaoDespesaAction,
  registrarFixDesvioDespesaAction,
} from '@/features/fix/actions'
import { getFixValidacaoDespesaResumo, requireIntrContext } from '@/features/fix/queries'

export default async function FixValidacaoDespesasPage() {
  const context = await requireIntrContext()
  const resumo = await getFixValidacaoDespesaResumo()
  const tratadas = [...resumo.registradas, ...resumo.ignoradas]

  return (
    <FixShell
      active="validacao"
      title="Validação"
      description="Previsto x realizado das despesas, com foco nos desvios que exigem ação."
      usuario={context.usuario}
    >
      <section className="card suite-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Gerar validação</h2>
            <p>Compare orçamento publicado com despesas realizadas da competência.</p>
          </div>
        </div>
        <form action={gerarFixValidacaoDespesasAction} className="module-form-grid">
          <label>
            <span>Competência</span>
            <input name="competencia" type="month" required />
          </label>
          <label>
            <span>Tolerância %</span>
            <input name="tolerancia_percentual" type="number" step="0.01" min="0" max="100" defaultValue="5" />
          </label>
          <button className="button" type="submit">Validar</button>
        </form>
      </section>

      <FixResumoCards cards={resumo.cards.slice(0, 4)} />

      <FixValidacaoDespesasList
        title="Pendências"
        rows={resumo.pendentes}
        empty="Nenhuma divergência, nova despesa ou despesa não localizada."
        registrarAction={registrarFixDesvioDespesaAction}
        ignorarAction={ignorarFixValidacaoDespesaAction}
        ajustarAction={atualizarFixOrcamentoFuturoPorValidacaoAction}
      />

      <IntrGenericList
        title="Tratadas manualmente"
        description="Desvios registrados ou itens ignorados com justificativa."
        rows={tratadas.slice(0, 12)}
        empty="Nenhum tratamento manual registrado."
      />
    </FixShell>
  )
}
