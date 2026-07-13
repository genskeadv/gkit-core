'use client';

import { useEffect, useMemo, useState } from 'react';
import { EmptyState, MetricCard, MonthContextHeader, StatusBadge } from '../ui/FlexUI';

type MonthStatus = 'aberto' | 'fechado' | 'nao_aberto' | 'indisponivel';

type SanitizationRow = {
  id: string;
  descricao: string;
  vencimento_dia: number | null;
  vencimento_texto: string | null;
  valor_previsto: number;
  categoria: string;
  centro: string | null;
  pendencias: Array<'categoria' | 'centro'>;
  created_at?: string;
  sugestao?: SanitizationSuggestion | null;
};

type SanitizationSuggestion = {
  categoria: string;
  descricaoPrevista: string;
  valorPrevisto: number;
  pontuacao: number;
  motivo: string;
};

type SanitizationPayload = {
  configured: boolean;
  competencia: string;
  status: MonthStatus;
  canEdit: boolean;
  rows: SanitizationRow[];
  categories: string[];
  centers: string[];
  summary: {
    pendentes: number;
    semCategoria: number;
    semCentro: number;
    totalPendente: number;
  };
};

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDay(row: SanitizationRow) {
  if (row.vencimento_dia) return String(row.vencimento_dia).padStart(2, '0');
  return row.vencimento_texto || '-';
}

