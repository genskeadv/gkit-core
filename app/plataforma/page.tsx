import Link from 'next/link'
import { BrandLogo } from '@/features/shared/brand-logo'
import { canAccess } from '@/lib/auth/permissions'
import { requirePlatformContext } from '@/lib/auth/platform'
import type { PlatformModule } from '@/lib/auth/platform'

type ModuleCard = PlatformModule & {
  area: string
  external?: boolean
}

const manualSlugs: Record<string, string> = {
  core: 'core',
  ciclo: 'gkit-ciclo',
  colab: 'colab',
  'gkit-ate': 'gkit-ate',
  'gkit-ciclo': 'gkit-ciclo',
  'gkit-dir': 'gkit-dir',
  'gkit-fat': 'gkit-fat',
  'gkit-flex': 'gkit-flex',
  'gkit-jur': 'gkit-jur',
  'gkit-new': 'gkit-new',
  'gkit-performa': 'gkit-performa',
}

const adminModule: ModuleCard = {
  id: 'admin-core',
  codigo: 'core',
  nome: 'GKIT Core',
  descricao: 'Usuarios, carteiras, perfis, modulos e auditoria.',
  status: 'ativo',
  href: '/admin',
  area: 'Administracao',
}

const moduleArea: Record<string, string> = {
  core: 'Administracao',
  ciclo: 'Governanca',
  'gkit-ciclo': 'Governanca',
  'gkit-ate': 'Atendimento',
  'gkit-dir': 'Diretorio',
  'gkit-fat': 'Faturamento',
  'gkit-flex': 'Financial Xperience',
  'gkit-jur': 'Juridico',
  'gkit-new': 'Novos negocios',
  'gkit-performa': 'Performance',
  colab: 'Portal do colaborador',
  painel: 'Entrada unificada',
  sind: 'Portal do sindico',
}

const moduleDisplay: Record<string, Pick<ModuleCard, 'nome' | 'descricao' | 'area'> & { href?: string }> = {
  ciclo: {
    nome: 'GKIT Ciclo',
    descricao: 'Lifecycle, onboarding, documentos e cadastro mestre.',
    area: 'Governanca',
    href: '/modulos/gkit-ciclo',
  },
  'gkit-ciclo': {
    nome: 'GKIT Ciclo',
    descricao: 'Lifecycle, onboarding, documentos e cadastro mestre.',
    area: 'Governanca',
    href: '/modulos/gkit-ciclo',
  },
  'gkit-new': {
    nome: 'GKIT New',
    descricao: 'CRM 2.0 enxuto: clientes, contatos, oportunidades e workflow.',
    area: 'Novos negocios',
    href: '/modulos/gkit-new',
  },
  'gkit-ate': {
    nome: 'GKIT ATE',
    descricao: 'Atendimentos consultivos do ASTREA com tarefas vinculadas.',
    area: 'Atendimento',
    href: '/modulos/gkit-ate',
  },
  'gkit-dir': {
    nome: 'GKIT DIR',
    descricao: 'Diretorio de clientes com dados cadastrais vindos do Ciclo.',
    area: 'Diretorio',
    href: '/modulos/gkit-dir',
  },
  'gkit-fat': {
    nome: 'GKIT FAT',
    descricao: 'Faturamento de servicos advocaticios 03220 com contratos e OS.',
    area: 'Faturamento',
    href: '/modulos/gkit-fat',
  },
  'gkit-flex': {
    nome: 'GKIT Flex',
    descricao: 'Comissoes, contas a pagar, cadastros financeiros e auditoria mensal.',
    area: 'Financial Xperience',
    href: '/modulos/gkit-flex',
  },
  'gkit-jur': {
    nome: 'GKIT Jur',
    descricao: 'Operacao juridica integrada: processos, prazos, agenda e documentos.',
    area: 'Juridico',
    href: '/modulos/gkit-jur/inbox',
  },
  'gkit-performa': {
    nome: 'GKIT Performa',
    descricao: 'Ranking de performance do time a partir da agenda operacional.',
    area: 'Performance',
    href: '/modulos/gkit-performa',
  },
  colab: {
    nome: 'GKIT Colab',
    descricao: 'Portal individual de colaboradores, pagamentos, comissoes e documentos.',
    area: 'Portal do colaborador',
    href: '/modulos/colab',
  },
}

function canonicalCode(codigo: string) {
  return codigo
}

function toModuleCard(modulo: PlatformModule): ModuleCard {
  const codigo = canonicalCode(modulo.codigo)
  const display = moduleDisplay[codigo]

  return {
    ...modulo,
    codigo,
    area: display?.area ?? moduleArea[codigo] ?? 'Modulo integrado',
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

function ModuleTile({ module }: { module: ModuleCard }) {
  const manualSlug = manualSlugs[module.codigo]
  const cardClassName = module.external ? 'platform-module-card external' : 'platform-module-card'
  const accessAction = module.external ? (
    <a className="module-action primary" href={module.href} target="_blank" rel="noopener noreferrer">
      Acessar
    </a>
  ) : (
    <Link className="module-action primary" href={module.href}>
      Acessar
    </Link>
  )

  return (
    <article className={cardClassName}>
      <div className="module-top-line" />
      <div className="module-card-head">
        <span className={module.external ? 'module-status external' : 'module-status'}>
          {module.external ? 'Link externo' : 'Operacional'}
        </span>
      </div>
      <img
        src="/GKIT_ico.png"
        alt={module.nome}
        className="module-app-mark"
      />
      <h3>{module.nome}</h3>
      <p>{module.descricao}</p>
      <span className="module-area">{module.area}</span>
      <div className="module-footer">
        {manualSlug ? (
          <Link className="module-action secondary" href={`/manuais/${manualSlug}`}>
            Manual
          </Link>
        ) : null}
        {accessAction}
      </div>
    </article>
  )
}

export default async function PlataformaPage() {
  const { usuario, permissions, modules } = await requirePlatformContext()
  const hasAdmin = canAccess(permissions, 'admin.dashboard.read')
  const integratedModules = uniqueModules(modules).filter((module) => (
    !['cobranca', 'crm', 'din', 'fix', 'flex', 'intr'].includes(module.codigo)
  ))
  const visibleModules: ModuleCard[] = hasAdmin
    ? [adminModule, ...integratedModules]
    : [...integratedModules]

  return (
    <main className="platform-page">
      <style>{`
        .platform-page h1,
        .platform-page h2,
        .platform-page h3,
        .platform-page strong,
        .platform-page .module-area,
        .platform-page .module-action,
        .platform-page .module-status,
        .platform-page .platform-user-name,
        .platform-page .platform-brand-name {
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
            <span className="platform-user-status">Sessao ativa</span>
            <span className="platform-user-name">{usuario.nome}</span>
            <span>{usuario.email}</span>
            <a className="button secondary" href="/logout">Sair</a>
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
              Acesso centralizado aos modulos integrados da GKIT, com controle unico de usuarios, perfis e permissoes.
            </p>
          </div>
        </section>

        <section className="platform-modules-section">
          <div className="platform-section-heading">
            <h2>Sistemas disponiveis</h2>
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
