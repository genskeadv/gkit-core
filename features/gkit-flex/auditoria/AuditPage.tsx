'use client';

import { useEffect, useMemo, useState } from 'react';
import { MonthContextHeader } from '../ui/FlexUI';

type Status = 'ok' | 'aviso' | 'bloqueio';

type AuditData = {
  configured: boolean;
  competencia: string;
  status: { geral: Status; texto: string };
  checklist: Array<{ id: string; titulo: string; status: Status; detalhe: string }>;
  comissoes: null | {
    latestExecution: any;
    totalRecebido: number;
    totalComissao: number;
    lancamentos: number;
    semVendedor: number;
    resumos: Array<any>;
  };
  contasPagar: null | {
    total: number;
    totalPago: number;
    totalAberto: number;
    quantidade: number;
    semCategoria: number;
    valorZerado: number;
    vencimentoInvalido: number;
    comissoesQuantidade: number;
    comissoesTotal: number;
    porCategoria: Array<{ categoria: string; valor: number }>;
  };
  versoes: { comissoes: Array<any>; importacoes: Array<any>; snapshots: Array<any> };
  auditoria: { total: number; porProblema: Array<{ nome: string; quantidade: number }>; amostras: Array<any> };
  eventos: Array<any>;
};

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return '-';
  }
}

function statusLabel(status: Status | string) {
  if (status === 'ok') return 'OK';
  if (status === 'aviso') return 'Aviso';
  if (status === 'bloqueio') return 'Bloqueio';
  if (status === 'aberto') return 'Aberto';
  if (status === 'fechado') return 'Fechado';
  return 'Não aberto';
}

function statusClass(status: Status | string) {
  if (status === 'ok' || status === 'aberto') return 'status-aberto';
  if (status === 'aviso') return 'status-aviso';
  if (status === 'bloqueio' || status === 'fechado') return 'status-fechado';
  return 'status-nao_aberto';
}

function prettyAction(value: string) {
  return String(value || '').replaceAll('_', ' ');
}