export function SaneamentoPage() {
  const [competencia, setCompetencia] = useState(currentMonthValue());
  const [field, setField] = useState<'categoria' | 'centro'>('categoria');
  const [data, setData] = useState<SanitizationPayload | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedValue, setSelectedValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [rowValues, setRowValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const competenciaParam = useMemo(() => `${competencia}-01`, [competencia]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const rows = data?.rows || [];
  const visibleRows = useMemo(() => rows.filter((row) => row.pendencias.includes(field)), [rows, field]);
  const selectedRows = useMemo(() => visibleRows.filter((row) => selectedSet.has(row.id)), [visibleRows, selectedSet]);
  const selectedTotal = useMemo(() => Math.round(selectedRows.reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0) * 100) / 100, [selectedRows]);
  const suggestionCount = useMemo(() => rowsWithSuggestions(data?.rows || []).length, [data?.rows]);
  const options = field === 'categoria' ? data?.categories || [] : data?.centers || [];
  const fieldLabel = field === 'categoria' ? 'categoria' : 'centro';
  const canApply = Boolean(data?.canEdit && selectedIds.length && (selectedValue || newValue.trim()) && !saving);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/gkit-flex/contas-pagar/saneamento?competencia=${encodeURIComponent(competenciaParam)}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Erro ao carregar saneamento.');
      setData(payload);
      setSelectedIds((current) => current.filter((id) => (payload.rows || []).some((row: SanitizationRow) => row.id === id && row.pendencias.includes(field))));
      setRowValues((current) => {
        const next: Record<string, string> = {};
        for (const row of payload.rows || []) {
          next[row.id] = current[row.id] || (field === 'categoria' ? row.sugestao?.categoria : '') || '';
        }
        return next;
      });
    } catch (err) {
      setData(null);
      setSelectedIds([]);
      setError(err instanceof Error ? err.message : 'Erro ao carregar saneamento.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    setMessage('');
    setSelectedIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competenciaParam]);

  function toggleRow(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function selectAll() {
    setSelectedIds(visibleRows.map((row) => row.id));
  }

  async function applyValue(idsOverride?: string[], valueOverride?: string) {
    const idsToApply = idsOverride || selectedIds;
    const targetValue = valueOverride || newValue.trim() || selectedValue;
    if (!data?.canEdit || !idsToApply.length || !targetValue || saving) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/gkit-flex/contas-pagar/saneamento', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competencia: competenciaParam, ids: idsToApply, field, value: targetValue }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Erro ao classificar pagamentos.');
      setData(payload);
      setSelectedIds([]);
      setRowValues({});
      setSelectedValue('');
      setNewValue('');
      setMessage(`${payload.updated || 0} pagamento(s) classificados em ${targetValue}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao classificar pagamentos.');
    } finally {
      setSaving(false);
    }
  }

  function rowValue(row: SanitizationRow) {
    if (Object.prototype.hasOwnProperty.call(rowValues, row.id)) {
      return rowValues[row.id];
    }
    return field === 'categoria' ? row.sugestao?.categoria || '' : '';
  }

  function updateRowValue(id: string, value: string) {
    setRowValues((current) => ({ ...current, [id]: value }));
  }

  return (
    <main className="page-shell wide-shell flex-saneamento-page">
      <MonthContextHeader
        title="Saneamento de extrato"
        description="Classifique pagamentos importados que ainda estao sem categoria ou sem centro."
        competencia={competencia}
        onCompetenciaChange={setCompetencia}
        primaryStatus={{ label: 'Pagamentos', status: data?.status || 'nao_aberto' }}
        secondaryStatus={{ label: 'Saneamento', status: visibleRows.length ? 'aviso' : 'ok' }}
      >
        <button className="secondary-button" onClick={load} disabled={loading}>{loading ? 'Atualizando...' : 'Atualizar'}</button>
      </MonthContextHeader>

      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}
      {!data?.configured ? <div className="warning">Supabase nao configurado para carregar os pagamentos.</div> : null}
      {data && !data.canEdit ? <div className="warning">A competencia precisa estar aberta para classificar pagamentos.</div> : null}

      <section className="grid-4 dashboard-metrics">
        <MetricCard label="Pendentes" value={data?.summary.pendentes || 0} help="Total com pendencia" tone={rows.length ? 'warning' : 'good'} />
        <MetricCard label="Sem categoria" value={data?.summary.semCategoria || 0} tone={(data?.summary.semCategoria || 0) ? 'warning' : 'good'} />
        <MetricCard label="Sem centro" value={data?.summary.semCentro || 0} tone={(data?.summary.semCentro || 0) ? 'warning' : 'good'} />
        <MetricCard label="Valor pendente" value={formatMoney(data?.summary.totalPendente || 0)} />
      </section>

      <section className="grid-4 dashboard-metrics">
        <MetricCard label="Selecionados" value={selectedIds.length} help={formatMoney(selectedTotal)} tone={selectedIds.length ? 'warning' : 'default'} />
        <MetricCard label="Modo" value={field === 'categoria' ? 'Categoria' : 'Centro'} help={`${visibleRows.length} pendente(s)`} />
        <MetricCard label="Destino" value={newValue.trim() || selectedValue || '-'} help="destino do lote" />
        <MetricCard label="Status" value={data?.canEdit ? 'Editavel' : 'Bloqueado'} help="competencia" tone={data?.canEdit ? 'good' : 'danger'} />
        <MetricCard label="Sugestoes" value={suggestionCount} help="categoria pela previsao" tone={suggestionCount ? 'good' : 'default'} />
      </section>

      <section className="card flex-saneamento-actions">
        <div className="header-row compact-header">
          <div>
            <p className="eyebrow">Classificacao</p>
            <h2>Aplicar {fieldLabel}</h2>
            <p className="muted small-text">{selectedIds.length ? `${selectedIds.length} pagamento(s) selecionado(s).` : 'Nenhum pagamento selecionado.'}</p>
          </div>
          <StatusBadge status={data?.canEdit ? 'ok' : 'bloqueio'} label={data?.canEdit ? 'Aberto' : 'Bloqueado'} />
        </div>

        <div className="form-grid">
          <label className="field-label">
            Pendencia
            <select className="text-input" value={field} onChange={(event) => { setField(event.target.value as 'categoria' | 'centro'); setSelectedIds([]); setSelectedValue(''); setNewValue(''); setRowValues({}); }}>
              <option value="categoria">Categoria</option>
              <option value="centro">Centro</option>
            </select>
          </label>
          <label className="field-label">
            {field === 'categoria' ? 'Categoria' : 'Centro'}
            <select className="text-input" value={selectedValue} onChange={(event) => { setSelectedValue(event.target.value); setNewValue(''); }}>
              <option value="">Selecione</option>
              {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="field-label">
            Novo {fieldLabel}
            <input className="text-input" value={newValue} onChange={(event) => { setNewValue(event.target.value); setSelectedValue(''); }} placeholder={field === 'categoria' ? 'Ex.: Infraestrutura' : 'Ex.: Operacional'} />
          </label>
          <div className="module-inline-actions">
            <button className="secondary-button" onClick={selectAll} disabled={!visibleRows.length || !data?.canEdit}>Selecionar todos</button>
            <button className="secondary-button" onClick={() => setSelectedIds([])} disabled={!selectedIds.length}>Limpar selecao</button>
            <button className="primary-button" onClick={() => applyValue()} disabled={!canApply}>{saving ? 'Classificando...' : `Aplicar ${fieldLabel}`}</button>
          </div>
        </div>
        <datalist id="saneamento-opcoes">
          {options.map((option) => <option key={option} value={option} />)}
        </datalist>
      </section>

      <section className="card">
        <div className="header-row compact-header">
          <div>
            <p className="eyebrow">Pendencias</p>
            <h2>Pagamentos sem {fieldLabel}</h2>
          </div>
        </div>

        {visibleRows.length ? (
          <div className="table-wrap">
            <table className="editable-table flex-saneamento-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Dia</th>
                  <th>Pagamento</th>
                  <th className="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id} className={selectedSet.has(row.id) ? 'paid-row' : ''}>
                    <td>
                      <input type="checkbox" checked={selectedSet.has(row.id)} disabled={!data?.canEdit} onChange={() => toggleRow(row.id)} />
                    </td>
                    <td>{formatDay(row)}</td>
                    <td>
                      <div className="flex-saneamento-payment-cell">
                        <div className="flex-saneamento-payment-copy">
                          <strong>{row.descricao}</strong>
                          <p className="muted small-text">
                            Categoria: {row.categoria || 'Sem categoria'} | Centro: {row.centro || 'Sem centro'}
                          </p>
                        </div>
                        <div className="module-inline-actions flex-saneamento-row-actions">
                          {field === 'categoria' && row.sugestao ? <SuggestionPill suggestion={row.sugestao} /> : <span className="muted small-text">{field === 'categoria' ? 'Sem sugestao da previsao' : 'Defina o centro'}</span>}
                          <input
                            className="inline-input"
                            list="saneamento-opcoes"
                            value={rowValue(row)}
                            onChange={(event) => updateRowValue(row.id, event.target.value)}
                            placeholder={field === 'categoria' ? 'Categoria' : 'Centro'}
                            disabled={!data?.canEdit || saving}
                          />
                          <button className="secondary-button" onClick={() => applyValue([row.id], rowValue(row))} disabled={!data?.canEdit || saving || !rowValue(row)}>Aplicar</button>
                        </div>
                      </div>
                    </td>
                    <td className="text-right">{formatMoney(row.valor_previsto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={`Nenhuma pendencia de ${fieldLabel}`} description="Os pagamentos desta competencia ja estao classificados neste criterio." />
        )}
      </section>
    </main>
  );
}

function rowsWithSuggestions(rows: SanitizationRow[]) {
  return rows.filter((row) => row.sugestao?.categoria);
}

function SuggestionPill({ suggestion }: { suggestion: SanitizationSuggestion }) {
  return (
    <span className="status-pill status-aberto compact" title={`${suggestion.motivo}. Previsao: ${suggestion.descricaoPrevista}`}>
      {suggestion.categoria} - {Math.round(suggestion.pontuacao)}%
    </span>
  );
}
