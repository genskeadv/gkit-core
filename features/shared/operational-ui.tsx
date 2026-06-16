import Link from 'next/link'
import type { ReactNode } from 'react'

export type OperationalQuickLink = {
  href: string
  title: string
  description: string
  label?: string
  meta?: string
}

export type OperationalKpi = {
  label: string
  value: string
  hint: string
}

export function OperationalSection({
  action,
  children,
  className,
  classPrefix,
  description,
  eyebrow,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  className?: string
  classPrefix: string
  description?: string
  eyebrow?: string
  title: string
}) {
  return (
    <section className={className ? `${classPrefix}-section ${className}` : `${classPrefix}-section`}>
      <header className={`${classPrefix}-section-header`}>
        <div>
          {eyebrow ? <span>{eyebrow}</span> : null}
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action ? <div className={`${classPrefix}-section-action`}>{action}</div> : null}
      </header>
      {children}
    </section>
  )
}

export function OperationalQuickLinks({
  classPrefix,
  defaultLabel,
  items,
}: {
  classPrefix: string
  defaultLabel: string
  items: OperationalQuickLink[]
}) {
  return (
    <div className={`${classPrefix}-quick-grid`}>
      {items.map((item) => (
        <Link className={`${classPrefix}-quick-card`} href={item.href} key={item.href}>
          <span>{item.label ?? defaultLabel}</span>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          {item.meta ? <small>{item.meta}</small> : null}
        </Link>
      ))}
    </div>
  )
}

export function OperationalKpiGrid({
  className,
  items,
}: {
  className: string
  items: OperationalKpi[]
}) {
  return (
    <section className={className}>
      {items.map((item) => (
        <article className="card metric-card" key={item.label}>
          <p className="metric-label">{item.label}</p>
          <p className="metric-value">{item.value}</p>
          <p className="metric-hint">{item.hint}</p>
        </article>
      ))}
    </section>
  )
}
