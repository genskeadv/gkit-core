'use client';

import { useEffect, useMemo, useState } from 'react';
import { ActionCard, MetricCard, MonthContextHeader, StatusBadge } from '../ui/FlexUI';

type MonthStatus = 'aberto' | 'fechado' | 'nao_aberto';

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

function formatCompetencia(value: string) {
  if (!value) return '-';
  const [year, month] = value.slice(0, 7).split('-');
  return `${month}/${year}`;
}

export function DashboardHome() {
  const [competencia, setCompetencia] = useState(currentMonthValue());
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const competenciaParam = useMemo(() => `${competencia}-01`, [competencia]);

  async function loadSummary() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/gkit-flex/dashboard/resumo?competencia=${encodeURIComponent(competenciaParam)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar o resumo do mês.');
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o resumo do mês.');
    } finally {
      setLoading(false);
    }
  }

  async function updateMonth(action: 'abrir' | 'fechar' | 'reabrir') {
    if (action === 'fechar') {
      const confirmed = window.confirm(`Fechar ${formatCompetencia(competenciaParam)}? O mês ficará protegido contra alterações.`);
      if (!confirmed) return;
    }
    if (action === 'reabrir') {
      const confirmed = window.confirm(`Reabrir ${formatCompetencia(competenciaParam)}? Use apenas para correções.`);
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
      if (!response.ok) throw new Error(payload.error || 'Não foi possível atualizar o mês.');

      const actionLabel = action === 'abrir' ? 'aberto' : action === 'fechar' ? 'fechado' : 'reaberto';
      const warnings = [payload.comissoesWarning, payload.contasPagarWarning].filter(Boolean).join(' | ');
      setSuccess(warnings ? `Mês ${actionLabel}, com aviso: ${warnings}` : `Mês ${actionLabel} com sucesso.`);
      await loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar o mês.');
    } finally {
      setActionLoading('');
    }
  }

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competenciaParam]);

  const recebido = data?.comissoes.latestExecution?.total_valor_recebido || 0;
  const comissoes = data?.comissoes.latestExecution?.total_comissao || 0;
  const contasPagarTotal = data?.contasPagar.total || 0;
  const contasPagarAberto = data?.contasPagar.totalAberto || 0;
  const saldo = data?.saldo.recebidoMenosPagarTotal || 0;

  const monthNotOpened = data?.comissoes.status === 'nao_aberto' && data?.contasPagar.status === 'nao_aberto';
  const monthIsOpen = data?.comissoes.status === 'aberto' || data?.contasPagar.status === 'aberto';
  const monthIsClosed = data?.comissoes.status === 'fechado' || data?.contasPagar.status === 'fechado';

  return (
    <main className="page-shell dashboard-page clean-home">
      <MonthContextHeader
        title="GKIT Flex"
        description="Resumo mensal limpo: abrir ou fechar mês, contas a pagar e contas a receber."
        competencia={competencia}
        onCompetenciaChange={setCompetencia}
        primaryStatus={{ label: 'Receber', status: data?.comissoes.status || 'nao_aberto' }}
        secondaryStatus={{ label: 'Pagar', status: data?.contasPagar.status || 'nao_aberto' }}
      />

      {error ? <div className="error">{error}</div> : null}
      {success ? <div className="success">{success}</div> : null}
      {!data?.configured ? (
        <div className="warning">Supabase não configurado. Preencha o `.env.local` para carregar e salvar os dados.</div>
      ) : null}

      <section className="month-control-card clean-month-control">
        <div>
          <p className="eyebrow">Mês</p>
          <h2>{formatCompetencia(data?.competencia || competenciaParam)}</h2>
          <p className="muted small-text">
            Receber: <StatusBadge status={data?.comissoes.status || 'nao_aberto'} compact />{' '}
            Pagar: <StatusBadge status={data?.contasPagar.status || 'nao_aberto'} compact />
          </p>
        </div>
        <div className="month-actions">
          <button className="secondary-button" disabled={Boolean(actionLoading) || !monthNotOpened} onClick={() => updateMonth('abrir')}>
            {actionLoading === 'abrir' ? 'Abrindo...' : 'Abrir mês'}
          </button>
          <button className="secondary-button" disabled={Boolean(actionLoading) || !monthIsClosed} onClick={() => updateMonth('reabrir')}>
            {actionLoading === 'reabrir' ? 'Reabrindo...' : 'Reabrir mês'}
          </button>
          <button className="primary-button" disabled={Boolean(actionLoading) || !monthIsOpen} onClick={() => updateMonth('fechar')}>
            {actionLoading === 'fechar' ? 'Fechando...' : 'Fechar mês'}
          </button>
        </div>
      </section>

      <section className="grid-3 dashboard-metrics clean-summary">
        <MetricCard label="Recebido" value={formatMoney(recebido)} help="Último contas a receber processado" tone={recebido > 0 ? 'good' : 'default'} />
        <MetricCard label="A pagar" value={formatMoney(contasPagarTotal)} help={`${data?.contasPagar.quantidade || 0} item(ns) no mês`} tone={contasPagarAberto > 0 ? 'warning' : 'default'} />
        <MetricCard label="Saldo referência" value={formatMoney(saldo)} help="Recebido menos contas a pagar total" tone={saldo >= 0 ? 'good' : 'danger'} />
      </section>

      <section className="grid-2 dashboard-cards clean-main-cards">
        <ActionCard
          eyebrow="Financeiro"
          title="Contas a pagar"
          href={`/modulos/gkit-flex/contas-a-pagar?competencia=${competenciaParam}`}
          status={data?.contasPagar.status || 'nao_aberto'}
          value={formatMoney(contasPagarTotal)}
          details={[
            <>Pago: <strong>{formatMoney(data?.contasPagar.totalPago || 0)}</strong></>,
            <>Aberto: <strong>{formatMoney(contasPagarAberto)}</strong></>,
            <>Itens: <strong>{data?.contasPagar.quantidade || 0}</strong></>,
          ]}
          cta="Abrir contas a pagar"
        />

        <ActionCard
          eyebrow="Recebíveis"
          title="Contas a receber + comissões"
          href={`/modulos/gkit-flex/comissoes?competencia=${competenciaParam}`}
          status={data?.comissoes.status || 'nao_aberto'}
          value={formatMoney(recebido)}
          details={[
            <>Comissões: <strong>{formatMoney(comissoes)}</strong></>,
            <>Base reduzida: <strong>{formatMoney(data?.comissoes.latestExecution?.total_base_reduzida || 0)}</strong></>,
            <>Auditoria: <strong>{data?.comissoes.latestExecution?.audit_count || 0} item(ns)</strong></>,
          ]}
          cta="Abrir contas a receber"
        />
      </section>

      {loading ? <p className="muted small-text">Atualizando resumo do mês...</p> : null}
    </main>
  );
}
