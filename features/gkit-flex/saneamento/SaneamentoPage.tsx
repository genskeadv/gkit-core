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

type CadastroTipo = 'categoria' | 'centro' | 'carteira';

type CadastroItem = {
  id: string;
  tipo: CadastroTipo;
  nome: string;
  status: 'ativo' | 'inativo';
  aliases: string[];
};

type CadastroResumo = {
  configured: boolean;
  categorias: CadastroItem[];
  centros: CadastroItem[];
  carteiras: CadastroItem[];
};

type ReclassPreview = {
  tipo: CadastroTipo;
  origem: { id: string; nome: string; aliases: string[] };
  destino: { id: string; nome: string; aliases: string[] };
  nomesAfetados: string[];
  impacto: Record<string, number> & { total: number };
  bloqueios: string[];
  avisos: string[];
  totalAtualizado?: number;
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

function activeCadastroItems(data: CadastroResumo | null, tipo: CadastroTipo) {
  const list = tipo === 'categoria' ? data?.categorias : tipo === 'centro' ? data?.centros : data?.carteiras;
  return (list || []).filter((item) => item.status === 'ativo');
}

function cadastroTipoLabel(tipo: CadastroTipo) {
  if (tipo === 'categoria') return 'Categoria';
  if (tipo === 'centro') return 'Centro';
  return 'Carteira';
}

function reclassificationImpactRows(preview: ReclassPreview | null) {
  if (!preview) return [];
  return [
    ['Pagamentos - categoria', preview.impacto.contasPagarCategoria || 0],
    ['Pagamentos - centro', preview.impacto.contasPagarCentro || 0],
    ['Comissoes resumo - categoria', preview.impacto.comissaoResumoCategoria || 0],
    ['Comissoes resumo - carteira', preview.impacto.comissaoResumoCarteira || 0],
    ['Comissoes lancamentos - categoria', preview.impacto.comissaoLancamentoCategoria || 0],
    ['Comissoes lancamentos - carteira', preview.impacto.comissaoLancamentoCarteira || 0],
    ['Comissoes auditoria - categoria', preview.impacto.comissaoAuditoriaCategoria || 0],
    ['Comissoes auditoria - carteira', preview.impacto.comissaoAuditoriaCarteira || 0],
  ].filter(([, value]) => Number(value) > 0);
}

function ReclassificationPanel({ data, onDone }: { data: CadastroResumo | null; onDone: () => Promise<void> }) {
  const [tipo, setTipo] = useState<CadastroTipo>('categoria');
  const [origemId, setOrigemId] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [preview, setPreview] = useState<ReclassPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const options = activeCadastroItems(data, tipo);

  useEffect(() => {
    setOrigemId('');
    setDestinoId('');
    setPreview(null);
    setMessage('');
    setError('');
  }, [tipo]);

  async function runPreview() {
    setLoading(true);
    setError('');
    setMessage('');
    setPreview(null);
    try {
      const response = await fetch('/api/gkit-flex/cadastros/reclassificar/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, origemCadastroId: origemId, destinoCadastroId: destinoId, motivo }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Erro ao gerar previa.');
      setPreview(payload);
      setMessage('Previa gerada. Confira o impacto antes de confirmar.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar previa.');
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!preview) return;
    const ok = window.confirm(`Confirmar reclassificacao de "${preview.origem.nome}" para "${preview.destino.nome}"? Essa acao atualiza ${preview.impacto.total} registro(s), inativa a origem e grava log.`);
    if (!ok) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/gkit-flex/cadastros/reclassificar/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, origemCadastroId: origemId, destinoCadastroId: destinoId, motivo }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Erro ao confirmar reclassificacao.');
      setPreview(payload);
      setMessage(`Reclassificacao confirmada: ${payload.totalAtualizado ?? payload.impacto?.total ?? 0} registro(s) atualizado(s).`);
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar reclassificacao.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card master-data-section">
      <div className="header-row compact-header">
        <div>
          <p className="eyebrow">v14</p>
          <h2>Fusao e reclassificacao segura</h2>
          <p className="muted small-text">Una nomes duplicados e reclassifique dados historicos com previa, confirmacao, aliases e log. Use quando houver categorias, centros ou carteiras repetidas por grafia.</p>
        </div>
        <StatusBadge status="aviso" label="Acao critica" />
      </div>

      {error ? <div className="error">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}

      <div className="form-grid">
        <label className="field-label">
          Tipo
          <select className="text-input" value={tipo} onChange={(event) => setTipo(event.target.value as CadastroTipo)}>
            <option value="categoria">Categoria</option>
            <option value="centro">Centro</option>
            <option value="carteira">Carteira</option>
          </select>
        </label>
        <label className="field-label">
          Origem - nome que sera fundido
          <select className="text-input" value={origemId} onChange={(event) => { setOrigemId(event.target.value); setPreview(null); }}>
            <option value="">Selecione a origem</option>
            {options.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        </label>
        <label className="field-label">
          Destino - nome canonico final
          <select className="text-input" value={destinoId} onChange={(event) => { setDestinoId(event.target.value); setPreview(null); }}>
            <option value="">Selecione o destino</option>
            {options.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        </label>
        <label className="field-label">
          Motivo da reclassificacao
          <input className="text-input" value={motivo} onChange={(event) => setMotivo(event.target.value)} placeholder="Ex.: padronizar categoria duplicada" />
        </label>
      </div>

      <div className="action-row">
        <button className="secondary-button" onClick={runPreview} disabled={loading || !origemId || !destinoId || origemId === destinoId}>{loading ? 'Processando...' : 'Gerar previa'}</button>
        <button className="primary-button" onClick={confirm} disabled={loading || !preview || preview.bloqueios.length > 0}>Confirmar reclassificacao</button>
      </div>

      {preview ? (
        <div className="preview-panel">
          <div className="grid-4 dashboard-metrics">
            <MetricCard label="Tipo" value={cadastroTipoLabel(preview.tipo)} help="Cadastro afetado" />
            <MetricCard label="Origem" value={preview.origem.nome} help={`${preview.origem.aliases.length} alias(es)`} tone="warning" />
            <MetricCard label="Destino" value={preview.destino.nome} help="Nome canonico final" tone="good" />
            <MetricCard label="Impacto" value={preview.impacto.total} help="Registros que serao atualizados" tone={preview.impacto.total ? 'warning' : 'default'} />
          </div>

          {preview.bloqueios.length ? <div className="error">Bloqueios: {preview.bloqueios.join(' ')}</div> : null}
          {preview.avisos.length ? <div className="warning">Avisos: {preview.avisos.join(' ')}</div> : null}

          <div className="table-wrap">
            <table className="periods-table">
              <thead>
                <tr><th>Area impactada</th><th className="text-right">Registros</th></tr>
              </thead>
              <tbody>
                {reclassificationImpactRows(preview).length ? reclassificationImpactRows(preview).map(([label, value]) => (
                  <tr key={label}><td>{label}</td><td className="text-right"><strong>{value}</strong></td></tr>
                )) : <tr><td colSpan={2}>Nenhum registro historico sera alterado. A fusao ainda pode ser util para alias/cadastro.</td></tr>}
              </tbody>
            </table>
          </div>

          <p className="muted small-text">Nomes reconhecidos na origem: {preview.nomesAfetados.join(', ') || '-'}.</p>
        </div>
      ) : null}
    </section>
  );
}

export function SaneamentoPage() {
  const [competencia, setCompetencia] = useState(currentMonthValue());
  const [field, setField] = useState<'categoria' | 'centro'>('categoria');
  const [data, setData] = useState<SanitizationPayload | null>(null);
  const [cadastros, setCadastros] = useState<CadastroResumo | null>(null);
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

  async function loadCadastros() {
    const response = await fetch('/api/gkit-flex/cadastros/resumo', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Erro ao carregar cadastros.');
    setCadastros(payload);
  }

  useEffect(() => {
    load();
    setMessage('');
    setSelectedIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competenciaParam]);

  useEffect(() => {
    loadCadastros().catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar cadastros.'));
  }, []);

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

      <ReclassificationPanel data={cadastros} onDone={loadCadastros} />

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
