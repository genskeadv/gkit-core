import { fecharIntrFechamentoAction, recalcularIntrFechamentoAction } from '@/features/intr/actions'
import { IntrFechamentoForm, IntrShell } from '@/features/intr/components'
import { countIntrFechamentoDivergencias, getIntrFechamento, requireIntrContext } from '@/features/intr/queries'

export default async function EditarIntrFechamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireIntrContext()
  const { id } = await params
  const fechamento = await getIntrFechamento(id)
  const divergencias = await countIntrFechamentoDivergencias(fechamento.competencia)

  return (
    <IntrShell
      active="fechamentos"
      title={`Fechamento ${fechamento.competencia}`}
      description="Recalcule totais, acompanhe pendencias e feche a competencia mensal."
      usuario={context.usuario}
    >
      <IntrFechamentoForm action={recalcularIntrFechamentoAction} fechamento={fechamento} />
      <form action={fecharIntrFechamentoAction} className="card suite-panel module-form-grid">
        <input type="hidden" name="id" value={fechamento.id} />
        <div className="module-form-wide">
          <h2>Fechar competencia</h2>
          <p>O fechamento so conclui quando nao houver comissoes em conferencia, pagamentos pendentes ou divergencias nao aceitas.</p>
        </div>
        {divergencias ? (
          <div className="suite-empty-block warning module-form-wide">
            <strong>{divergencias} pagamento(s) com valor divergente</strong>
            <span>Corrija os pagamentos antes de fechar ou marque a opcao abaixo para lancar como valores divergentes.</span>
          </div>
        ) : null}
        <label className="checkbox-row module-form-wide">
          <input name="aceitar_divergencias" type="checkbox" value="on" />
          <span>Lancar divergencias e fechar competencia</span>
        </label>
        <div className="form-actions module-form-wide">
          <button className="button" type="submit">Fechar competencia</button>
        </div>
      </form>
    </IntrShell>
  )
}
