import { getSupabaseAdmin } from '../audit';
import { getMonthlyForecast } from '../previsoes/forecastPersistence';
import { buildCollaboratorSummaries } from './commissionProcessor';
import { getCommissionMonthStatus, sanitizeCompetencia } from './supabasePersistence';
import { EmptyState, MetricCard, StatusBadge, formatMonthLabel } from '../ui/FlexUI';

type CommissionSummaryRow = {
  id: string;
  categoria: string;
  carteira: string;
  quantidade_lancamentos: number;
  valor_recebido: number;
  reducao_percentual: number;
  valor_reducao: number;
  valor_apos_reducao: number;
  percentual_comissao: number;
  comissao_total: number;
  divisor: number;
  comissao_final: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function isCommissionCategory(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .includes('comisso');
}

export async function CommissionsPage({ competencia }: { competencia?: string | null }) {
  const competenciaDate = sanitizeCompetencia(competencia || '');
  const competenciaInput = competenciaDate.slice(0, 7);
  const [monthStatus, forecast] = await Promise.all([
    getCommissionMonthStatus(competenciaDate),
    getMonthlyForecast(competenciaDate),
  ]);

  const supabase = getSupabaseAdmin();
  let latestExecution: null | {
    id: string;
    contas_file_name: string | null;
    total_valor_recebido: number;
    total_base_reduzida: number;
    total_comissao: number;
    audit_count: number;
    created_at: string;
  } = null;
  let rows: CommissionSummaryRow[] = [];

  if (supabase) {
    const { data: execution, error: executionError } = await supabase
      .from('comissao_execucoes')
      .select('id, contas_file_name, total_valor_recebido, total_base_reduzida, total_comissao, audit_count, created_at')
      .eq('competencia', competenciaDate)
      .eq('status', 'processado')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (executionError) throw new Error(`Erro ao consultar comissoes do mes: ${executionError.message}`);

    if (execution?.id) {
      latestExecution = {
        id: String(execution.id),
        contas_file_name: execution.contas_file_name ? String(execution.contas_file_name) : null,
        total_valor_recebido: Number(execution.total_valor_recebido || 0),
        total_base_reduzida: Number(execution.total_base_reduzida || 0),
        total_comissao: Number(execution.total_comissao || 0),
        audit_count: Number(execution.audit_count || 0),
        created_at: String(execution.created_at || ''),
      };

      const { data: summaries, error: summaryError } = await supabase
        .from('comissao_resumos')
        .select('id, categoria, carteira, quantidade_lancamentos, valor_recebido, reducao_percentual, valor_reducao, valor_apos_reducao, percentual_comissao, comissao_total, divisor, comissao_final')
        .eq('execucao_id', execution.id)
        .order('categoria', { ascending: true })
        .order('carteira', { ascending: true });

      if (summaryError) throw new Error(`Erro ao consultar previsao de comissoes: ${summaryError.message}`);
      rows = (summaries || []) as CommissionSummaryRow[];
    }
  }

  const forecastCommissionRows = forecast.pagamentos.filter((row) => isCommissionCategory(row.categoria));
  const forecastCommissionTotal = forecastCommissionRows.reduce((sum, row) => sum + Number(row.valor_previsto || 0), 0);
  const calculatedCommissionTotal = latestExecution?.total_comissao || rows.reduce((sum, row) => sum + Number(row.comissao_final || 0), 0);
  const displayedCommissionTotal = forecastCommissionTotal || calculatedCommissionTotal;
  const forecastAdjustment = forecastCommissionTotal ? forecastCommissionTotal - calculatedCommissionTotal : 0;
  const wallets = new Set(rows.map((row) => row.carteira).filter(Boolean));
  const collaboratorRows = buildCollaboratorSummaries(rows.map((row) => ({
    categoria: row.categoria,
    carteira: row.carteira,
    quantidadeLancamentos: Number(row.quantidade_lancamentos || 0),
    valorRecebido: Number(row.valor_recebido || 0),
    reducaoPercentual: Number(row.reducao_percentual || 0),
    valorReducao: Number(row.valor_reducao || 0),
    valorAposReducao: Number(row.valor_apos_reducao || 0),
    percentualComissao: Number(row.percentual_comissao || 0),
    comissaoTotal: Number(row.comissao_total || 0),
    divisor: Number(row.divisor || 1),
    comissaoFinal: Number(row.comissao_final || 0),
  })));

  return (
    <main className="page-shell">
      <section className="month-context-header">
        <div className="month-context-main">
          <p className="eyebrow">GKIT Flex</p>
          <h1>Comissões</h1>
          <p className="muted">Previsão mensal de comissões, detalhada por categoria e carteira.</p>
        </div>
      </section>
      <section className="month-context-toolbar">
        <div className="month-context-statuses">
          <span>Status: <StatusBadge status={monthStatus.status} compact /></span>
        </div>
        <div className="month-context-side">
          <label className="field-label dashboard-month">
            Competência
            <input className="text-input" value={formatMonthLabel(competenciaInput)} disabled readOnly />
          </label>
        </div>
      </section>

      <section className="grid-4 dashboard-metrics">
        <MetricCard
          label="Comissões previstas"
          value={formatMoney(displayedCommissionTotal)}
          help={forecastCommissionRows.length ? `${forecastCommissionRows.length} linha(s) na previsao mensal` : 'última apuração do mês'}
          tone={displayedCommissionTotal ? 'good' : 'default'}
        />
        <MetricCard
          label="Apuração calculada"
          value={formatMoney(calculatedCommissionTotal)}
          help={latestExecution ? `base ${formatMoney(latestExecution.total_base_reduzida)}` : 'sem calculo salvo'}
        />
        <MetricCard
          label="Ajustes da previsão"
          value={formatMoney(forecastAdjustment)}
          help="linhas manuais/extra"
          tone={Math.abs(forecastAdjustment) > 0.01 ? 'warning' : 'default'}
        />
        <MetricCard
          label="Carteiras"
          value={wallets.size}
          help={latestExecution ? `atualizado em ${formatDateTime(latestExecution.created_at)}` : 'sem apuração'}
        />
      </section>

      <section className="card">
        <div className="header-row compact-header">
          <div>
            <h2>Previsão por colaborador</h2>
            <p className="muted small-text">Rateio 50/50 nas carteiras com dois nomes e 100% nas individuais.</p>
          </div>
        </div>

        {collaboratorRows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Carteira</th>
                  <th>Categoria</th>
                  <th className="text-right">Rateio</th>
                  <th className="text-right">Comissão prevista</th>
                </tr>
              </thead>
              <tbody>
                {collaboratorRows.map((row, index) => (
                  <tr key={`${row.colaborador}-${row.carteira}-${row.categoria}-${index}`}>
                    <td><strong>{row.colaborador}</strong></td>
                    <td>{row.carteira}</td>
                    <td>{row.categoria}</td>
                    <td className="text-right">{Math.round(row.percentualRateio * 100)}%</td>
                    <td className="text-right"><strong>{formatMoney(Number(row.comissaoFinal || 0))}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sem rateio por colaborador" description="Ainda não há apuração salva para calcular o detalhamento." />
        )}
      </section>

      <section className="card">
        <div className="header-row compact-header">
          <div>
            <h2>Previsão por categoria e carteira</h2>
            <p className="muted small-text">
              Base: {latestExecution?.contas_file_name || 'nenhuma apuração salva para esta competência'}.
            </p>
          </div>
        </div>

        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Carteira</th>
                  <th className="text-right">Lançamentos</th>
                  <th className="text-right">Receita líquida</th>
                  <th className="text-right">Base</th>
                  <th className="text-right">Comissão prevista</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.categoria}</td>
                    <td><strong>{row.carteira}</strong></td>
                    <td className="text-right">{row.quantidade_lancamentos}</td>
                    <td className="text-right">{formatMoney(Number(row.valor_recebido || 0))}</td>
                    <td className="text-right">{formatMoney(Number(row.valor_apos_reducao || 0))}</td>
                    <td className="text-right"><strong>{formatMoney(Number(row.comissao_final || 0))}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sem comissões previstas" description="Ainda não há apuração de comissões salva para esta competência." />
        )}
      </section>
    </main>
  );
}
