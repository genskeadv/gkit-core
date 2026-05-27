import Link from 'next/link'
import type { ReactNode } from 'react'
import { BrandLogo } from '@/features/shared/brand-logo'
import type { PlatformUsuario } from '@/lib/auth/platform'

export type ModuleNavGroup = {
  title: string
  items: Array<{
    href: string
    label: string
    pending?: boolean
  }>
}

export function ModuleShell({
  activeHref,
  brand,
  children,
  description,
  eyebrow,
  navGroups,
  product,
  title,
  usuario,
}: {
  activeHref: string
  brand: string
  children: ReactNode
  description: string
  eyebrow: string
  navGroups: ModuleNavGroup[]
  product: string
  title: string
  usuario: PlatformUsuario
}) {
  return (
    <main className="module-shell">
      <aside className="module-sidebar">
        <div className="module-sidebar-header">
          <BrandLogo className="module-sidebar-mark" label={product} />
          <strong>{product}</strong>
        </div>

        <nav aria-label={`Navegacao ${product}`}>
          {navGroups.map((group) => (
            <details className="module-sidebar-group" key={group.title} open>
              <summary className="module-sidebar-group-label">{group.title}</summary>
              {group.items.map((item) => {
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
          ))}
        </nav>

        <div className="module-sidebar-footer">
          <span>{usuario.nome}</span>
          <span className="sidebar-badge">{usuario.tipo.replace('_', ' ')}</span>
        </div>
      </aside>

      <section className="module-main">
        <div className="platform-bg" />
        <header className="module-main-header">
          <Link className="button secondary" href="/plataforma">Voltar ao painel</Link>
          <div className="module-user">
            <strong>{usuario.nome}</strong>
            <span>{usuario.email}</span>
          </div>
        </header>

        <section className="module-page-hero">
          <div className="module-page-hero-main">
            <BrandLogo className="module-page-brand" label={`${title} - ${brand}`} />
            <div>
              <p className="platform-kicker">{eyebrow}</p>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
          </div>
        </section>

        <div className="module-page-content">{children}</div>
      </section>
    </main>
  )
}