export function AuditPage() {
  const [competencia, setCompetencia] = useState(currentMonthValue());
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const competenciaParam = useMemo(() => `${competencia}-01`, [competencia]);

  async function loadAudit() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/gkit-flex/auditoria/resumo?competencia=${encodeURIComponent(competenciaParam)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Erro ao carregar auditoria.');
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar auditoria.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('competencia');
    if (value && /^\d{4}-\d{2}/.test(value)) setCompetencia(value.slice(0, 7));
  }, []);

  useEffect(() => {
    loadAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competenciaParam]);

  const exportUrl = `/api/gkit-flex/auditoria/exportar?competencia=${encodeURIComponent(competenciaParam)}`;

  return (
    <main className="page-shell audit-page">
      <MonthContextHeader
        title="Auditoria mensal"
        description="Checklist, versões, importações, snapshots e eventos para conferir o mês antes de fechar."
        competencia={competencia}
        onCompetenciaChange={setCompetencia}
        primaryStatus={{ label: 'Status geral', status: data?.status.geral || 'bloqueio' }}
      >
        <a className="secondary-button" href="/">Home</a>
        <a className="primary-button" href={exportUrl}>Exportar fechamento</a>
      </MonthContextHeader>

      {error ? <div className="error">{error}</div> : null}
      {!data?.configured ? <div className="warning">Supabase ainda não configurado. Defina o `.env.local` para acessar a auditoria.</div> : null}

      <section className="grid-3 dashboard-metrics">
        <div className="metric">
          <p className="metric-label">Status geral</p>
          <p className="metric-value small-value">
            <span className={`status-pill ${statusClass(data?.status.geral || 'bloqueio')}`}>{statusLabel(data?.status.geral || 'bloqueio')}</span>
          </p>
          <p className="small-text muted">{loading ? 'Atualizando...' : data?.status.texto || '-'}</p>
        </div>
        <div className="metric">
          <p className="metric-label">Recebido / comissão</p>
          <p className="metric-value">{formatMoney(data?.comissoes?.totalRecebido || 0)}</p>
          <p className="small-text muted">Comissões: {formatMoney(data?.comissoes?.totalComissao || 0)}</p>
        </div>
        <div className="metric">
          <p className="metric-label">Contas a pagar</p>
          <p className="metric-value">{formatMoney(data?.contasPagar?.total || 0)}</p>
          <p className="small-text muted">Em aberto: {formatMoney(data?.contasPagar?.totalAberto || 0)}</p>
        </div>
      </section>

      <section className="card">
        <div className="header-row">
          <div>
            <p className="eyebrow">Checklist</p>
            <h2>Conferência antes do fechamento</h2>
          </div>
          <button className="secondary-button" onClick={loadAudit} disabled={loading}>{loading ? 'Atualizando...' : 'Atualizar'}</button>
        </div>
        <div className="checklist-grid">
          {(data?.checklist || []).map((item) => (
            <div className="checklist-item" key={item.id}>
              <span className={`status-pill compact ${statusClass(item.status)}`}>{statusLabel(item.status)}</span>
              <strong>{item.titulo}</strong>
              <p className="muted small-text">{item.detalhe}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid-2 dashboard-extra">
        <div className="card">
          <h2>Pontos de auditoria</h2>
          <div className="mini-kpis">
            <div><span>Comissões com apontamento</span><strong>{data?.auditoria.total || 0}</strong></div>
            <div><span>Lançamentos sem vendedor</span><strong>{data?.comissoes?.semVendedor || 0}</strong></div>
            <div><span>Despesas sem categoria</span><strong>{data?.contasPagar?.semCategoria || 0}</strong></div>
            <div><span>Valores zerados</span><strong>{data?.contasPagar?.valorZerado || 0}</strong></div>
          </div>
          {data?.auditoria.porProblema?.length ? (
            <div className="category-list audit-problems">
              {data.auditoria.porProblema.map((row) => <div className="category-row" key={row.nome}><span>{row.nome}</span><strong>{row.quantidade}</strong></div>)}
            </div>
          ) : <p className="muted">Nenhum problema de comissão agrupado.</p>}
        </div>

        <div className="card">
          <h2>Contas a pagar por categoria</h2>
          {data?.contasPagar?.porCategoria?.length ? (
            <div className="category-list">
              {data.contasPagar.porCategoria.slice(0, 12).map((row) => <div className="category-row" key={row.categoria}><span>{row.categoria}</span><strong>{formatMoney(row.valor)}</strong></div>)}
            </div>
          ) : <p className="muted">Nenhuma despesa cadastrada para esta competência.</p>}
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Versões</p>
        <h2>Histórico de processamento</h2>
        <div className="table-wrap">
          <table className="periods-table">
            <thead>
              <tr><th>Tipo</th><th>Data</th><th>Arquivo / motivo</th><th className="text-right">Total</th><th className="text-right">Pendências</th></tr>
            </thead>
            <tbody>
              {(data?.versoes.comissoes || []).map((row) => (
                <tr key={`c-${row.id}`}>
                  <td>Comissões v{row.versao}</td>
                  <td>{formatDate(row.created_at)}</td>
                  <td>{row.contas_file_name || '-'} / {row.clientes_file_name || '-'}</td>
                  <td className="text-right">{formatMoney(Number(row.total_comissao || 0))}</td>
                  <td className="text-right">{row.audit_count || 0}</td>
                </tr>
              ))}
              {(data?.versoes.importacoes || []).map((row) => (
                <tr key={`i-${row.id}`}>
                  <td>Importação pagar</td>
                  <td>{formatDate(row.created_at)}</td>
                  <td>{row.arquivo_nome} · {row.modo}</td>
                  <td className="text-right">{formatMoney(Number(row.valor_importado_manual || 0))}</td>
                  <td className="text-right">{row.linhas_com_erro || 0}</td>
                </tr>
              ))}
              {(data?.versoes.snapshots || []).map((row) => (
                <tr key={`s-${row.id}`}>
                  <td>Snapshot</td>
                  <td>{formatDate(row.created_at)}</td>
                  <td>{row.motivo}</td>
                  <td className="text-right">{row.total_itens || 0} itens</td>
                  <td className="text-right">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Eventos</p>
        <h2>Log operacional do mês</h2>
        {(data?.eventos || []).length ? (
          <div className="table-wrap">
            <table className="periods-table">
              <thead><tr><th>Data</th><th>Módulo</th><th>Ação</th><th>Entidade</th></tr></thead>
              <tbody>
                {(data?.eventos || []).map((event) => (
                  <tr key={event.id}>
                    <td>{formatDate(event.created_at)}</td>
                    <td>{event.modulo}</td>
                    <td>{prettyAction(event.action)}</td>
                    <td>{event.entidade_tipo || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted">Nenhum evento registrado para esta competência ainda.</p>}
      </section>

      <section className="card">
        <p className="eyebrow">Amostras</p>
        <h2>Principais apontamentos de comissão</h2>
        {(data?.auditoria.amostras || []).length ? (
          <div className="table-wrap">
            <table className="periods-table">
              <thead><tr><th>Linha</th><th>Cliente</th><th>Categoria</th><th>Problema</th><th className="text-right">Valor</th></tr></thead>
              <tbody>
                {(data?.auditoria.amostras || []).map((row) => (
                  <tr key={row.id}>
                    <td>{row.linha || '-'}</td>
                    <td>{row.cliente || '-'}</td>
                    <td>{row.categoria || '-'}</td>
                    <td>{row.problema || '-'}</td>
                    <td className="text-right">{formatMoney(Number(row.valor_recebido || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted">Nenhum apontamento amostral disponível.</p>}
      </section>
    </main>
  );
}
