'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { EmptyState, MetricCard, MonthContextHeader } from '../ui/FlexUI';

type MonthStatus = 'aberto' | 'fechado' | 'nao_aberto' | 'indisponivel';

type PayableItem = {
  id: string;
  descricao: string;
  vencimento_dia: number | null;
  vencimento_texto: string | null;
  valor_previsto: number;
  categoria: string;
  centro: string | null;
  pago: boolean;
  origem_tipo?: string | null;
};

type Summary = {
  total: number;
  totalPago: number;
  totalAberto: number;
  quantidade: number;
  quantidadePaga: number;
};

type ForecastSummary = {
  totalPagamentos: number;
  pagamentosCount: number;
};

type ImportIssue = { linha: number; severidade: 'erro' | 'aviso'; campo?: string; mensagem: string };
type ImportPreview = {
  competencia: string;
  arquivo: string;
  linhasLidas: number;
  linhasValidas: number;
  linhasComErro: number;
  itensAtuaisManuais: number;
  itensAtuaisComissao: number;
  itensNovos: number;
  itensAlterados: number;
  itensRemovidos: number;
  valorAtualManual: number;
  valorImportadoManual: number;
  diferencaValorManual: number;
  issues: ImportIssue[];
};

type ManualPayableForm = {
  descricao: string;
  vencimento_dia: string;
  valor_previsto: string;
  categoria: string;
  centro: string;
  pago: boolean;
};

