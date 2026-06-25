import Link from 'next/link'
import { BrandLogo } from '@/features/shared/brand-logo'
import { canAccess } from '@/lib/auth/permissions'
import { requirePlatformContext } from '@/lib/auth/platform'
import type { PlatformModule } from '@/lib/auth/platform'

type IconName = 'core' | 'fix' | 'intr' | 'flex' | 'crm' | 'ciclo' | 'grid' | 'shield' | 'clock'

type ModuleCard = PlatformModule & {
  area: string
  icon: IconName
  external?: boolean
}

const adminModule: ModuleCard = {
  id: 'admin-core',
  codigo: 'core',
  nome: 'GKIT Core',
  descricao: 'Usuários, carteiras, perfis, módulos e auditoria.',
  status: 'ativo',
  href: '/admin',
  area: 'Administração',
  icon: 'core',
}

const moduleMeta: Record<string, Pick<ModuleCard, 'area' | 'icon'>> = {
  core: { area: 'Administração', icon: 'core' },
  ciclo: { area: 'Governança', icon: 'ciclo' },
  'gkit-ate': { area: 'Atendimento', icon: 'clock' },
  'gkit-dir': { area: 'Diretório', icon: 'grid' },
  'gkit-flex': { area: 'Financial Xperience', icon: 'flex' },
  'gkit-new': { area: 'Novos negocios', icon: 'crm' },
  intr: { area: 'Financial Xperience', icon: 'fix' },
  fix: { area: 'Financial Xperience', icon: 'fix' },
  flex: { area: 'Financial Xperience', icon: 'flex' },
  colab: { area: 'Portal do colaborador', icon: 'grid' },
  din: { area: 'Faturamento', icon: 'fix' },
  painel: { area: 'Entrada unificada', icon: 'grid' },
  sind: { area: 'Portal do síndico', icon: 'ciclo' },
}

const moduleDisplay: Record<string, Pick<ModuleCard, 'nome' | 'descricao' | 'area' | 'icon'> & { href?: string }> = {
  ciclo: {
    nome: 'GKIT Ciclo',
    descricao: 'Lifecycle, onboarding, documentos e cadastro mestre.',
    area: 'Governança',
    icon: 'ciclo',
  },
  'gkit-new': {
    nome: 'GKIT New',
    descricao: 'CRM 2.0 enxuto: clientes, contatos, oportunidades e workflow.',
    area: 'Novos negocios',
    icon: 'crm',
    href: '/modulos/gkit-new',
  },
  'gkit-ate': {
    nome: 'GKIT ATE',
    descricao: 'Atendimentos consultivos do ASTREA com tarefas vinculadas.',
    area: 'Atendimento',
    icon: 'clock',
    href: '/modulos/gkit-ate',
  },
  'gkit-dir': {
    nome: 'GKIT DIR',
    descricao: 'Diretório de clientes com dados cadastrais vindos do Ciclo.',
    area: 'Diretório',
    icon: 'grid',
    href: '/modulos/gkit-dir',
  },
  'gkit-flex': {
    nome: 'GKIT Flex',
    descricao: 'Comissoes, contas a pagar, cadastros financeiros e auditoria mensal.',
    area: 'Financial Xperience',
    icon: 'flex',
    href: '/modulos/gkit-flex',
  },
  colab: {
    nome: 'GKIT Colab',
    descricao: 'Portal individual de colaboradores, pagamentos, comissões e documentos.',
    area: 'Portal do colaborador',
    icon: 'grid',
  },
  din: {
    nome: 'GKIT DIN',
    descricao: 'Faturamento mensal: repasses, clientes do ciclo e exportacao Omie.',
    area: 'Faturamento',
    icon: 'fix',
    href: '/modulos/din',
  },
  fix: {
    nome: 'GKIT FIX',
    descricao: 'Financial Xperience: pagamentos, extratos, conciliação e inteligência financeira.',
    area: 'Financial Xperience',
    icon: 'fix',
    href: '/modulos/fix',
  },
  flex: {
    nome: 'GKLI Flex',
    descricao: 'Operação financeira interna, comissões, pagamentos e fechamento.',
    area: 'Financial Xperience',
    icon: 'flex',
    href: '/modulos/flex',
  },
}

