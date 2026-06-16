import { IntrGenericList, FixShell } from '@/features/fix/components'
import { gerarFixOrcamentoDespesasAction } from '@/features/fix/actions'
import { listFixDespesaRecorrenteRows, listFixOrcamentoRows, requireIntrContext } from '@/features/fix/queries'

export default async function FixOrcamentoPage() {
  const context = await requireIntrContext()
  const [rows, recorrentes] = await Promise.all([
    listFixOrcamentoRows(),
    listFixDespesaRecorrenteRows(),
  ])

  return (
    <FixShell
      active="orcamento"
      title="Orçamento"
      description="Previsão de despesas criada a partir das recorrências reais."
      usuario={context.usuario}
    >
      <section className="card suite-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Gerar orçamento</h2>
            <p>Escolha uma competência base e publique a previsão futura.</p>
          </div>
        </div>
        <form action={gerarFixOrcamentoDespesasAction} className="module-form-grid">
          <label>
            <span>Competência base</span>
            <input name="competencia_base" type="month" required />
          </label>
          <label>
            <span>Meses</span>
            <input name="meses_previsao" type="number" min="1" max="12" defaultValue="3" />
          </label>
          <button className="button" type="submit">Gerar</button>
        </form>
      </section>
      <section className="suite-split-grid">
        <IntrGenericList
          title="Orçamento publicado"
          description="Itens previstos por competência e categoria."
          rows={rows.slice(0, 20)}
          empty="Nenhum orçamento gerado ainda."
        />
        <IntrGenericList
          title="Base recorrente"
          description="Despesas que alimentam a previsão."
          rows={recorrentes.slice(0, 12)}
          empty="Nenhum gerador recorrente detectado."
        />
      </section>
    </FixShell>
  )
}
