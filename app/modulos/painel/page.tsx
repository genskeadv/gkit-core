import Link from 'next/link'
import { BrandLogo } from '@/features/shared/brand-logo'
import { canAccess } from '@/lib/auth/permissions'
import { requirePlatformContext } from '@/lib/auth/platform'

const moduleArea: Record<string, string> = {
  core: 'Administração',
  'gkit-new': 'Novos negocios',
  ciclo: 'Governanca',
  flex: 'Financeiro operacional',
  intr: 'Financeiro e remuneracao',
  colab: 'Portal do colaborador',
}

const shortcutGroups = [
  {
    codigo: 'core',
    title: 'Core',
    description: 'Administração e segurança central.',
    links: [
      { href: '/admin', label: 'Visão geral' },
      { href: '/admin/usuarios', label: 'Usuários' },
      { href: '/admin/carteiras', label: 'Carteiras' },
      { href: '/admin/perfis', label: 'Perfis' },
      { href: '/admin/permissoes', label: 'Permissões' },
      { href: '/admin/apps', label: 'Módulos' },
      { href: '/admin/auditoria', label: 'Auditoria' },
    ],
    pending: [],
  },
  {
    codigo: 'gkit-new',
    title: 'GKIT New',
    description: 'CRM 2.0 com clientes, contatos e workflow comercial.',
    links: [
      { href: '/modulos/gkit-new', label: 'Cockpit' },
      { href: '/modulos/gkit-new/clientes', label: 'Clientes' },
      { href: '/modulos/gkit-new/contatos', label: 'Contatos' },
      { href: '/modulos/gkit-new/oportunidades', label: 'Oportunidades' },
      { href: '/modulos/gkit-new/base/workflow', label: 'Workflow' },
      { href: '/modulos/gkit-new/tarefas', label: 'Tarefas' },
      { href: '/modulos/gkit-new/gestao', label: 'Gestão' },
    ],
    pending: ['Oportunidades e tarefas na Sprint 2', 'Dashboard na Sprint 3'],
  },
  {
    codigo: 'ciclo',
    title: 'Ciclo',
    description: 'Funcionalidades operacionais ja publicadas no app unificado.',
    links: [
      { href: '/modulos/ciclo', label: 'Cockpit' },
      { href: '/modulos/ciclo/importacoes', label: 'Importações' },
      { href: '/modulos/ciclo/clientes', label: 'Clientes' },
      { href: '/modulos/ciclo/administradoras', label: 'Administradoras' },
      { href: '/modulos/ciclo/documentos', label: 'Documentos' },
      { href: '/modulos/ciclo/alertas', label: 'Alertas' },
      { href: '/modulos/ciclo/onboarding', label: 'Onboarding' },
      { href: '/modulos/ciclo/regularidade', label: 'Regularidade' },
      { href: '/modulos/ciclo/timeline', label: 'Timeline' },
      { href: '/modulos/ciclo/ocorrencias', label: 'Ocorrencias' },
      { href: '/modulos/ciclo/contratos', label: 'Contratos' },
      { href: '/modulos/ciclo/atas', label: 'Atas' },
      { href: '/modulos/ciclo/dashboard', label: 'Gestão' },
    ],
    pending: ['Automações', 'IA', 'Carteiras x usuários'],
  },
  {
    codigo: 'flex',
    title: 'Flex',
    description: 'Nova fundacao financeira-operacional da GKIT Suite.',
    links: [
      { href: '/modulos/flex', label: 'Cockpit' },
      { href: '/modulos/flex/importacoes', label: 'Importacoes' },
      { href: '/modulos/flex/financeiro', label: 'Financeiro' },
      { href: '/modulos/flex/comissoes', label: 'Comissões' },
      { href: '/modulos/flex/pagamentos', label: 'Pagamentos' },
      { href: '/modulos/flex/fechamentos', label: 'Fechamentos' },
      { href: '/modulos/flex/colaboradores', label: 'Colaboradores' },
      { href: '/modulos/flex/times', label: 'Times' },
      { href: '/modulos/flex/tipos-comissao', label: 'Tipos de comissao' },
      { href: '/modulos/flex/configuracoes', label: 'Configuracoes' },
    ],
    pending: ['Colab'],
  },
  {
    codigo: 'intr',
    title: 'FIX',
    description: 'Financeiro, colaboradores e gestão da competência.',
    links: [
      { href: '/modulos/fix', label: 'Cockpit' },
      { href: '/modulos/fix/importacoes', label: 'Importações' },
      { href: '/modulos/fix/colaboradores', label: 'Colaboradores' },
      { href: '/modulos/fix/times', label: 'Times' },
      { href: '/modulos/fix/pagamentos', label: 'Pagamentos' },
      { href: '/modulos/fix/comissoes', label: 'Comissoes' },
      { href: '/modulos/fix/tipos-comissao', label: 'Tipos de comissao' },
      { href: '/modulos/fix/fechamentos', label: 'Fechamentos' },
    ],
    pending: [],
  },
  {
    codigo: 'colab',
    title: 'Colab',
    description: 'Portal individual sem menu lateral.',
    links: [
      { href: '/modulos/colab', label: 'Inicio' },
      { href: '/modulos/colab/pagamentos', label: 'Pagamentos' },
      { href: '/modulos/colab/comissoes', label: 'Comissoes' },
      { href: '/modulos/colab/beneficios', label: 'Beneficios' },
      { href: '/modulos/colab/documentos', label: 'Documentos' },
      { href: '/modulos/colab/perfil', label: 'Perfil' },
    ],
    pending: [],
  },
]

