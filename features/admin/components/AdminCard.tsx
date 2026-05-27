export function AdminCard({ title, value, hint }: { title: string; value: string | number; hint?: string }) {
  return (
    <div className="card metric-card">
      <p className="metric-label">{title}</p>
      <p className="metric-value">{value}</p>
      {hint ? <p className="metric-hint">{hint}</p> : null}
    </div>
  )
}
