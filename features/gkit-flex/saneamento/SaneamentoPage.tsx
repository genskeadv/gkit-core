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
  origem_tipo?: string | null;
  origem_arquivo?: string | null;
  raw?: Record<string, unknown> | null;
  created_at?: string;
};

type SanitizationGroup = {
  chave: string;
  descricao: string;
  quantidade: number;
  total: number;
  ids: string[];
};

type SanitizationPayload = {
  configured: boolean;
  competencia: string;
  status: MonthStatus;
  canEdit: boolean;
  rows: SanitizationRow[];
  groups: SanitizationGroup[];
  categories: string[];
  summary: {
    pendentes: number;
    totalPendente: number;
    grupos: number;
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

function sourceLabel(row: SanitizationRow) {
  const rawSource = String(row.raw?.origem_importacao || '');
  if (rawSource.includes('ofx')) return 'OFX';
  if (rawSource.includes('csv')) return 'CSV';
  if (row.origem_arquivo) return row.origem_arquivo;
  return row.origem_tipo || 'Importacao';
}

export function SaneamentoPage() {
  const [competencia, setCompetencia] = useState(currentMonthValue());
  const [data, setData] = useState<SanitizationPayload | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categoria, setCategoria] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const competenciaParam = useMemo(() => `${competencia}-01`, [competencia]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedRows = useMemo(() => (data?.rows || []).filter((row) => selectedSet.has(row.id)), [data?.rows, selectedSet]);
  const selectedTotal = useMemo(() => Math.round(selectedRows.reduce((acc, row) => acc + Number(row.valor_previsto || 0), 0) * 100) / 100, [selectedRows]);
  const canApply = Boolean(data?.canEdit && selectedIds.length && (categoria || novaCategoria.trim()) && !saving);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/gkit-flex/contas-pagar/saneamento?competencia=${encodeURIComponent(competenciaParam)}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Erro ao carregar saneamento.');
      setData(payload);
      setSelectedIds((current) => current.filter((id) => (payload.rows || []).some((row: SanitizationRow) => row.id === id)));
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

  function selectGroup(group: SanitizationGroup) {
    setSelectedIds((current) => Array.from(new Set([...current, ...group.ids])));
  }

  function selectAll() {
    setSelectedIds(data?.rows.map((row) => row.id) || []);
  }

  async function applyCategory() {
    if (!canApply) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const targetCategory = novaCategoria.trim() || categoria;
      const response = await fetch('/api/gkit-flex/contas-pagar/saneamento', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competencia: competenciaParam, ids: selectedIds, categoria: targetCategory }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Erro ao classificar pagamentos.');
      setData(payload);
      setSelectedIds([]);
      setCategoria('');
      setNovaCategoria('');
      setMessage(`${payload.updated || 0} pagamento(s) classificados em ${targetCategory}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao classificar pagamentos.');
    } finally {
      setSaving(false);
    }
  }

  const rows = data?.rows || [];
  const groups = data?.groups || [];
  const categories = data?.categories || [];

  return (
    <main className="page-shell wide-shell flex-saneamento-page">
      <MonthContextHeader
        title="Saneamento de extrato"
        description="Classifique pagamentos importados que ainda estao sem categoria."
        competencia={competencia}
        onCompetenciaChange={setCompetencia}
        primaryStatus={{ label: 'Pagamentos', status: data?.status || 'nao_aberto' }}
        secondaryStatus={{ label: 'Saneamento', status: rows.length ? 'aviso' : 'ok' }}
      >
        <button className="secondary-button" onClick={load} disabled={loading}>{loading ? 'Atualizando...' : 'Atualizar'}</button>
      </MonthContextHeader>

      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}
      {!data?.configured ? <div className="warning">Supabase nao configurado para carregar os pagamentos.</div> : null}
      {data && !data.canEdit ? <div className="warning">A competencia precisa estar aberta para classificar pagamentos.</div> : null}

      <section className="grid-4 dashboard-metrics">
        <MetricCard label="Pendentes" value={data?.summary.pendentes || 0} help="Sem categoria" tone={rows.length ? 'warning' : 'good'} />
        <MetricCard label="Valor pendente" value={formatMoney(data?.summary.totalPendente || 0)} />
        <MetricCard label="Grupos" value={data?.summary.grupos || 0} help="Descricoes similares" />
        <MetricCard label="Selecionados" value={selectedIds.length} help={formatMoney(selectedTotal)} tone={selectedIds.length ? 'warning' : 'default'} />
      </section>

      <section className="card flex-saneamento-actions">
        <div className="header-row compact-header">
          <div>
            <p className="eyebrow">Classificacao</p>
            <h2>Aplicar categoria</h2>
            <p className="muted small-text">{selectedIds.length ? `${selectedIds.length} pagamento(s) selecionado(s).` : 'Nenhum pagamento selecionado.'}</p>
          </div>
          <StatusBadge status={data?.canEdit ? 'ok' : 'bloqueio'} label={data?.canEdit ? 'Aberto' : 'Bloqueado'} />
        </div>

        <div className="form-grid">
          <label className="field-label">
            Categoria
            <select className="text-input" value={categoria} onChange={(event) => { setCategoria(event.target.value); setNovaCategoria(''); }}>
              <option value="">Selecione</option>
              {categories.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="field-label">
            Nova categoria
            <input className="text-input" value={novaCategoria} onChange={(event) => { setNovaCategoria(event.target.value); setCategoria(''); }} placeholder="Ex.: Infraestrutura" />
          </label>
          <div className="module-inline-actions">
            <button className="secondary-button" onClick={selectAll} disabled={!rows.length || !data?.canEdit}>Selecionar todos</button>
            <button className="secondary-button" onClick={() => setSelectedIds([])} disabled={!selectedIds.length}>Limpar selecao</button>
            <button className="primary-button" onClick={applyCategory} disabled={!canApply}>{saving ? 'Classificando...' : 'Aplicar categoria'}</button>
          </div>
        </div>
      </section>

      {groups.length ? (
        <section className="card flex-saneamento-groups">
          <div className="header-row compact-header">
            <div>
              <p className="eyebrow">Grupos</p>
              <h2>Descricoes similares</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table className="periods-table">
              <thead>
                <tr>
                  <th>Descricao</th>
                  <th className="text-right">Itens</th>
                  <th className="text-right">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {groups.slice(0, 12).map((group) => (
                  <tr key={group.chave}>
                    <td><strong>{group.descricao}</strong></td>
                    <td className="text-right">{group.quantidade}</td>
                    <td className="text-right">{formatMoney(group.total)}</td>
                    <td className="text-right"><button className="secondary-button" onClick={() => selectGroup(group)} disabled={!data?.canEdit}>Selecionar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="header-row compact-header">
          <div>
            <p className="eyebrow">Pendencias</p>
            <h2>Pagamentos sem categoria</h2>
          </div>
        </div>

        {rows.length ? (
          <div className="table-wrap">
            <table className="editable-table flex-saneamento-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Dia</th>
                  <th>Descricao</th>
                  <th>Origem</th>
                  <th className="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={selectedSet.has(row.id) ? 'paid-row' : ''}>
                    <td>
                      <input type="checkbox" checked={selectedSet.has(row.id)} disabled={!data?.canEdit} onChange={() => toggleRow(row.id)} />
                    </td>
                    <td>{formatDay(row)}</td>
                    <td>
                      <strong>{row.descricao}</strong>
                      <p className="muted small-text">{row.centro || 'Sem centro'}</p>
                    </td>
                    <td>{sourceLabel(row)}</td>
                    <td className="text-right">{formatMoney(row.valor_previsto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Nenhuma pendencia de categoria" description="Os pagamentos desta competencia ja estao classificados." />
        )}
      </section>
    </main>
  );
}
