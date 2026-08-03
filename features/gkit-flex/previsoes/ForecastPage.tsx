'use client';

import { useEffect, useMemo, useState } from 'react';
import { EmptyState, MetricCard, MonthContextHeader } from '../ui/FlexUI';

type RevenueForecastRow = {
  id?: string;
  tipo: string;
  valor_previsto: number;
  origem_competencia?: string | null;
  origem_valor?: number | null;
  observacao?: string | null;
};

type PaymentForecastRow = {
  id?: string;
  descricao: string;
  vencimento_dia?: number | null;
  vencimento_texto?: string | null;
  valor_previsto: number;
  categoria: string;
  centro?: string | null;
  origem_competencia?: string | null;
  origem_item_id?: string | null;
  observacao?: string | null;
  ordem?: number;
};

type ForecastData = {
  configured: boolean;
  competencia: string;
  origemCompetencia: string;
  receitas: RevenueForecastRow[];
  pagamentos: PaymentForecastRow[];
  summary: {
    totalReceitas: number;
    totalPagamentos: number;
    saldoPrevisto: number;
    receitasCount: number;
    pagamentosCount: number;
  };
  actuals: {
    receitasRealizadas: number;
    pagamentosRealizados: number;
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
};

type ComparisonRow = {
  chave: string;
  label: string;
  previsto: number;
  realizado: number;
  diferenca: number;
  variacaoPercentual: number | null;
};

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function normalizeMoneyInput(value: string) {
  const cleaned = value.replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

function monthLabel(value: string) {
  if (!value) return '-';
  const [year, month] = value.slice(0, 7).split('-');
  return `${month}/${year}`;
}

function makeBlankRevenue(): RevenueForecastRow {
  return { tipo: '', valor_previsto: 0, observacao: '' };
}

function makeBlankPayment(index: number): PaymentForecastRow {
  return { descricao: '', vencimento_dia: null, vencimento_texto: '', valor_previsto: 0, categoria: 'Sem categoria', centro: '', observacao: '', ordem: index };
}

export function ForecastPage() {
  const [competencia, setCompetencia] = useState(currentMonthValue());
  const [activeTab, setActiveTab] = useState<'receitas' | 'pagamentos' | 'comparativo'>('receitas');
  const [data, setData] = useState<ForecastData | null>(null);
  const [receitas, setReceitas] = useState<RevenueForecastRow[]>([]);
  const [pagamentos, setPagamentos] = useState<PaymentForecastRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hasUnsavedPaymentChanges, setHasUnsavedPaymentChanges] = useState(false);

  const competenciaParam = useMemo(() => `${competencia}-01`, [competencia]);
  const totalReceitas = useMemo(() => Math.round(receitas.reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0) * 100) / 100, [receitas]);
  const totalPagamentos = useMemo(() => Math.round(pagamentos.reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0) * 100) / 100, [pagamentos]);
  const saldoPrevisto = Math.round((totalReceitas - totalPagamentos) * 100) / 100;

  async function loadForecast(selectedCompetencia = competenciaParam) {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/gkit-flex/previsoes?competencia=${encodeURIComponent(selectedCompetencia)}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar previsões.');
      setData(payload);
      setReceitas(payload.receitas || []);
      setPagamentos(payload.pagamentos || []);
      setHasUnsavedPaymentChanges(false);
    } catch (err) {
      setData(null);
      setReceitas([]);
      setPagamentos([]);
      setHasUnsavedPaymentChanges(false);
      setError(err instanceof Error ? err.message : 'Erro inesperado ao carregar previsões.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadForecast(competenciaParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competenciaParam]);

  async function generateBase(tipo: 'receitas' | 'pagamentos') {
    const hasRows = tipo === 'receitas' ? receitas.length > 0 : pagamentos.length > 0;
    const overwrite = hasRows ? window.confirm('Já existe previsão nesta aba. Substituir pela base do mês anterior?') : false;
    if (hasRows && !overwrite) return;

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/gkit-flex/previsoes/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competencia: competenciaParam, tipo, overwrite }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível gerar a previsão.');
      setData(payload);
      setReceitas(payload.receitas || []);
      setPagamentos(payload.pagamentos || []);
      setHasUnsavedPaymentChanges(false);
      const generated = tipo === 'receitas' ? payload.generated?.receitas || 0 : payload.generated?.pagamentos || 0;
      setMessage(generated ? `Base gerada pelo mes anterior com ${generated} linha(s).` : 'Não encontrei base no mês anterior para esta aba.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao gerar previsão.');
    } finally {
      setLoading(false);
    }
  }

  async function saveForecast() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/gkit-flex/previsoes/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competencia: competenciaParam, receitas, pagamentos }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível salvar a previsão.');
      setData(payload);
      setReceitas(payload.receitas || []);
      setPagamentos(payload.pagamentos || []);
      setHasUnsavedPaymentChanges(false);
      setMessage('Previsão mensal salva.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao salvar previsão.');
    } finally {
      setSaving(false);
    }
  }

  function updateRevenue(index: number, patch: Partial<RevenueForecastRow>) {
    setReceitas((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function updatePayment(index: number, patch: Partial<PaymentForecastRow>) {
    setHasUnsavedPaymentChanges(true);
    setPagamentos((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch, ordem: rowIndex } : row)));
  }

  function addPaymentRow() {
    setHasUnsavedPaymentChanges(true);
    setPagamentos((current) => [...current, makeBlankPayment(current.length)]);
  }

  function deletePaymentRow(index: number) {
    setHasUnsavedPaymentChanges(true);
    setPagamentos((current) => current.filter((_, rowIndex) => rowIndex !== index).map((row, rowIndex) => ({ ...row, ordem: rowIndex })));
  }

  return (
    <main className="page-shell wide-shell forecast-page">
      <MonthContextHeader
        title="Previsões mensais"
        description="Monte a previsão de receitas por tipo e a previsão de pagamentos do mês, usando o fechamento anterior como base editável."
        competencia={competencia}
        onCompetenciaChange={setCompetencia}
        primaryStatus={{ label: 'Origem', status: data?.configured ? 'ok' : 'indisponivel' }}
        secondaryStatus={{ label: 'Mês anterior', status: data?.origemCompetencia ? 'ok' : 'nao_aberto' }}
      >
        <button className="primary-button" onClick={saveForecast} disabled={saving || loading || !data?.configured}>{saving ? 'Salvando...' : 'Salvar previsão'}</button>
      </MonthContextHeader>

      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}
      {!data?.configured ? <div className="warning">Supabase não configurado ou tabelas de previsão ainda não aplicadas.</div> : null}

      <section className="grid-4 dashboard-metrics">
        <MetricCard label="Receita prevista" value={formatCurrency(totalReceitas)} help={`${receitas.length} tipo(s)`} tone={totalReceitas ? 'good' : 'default'} />
        <MetricCard label="Pagamentos previstos" value={formatCurrency(totalPagamentos)} help={`${pagamentos.length} linha(s)`} />
        <MetricCard label="Saldo previsto" value={formatCurrency(saldoPrevisto)} tone={saldoPrevisto < 0 ? 'warning' : 'good'} />
        <MetricCard label="Mês base" value={monthLabel(data?.origemCompetencia || '')} help="fechamento anterior" />
      </section>

      <section className="card forecast-workspace">
        <div className="forecast-tabs" role="tablist" aria-label="Previsão mensal">
          <button type="button" className={activeTab === 'receitas' ? 'active' : ''} onClick={() => setActiveTab('receitas')}>Receitas</button>
          <button type="button" className={activeTab === 'pagamentos' ? 'active' : ''} onClick={() => setActiveTab('pagamentos')}>Pagamentos</button>
          <button type="button" className={activeTab === 'comparativo' ? 'active' : ''} onClick={() => setActiveTab('comparativo')}>Comparativo</button>
        </div>

        {activeTab === 'receitas' ? (
          <section className="forecast-section">
            <div className="header-row compact-header">
              <div>
                <p className="eyebrow">Previsão de receitas</p>
                <h2>Receitas por tipo</h2>
                <p className="muted small-text">Base sugerida pelo realizado do mês anterior, editável antes da comparação com o realizado.</p>
              </div>
              <div className="action-row">
                <button className="secondary-button" disabled={loading || !data?.configured} onClick={() => generateBase('receitas')}>Gerar base anterior</button>
                <button className="secondary-button" disabled={loading} onClick={() => setReceitas((current) => [...current, makeBlankRevenue()])}>Adicionar tipo</button>
              </div>
            </div>
            <RevenueTable rows={receitas} onChange={updateRevenue} onDelete={(index) => setReceitas((current) => current.filter((_, rowIndex) => rowIndex !== index))} />
          </section>
        ) : null}

        {activeTab === 'pagamentos' ? (
          <section className="forecast-section">
            <div className="header-row compact-header">
              <div>
                <p className="eyebrow">Previsão de pagamentos</p>
                <h2>Pagamentos previstos</h2>
                <p className="muted small-text">Base sugerida pelo fechamento do mês anterior, com linhas editaveis para ajustes do mês atual.</p>
              </div>
              <div className="action-row">
                <button className="secondary-button" disabled={loading || !data?.configured} onClick={() => generateBase('pagamentos')}>Gerar base anterior</button>
                <button className="secondary-button" disabled={loading} onClick={addPaymentRow}>Adicionar pagamento</button>
                {hasUnsavedPaymentChanges ? (
                  <button className="primary-button" disabled={saving || loading || !data?.configured} onClick={saveForecast}>
                    {saving ? 'Salvando...' : 'Salvar pagamentos'}
                  </button>
                ) : null}
              </div>
            </div>
            <PaymentTable rows={pagamentos} onChange={updatePayment} onDelete={deletePaymentRow} />
          </section>
        ) : null}

        {activeTab === 'comparativo' ? (
          <section className="forecast-section">
            <div className="header-row compact-header">
              <div>
                <p className="eyebrow">Fechamento</p>
                <h2>Previsto x realizado</h2>
                <p className="muted small-text">Comparação entre a previsão do início do mês e o realizado importado no fechamento.</p>
              </div>
              <button className="secondary-button" disabled={loading} onClick={() => loadForecast(competenciaParam)}>Atualizar comparativo</button>
            </div>
            <section className="grid-3 dashboard-metrics">
              <MetricCard label="Saldo previsto" value={formatCurrency(data?.comparativo?.resumo.saldoPrevisto || 0)} />
              <MetricCard label="Saldo realizado" value={formatCurrency(data?.comparativo?.resumo.saldoRealizado || 0)} tone={(data?.comparativo?.resumo.saldoRealizado || 0) < 0 ? 'warning' : 'good'} />
              <MetricCard label="Diferença do saldo" value={formatCurrency(data?.comparativo?.resumo.diferencaSaldo || 0)} tone={(data?.comparativo?.resumo.diferencaSaldo || 0) < 0 ? 'warning' : 'good'} />
            </section>
            <section className="forecast-comparison-grid">
              <ComparisonPanel
                title="Receitas por tipo"
                description={`Previsto ${formatCurrency(data?.comparativo?.resumo.totalReceitasPrevistas || 0)} / realizado ${formatCurrency(data?.comparativo?.resumo.totalReceitasRealizadas || 0)}`}
                rows={data?.comparativo?.receitasPorTipo || []}
                empty="Sem previsão ou realizado de receitas para comparar."
              />
              <ComparisonPanel
                title="Pagamentos por categoria"
                description={`Previsto ${formatCurrency(data?.comparativo?.resumo.totalPagamentosPrevistos || 0)} / realizado ${formatCurrency(data?.comparativo?.resumo.totalPagamentosRealizados || 0)}`}
                rows={data?.comparativo?.pagamentosPorCategoria || []}
                empty="Sem previsão ou realizado de pagamentos para comparar."
              />
            </section>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function formatPercent(value: number | null) {
  if (value === null) return '-';
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

function ComparisonPanel({ title, description, rows, empty }: { title: string; description: string; rows: ComparisonRow[]; empty: string }) {
  return (
    <section className="preview-box forecast-comparison-panel">
      <div className="header-row compact-header">
        <div>
          <h2>{title}</h2>
          <p className="muted small-text">{description}</p>
        </div>
      </div>
      {rows.length ? (
        <div className="table-wrap">
          <table className="periods-table">
            <thead>
              <tr>
                <th>Grupo</th>
                <th className="text-right">Previsto</th>
                <th className="text-right">Realizado</th>
                <th className="text-right">Diferença</th>
                <th className="text-right">Var.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.chave}>
                  <td><strong>{row.label}</strong></td>
                  <td className="text-right">{formatCurrency(row.previsto)}</td>
                  <td className="text-right">{formatCurrency(row.realizado)}</td>
                  <td className={`text-right ${row.diferenca < 0 ? 'negative-value' : 'positive-value'}`}>{formatCurrency(row.diferenca)}</td>
                  <td className="text-right">{formatPercent(row.variacaoPercentual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Sem comparativo" description={empty} />
      )}
    </section>
  );
}

function RevenueTable({ rows, onChange, onDelete }: { rows: RevenueForecastRow[]; onChange: (index: number, patch: Partial<RevenueForecastRow>) => void; onDelete: (index: number) => void }) {
  if (!rows.length) {
    return <EmptyState title="Sem previsão de receitas" description="Gere a base pelo mês anterior ou adicione tipos manualmente." />;
  }

  return (
    <div className="table-wrap">
      <table className="editable-table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th className="text-right">Valor previsto</th>
            <th>Origem</th>
            <th>Observação</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index}>
              <td><input className="inline-input" value={row.tipo} onChange={(event) => onChange(index, { tipo: event.target.value })} /></td>
              <td className="text-right"><input className="inline-input money-input" value={String(row.valor_previsto ?? 0).replace('.', ',')} onChange={(event) => onChange(index, { valor_previsto: normalizeMoneyInput(event.target.value) })} /></td>
              <td>{row.origem_competencia ? monthLabel(row.origem_competencia) : '-'}</td>
              <td><input className="inline-input" value={row.observacao || ''} onChange={(event) => onChange(index, { observacao: event.target.value })} /></td>
              <td className="text-right"><button className="secondary-button compact-button" type="button" onClick={() => onDelete(index)}>Remover</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentTable({ rows, onChange, onDelete }: { rows: PaymentForecastRow[]; onChange: (index: number, patch: Partial<PaymentForecastRow>) => void; onDelete: (index: number) => void }) {
  if (!rows.length) {
    return <EmptyState title="Sem previsão de pagamentos" description="Gere a base pelo fechamento anterior ou adicione pagamentos manualmente." />;
  }

  return (
    <div className="table-wrap">
      <table className="editable-table">
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Venc.</th>
            <th>Categoria</th>
            <th>Centro</th>
            <th className="text-right">Valor previsto</th>
            <th>Observação</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index}>
              <td><input className="inline-input description-input" value={row.descricao} onChange={(event) => onChange(index, { descricao: event.target.value })} /></td>
              <td><input className="inline-input short-input" value={row.vencimento_dia ? String(row.vencimento_dia).padStart(2, '0') : row.vencimento_texto || ''} onChange={(event) => onChange(index, { vencimento_dia: Number(event.target.value.replace(/\D/g, '')) || null, vencimento_texto: event.target.value })} /></td>
              <td><input className="inline-input" value={row.categoria} onChange={(event) => onChange(index, { categoria: event.target.value })} /></td>
              <td><input className="inline-input" value={row.centro || ''} onChange={(event) => onChange(index, { centro: event.target.value })} /></td>
              <td className="text-right"><input className="inline-input money-input" value={String(row.valor_previsto ?? 0).replace('.', ',')} onChange={(event) => onChange(index, { valor_previsto: normalizeMoneyInput(event.target.value) })} /></td>
              <td><input className="inline-input" value={row.observacao || ''} onChange={(event) => onChange(index, { observacao: event.target.value })} /></td>
              <td className="text-right"><button className="secondary-button compact-button" type="button" onClick={() => onDelete(index)}>Remover</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
