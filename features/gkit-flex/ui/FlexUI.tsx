import React from 'react';

type MonthStatus = 'aberto' | 'fechado' | 'nao_aberto' | 'indisponivel' | string;
const FLEX_COMPETENCIA_STORAGE_KEY = 'gkit-flex:competencia';
const FLEX_COMPETENCIA_EVENT = 'gkit-flex:competencia-change';

export function formatMonthLabel(value: string) {
  if (!value) return '-';
  const normalized = value.length === 7 ? `${value}-01` : value;
  const [year, month] = normalized.slice(0, 7).split('-');
  return `${month}/${year}`;
}

function currentYearMonthOptions() {
  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return Array.from({ length: currentMonth }, (_, index) => {
    const month = currentMonth - index;
    const value = `${year}-${String(month).padStart(2, '0')}`;
    return { value, label: formatMonthLabel(value) };
  });
}

function normalizeCompetencia(value: string | null | undefined) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}/.test(text) ? text.slice(0, 7) : '';
}

function persistCompetencia(value: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FLEX_COMPETENCIA_STORAGE_KEY, value);

  const url = new URL(window.location.href);
  if (url.searchParams.get('competencia') !== value) {
    url.searchParams.set('competencia', value);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  window.dispatchEvent(new CustomEvent(FLEX_COMPETENCIA_EVENT, { detail: { competencia: value } }));
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
  const monthOptions = React.useMemo(() => currentYearMonthOptions(), []);
  const monthValues = React.useMemo(() => new Set(monthOptions.map((option) => option.value)), [monthOptions]);
  const selectedCompetencia = monthValues.has(competencia) ? competencia : monthOptions[0]?.value || competencia;
  const restoredRef = React.useRef(false);

  React.useEffect(() => {
    if (!onCompetenciaChange) return;
    if (!restoredRef.current && typeof window !== 'undefined') {
      restoredRef.current = true;
      const urlCompetencia = normalizeCompetencia(new URLSearchParams(window.location.search).get('competencia'));
      const storedCompetencia = normalizeCompetencia(window.localStorage.getItem(FLEX_COMPETENCIA_STORAGE_KEY));
      const restored = [urlCompetencia, storedCompetencia].find((value) => value && monthValues.has(value));

      if (restored && restored !== competencia) {
        onCompetenciaChange(restored);
        return;
      }
    }

    if (onCompetenciaChange && selectedCompetencia && selectedCompetencia !== competencia) {
      onCompetenciaChange(selectedCompetencia);
      return;
    }

    if (selectedCompetencia && monthValues.has(selectedCompetencia)) persistCompetencia(selectedCompetencia);
  }, [competencia, monthValues, onCompetenciaChange, selectedCompetencia]);

  function handleCompetenciaChange(value: string) {
    persistCompetencia(value);
    onCompetenciaChange?.(value);
  }

  return (
    <>
      <section className="module-page-hero month-context-header">
        <div className="module-page-hero-main">
          <div className="module-page-hero-title">
            <div className="month-context-main">
              <p className="platform-kicker eyebrow">GKIT Flex</p>
              <h1>{title}</h1>
              <p className="muted">{description}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="month-context-toolbar">
        <div className="month-context-statuses">
          {primaryStatus ? <span>{primaryStatus.label}: <StatusBadge status={primaryStatus.status} compact /></span> : null}
          {secondaryStatus ? <span>{secondaryStatus.label}: <StatusBadge status={secondaryStatus.status} compact /></span> : null}
        </div>
        <div className="month-context-side">
          <label className="field-label dashboard-month">
            Competencia
            {onCompetenciaChange ? (
              <select
                className="text-input"
                value={selectedCompetencia}
                onChange={(event) => handleCompetenciaChange(event.target.value)}
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            ) : (
              <select
                className="text-input"
                value={selectedCompetencia}
                disabled
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            )}
          </label>
          {children ? <div className="month-context-actions">{children}</div> : null}
        </div>
      </section>
    </>
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
