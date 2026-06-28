'use client';

import { useEffect, useMemo, useState } from 'react';
import { EmptyState, MetricCard, MonthContextHeader, StatusBadge } from '../ui/FlexUI';

type MonthStatus = 'aberto' | 'fechado' | 'nao_aberto';
type ActionKey = 'receitas' | 'pagar' | 'comparativo' | 'colaboradores';

type SummaryRow = {
  categoria: string;
  carteira: string;
  quantidadeLancamentos: number;
  valorRecebido: number;
  valorAposReducao: number;
  comissaoFinal: number;
};

type ReceivablePreview = {
  arquivo: string;
  resumo: SummaryRow[];
  totals: { valorRecebido: number; valorAposReducao: number; comissaoFinal: number };
  auditCount: number;
  executionId?: string | null;
  saved?: boolean;
  warning?: string | null;
};

type ImportIssue = { linha: number; severidade: 'erro' | 'aviso'; campo?: string; mensagem: string };
type PayablePreview = {
  arquivo: string;
  linhasValidas: number;
  linhasComErro: number;
  itensNovos: number;
  itensAlterados: number;
  itensRemovidos: number;
  valorImportadoManual: number;
  issues: ImportIssue[];
  sample: Array<{ categoria: string; valorPrevisto: number; pago: boolean }>;
};

type ComparisonRow = {
  chave: string;
  label: string;
  previsto: number;
  realizado: number;
  diferenca: number;
  variacaoPercentual: number | null;
};

type DashboardSummary = {
  configured: boolean;
  competencia: string;
  comissoes: {
    status: MonthStatus;
    canProcess: boolean;
    latestExecution: null | {
      id: string;
      total_valor_recebido: number;
      total_base_reduzida: number;
      total_comissao: number;
      audit_count: number;
      created_at: string;
    };
    totalsByCategory: Array<{ categoria: string; valor_recebido: number; comissao_final: number }>;
  };
  contasPagar: {
    status: MonthStatus;
    canEdit: boolean;
    total: number;
    totalPago: number;
    totalAberto: number;
    quantidade: number;
    quantidadePaga: number;
    quantidadeComissoes: number;
    totalComissoesNoPagar: number;
    totalsByCategory: Array<{ categoria: string; total: number; pago: number; aberto: number; quantidade: number }>;
  };
  colaboradores: {
    total: number;
    ativos: number;
    totalMensal: number;
    pagamentos: Array<{
      id: string;
      nome: string;
      carteira: string | null;
      receitaMes: number;
      comissaoMes: number;
      pagamentoBase: number;
      total: number;
    }>;
  };
  comparativo: {
    resumo: {
      totalReceitasPrevistas: number;
      totalReceitasRealizadas: number;
      diferencaReceitas: number;
      totalPagamentosPrevistos: number;
      totalPagamentosRealizados: number;
      diferencaPagamentos: number;
      saldoPrevisto: number;
      saldoRealizado: number;
      diferencaSaldo: number;
    };
    receitasPorTipo: ComparisonRow[];
    pagamentosPorCategoria: ComparisonRow[];
  };
  saldo: {
    recebidoMenosPagarTotal: number;
    recebidoMenosPagarAberto: number;
  };
};

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatPercent(value: number | null) {
  if (value === null) return '-';
  return `${value > 0 ? '+' : ''}${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`;
}

function formatCompetencia(value: string) {
  if (!value) return '-';
  const [year, month] = value.slice(0, 7).split('-');
  return `${month}/${year}`;
}

