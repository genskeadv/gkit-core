export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="page-title-block">
      <h2 className="page-title">{title}</h2>
      {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
    </div>
  )
}
