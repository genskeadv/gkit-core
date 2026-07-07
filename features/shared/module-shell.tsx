import Link from 'next/link'
import type { ReactNode } from 'react'
import { BrandLogo } from '@/features/shared/brand-logo'
import type { PlatformUsuario } from '@/lib/auth/platform'

export type ModuleNavGroup = {
  href?: string
  title: string
  items?: Array<{
    href: string
    label: string
    pending?: boolean
  }>
}

export function ModuleShell({
  activeHref,
  actions,
  brand,
  children,
  description,
  eyebrow,
  navGroups,
  product,
  title,
  usuario,
  variantClassName,
}: {
  activeHref: string
  actions?: ReactNode
  brand: string
  children: ReactNode
  description?: string
  eyebrow: string
  navGroups: ModuleNavGroup[]
  product: string
  title: string
  usuario: PlatformUsuario
  variantClassName?: string
}) {
  return (
    <main className={variantClassName ? `module-shell ${variantClassName}` : 'module-shell'}>
      <aside className="module-sidebar">
        <div className="module-sidebar-header">
          <BrandLogo className="module-sidebar-mark" label={brand} />
          <div>
            <strong>{product}</strong>
            <small>{brand}</small>
          </div>
        </div>

        <nav aria-label={`Navegacao ${product}`}>
          {navGroups.map((group) => (
            group.href ? (
              <Link
                className={activeHref === group.href ? 'active module-sidebar-direct' : 'module-sidebar-direct'}
                href={group.href}
                key={group.title}
              >
                <span>{group.title}</span>
              </Link>
            ) : (
              <details className="module-sidebar-group" key={group.title} open>
                <summary className="module-sidebar-group-label">{group.title}</summary>
                {(group.items ?? []).map((item) => {
                  const active = activeHref === item.href
                  return (
                    <Link
                      className={active ? 'active' : item.pending ? 'pending' : ''}
                      href={item.pending ? '/modulos/painel' : item.href}
                      key={`${group.title}-${item.href}-${item.label}`}
                    >
                      <span>{item.label}</span>
                      {item.pending ? <small>pendente</small> : null}
                    </Link>
                  )
                })}
              </details>
            )
          ))}
        </nav>

        <div className="module-sidebar-footer">
          <span>{usuario.nome}</span>
          <span className="sidebar-badge">{usuario.tipo.replace('_', ' ')}</span>
        </div>
      </aside>

      <section className="module-main">
        <div className="platform-bg" />
        <section className="module-page-hero">
          <div className="module-page-hero-main">
            <div className="module-page-hero-title">
              <div>
                <p className="platform-kicker">{eyebrow}</p>
                <h1>{title}</h1>
                {description ? <p>{description}</p> : null}
              </div>
            </div>
            {actions ? <div className="module-page-actions">{actions}</div> : null}
          </div>
        </section>

        <div className="module-page-content">{children}</div>
      </section>
    </main>
  )
}
