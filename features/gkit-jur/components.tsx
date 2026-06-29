import Link from 'next/link'
import type { ReactNode } from 'react'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import type { PlatformUsuario } from '@/lib/auth/platform'

type GkitJurTab = 'cockpit' | 'processos' | 'prazos' | 'agenda' | 'documentos' | 'relatorios' | 'cadastros'

const activeHref: Record<GkitJurTab, string> = {
  cockpit: '/modulos/gkit-jur',
  processos: '/modulos/gkit-jur/processos',
  prazos: '/modulos/gkit-jur/prazos',
  agenda: '/modulos/gkit-jur/agenda',
  documentos: '/modulos/gkit-jur/documentos',
  relatorios: '/modulos/gkit-jur/relatorios',
  cadastros: '/modulos/gkit-jur/cadastros',
}

const navGroups: ModuleNavGroup[] = [
  { href: '/modulos/gkit-jur', title: 'Cockpit' },
  { href: '/modulos/gkit-jur/processos', title: 'Processos' },
  { href: '/modulos/gkit-jur/prazos', title: 'Prazos' },
  { href: '/modulos/gkit-jur/agenda', title: 'Agenda' },
  { href: '/modulos/gkit-jur/documentos', title: 'Documentos' },
  { href: '/modulos/gkit-jur/relatorios', title: 'Relatorios' },
  { href: '/modulos/gkit-jur/cadastros', title: 'Cadastros' },
]

const cockpitCards = [
  {
    href: '/modulos/gkit-jur/processos',
    label: '1. Processos',
    title: 'Triagem juridica',
    description: 'Organize casos, partes e fase atual do trabalho.',
  },
  {
    href: '/modulos/gkit-jur/prazos',
    label: '2. Prazos',
    title: 'Controle de prazos',
    description: 'Priorize vencimentos e tarefas sensiveis.',
  },
  {
    href: '/modulos/gkit-jur/agenda',
    label: '3. Agenda',
    title: 'Agenda operacional',
    description: 'Concentre audiencias, reunioes e rotinas do dia.',
  },
  {
    href: '/modulos/gkit-jur/documentos',
    label: '4. Documentos',
    title: 'Documentos juridicos',
    description: 'Prepare pecas, comprovantes e anexos do fluxo.',
  },
]

export function GkitJurShell({
  active,
  actions,
  children,
  description,
  title,
  usuario,
}: {
  active: GkitJurTab
  actions?: ReactNode
  children: ReactNode
  description: string
  title: string
  usuario: PlatformUsuario
}) {
  return (
    <ModuleShell
      activeHref={activeHref[active]}
      actions={actions}
      brand="Juridico"
      description={description}
      eyebrow="GKIT Jur"
      navGroups={navGroups}
      product="GKIT Jur"
      title={title}
      usuario={usuario}
      variantClassName={active === 'cockpit' ? 'gkit-new-shell gkit-jur-shell gkit-jur-cockpit-page' : 'gkit-new-shell gkit-jur-shell'}
    >
      {children}
    </ModuleShell>
  )
}

export function GkitJurSection({
  action,
  children,
  className,
  description,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  className?: string
  description?: string
  title: string
}) {
  return (
    <section className={className ? `suite-panel ${className}` : 'suite-panel'}>
      <div className="suite-panel-heading">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function GkitJurCockpit() {
  return (
    <>
      <section className="suite-panel gkit-new-command-panel gkit-jur-command-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Ordem do fluxo</h2>
            <p>Primeira casca do modulo juridico, pronta para receber os detalhes tecnicos do fluxo.</p>
          </div>
        </div>

        <div className="gkit-new-quick-grid gkit-new-cockpit-flow">
          {cockpitCards.map((card) => (
            <Link className="gkit-new-quick-card" href={card.href} key={card.href}>
              <span>{card.label}</span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <GkitJurSection
        title="Fila juridica"
        description="Visao inicial para receber processos, prazos e documentos quando definirmos o modelo operacional."
      >
        <div className="suite-kpi-grid compact">
          <article className="metric-card">
            <span className="metric-label">Processos ativos</span>
            <strong className="metric-value">0</strong>
            <span className="metric-hint">aguardando modelo de dados</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">Prazos abertos</span>
            <strong className="metric-value">0</strong>
            <span className="metric-hint">sem importacao configurada</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">Audiencias</span>
            <strong className="metric-value">0</strong>
            <span className="metric-hint">agenda em desenho</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">Documentos</span>
            <strong className="metric-value">0</strong>
            <span className="metric-hint">repositorio futuro</span>
          </article>
        </div>
      </GkitJurSection>
    </>
  )
}

export function GkitJurPlaceholder({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <GkitJurSection title={title} description={description}>
      <div className="suite-empty-block">
        Estrutura criada. O proximo passo e definir campos, regras e integracoes desta area.
      </div>
    </GkitJurSection>
  )
}