function canonicalCode(codigo: string) {
  return codigo === 'intr' || codigo === 'fix' || codigo === 'flex' ? 'din' : codigo
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

  if (name === 'fix' || name === 'intr' || name === 'flex') {
    return (
      <svg {...common}>
        <path d="M4 19.5h16" />
        <path d="M7 16.5V11" />
        <path d="M12 16.5V7.5" />
        <path d="M17 16.5v-4" />
        <path d="M5.5 7.5 10 4l4 3 4.5-3.5" />
        <path d="M18.5 3.5V8h-4.5" />
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
  const codigo = canonicalCode(modulo.codigo)
  const display = moduleDisplay[codigo]
  const meta = moduleMeta[codigo] ?? { area: 'Módulo integrado', icon: 'grid' as IconName }

  return {
    ...modulo,
    codigo,
    area: display?.area ?? meta.area,
    icon: display?.icon ?? meta.icon,
    nome: display?.nome ?? modulo.nome.replace(/^GKLI\b/, 'GKIT'),
    descricao: display?.descricao ?? modulo.descricao,
    href: display?.href ?? modulo.href,
  }
}

function uniqueModules(modules: PlatformModule[]) {
  const ordered = modules.map(toModuleCard)
  const byCode = new Map<string, ModuleCard>()

  for (const item of ordered) {
    const existing = byCode.get(item.codigo)
    if (!existing) {
      byCode.set(item.codigo, item)
      continue
    }

    if (item.codigo === 'fix' && existing.id !== 'fix') {
      byCode.set(item.codigo, item)
    }
  }

  return Array.from(byCode.values())
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
        <span className="platform-summary-value">{value}</span>
        <span>{detail}</span>
      </div>
    </div>
  )
}

function ModuleTile({ module }: { module: ModuleCard }) {
  const content = (
    <>
      <div className="module-top-line" />
      <img
        src="/GKIT_ico.png"
        alt={module.nome}
        className="module-app-mark"
      />
      <h3>{module.nome}</h3>
      <p>{module.descricao}</p>
      <div className="module-divider" />
      <span className="module-area-label">Área</span>
      <span className="module-area">{module.area}</span>
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
  const integratedModules = uniqueModules(modules).filter((module) => (
    module.codigo !== 'cobranca' && module.codigo !== 'fix' && module.codigo !== 'intr' && module.codigo !== 'flex' && module.codigo !== 'crm'
  ))
  const visibleModules: ModuleCard[] = hasAdmin
    ? [adminModule, ...integratedModules]
    : [...integratedModules]
  const moduleSummary = integratedModules.map((module) => module.nome.replace('GKIT ', '')).join(', ')

  return (
    <main className="platform-page">
      <style>{`
        .platform-page h1,
        .platform-page h2,
        .platform-page h3,
        .platform-page strong,
        .platform-page .platform-summary-value,
        .platform-page .module-area,
        .platform-page .module-action,
        .platform-page .module-status,
        .platform-page .platform-user-name,
        .platform-page .platform-brand-name,
        .platform-page .platform-environment-name {
          font-weight: 400 !important;
        }
      `}</style>
      <div className="platform-bg" />
      <div className="platform-wrap">
        <header className="platform-entry-header">
          <div className="platform-brand">
            <BrandLogo className="platform-brand-mark" label="GKIT Suite" />
            <div>
              <span className="platform-brand-name">GKIT Suite</span>
              <span>Genske Advogados</span>
            </div>
          </div>

          <div className="platform-user-panel">
            <span className="platform-user-status">Sessão ativa</span>
            <span className="platform-user-name">{usuario.nome}</span>
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
              Acesso centralizado aos módulos integrados da GKIT, com controle único de usuários, perfis e permissões.
            </p>
          </div>

          <div className="platform-environment-card">
            <div className="platform-environment-icon"><Icon name="shield" /></div>
            <div>
              <span>Ambiente</span>
              <span className="platform-environment-name">Core</span>
              <p>Banco único em implantação limpa</p>
            </div>
          </div>
        </section>

        <section className="platform-summary-grid">
          <SummaryCard icon="grid" label="Módulos integrados" value={`${integratedModules.length}`} detail={moduleSummary} />
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
