import { getDashboardSummary, sanitizeCompetencia } from '../dashboard/dashboardPersistence';
import { EmptyState, MetricCard, MonthContextHeader } from '../ui/FlexUI';

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export async function ReceitasPage({ competencia }: { competencia?: string | null }) {
  const competenciaDate = sanitizeCompetencia(competencia);
  const competenciaInput = competenciaDate.slice(0, 7);
  const data = await getDashboardSummary(competenciaDate);
  const latestExecution = data.comissoes.latestExecution;
  const rows = data.comissoes.totalsByCategory;

  return (
    <main className="page-shell">
      <MonthContextHeader
        title="Receitas"
        description="Resumo mensal das receitas importadas, agrupadas por categoria."
        competencia={competenciaInput}
        primaryStatus={{ label: 'Status', status: data.comissoes.status }}
      />

      <section className="grid-3 dashboard-metrics">
        <MetricCard
          label="Receita liquida"
          value={formatMoney(latestExecution?.total_valor_recebido || 0)}
          help={latestExecution ? `Ultima apuracao em ${formatDateTime(latestExecution.created_at)}` : 'Sem apuracao salva'}
          tone={latestExecution?.total_valor_recebido ? 'good' : 'default'}
        />
        <MetricCard
          label="Categorias"
          value={rows.length}
          help="com receita no mes"
        />
        <MetricCard
          label="Comissoes calculadas"
          value={formatMoney(latestExecution?.total_comissao || 0)}
          help="referencia do fechamento"
        />
      </section>

      <section className="card">
        <div className="header-row compact-header">
          <div>
            <h2>Receitas por categoria</h2>
            <p className="muted small-text">
              Base: {latestExecution?.contas_file_name || 'nenhuma planilha importada para esta competencia'}.
            </p>
          </div>
        </div>

        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th className="text-right">Receita liquida</th>
                  <th className="text-right">Comissao</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.categoria}>
                    <td><strong>{row.categoria}</strong></td>
                    <td className="text-right">{formatMoney(row.valor_recebido)}</td>
                    <td className="text-right">{formatMoney(row.comissao_final)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sem receitas" description="Ainda nao ha apuracao salva para esta competencia." />
        )}
      </section>
    </main>
  );
}
