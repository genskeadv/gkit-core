'use client';

import { useEffect, useMemo, useState } from 'react';
import { EmptyState, MetricCard, MonthContextHeader } from '../ui/FlexUI';

type ExecutionRow = {
  id: string;
  competencia: string;
  contas_file_name: string;
  clientes_file_name: string;
  total_valor_recebido: number;
  total_base_reduzida: number;
  total_comissao: number;
  audit_count: number;
  status: string;
  created_at: string;
};

type SummaryRow = {
  categoria: string;
  carteira: string;
  quantidadeLancamentos: number;
  valorRecebido: number;
  valorAposReducao: number;
  comissaoFinal: number;
};

type MonthStatus = 'aberto' | 'fechado' | 'nao_aberto' | 'indisponivel';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function monthStatusLabel(status: MonthStatus) {
  if (status === 'aberto') return 'Mês aberto';
  if (status === 'fechado') return 'Mês fechado';
  if (status === 'indisponivel') return 'Supabase indisponível';
  return 'Mês não aberto';
}

export function CommissionUploader() {
  const [contasReceber, setContasReceber] = useState<File | null>(null);
  const [competencia, setCompetencia] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [monthLoading, setMonthLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [auditCount, setAuditCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [executions, setExecutions] = useState<ExecutionRow[]>([]);
  const [historyConfigured, setHistoryConfigured] = useState<boolean | null>(null);
  const [monthStatus, setMonthStatus] = useState<MonthStatus>('indisponivel');

  const canSubmit = Boolean(contasReceber && !loading && monthStatus === 'aberto');

  async function loadMonthStatus(selectedCompetencia = competencia) {
    try {
      setMonthLoading(true);
      const response = await fetch(`/api/gkit-flex/comissoes/competencia?competencia=${selectedCompetencia}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível consultar a competência.');
      if (!payload.configured) {
        setMonthStatus('indisponivel');
        return;
      }
      setMonthStatus((payload.status || 'nao_aberto') as MonthStatus);
    } catch {
      setMonthStatus('indisponivel');
    } finally {
      setMonthLoading(false);
    }
  }

  async function handleMonthAction(action: 'abrir' | 'fechar' | 'reabrir') {
    if (action === 'fechar') {
      const confirmed = window.confirm('Fechar esta competência de comissões? Novos cálculos serão bloqueados até reabrir.');
      if (!confirmed) return;
    }
    if (action === 'reabrir') {
      const confirmed = window.confirm('Reabrir esta competência de comissões para correção?');
      if (!confirmed) return;
    }
    try {
      setMonthLoading(true);
      setError(null);
      setSaveStatus(null);
      const response = await fetch('/api/gkit-flex/comissoes/competencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competencia, action }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível atualizar a competência.');
      setMonthStatus((payload.status || 'nao_aberto') as MonthStatus);
      setSaveStatus(
        action === 'abrir'
          ? 'Mês aberto para processamento.'
          : action === 'fechar'
            ? 'Mês fechado. Novas importações ficam bloqueadas até reabrir.'
            : 'Mês reaberto para correções.',
      );
      await loadExecutions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao atualizar mês.');
    } finally {
      setMonthLoading(false);
    }
  }

  async function loadExecutions() {
    try {
      const response = await fetch('/api/gkit-flex/comissoes/execucoes', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível carregar histórico.');
      setHistoryConfigured(Boolean(payload.configured));
      setExecutions((payload.rows || []) as ExecutionRow[]);
    } catch {
      setHistoryConfigured(false);
      setExecutions([]);
    }
  }

  useEffect(() => {
    loadExecutions();
  }, []);

  useEffect(() => {
    loadMonthStatus(competencia);
  }, [competencia]);

  const totals = useMemo(() => {
    return summary.reduce(
      (acc, row) => {
        acc.valorRecebido += row.valorRecebido;
        acc.valorAposReducao += row.valorAposReducao;
        acc.comissaoFinal += row.comissaoFinal;
        return acc;
      },
      { valorRecebido: 0, valorAposReducao: 0, comissaoFinal: 0 },
    );
  }, [summary]);

  async function handleSubmit() {
    if (!contasReceber) return;

    setLoading(true);
    setError(null);
    setSaveStatus(null);
    setSummary([]);
    setAuditCount(null);

    try {
      const formData = new FormData();
      formData.append('contasReceber', contasReceber);
      formData.append('competencia', competencia ? `${competencia}-01` : '');

      const response = await fetch('/api/gkit-flex/comissoes/calcular', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Não foi possível calcular as comissões.');
      }

      const encodedSummary = response.headers.get('X-Commission-Summary');
      const auditHeader = response.headers.get('X-Audit-Count');

      if (encodedSummary) {
        setSummary(JSON.parse(decodeURIComponent(encodedSummary)) as SummaryRow[]);
      }
      if (auditHeader) {
        setAuditCount(Number(auditHeader));
      }

      const saved = response.headers.get('X-Commission-Saved') === 'true';
      const executionId = response.headers.get('X-Commission-Execution-Id');
      const warning = response.headers.get('X-Commission-Warning');
      if (saved) {
        setSaveStatus(`Execução salva no Supabase${executionId ? `: ${executionId}` : ''}.`);
        loadExecutions();
      } else if (warning) {
        setSaveStatus(decodeURIComponent(warning));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `comissoes_${competencia}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao calcular comissões.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <MonthContextHeader
        title="Contas a receber + comissões"
        description="Envie a planilha de contas a receber; clientes e carteiras sao lidos do Ciclo e do Core."
        competencia={competencia}
        onCompetenciaChange={setCompetencia}
        primaryStatus={{ label: 'Status', status: monthStatus }}
      >
        <a className="secondary-button" href="/">Home</a>
        {monthStatus === 'nao_aberto' && (
          <button type="button" onClick={() => handleMonthAction('abrir')} className="secondary-button" disabled={monthLoading}>Abrir mês</button>
        )}
        {monthStatus === 'aberto' && (
          <button type="button" onClick={() => handleMonthAction('fechar')} className="danger-button" disabled={monthLoading}>Fechar mês</button>
        )}
        {monthStatus === 'fechado' && (
          <button type="button" onClick={() => handleMonthAction('reabrir')} className="secondary-button" disabled={monthLoading}>Reabrir mês</button>
        )}
      </MonthContextHeader>

      <section className="card">
        <div className="process-steps">
          <span className={monthStatus === 'aberto' ? 'step step-ok' : 'step'}>1. Abrir mês</span>
          <span className={contasReceber ? 'step step-ok' : 'step'}>2. Contas a receber</span>
          <span className="step step-ok">3. Clientes do Ciclo</span>
          <span className={summary.length ? 'step step-ok' : 'step'}>4. Calcular e baixar</span>
        </div>

        {monthStatus === 'fechado' && (
          <div className="warning">Esta competência está fechada. Para corrigir ou reprocessar, reabra o mês.</div>
        )}
        {monthStatus === 'nao_aberto' && (
          <div className="warning">Esta competência ainda não foi aberta. Clique em “Abrir mês” antes de calcular.</div>
        )}
        {monthStatus === 'indisponivel' && (
          <div className="warning">Controle de mês indisponível. Confira as variáveis do Supabase e execute o schema v4.</div>
        )}

        <div className="grid-2">
          <label className="upload-box">
            <span className="upload-title">1. Contas a receber do mês</span>
            <span className="upload-help">Arquivo financeiro mensal exportado do sistema.</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => setContasReceber(event.target.files?.[0] ?? null)}
              className="file-input"
            />
            {contasReceber && <p className="selected-file">Selecionado: {contasReceber.name}</p>}
          </label>

          <div className="upload-box">
            <span className="upload-title">2. Clientes e carteiras</span>
            <span className="upload-help">Base usada automaticamente: clientes ativos do Ciclo vinculados as carteiras do Core.</span>
            <p className="selected-file">Origem: ciclo.clientes + core.carteiras</p>
          </div>
        </div>

        <div className="actions">
          <button type="button" disabled={!canSubmit} onClick={handleSubmit} className="primary-button">
            {loading ? 'Calculando...' : 'Calcular, salvar e baixar planilha'}
          </button>
          <p className="muted">Saída: Resumo, Acordos Judiciais, Mensalidade, Contas com Carteira e Auditoria.</p>
        </div>

        {error && <div className="error">{error}</div>}
        {saveStatus && <div className="success">{saveStatus}</div>}
      </section>

      <section className="grid-3">
        <MetricCard label="Valor recebido" value={formatCurrency(totals.valorRecebido)} help="Total considerado na apuração" />
        <MetricCard label="Base após redutores" value={formatCurrency(totals.valorAposReducao)} help="Após 15% em acordos e 14% em mensalidade" />
        <MetricCard label="Comissão final" value={formatCurrency(totals.comissaoFinal)} help="Valor final por regra de categoria" tone={totals.comissaoFinal > 0 ? 'good' : 'default'} />
      </section>

      <section className="card">
        <div className="header-row">
          <div>
            <h2>Histórico salvo</h2>
            <p className="muted">Últimas execuções gravadas no Supabase.</p>
          </div>
          <button type="button" onClick={loadExecutions} className="secondary-button">Atualizar</button>
        </div>

        {historyConfigured === false && (
          <div className="warning">Supabase ainda não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env.local.</div>
        )}

        {historyConfigured && executions.length === 0 && <EmptyState title="Nenhuma execução salva" description="Calcule uma competência aberta para criar o primeiro histórico de comissões." />}

        {executions.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Competência</th>
                  <th>Arquivo contas</th>
                  <th className="text-right">Recebido</th>
                  <th className="text-right">Base reduzida</th>
                  <th className="text-right">Comissão</th>
                  <th className="text-right">Auditoria</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((row) => (
                  <tr key={row.id}>
                    <td>{row.competencia?.slice(0, 7)}</td>
                    <td>{row.contas_file_name}</td>
                    <td className="text-right">{formatCurrency(Number(row.total_valor_recebido))}</td>
                    <td className="text-right">{formatCurrency(Number(row.total_base_reduzida))}</td>
                    <td className="text-right"><strong>{formatCurrency(Number(row.total_comissao))}</strong></td>
                    <td className="text-right">{row.audit_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {summary.length > 0 && (
        <section className="card">
          <div className="header-row">
            <div>
              <h2>Resumo por carteira</h2>
              <p className="muted">Conferência rápida antes de usar a planilha baixada.</p>
            </div>
            {auditCount !== null && <span className="badge">{auditCount} item(ns) na auditoria</span>}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Carteira</th>
                  <th className="text-right">Lançamentos</th>
                  <th className="text-right">Valor recebido</th>
                  <th className="text-right">Após redução</th>
                  <th className="text-right">Comissão final</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row, index) => (
                  <tr key={`${row.categoria}-${row.carteira}-${index}`}>
                    <td>{row.categoria}</td>
                    <td><strong>{row.carteira}</strong></td>
                    <td className="text-right">{row.quantidadeLancamentos}</td>
                    <td className="text-right">{formatCurrency(row.valorRecebido)}</td>
                    <td className="text-right">{formatCurrency(row.valorAposReducao)}</td>
                    <td className="text-right"><strong>{formatCurrency(row.comissaoFinal)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
