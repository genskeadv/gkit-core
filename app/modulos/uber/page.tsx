import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CarFront, LayoutGrid } from 'lucide-react'
import { canAccess } from '@/lib/auth/permissions'
import { createStandaloneUberExpenseAction } from '@/features/colab/actions'
import { ColabUberExpenses } from '@/features/colab/components'
import { getColabUberData, requireUberContext } from '@/features/colab/queries'
import { BrandLogo } from '@/features/shared/brand-logo'

const uberTabs = [
  { href: '/plataforma', icon: LayoutGrid, label: 'Plataforma' },
  { href: '/modulos/uber', icon: CarFront, label: 'GKIT Uber', active: true },
]

export default async function UberPage({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string; erro?: string }>
}) {
  const context = await requireUberContext()
  const canRead = canAccess(context.permissions, 'uber.read') || canAccess(context.permissions, 'uber.write')
  const canCreate = canAccess(context.permissions, 'uber.write')

  if (!canRead) redirect('/plataforma')

  const [uberData, params] = await Promise.all([
    getColabUberData(context.usuario.email, canCreate),
    searchParams ?? Promise.resolve({} as { ok?: string; erro?: string }),
  ])

  return (
    <main className="suite-page">
      <div className="platform-bg" />
      <div className="suite-wrap no-sidebar colab-shell-wrap">
        <section className="suite-hero-card colab-app-hero">
          <div className="suite-hero-main">
            <BrandLogo className="suite-brand-mark" label="GKIT Uber" />
            <div>
              <p className="platform-kicker">GKIT Uber</p>
              <h1>Despesas de Uber</h1>
              <p>Lancamento de corridas vinculadas a clientes do Ciclo, com recibo ou quilometragem para reembolso.</p>
            </div>
          </div>
          <nav className="suite-tabs" aria-label="Navegacao do GKIT Uber">
            {uberTabs.map((tab) => (
              <Link className={tab.active ? 'active' : ''} href={tab.href} key={tab.href}>
                <tab.icon aria-hidden="true" size={16} strokeWidth={2.2} />
                {tab.label}
              </Link>
            ))}
          </nav>
        </section>

        <ColabUberExpenses
          action={createStandaloneUberExpenseAction}
          data={uberData}
          error={params.erro}
          success={params.ok === '1'}
        />

        <nav className="colab-mobile-dock uber-mobile-dock" aria-label="Navegacao rapida do GKIT Uber">
          {uberTabs.map((tab) => (
            <Link className={tab.active ? 'active' : ''} href={tab.href} key={tab.href}>
              <tab.icon aria-hidden="true" size={18} strokeWidth={2.2} />
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  )
}