const executiveFlow = [
  { codigo: 'gkit-new', title: 'Conquistar 2.0', description: 'GKIT New registra clientes, contatos, oportunidades e workflow.' },
  { codigo: 'ciclo', title: 'Acompanhar', description: 'Ciclo assume onboarding e vida diaria do cliente.' },
  { codigo: 'flex', title: 'Controlar', description: 'Flex consolida financeiro, comissoes, pagamentos e fechamentos.' },
  { codigo: 'colab', title: 'Publicar', description: 'Colab mostra pagamentos e comissoes para cada colaborador.' },
]

export default async function PainelPage() {
  const context = await requirePlatformContext('/modulos/painel')
  const hasAdmin = canAccess(context.permissions, 'admin.dashboard.read')
  const availableCodes = new Set(context.modules.map((modulo) => modulo.codigo))
  availableCodes.delete('fix')
  availableCodes.delete('intr')
  const availableShortcutGroups = shortcutGroups.filter((group) => (
    group.codigo === 'core' ? hasAdmin : availableCodes.has(group.codigo)
  ))
  const modules = [
    ...(hasAdmin
      ? [{ codigo: 'core', nome: 'GKIT Core', descricao: 'Usuários, perfis, carteiras e permissões.', href: '/admin' }]
      : []),
    ...context.modules.filter((modulo) => modulo.codigo !== 'fix' && modulo.codigo !== 'intr'),
  ]
  const operationalModules = executiveFlow.filter((item) => availableCodes.has(item.codigo))
  const publishedShortcutCount = availableShortcutGroups.reduce((sum, group) => sum + group.links.length, 0)
  const pendingCount = availableShortcutGroups.reduce((sum, group) => sum + group.pending.length, 0)

  return (
    <main className="suite-page">
      <div className="platform-bg" />
      <div className="suite-wrap no-sidebar">
        <section className="suite-hero-card">
          <div className="suite-hero-main">
            <BrandLogo className="suite-brand-mark" label="Suite GKIT" />
            <div>
              <p className="platform-kicker">Painel</p>
              <h1>Suite GKIT</h1>
              <p>Entrada unificada para os modulos internos, com sessao unica e acesso determinado pelo Core.</p>
            </div>
          </div>
        </section>

        <section className="suite-executive-grid">
          <article className="suite-executive-card featured">
            <span>Fluxo operacional</span>
            <h2>{operationalModules.length} de {executiveFlow.length} modulos ativos</h2>
            <p>Leitura executiva da esteira: venda, onboarding, operação interna e publicação ao colaborador.</p>
          </article>
          <article className="suite-executive-card">
            <span>Atalhos publicados</span>
            <h2>{publishedShortcutCount}</h2>
            <p>Acessos principais visiveis conforme permissoes do Core.</p>
          </article>
          <article className="suite-executive-card">
            <span>Pontos de atencao</span>
            <h2>{pendingCount}</h2>
            <p>Itens mapeados para evolucao, sem bloquear o uso atual.</p>
          </article>
        </section>

        <section className="suite-flow-map">
          {executiveFlow.map((item) => {
            const active = availableCodes.has(item.codigo)
            return (
              <article className={active ? 'active' : ''} key={item.codigo}>
                <span>{moduleArea[item.codigo]}</span>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </article>
            )
          })}
        </section>

        <section className="suite-module-grid">
          {modules.map((modulo) => (
            <Link className="suite-module-card" href={modulo.href} key={`${modulo.codigo}-${modulo.href}`}>
              <span>{moduleArea[modulo.codigo] ?? 'Modulo GKIT'}</span>
              <h2>{modulo.nome}</h2>
              <p>{modulo.descricao}</p>
              <strong>Acessar</strong>
            </Link>
          ))}
        </section>

        <section className="suite-shortcut-grid">
          {availableShortcutGroups.map((group) => (
            <article className="suite-shortcut-card" key={group.title}>
              <div>
                <span>{group.title}</span>
                <h2>{group.description}</h2>
              </div>

              <div className="suite-shortcut-links">
                {group.links.map((link) => (
                  <Link href={link.href} key={link.href}>{link.label}</Link>
                ))}
              </div>

              {group.pending.length ? (
                <details>
                  <summary>{group.pending.length} itens pendentes de migracao</summary>
                  <p>{group.pending.join(', ')}</p>
                </details>
              ) : (
                <p className="suite-shortcut-complete">Atalhos principais publicados.</p>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
