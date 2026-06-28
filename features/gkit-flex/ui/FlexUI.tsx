import React from 'react';

type MonthStatus = 'aberto' | 'fechado' | 'nao_aberto' | 'indisponivel' | string;

export function formatMonthLabel(value: string) {
  if (!value) return '-';
  const normalized = value.length === 7 ? `${value}-01` : value;
  const [year, month] = normalized.slice(0, 7).split('-');
  return `${month}/${year}`;
}

export function statusLabel(status: MonthStatus) {
  if (status === 'aberto') return 'Aberto';
  if (status === 'fechado') return 'Fechado';
  if (status === 'indisponivel') return 'Indisponivel';
  if (status === 'ok') return 'OK';
  if (status === 'aviso') return 'Atencao';
  if (status === 'bloqueio') return 'Bloqueio';
  return 'Nao aberto';
}

export function statusClass(status: MonthStatus) {
  if (status === 'aberto' || status === 'ok') return 'status-aberto';
  if (status === 'fechado' || status === 'bloqueio') return 'status-fechado';
  if (status === 'aviso') return 'status-aviso';
  if (status === 'indisponivel') return 'status-indisponivel';
  return 'status-nao_aberto';
}

export function StatusBadge({ status, label, compact = false }: { status: MonthStatus; label?: string; compact?: boolean }) {
  return <span className={`status-pill ${compact ? 'compact' : ''} ${statusClass(status)}`}>{label || statusLabel(status)}</span>;
}

export function MonthContextHeader({
  title,
  description,
  competencia,
  onCompetenciaChange,
  primaryStatus,
  secondaryStatus,
  children,
}: {
  title: string;
  description: string;
  competencia: string;
  onCompetenciaChange?: (value: string) => void;
  primaryStatus?: { label: string; status: MonthStatus };
  secondaryStatus?: { label: string; status: MonthStatus };
  children?: React.ReactNode;
}) {
  return (
    <section className="month-context-header">
      <div className="month-context-main">
        <p className="eyebrow">GKIT Flex</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
        <div className="month-context-statuses">
          {primaryStatus ? <span>{primaryStatus.label}: <StatusBadge status={primaryStatus.status} compact /></span> : null}
          {secondaryStatus ? <span>{secondaryStatus.label}: <StatusBadge status={secondaryStatus.status} compact /></span> : null}
        </div>
      </div>
      <div className="month-context-side">
        <label className="field-label dashboard-month">
          Competencia
          <input
            className="text-input"
            type="month"
            value={competencia}
            disabled={!onCompetenciaChange}
            onChange={(event) => onCompetenciaChange?.(event.target.value)}
          />
        </label>
        {children ? <div className="month-context-actions">{children}</div> : null}
      </div>
    </section>
  );
}

export function MetricCard({ label, value, help, tone = 'default' }: { label: string; value: React.ReactNode; help?: React.ReactNode; tone?: 'default' | 'good' | 'warning' | 'danger' }) {
  return (
    <div className={`metric metric-${tone}`}>
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      {help ? <p className="small-text muted">{help}</p> : null}
    </div>
  );
}

export function ActionCard({ eyebrow, title, value, details, href, status, cta }: { eyebrow: string; title: string; value: React.ReactNode; details: React.ReactNode[]; href: string; status?: MonthStatus; cta: string }) {
  return (
    <a className="module-card action-card" href={href}>
      <div className="module-card-top">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {status ? <StatusBadge status={status} /> : null}
      </div>
      <div className="module-main-value">{value}</div>
      <div className="module-details">
        {details.map((detail, index) => <span key={index}>{detail}</span>)}
      </div>
      <span className="card-cta">{cta}</span>
    </a>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}