function sumByCategory(rows: Array<{ categoria: string; valorPrevisto: number; pago?: boolean }>) {
  const map = new Map<string, { categoria: string; total: number; pago: number; aberto: number; quantidade: number }>();
  for (const row of rows) {
    const categoria = row.categoria || 'Sem categoria';
    const current = map.get(categoria) || { categoria, total: 0, pago: 0, aberto: 0, quantidade: 0 };
    current.total = Math.round((current.total + Number(row.valorPrevisto || 0)) * 100) / 100;
    current.quantidade += 1;
    if (row.pago) current.pago = Math.round((current.pago + Number(row.valorPrevisto || 0)) * 100) / 100;
    else current.aberto = Math.round((current.aberto + Number(row.valorPrevisto || 0)) * 100) / 100;
    map.set(categoria, current);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function ActionCard({
  active,
  eyebrow,
  title,
  value,
  helper,
  onClick,
}: {
  active: boolean;
  eyebrow: string;
  title: string;
  value: string;
  helper: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`flex-cockpit-card ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="eyebrow">{eyebrow}</span>
      <strong>{title}</strong>
      <span className="module-main-value">{value}</span>
      <span className="muted small-text">{helper}</span>
    </button>
  );
}

export function DashboardHome() {
  const [competencia, setCompetencia] = useState(currentMonthValue());
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [active, setActive] = useState<ActionKey>('receitas');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [receivableFile, setReceivableFile] = useState<File | null>(null);
  const [receivablePreview, setReceivablePreview] = useState<ReceivablePreview | null>(null);
  const [payableFile, setPayableFile] = useState<File | null>(null);
  const [payablePreview, setPayablePreview] = useState<PayablePreview | null>(null);

  const competenciaParam = useMemo(() => `${competencia}-01`, [competencia]);
  const payablePreviewByCategory = useMemo(() => sumByCategory(payablePreview?.sample || []), [payablePreview]);

  async function loadSummary() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/gkit-flex/dashboard/resumo?competencia=${encodeURIComponent(competenciaParam)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Nao foi possivel carregar o resumo do mes.');
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar o resumo do mes.');
    } finally {
      setLoading(false);
    }
  }

  async function updateMonth(action: 'abrir' | 'fechar' | 'reabrir') {
    if (action === 'fechar') {
      const confirmed = window.confirm(`Fechar ${formatCompetencia(competenciaParam)}? O mes ficara protegido contra alteracoes.`);
      if (!confirmed) return;
    }
    if (action === 'reabrir') {
      const confirmed = window.confirm(`Reabrir ${formatCompetencia(competenciaParam)}? Use apenas para correcoes.`);
      if (!confirmed) return;
    }

    setActionLoading(action);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/gkit-flex/dashboard/competencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competencia: competenciaParam, action }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Nao foi possivel atualizar o mes.');

      const actionLabel = action === 'abrir' ? 'aberto' : action === 'fechar' ? 'fechado' : 'reaberto';
      const warnings = [payload.comissoesWarning, payload.contasPagarWarning].filter(Boolean).join(' | ');
      setSuccess(warnings ? `Mes ${actionLabel}, com aviso: ${warnings}` : `Mes ${actionLabel} com sucesso.`);
      await loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel atualizar o mes.');
    } finally {
      setActionLoading('');
    }
  }

  async function previewReceitas() {
    if (!receivableFile) return;
    setActionLoading('preview-receitas');
    setError('');
    setSuccess('');
    setReceivablePreview(null);
    try {
      const formData = new FormData();
      formData.append('contasReceber', receivableFile);
      formData.append('competencia', competenciaParam);
      formData.append('action', 'preview');
      const response = await fetch('/api/gkit-flex/comissoes/calcular', { method: 'POST', body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Nao foi possivel gerar a previa de receitas.');
      setReceivablePreview(payload);
      setSuccess('Previa de receitas gerada. Revise o resumo antes de gravar.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar previa de receitas.');
    } finally {
      setActionLoading('');
    }
  }

  async function saveReceitas() {
    if (!receivableFile || !receivablePreview) return;
    setActionLoading('save-receitas');
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      formData.append('contasReceber', receivableFile);
      formData.append('competencia', competenciaParam);
      formData.append('action', 'save');
      const response = await fetch('/api/gkit-flex/comissoes/calcular', { method: 'POST', body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Nao foi possivel gravar a receita.');
      setReceivablePreview(payload);
      setSuccess(payload.warning || 'Receita gravada e comissoes recalculadas para a competencia.');
      await loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gravar receita.');
    } finally {
      setActionLoading('');
    }
  }

  async function previewContasPagar() {
    if (!payableFile) return;
    setActionLoading('preview-pagar');
    setError('');
    setSuccess('');
    setPayablePreview(null);
    try {
      const formData = new FormData();
      formData.append('contasPagar', payableFile);
      formData.append('competencia', competenciaParam);
      const response = await fetch('/api/gkit-flex/contas-pagar/preview', { method: 'POST', body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Nao foi possivel gerar a previa de pagamentos.');
      setPayablePreview(payload.preview);
      setSuccess('Previa de pagamentos gerada. Confira o realizado do mes por categoria.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar previa de pagamentos.');
    } finally {
      setActionLoading('');
    }
  }

  async function saveContasPagar() {
    if (!payableFile || !payablePreview) return;
    setActionLoading('save-pagar');
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      formData.append('contasPagar', payableFile);
      formData.append('competencia', competenciaParam);
      const response = await fetch('/api/gkit-flex/contas-pagar/importar', { method: 'POST', body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Nao foi possivel gravar pagamentos.');
      setSuccess(`Pagamentos gravados. ${payload.imported || 0} linha(s) importada(s).`);
      setPayableFile(null);
      setPayablePreview(null);
      await loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gravar pagamentos.');
    } finally {
      setActionLoading('');
    }
  }

  useEffect(() => {
    loadSummary();
    setReceivablePreview(null);
    setPayablePreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competenciaParam]);

  const recebido = data?.comissoes.latestExecution?.total_valor_recebido || 0;
  const pagamentosEfetuadosTotal = data?.contasPagar.totalPago || 0;
  const colaboradoresTotal = data?.colaboradores.totalMensal || 0;
  const comparativoSaldo = data?.comparativo.resumo.diferencaSaldo || 0;
  const monthNotOpened = data?.comissoes.status === 'nao_aberto' && data?.contasPagar.status === 'nao_aberto';
  const monthIsOpen = data?.comissoes.status === 'aberto' || data?.contasPagar.status === 'aberto';
  const monthIsClosed = data?.comissoes.status === 'fechado' || data?.contasPagar.status === 'fechado';

  return (
    <main className="page-shell dashboard-page flex-cockpit-page">
      <MonthContextHeader
        title="Cockpit Flex"
        description="Central de execucao mensal: importar receitas, gravar pagamentos efetuados, conferir comissoes e pagamentos por colaborador."
        competencia={competencia}
        onCompetenciaChange={setCompetencia}
        primaryStatus={{ label: 'Receitas', status: data?.comissoes.status || 'nao_aberto' }}
        secondaryStatus={{ label: 'Pagamentos', status: data?.contasPagar.status || 'nao_aberto' }}
      >
        {monthNotOpened ? <button className="secondary-button" disabled={Boolean(actionLoading)} onClick={() => updateMonth('abrir')}>Abrir mes</button> : null}
        {monthIsClosed ? <button className="secondary-button" disabled={Boolean(actionLoading)} onClick={() => updateMonth('reabrir')}>Reabrir mes</button> : null}
        {monthIsOpen ? <button className="primary-button" disabled={Boolean(actionLoading)} onClick={() => updateMonth('fechar')}>Fechar mes</button> : null}
      </MonthContextHeader>

      {error ? <div className="error">{error}</div> : null}
      {success ? <div className="success">{success}</div> : null}
      {!data?.configured ? <div className="warning">Supabase nao configurado. Configure as variaveis antes de usar o cockpit.</div> : null}

      <section className="flex-cockpit-grid">
        <ActionCard active={active === 'receitas'} eyebrow="Importacao" title="Contas a receber" value={formatMoney(recebido)} helper="Previa da receita e gravacao" onClick={() => setActive('receitas')} />
        <ActionCard active={active === 'pagar'} eyebrow="Importacao" title="Pagamentos efetuados" value={formatMoney(pagamentosEfetuadosTotal)} helper={`${data?.contasPagar.quantidadePaga || 0} realizado(s)`} onClick={() => setActive('pagar')} />
        <ActionCard active={active === 'comparativo'} eyebrow="Fechamento" title="Comparativo" value={formatMoney(comparativoSaldo)} helper="previsto x realizado" onClick={() => setActive('comparativo')} />
        <ActionCard active={active === 'colaboradores'} eyebrow="Equipe" title="Colaboradores" value={formatMoney(colaboradoresTotal)} helper="pagamentos e comissoes" onClick={() => setActive('colaboradores')} />
      </section>

      <section className="card flex-cockpit-panel">
        {active === 'receitas' ? (
          <>
            <div className="header-row compact-header">
              <div>
                <p className="eyebrow">Contas a receber</p>
                <h2>Importar receita do mes</h2>
                <p className="muted small-text">Envie a planilha de receitas para gerar a previa. A gravacao acontece somente no botao Gravar receita.</p>
              </div>
              <StatusBadge status={data?.comissoes.status || 'nao_aberto'} label={data?.comissoes.canProcess ? 'Aberto' : 'Bloqueado'} />
            </div>
            <div className="flex-cockpit-import-row">
              <input type="file" accept=".xlsx,.xls" onChange={(event) => { setReceivableFile(event.target.files?.[0] || null); setReceivablePreview(null); }} />
              <button className="secondary-button" disabled={!receivableFile || !data?.comissoes.canProcess || actionLoading === 'preview-receitas'} onClick={previewReceitas}>Gerar previa</button>
              <button className="primary-button" disabled={!receivablePreview || !data?.comissoes.canProcess || actionLoading === 'save-receitas'} onClick={saveReceitas}>Gravar receita</button>
            </div>
            {receivablePreview ? (
              <>
                <section className="grid-3 dashboard-metrics">
                  <MetricCard label="Receita" value={formatMoney(receivablePreview.totals.valorRecebido)} help={receivablePreview.arquivo} tone="good" />
                  <MetricCard label="Base reduzida" value={formatMoney(receivablePreview.totals.valorAposReducao)} help="apos redutores" />
                  <MetricCard label="Comissoes" value={formatMoney(receivablePreview.totals.comissaoFinal)} help={`${receivablePreview.auditCount} apontamento(s)`} />
                </section>
                <PreviewTable rows={receivablePreview.resumo} />
              </>
            ) : (
              <EmptyState title="Nenhuma previa gerada" description="Selecione a planilha de contas a receber e clique em Gerar previa." />
            )}
          </>
        ) : null}

        {active === 'pagar' ? (
          <>
            <div className="header-row compact-header">
              <div>
                <p className="eyebrow">Pagamentos</p>
                <h2>Importar pagamentos efetuados no mes</h2>
                <p className="muted small-text">A previa compara o extrato realizado com a previsao atual antes da gravacao.</p>
              </div>
              <StatusBadge status={data?.contasPagar.status || 'nao_aberto'} label={data?.contasPagar.canEdit ? 'Aberto' : 'Bloqueado'} />
            </div>
            <div className="flex-cockpit-import-row">
              <input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => { setPayableFile(event.target.files?.[0] || null); setPayablePreview(null); }} />
              <button className="secondary-button" disabled={!payableFile || !data?.contasPagar.canEdit || actionLoading === 'preview-pagar'} onClick={previewContasPagar}>Gerar previa</button>
              <button className="primary-button" disabled={!payablePreview || payablePreview.linhasComErro > 0 || !data?.contasPagar.canEdit || actionLoading === 'save-pagar'} onClick={saveContasPagar}>Gravar pagamentos</button>
            </div>
            {payablePreview ? (
              <>
                <section className="grid-4 dashboard-metrics">
                  <MetricCard label="Realizado importado" value={formatMoney(payablePreview.valorImportadoManual)} help={payablePreview.arquivo} />
                  <MetricCard label="Novos" value={payablePreview.itensNovos} help="pagamentos novos" />
                  <MetricCard label="Alterados" value={payablePreview.itensAlterados} help="lancamentos existentes" />
                  <MetricCard label="Erros" value={payablePreview.linhasComErro} help={`${payablePreview.linhasValidas} linha(s) validas`} tone={payablePreview.linhasComErro ? 'danger' : 'good'} />
                </section>
                <CategoryTable rows={payablePreviewByCategory} valueLabel="Realizado preview" />
              </>
            ) : (
              <CategoryTable rows={data?.contasPagar.totalsByCategory || []} valueLabel="Previsao atual" empty="Importe o extrato de pagamentos efetuados para ver a previa por categoria." />
            )}
          </>
        ) : null}

        {active === 'comparativo' ? (
          <>
            <div className="header-row compact-header">
              <div>
                <p className="eyebrow">Comparativo</p>
                <h2>Previsto x realizado por categoria</h2>
                <p className="muted small-text">Leitura do mes aberto, comparando a previsao mensal com as receitas e pagamentos ja importados.</p>
              </div>
              <a className="secondary-button" href={`/modulos/gkit-flex/previsoes?competencia=${competenciaParam}`}>Abrir previsoes</a>
            </div>
            <section className="grid-3 dashboard-metrics">
              <MetricCard label="Saldo previsto" value={formatMoney(data?.comparativo.resumo.saldoPrevisto || 0)} />
              <MetricCard label="Saldo realizado" value={formatMoney(data?.comparativo.resumo.saldoRealizado || 0)} tone={(data?.comparativo.resumo.saldoRealizado || 0) < 0 ? 'warning' : 'good'} />
              <MetricCard label="Diferenca" value={formatMoney(comparativoSaldo)} tone={comparativoSaldo < 0 ? 'warning' : 'good'} />
            </section>
            <div className="forecast-comparison-grid">
              <ComparisonTable title="Receitas por categoria" rows={data?.comparativo.receitasPorTipo || []} empty="Sem previsao ou receita realizada para comparar." />
              <ComparisonTable title="Pagamentos por categoria" rows={data?.comparativo.pagamentosPorCategoria || []} empty="Sem previsao ou pagamento realizado para comparar." />
            </div>
          </>
        ) : null}

        {active === 'colaboradores' ? (
          <>
            <div className="header-row compact-header">
              <div>
                <p className="eyebrow">Colaboradores</p>
                <h2>Receitas e pagamentos por colaborador</h2>
                <p className="muted small-text">Linha por colaborador com receita do mes, comissoes calculadas e pagamento mensal estimado.</p>
              </div>
              <a className="secondary-button" href="/modulos/gkit-flex/colaboradores">Abrir colaboradores</a>
            </div>
            <section className="grid-3 dashboard-metrics">
              <MetricCard label="Pagamentos + comissoes" value={formatMoney(colaboradoresTotal)} tone={colaboradoresTotal ? 'good' : 'default'} />
              <MetricCard label="Colaboradores" value={data?.colaboradores.total || 0} help={`${data?.colaboradores.ativos || 0} ativo(s)`} />
              <MetricCard label="Com movimento" value={data?.colaboradores.pagamentos.length || 0} help="exibidos no resumo" />
            </section>
            <CollaboratorTable rows={data?.colaboradores.pagamentos || []} />
          </>
        ) : null}
      </section>

      {loading ? <p className="muted small-text">Atualizando cockpit...</p> : null}
    </main>
  );
}

function ComparisonTable({ title, rows, empty }: { title: string; rows: ComparisonRow[]; empty: string }) {
  if (!rows.length) return <EmptyState title={title} description={empty} />;
  return (
    <div className="forecast-comparison-panel">
      <div className="header-row compact-header">
        <h3>{title}</h3>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th className="text-right">Previsto</th>
              <th className="text-right">Realizado</th>
              <th className="text-right">Diferenca</th>
              <th className="text-right">Var.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.chave}>
                <td>{row.label}</td>
                <td className="text-right">{formatMoney(row.previsto)}</td>
                <td className="text-right"><strong>{formatMoney(row.realizado)}</strong></td>
                <td className={`text-right ${row.diferenca < 0 ? 'negative-value' : 'positive-value'}`}>{formatMoney(row.diferenca)}</td>
                <td className="text-right">{formatPercent(row.variacaoPercentual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreviewTable({ rows }: { rows: SummaryRow[] }) {
  if (!rows.length) return <EmptyState title="Sem linhas para exibir" description="A previa nao retornou receitas elegiveis." />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Carteira</th>
            <th className="text-right">Lancamentos</th>
            <th className="text-right">Receita</th>
            <th className="text-right">Comissao</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.categoria}-${row.carteira}-${index}`}>
              <td>{row.categoria}</td>
              <td>{row.carteira}</td>
              <td className="text-right">{row.quantidadeLancamentos}</td>
              <td className="text-right">{formatMoney(row.valorRecebido)}</td>
              <td className="text-right"><strong>{formatMoney(row.comissaoFinal)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoryTable({
  rows,
  valueLabel,
  empty = 'Nenhum valor para exibir.',
}: {
  rows: Array<{ categoria: string; total: number; pago?: number; aberto?: number; quantidade?: number }>;
  valueLabel: string;
  empty?: string;
}) {
  if (!rows.length) return <EmptyState title="Sem resumo" description={empty} />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Categoria</th>
            <th className="text-right">Itens</th>
            <th className="text-right">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.categoria}>
              <td>{row.categoria}</td>
              <td className="text-right">{row.quantidade ?? '-'}</td>
              <td className="text-right"><strong>{formatMoney(row.total)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CollaboratorTable({
  rows,
}: {
  rows: Array<{ id: string; nome: string; carteira: string | null; receitaMes: number; comissaoMes: number; pagamentoBase: number; total: number }>;
}) {
  if (!rows.length) return <EmptyState title="Sem movimento por colaborador" description="Importe receitas ou cadastre os dados financeiros dos colaboradores para ver o resumo aqui." />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Colaborador</th>
            <th>Carteira</th>
            <th className="text-right">Receita no mes</th>
            <th className="text-right">Comissoes</th>
            <th className="text-right">Pagamento base</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td><strong>{row.nome}</strong></td>
              <td>{row.carteira || '-'}</td>
              <td className="text-right">{formatMoney(row.receitaMes)}</td>
              <td className="text-right">{formatMoney(row.comissaoMes)}</td>
              <td className="text-right">{formatMoney(row.pagamentoBase)}</td>
              <td className="text-right"><strong>{formatMoney(row.total)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

