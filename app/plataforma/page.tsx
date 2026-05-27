import Link from 'next/link'
import { BrandLogo } from '@/features/shared/brand-logo'
import { canAccess } from '@/lib/auth/permissions'
import { requirePlatformContext } from '@/lib/auth/platform'
import type { PlatformModule } from '@/lib/auth/platform'

type IconName = 'core' | 'intr' | 'crm' | 'ciclo' | 'cobranca' | 'grid' | 'shield' | 'clock'

type ModuleCard = PlatformModule & {
  area: string
  icon: IconName
  external?: boolean
}

const adminModule: ModuleCard = {
  id: 'admin-core',
  codigo: 'core',
  nome: 'GKLI Core',
  descricao: 'Usuários, carteiras, perfis, módulos e auditoria.',
  status: 'ativo',
  href: '/admin',
  area: 'Administração',
  icon: 'core',
}

const cobrancaLink: ModuleCard = {
  id: 'external-cobranca',
  codigo: 'cobranca',
  nome: 'GKLI Cobrança',
  descricao: 'Acesso ao ambiente independente de cobrança.',
  status: 'link',
  href: 'https://gkli-cob.vercel.app',
  area: 'Link externo',
  icon: 'cobranca',
  external: true,
}

const moduleMeta: Record<string, Pick<ModuleCard, 'area' | 'icon'>> = {
  core: { area: 'Administração', icon: 'core' },
  ciclo: { area: 'Governança', icon: 'ciclo' },
  crm: { area: 'Novos negócios', icon: 'crm' },
  intr: { area: 'Operação interna', icon: 'intr' },
  colab: { area: 'Portal do colaborador', icon: 'grid' },
  painel: { area: 'Entrada unificada', icon: 'grid' },
  sind: { area: 'Portal do síndico', icon: 'ciclo' },
}

function Icon({ name }: { name: IconName }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  }

  if (name === 'crm') {
    return (
      <svg {...common}>
        <path d="M16 18.5c0-2.2-1.8-4-4-4s-4 1.8-4 4" />
        <path d="M12 11.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
        <path d="M5 17.5c-.8-.9-1.2-1.9-1.2-3 0-1.8 1.1-3.3 2.7-3.9" />
        <path d="M19 17.5c.8-.9 1.2-1.9 1.2-3 0-1.8-1.1-3.3-2.7-3.9" />
      </svg>
    )
  }

  if (name === 'ciclo') {
    return (
      <svg {...common}>
        <path d="M7 7.5A6.8 6.8 0 0 1 18.5 10" />
        <path d="M18.5 6.5V10H15" />
        <path d="M17 16.5A6.8 6.8 0 0 1 5.5 14" />
        <path d="M5.5 17.5V14H9" />
      </svg>
    )
  }

  if (name === 'cobranca') {
    return (
      <svg {...common}>
        <path d="M7 3.5h7l4 4V20.5H7Z" />
        <path d="M14 3.5V8h4" />
        <path d="M9.5 12h5" />
        <path d="M9.5 15h3" />
        <circle cx="16.5" cy="16.5" r="3.2" />
        <path d="M16.5 14.8v3.4" />
      </svg>
    )
  }

  if (name === 'grid') {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="6" height="6" rx="1.5" />
        <rect x="14" y="4" width="6" height="6" rx="1.5" />
        <rect x="4" y="14" width="6" height="6" rx="1.5" />
        <rect x="14" y="14" width="6" height="6" rx="1.5" />
      </svg>
    )
  }

  if (name === 'clock') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3.2 2" />
      </svg>
    )
  }

  if (name === 'shield' || name === 'core') {
    return (
      <svg {...common}>
        <path d="M12 3.5 19 6v5.5c0 4.4-2.7 7.4-7 9-4.3-1.6-7-4.6-7-9V6Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10.5V20h13v-9.5" />
      <path d="M9.5 20v-6h5v6" />
    </svg>
  )
}

function toModuleCard(modulo: PlatformModule): ModuleCard {
  const meta = moduleMeta[modulo.codigo] ?? { area: 'Módulo integrado', icon: 'grid' as IconName }
  return { ...modulo, ...meta }
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: IconName
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="platform-summary-card">
      <div className="platform-summary-icon"><Icon name={icon} /></div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </div>
  )
}

function ModuleTile({ module }: { module: ModuleCard }) {
  const content = (
    <>
      <div className="module-top-line" />
      <div className="module-icon"><Icon name={module.icon} /></div>
      <h3>{module.nome}</h3>
      <p>{module.descricao}</p>
      <div className="module-divider" />
      <span className="module-area-label">Área</span>
      <strong className="module-area">{module.area}</strong>
      <div className="module-footer">
        <span className={module.external ? 'module-status external' : 'module-status'}>
          {module.external ? 'Link externo' : 'Operacional'}
        </span>
        <span className="module-action">Acessar</span>
      </div>
    </>
  )

  if (module.external) {
    return (
      <a className="platform-module-card external" href={module.href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    )
  }

  return (
    <Link className="platform-module-card" href={module.href}>
      {content}
    </Link>
  )
}

export default async function PlataformaPage() {
  const { usuario, permissions, modules } = await requirePlatformContext()
  const hasAdmin = canAccess(permissions, 'admin.dashboard.read')
  const integratedModules = modules.map(toModuleCard)
  const visibleModules: ModuleCard[] = hasAdmin
    ? [adminModule, ...integratedModules, cobrancaLink]
    : [...integratedModules, cobrancaLink]

  return (
    <main className="platform-page">
      <div className="platform-bg" />
      <div className="platform-wrap">
        <header className="platform-entry-header">
          <div className="platform-brand">
            <BrandLogo className="platform-brand-mark" label="GKLI Suite" />
            <div>
              <strong>GKLI Suite</strong>
              <span>Genske Advogados</span>
            </div>
          </div>

          <div className="platform-user-panel">
            <span className="platform-user-status">Sessão ativa</span>
            <strong>{usuario.nome}</strong>
            <span>{usuario.email}</span>
            <Link className="button secondary" href="/logout">Sair</Link>
          </div>
        </header>

        <section className="platform-hero">
          <div>
            <p className="platform-kicker">Plataforma operacional</p>
            <h1>
              Painel de Sistemas
              <span>Genske Advogados</span>
            </h1>
            <div className="platform-rule" />
            <p className="platform-hero-copy">
              Acesso centralizado aos módulos integrados da GKLI, com controle único de usuários, perfis e permissões.
            </p>
          </div>

          <div className="platform-environment-card">
            <div className="platform-environment-icon"><Icon name="shield" /></div>
            <div>
              <span>Ambiente</span>
              <strong>Core</strong>
              <p>Banco único em implantação limpa</p>
            </div>
          </div>
        </section>

        <section className="platform-summary-grid">
          <SummaryCard icon="grid" label="Módulos integrados" value={`${modules.length}`} detail={modules.map((module) => module.nome.replace('GKLI ', '')).join(', ')} />
          <SummaryCard icon="shield" label="Acesso" value={usuario.tipo.replace('_', ' ')} detail="Perfil ativo no core" />
          <SummaryCard icon="clock" label="Entrada" value="Única" detail="Login centralizado" />
        </section>

        <section className="platform-modules-section">
          <div className="platform-section-heading">
            <h2>Sistemas disponíveis</h2>
            <p>Selecione o sistema desejado para acessar.</p>
          </div>

          <div className="platform-modules-grid">
            {visibleModules.map((module) => (
              <ModuleTile key={`${module.codigo}-${module.id}`} module={module} />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
