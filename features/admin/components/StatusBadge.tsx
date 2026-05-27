export function StatusBadge({ status }: { status?: string | null }) {
  const label = status ?? '—'
  return (
    <span className="badge">
      {label}
    </span>
  )
}