const emptySummary: Summary = { total: 0, totalPago: 0, totalAberto: 0, quantidade: 0, quantidadePaga: 0 };
const emptyForecastSummary: ForecastSummary = { totalPagamentos: 0, pagamentosCount: 0 };
const emptyManualPayableForm: ManualPayableForm = {
  descricao: '',
  vencimento_dia: '',
  valor_previsto: '',
  categoria: 'Sem categoria',
  centro: '',
  pago: true,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function normalizeMoneyInput(value: string) {
  let cleaned = value.replace(/R\$/gi, '').replace(/\s/g, '');
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    cleaned = cleaned.replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '');
    if (decimalSeparator === ',') cleaned = cleaned.replace(',', '.');
  } else if (lastComma >= 0) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot >= 0) {
    const parts = cleaned.split('.');
    const decimalPart = parts.at(-1) || '';
    cleaned = parts.length === 2 && decimalPart.length <= 2 ? cleaned : cleaned.replace(/\./g, '');
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

export function AccountsPayablePage() {
  const [competencia, setCompetencia] = useState(() => new Date().toISOString().slice(0, 7));
  const [monthStatus, setMonthStatus] = useState<MonthStatus>('indisponivel');
  const [items, setItems] = useState<PayableItem[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [forecastSummary, setForecastSummary] = useState<ForecastSummary>(emptyForecastSummary);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState<ManualPayableForm>(emptyManualPayableForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEdit = monthStatus === 'aberto';

  const categories = useMemo(() => {
    const set = new Set(items.map((item) => item.categoria).filter(Boolean));
    ['Pessoal', 'Impostos', 'Operacional', 'Despesas do negocio', 'Sem categoria'].forEach((category) => set.add(category));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [items]);

  const centers = useMemo(() => {
    const set = new Set(items.map((item) => item.centro).filter(Boolean) as string[]);
    ['Pessoal', 'Operacional', 'Estrutura', 'TI', 'Consumo', 'Comissões', 'Impostos', 'Novos Negocios'].forEach((center) => set.add(center));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [items]);

  async function loadMonth(selectedCompetencia = competencia) {
    try {
      setLoading(true);
      setError(null);
      const statusResponse = await fetch(`/api/gkit-flex/contas-pagar/competencia?competencia=${selectedCompetencia}`, { cache: 'no-store' });
      const statusPayload = await statusResponse.json();
      if (!statusResponse.ok) throw new Error(statusPayload?.error || 'Não foi possível consultar o mês.');

      setMonthStatus(statusPayload.configured ? (statusPayload.status || 'nao_aberto') : 'indisponivel');

      const itemsResponse = await fetch(`/api/gkit-flex/contas-pagar/itens?competencia=${selectedCompetencia}`, { cache: 'no-store' });
      const itemsPayload = await itemsResponse.json();
      if (!itemsResponse.ok) throw new Error(itemsPayload?.error || 'Não foi possível carregar pagamentos.');

      setItems(itemsPayload.rows || []);
      setSummary(itemsPayload.summary || emptySummary);
      setForecastSummary(itemsPayload.forecastSummary || emptyForecastSummary);
    } catch (err) {
      setMonthStatus('indisponivel');
      setItems([]);
      setSummary(emptySummary);
      setForecastSummary(emptyForecastSummary);
      setError(err instanceof Error ? err.message : 'Erro inesperado ao carregar pagamentos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMonth(competencia);
  }, [competencia]);

  async function openMonth(action: 'abrir' | 'reabrir') {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const response = await fetch('/api/gkit-flex/contas-pagar/competencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competencia, action }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível abrir/reabrir o mês.');
      setMessage(action === 'abrir' ? 'Mês aberto para importação e edicao.' : 'Mês reaberto para ajustes.');
      await loadMonth(competencia);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao abrir/reabrir mês.');
    } finally {
      setLoading(false);
    }
  }

  async function generatePreview() {
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      setPreview(null);
      const formData = new FormData();
      formData.append('competencia', `${competencia}-01`);
      formData.append('contasPagar', file);

      const response = await fetch('/api/gkit-flex/contas-pagar/preview', { method: 'POST', body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível gerar a prévia da importação.');

      setPreview(payload.preview || null);
      setMessage('Prévia gerada. Revise os impactos antes de confirmar a sobrescrita do mês aberto.');
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : 'Erro inesperado ao gerar prévia.');
    } finally {
      setLoading(false);
    }
  }

  async function importFile() {
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const formData = new FormData();
      formData.append('competencia', `${competencia}-01`);
      formData.append('contasPagar', file);

      const response = await fetch('/api/gkit-flex/contas-pagar/importar', { method: 'POST', body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível importar pagamentos.');

      setItems(payload.rows || []);
      setSummary(payload.summary || emptySummary);
      setForecastSummary(payload.forecastSummary || emptyForecastSummary);
      setMessage(`Importação concluída. ${payload.imported || 0} pagamento(s) gravado(s). Snapshot criado antes da atualização e auditoria gravada.`);
      setFile(null);
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao importar.');
    } finally {
      setLoading(false);
    }
  }

  function exportFile() {
    window.location.href = `/api/gkit-flex/contas-pagar/exportar?competencia=${competencia}`;
  }

  function updateLocal(id: string, patch: Partial<PayableItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function recalculateFrom(itemsToSum: PayableItem[]) {
    const total = itemsToSum.reduce((acc, item) => acc + Number(item.valor_previsto || 0), 0);
    const totalPago = itemsToSum.filter((item) => item.pago).reduce((acc, item) => acc + Number(item.valor_previsto || 0), 0);
    setSummary({
      total,
      totalPago,
      totalAberto: total - totalPago,
      quantidade: itemsToSum.length,
      quantidadePaga: itemsToSum.filter((item) => item.pago).length,
    });
  }

  const forecastTotal = Math.round(Number(forecastSummary.totalPagamentos || 0) * 100) / 100;
  const actualTotal = Math.round(Number(summary.totalPago || 0) * 100) / 100;
  const forecastDifference = Math.round((forecastTotal - actualTotal) * 100) / 100;

  async function saveItem(id: string, patch: Record<string, unknown>) {
    try {
      setSavingId(id);
      setError(null);
      const response = await fetch(`/api/gkit-flex/contas-pagar/itens/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível salvar a linha.');
      setMessage('Alteração salva.');
      await loadMonth(competencia);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao salvar linha.');
      await loadMonth(competencia);
    } finally {
      setSavingId(null);
    }
  }

  async function handlePagoChange(item: PayableItem, pago: boolean) {
    const nextItems = items.map((row) => row.id === item.id ? { ...row, pago } : row);
    setItems(nextItems);
    recalculateFrom(nextItems);
    await saveItem(item.id, { pago });
  }

  function updateManualForm(patch: Partial<ManualPayableForm>) {
    setManualForm((current) => ({ ...current, ...patch }));
  }

  async function createManualItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSavingId('manual');
      setError(null);
      setMessage(null);

      const response = await fetch('/api/gkit-flex/contas-pagar/itens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competencia: `${competencia}-01`,
          descricao: manualForm.descricao,
          vencimento_dia: manualForm.vencimento_dia ? Number(manualForm.vencimento_dia) : null,
          valor_previsto: normalizeMoneyInput(manualForm.valor_previsto),
          categoria: manualForm.categoria,
          centro: manualForm.centro,
          pago: manualForm.pago,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível criar o pagamento manual.');

      setItems(payload.rows || []);
      setSummary(payload.summary || emptySummary);
      setForecastSummary(payload.forecastSummary || emptyForecastSummary);
      setManualForm(emptyManualPayableForm);
      setShowManualForm(false);
      setMessage('Pagamento manual criado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao criar pagamento manual.');
    } finally {
      setSavingId(null);
    }
  }

  async function closeMonth() {
    try {
      const confirmed = window.confirm('Fechar este mês? Isso bloqueará alterações e criará a previsão de pagamentos do próximo mês a partir da lista atual.');
      if (!confirmed) return;

      setLoading(true);
      setError(null);
      setMessage(null);
      const response = await fetch('/api/gkit-flex/contas-pagar/fechar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competencia }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível fechar o mês.');
      setMessage(`Mês fechado. Próximo mês criado (${String(payload.nextCompetencia).slice(0, 7)}) com ${payload.copied} pagamento(s) previsto(s).`);
      await loadMonth(competencia);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao fechar mês.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell wide-shell">
      <MonthContextHeader
        title="Pagamentos efetuados"
        description="Importe os pagamentos efetuados no mês e compare o realizado com a previsão aberta."
        competencia={competencia}
        onCompetenciaChange={setCompetencia}
        primaryStatus={{ label: 'Status', status: monthStatus }}
      >
        <a className="secondary-button" href="/">Home</a>
        {monthStatus === 'nao_aberto' && <button type="button" className="secondary-button" onClick={() => openMonth('abrir')} disabled={loading}>Abrir mês</button>}
        {monthStatus === 'aberto' && <button type="button" className="danger-button" onClick={closeMonth} disabled={loading}>Fechar mês</button>}
        {monthStatus === 'fechado' && <button type="button" className="secondary-button" onClick={() => openMonth('reabrir')} disabled={loading}>Reabrir mês</button>}
      </MonthContextHeader>

      <section className="card">

        {monthStatus === 'nao_aberto' && <div className="warning">Abra o mês para importar o extrato realizado e comparar com a previsão.</div>}
        {monthStatus === 'fechado' && <div className="warning">Mês fechado. A lista está protegida contra alterações até reabrir.</div>}
        {monthStatus === 'indisponivel' && <div className="warning">Supabase indisponível. Confira o .env.local e execute o schema v6.</div>}
        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        <div className="grid-3">
          <MetricCard label="Previsão do mês" value={formatCurrency(forecastTotal)} help={`${forecastSummary.pagamentosCount || 0} linha(s) previstas`} />
          <MetricCard label="Pagamentos efetuados" value={formatCurrency(actualTotal)} help={`${summary.quantidadePaga} pagamento(s) no extrato`} tone="good" />
          <MetricCard label="Diferença" value={formatCurrency(forecastDifference)} help="Previsto menos realizado" tone={forecastDifference > 0 ? 'warning' : 'good'} />
        </div>

        <section className="payable-import-box">
          <div>
            <h2>Importar pagamentos efetuados no mês</h2>
            <p className="muted small-text">A importação pode ser feita a qualquer momento do mês aberto. Ela aceita planilha ou extrato bancário CSV/OFX e permite comparar o realizado com a previsão.</p>
          </div>
          <div className="import-actions">
            <button type="button" className="secondary-button" onClick={exportFile} disabled={loading || monthStatus === 'indisponivel'}>Exportar previsão do mês</button>
            <input type="file" accept=".xlsx,.xls,.csv,.ofx" onChange={(event) => { setFile(event.target.files?.[0] || null); setPreview(null); }} disabled={!canEdit || loading} />
            <button type="button" className="secondary-button" onClick={generatePreview} disabled={!file || !canEdit || loading}>
              Gerar prévia
            </button>
            <button type="button" className="primary-button" onClick={importFile} disabled={!file || !preview || !canEdit || loading || preview.linhasComErro > 0}>
              Gravar pagamentos
            </button>
          </div>
        </section>

        {preview && (
          <section className="preview-box">
            <div className="header-row">
              <div>
                <h2>Prévia dos pagamentos</h2>
                <p className="muted small-text">Arquivo: {preview.arquivo}. A gravação substitui os pagamentos efetuados do mês pelo extrato importado.</p>
              </div>
              {preview.linhasComErro > 0 ? <span className="badge badge-danger">Bloqueada</span> : <span className="badge badge-paid">Pronta para confirmar</span>}
            </div>
            <div className="preview-impact">
              <strong>A gravação irá:</strong>
              <span>+ Criar {preview.itensNovos} pagamento(s) novo(s)</span>
              <span>~ Alterar {preview.itensAlterados} pagamento(s)</span>
              <span>- Remover {preview.itensRemovidos} pagamento(s) que não vieram no novo extrato</span>
            </div>
            <div className="grid-3">
              <MetricCard label="Linhas validas" value={preview.linhasValidas} help={`${preview.linhasComErro} linha(s) com erro`} tone={preview.linhasComErro > 0 ? 'danger' : 'good'} />
              <MetricCard label="Novos / alterados" value={`${preview.itensNovos} / ${preview.itensAlterados}`} help="Impacto no extrato do mês" />
              <MetricCard label="Removidos" value={preview.itensRemovidos} help="Não vieram na nova planilha" tone={preview.itensRemovidos > 0 ? 'warning' : 'default'} />
            </div>
            <div className="grid-3">
              <MetricCard label="Extrato atual" value={formatCurrency(preview.valorAtualManual)} />
              <MetricCard label="Realizado importado" value={formatCurrency(preview.valorImportadoManual)} />
              <MetricCard label="Diferença" value={formatCurrency(preview.diferencaValorManual)} tone={preview.diferencaValorManual === 0 ? 'default' : 'warning'} />
            </div>
            {!!preview.issues?.length && (
              <div className="audit-list">
                <h3>Auditoria da planilha</h3>
                {preview.issues.slice(0, 12).map((issue, index) => (
                  <div key={`${issue.linha}-${index}`} className={issue.severidade === 'erro' ? 'audit-row audit-error' : 'audit-row audit-warning'}>
                    Linha {issue.linha}: {issue.campo ? `${issue.campo} - ` : ''}{issue.mensagem}
                  </div>
                ))}
                {preview.issues.length > 12 && <p className="muted small-text">Mais {preview.issues.length - 12} ocorrência(s) registradas na auditoria.</p>}
              </div>
            )}
          </section>
        )}

        <div className="header-row payable-header-row">
          <div>
            <h2>Pagamentos do mês</h2>
            <p className="muted small-text">{summary.quantidade} lançamentos, {summary.quantidadePaga} marcados como pagos.</p>
          </div>
          <button type="button" className="secondary-button" onClick={() => setShowManualForm((current) => !current)} disabled={!canEdit || loading}>
            {showManualForm ? 'Cancelar inclusão' : 'Adicionar pagamento'}
          </button>
        </div>

        {showManualForm && (
          <form className="preview-box" onSubmit={createManualItem}>
            <div className="header-row">
              <div>
                <h2>Novo pagamento manual</h2>
                <p className="muted small-text">Lançamento avulso da competência aberta.</p>
              </div>
            </div>
            <div className="grid-3">
              <label className="field-label">
                Descrição
                <input className="text-input" value={manualForm.descricao} onChange={(event) => updateManualForm({ descricao: event.target.value })} required />
              </label>
              <label className="field-label">
                Dia
                <input className="text-input" type="number" min="1" max="31" value={manualForm.vencimento_dia} onChange={(event) => updateManualForm({ vencimento_dia: event.target.value })} />
              </label>
              <label className="field-label">
                Valor
                <input className="text-input" type="number" min="0.01" step="0.01" value={manualForm.valor_previsto} onChange={(event) => updateManualForm({ valor_previsto: event.target.value })} required />
              </label>
            </div>
            <div className="grid-3">
              <label className="field-label">
                Categoria
                <input className="text-input" list="payable-categories" value={manualForm.categoria} onChange={(event) => updateManualForm({ categoria: event.target.value })} />
              </label>
              <label className="field-label">
                Centro
                <input className="text-input" list="payable-centers" value={manualForm.centro} onChange={(event) => updateManualForm({ centro: event.target.value })} />
              </label>
              <label className="gkit-flex-check">
                <input type="checkbox" checked={manualForm.pago} onChange={(event) => updateManualForm({ pago: event.target.checked })} />
                <span>Pago</span>
              </label>
            </div>
            <div className="actions">
              <button type="button" className="secondary-button" onClick={() => { setShowManualForm(false); setManualForm(emptyManualPayableForm); }} disabled={savingId === 'manual'}>
                Cancelar
              </button>
              <button type="submit" className="primary-button" disabled={!canEdit || savingId === 'manual'}>
                {savingId === 'manual' ? 'Salvando...' : 'Salvar pagamento'}
              </button>
            </div>
          </form>
        )}

        <div className="table-wrap">
          <table className="editable-table">
            <thead>
              <tr>
                <th>Pago</th>
                <th>Venc.</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Centro</th>
                <th className="text-right">Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={item.pago ? 'paid-row' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.pago}
                      disabled={!canEdit || savingId === item.id}
                      onChange={(event) => handlePagoChange(item, event.target.checked)}
                    />
                  </td>
                  <td>{item.vencimento_dia ? String(item.vencimento_dia).padStart(2, '0') : item.vencimento_texto || '-'}</td>
                  <td>
                    <input
                      className="inline-input description-input"
                      value={item.descricao}
                      disabled={!canEdit || savingId === item.id}
                      onChange={(event) => updateLocal(item.id, { descricao: event.target.value })}
                      onBlur={(event) => saveItem(item.id, { descricao: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="inline-input"
                      list="payable-categories"
                      value={item.categoria}
                      disabled={!canEdit || savingId === item.id}
                      onChange={(event) => updateLocal(item.id, { categoria: event.target.value })}
                      onBlur={(event) => saveItem(item.id, { categoria: event.target.value })}
                    />
                  </td>
                  <td>{item.centro || '-'}</td>
                  <td className="text-right">
                    <input
                      className="inline-input money-input"
                      value={String(item.valor_previsto).replace('.', ',')}
                      disabled={!canEdit || savingId === item.id}
                      onChange={(event) => updateLocal(item.id, { valor_previsto: normalizeMoneyInput(event.target.value) })}
                      onBlur={(event) => saveItem(item.id, { valor_previsto: normalizeMoneyInput(event.target.value) })}
                    />
                  </td>
                  <td>{savingId === item.id ? <span className="badge">Salvando</span> : item.pago ? <span className="badge badge-paid">Pago</span> : <span className="badge">Aberto</span>}</td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={7}><EmptyState title="Nenhum pagamento neste mês" description="Abra o mês e importe o extrato realizado, ou feche o mês anterior para criar a próxima competência automaticamente." /></td>
                </tr>
              )}
            </tbody>
          </table>
          <datalist id="payable-categories">
            {categories.map((category) => <option key={category} value={category} />)}
          </datalist>
          <datalist id="payable-centers">
            {centers.map((center) => <option key={center} value={center} />)}
          </datalist>
        </div>
      </section>
    </main>
  );
}

