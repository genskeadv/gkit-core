import Link from 'next/link'
import type { ReactNode } from 'react'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import { OperationalKpiGrid, OperationalQuickLinks, OperationalSection } from '@/features/shared/operational-ui'
import { CicloSubmitButton } from '@/features/ciclo/submit-button'
import { formatDate, priorityLabel, priorityScore, riskTone } from '@/features/ciclo/scoring'
import type {
  CicloAlerta,
  CicloAlertaRecord,
  CicloAdministradoraRecord,
  CicloAtaRecord,
  CicloAtendimentoDashboard,
  CicloAtendimentoTab,
  CicloCliente,
  CicloClienteFormData,
  CicloClienteIntegral,
  CicloClienteRecord,
  CicloContratoRecord,
  CicloData,
  CicloDocumento,
  CicloDocumentoFormData,
  CicloDocumentoRecord,
  CicloImportacaoItem,
  CicloImportacaoLote,
  CicloListRow,
  CicloOnboardingDetail,
  CicloOnboardingWorkflowAtividade,
  CicloOcorrenciaRecord,
  CicloTipoCliente,
} from '@/features/ciclo/types'
import {
  completeCicloOnboardingAction,
  createCicloOnboardingWorkflowAtividadeAction,
  resolveCicloAlertaAction,
  startCicloOnboardingAction,
  updateCicloOnboardingAtividadeAction,
  updateCicloOnboardingDocumentoAction,
  updateCicloOnboardingWorkflowAtividadeAction,
} from '@/features/ciclo/actions'

const cicloDocumentoTipos = [
  ['contrato', 'Contrato'],
  ['cartao_cnpj', 'Cartao CNPJ'],
  ['ata_eleicao', 'Ata eleicao'],
  ['ata_previsao_orcamentaria', 'Ata previsao orcamentaria'],
  ['cpf_sindico', 'CPF sindico'],
  ['cnpj_empresa_sindico', 'CNPJ empresa sindico'],
  ['convencao', 'Convencao'],
  ['regulamento', 'Regulamento'],
  ['cadastro_unidade', 'Cadastro de unidade'],
]

const cicloAlertaSeveridades = [
  ['baixa', 'Baixa'],
  ['media', 'Média'],
  ['alta', 'Alta'],
  ['critica', 'Critica'],
]

function impactoTone(value: string) {
  if (value === 'critico' || value === 'alto') return 'danger'
  if (value === 'medio' || value === 'neutro') return 'warning'
  if (value === 'baixo') return 'success'
  return 'primary'
}

function tipoClienteLabel(value: string) {
  if (value === 'pontual') return 'Pontual'
  if (value === 'cobranca') return 'Cobrança'
  return 'Mensal'
}
import type { PlatformUsuario } from '@/lib/auth/platform'

type CicloTab =
  | 'cockpit'
  | 'dashboard'
  | 'clientes'
  | 'atendimento'
  | 'administradoras'
  | 'importacoes'
  | 'documentos'
  | 'alertas'
  | 'onboarding'
  | 'regularidade'
  | 'timeline'
  | 'ocorrencias'

const activeHref: Record<CicloTab, string> = {
  cockpit: '/modulos/ciclo',
  dashboard: '/modulos/ciclo/dashboard',
  clientes: '/modulos/ciclo/clientes',
  atendimento: '/modulos/ciclo/atendimento',
  administradoras: '/modulos/ciclo/administradoras',
  importacoes: '/modulos/ciclo/importacoes',
  documentos: '/modulos/ciclo/documentos',
  alertas: '/modulos/ciclo/alertas',
  onboarding: '/modulos/ciclo/onboarding',
  regularidade: '/modulos/ciclo/regularidade',
  timeline: '/modulos/ciclo/timeline',
  ocorrencias: '/modulos/ciclo/ocorrencias',
}

const navGroups: ModuleNavGroup[] = [
  {
    title: 'Cockpit',
    items: [
      { href: '/modulos/ciclo', label: 'Cockpit' },
      { href: '/modulos/ciclo/dashboard', label: 'Dashboard' },
    ],
  },
  {
    title: 'Base cadastral',
    items: [
      { href: '/modulos/ciclo/clientes', label: 'Clientes' },
      { href: '/modulos/ciclo/atendimento', label: 'Atendimento' },
      { href: '/modulos/ciclo/administradoras', label: 'Administradoras' },
      { href: '/modulos/ciclo/importacoes', label: 'Importações' },
    ],
  },
  {
    title: 'Operação',
    items: [
      { href: '/modulos/ciclo/documentos', label: 'Documentos' },
      { href: '/modulos/ciclo/alertas', label: 'Alertas' },
      { href: '/modulos/ciclo/onboarding', label: 'Onboarding' },
      { href: '/modulos/ciclo/regularidade', label: 'Regularidade' },
      { href: '/modulos/ciclo/timeline', label: 'Timeline' },
      { href: '/modulos/ciclo/ocorrencias', label: 'Ocorrências' },
    ],
  },
]

const navTitleByHref: Record<string, string> = {
  '/modulos/ciclo': 'Cockpit',
  '/modulos/ciclo/dashboard': 'Gestão',
  '/modulos/ciclo/clientes': 'Clientes',
  '/modulos/ciclo/atendimento': 'Atendimento',
  '/modulos/ciclo/documentos': 'Documentos',
  '/modulos/ciclo/alertas': 'Alertas',
  '/modulos/ciclo/onboarding': 'Onboarding',
  '/modulos/ciclo/regularidade': 'Regularidade',
  '/modulos/ciclo/ocorrencias': 'Ocorrências',
  '/modulos/ciclo/administradoras': 'Administradoras',
  '/modulos/ciclo/importacoes': 'Importações',
}

const navOrder = [
  '/modulos/ciclo',
  '/modulos/ciclo/importacoes',
  '/modulos/ciclo/clientes',
  '/modulos/ciclo/atendimento',
  '/modulos/ciclo/documentos',
  '/modulos/ciclo/alertas',
  '/modulos/ciclo/onboarding',
  '/modulos/ciclo/regularidade',
  '/modulos/ciclo/ocorrencias',
  '/modulos/ciclo/administradoras',
  '/modulos/ciclo/dashboard',
]

const availableNavHrefs = new Set(navGroups.flatMap((group) => (group.items ?? []).map((item) => item.href)))
const flatNavGroups: ModuleNavGroup[] = navOrder
  .filter((href) => availableNavHrefs.has(href))
  .map((href) => ({
    href,
    title: navTitleByHref[href],
  }))

export function CicloShell({
  active,
  actions,
  children,
  description,
  eyebrow,
  title,
  usuario,
}: {
  active: CicloTab
  actions?: ReactNode
  children: ReactNode
  description: string
  eyebrow: string
  title: string
  usuario: PlatformUsuario
}) {
  return (
    <ModuleShell
      activeHref={activeHref[active]}
      actions={actions}
      brand="Gestão condominial"
      description={description}
      eyebrow={eyebrow}
      navGroups={flatNavGroups}
      product="GKIT Ciclo"
      title={title}
      usuario={usuario}
      variantClassName={active === 'cockpit' ? 'ciclo-shell ciclo-cockpit-page' : 'ciclo-shell'}
    >
      {children}
    </ModuleShell>
  )
}

export function CicloSection({
  action,
  children,
  className,
  description,
  eyebrow,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  className?: string
  description?: string
  eyebrow?: string
  title: string
}) {
  return (
    <OperationalSection action={action} className={className} classPrefix="ciclo" description={description} eyebrow={eyebrow} title={title}>
      {children}
    </OperationalSection>
  )
}

export function CicloQuickLinks({
  items,
}: {
  items: Array<{ href: string; title: string; description: string; label?: string; meta?: string }>
}) {
  return <OperationalQuickLinks classPrefix="ciclo" defaultLabel="Ciclo" items={items} />
}

export function CicloReadinessCard({ data }: { data: CicloData }) {
  if (data.databaseReady || data.clientes.length || data.documentos.length || data.alertas.length) return null

  return (
    <section className="ciclo-empty-card">
      <strong>Ciclo pronto para iniciar</strong>
      <span>Cadastre clientes e documentos para alimentar a regularidade, alertas e timeline operacional.</span>
    </section>
  )
}

export function CicloKpis({ data }: { data: CicloData }) {
  const ativos = data.clientes.filter((cliente) => cliente.status === 'ativo').length
  const implantacao = data.clientes.filter((cliente) => cliente.status === 'novo' || cliente.status === 'implantacao').length
  const altoRisco = data.clientes.filter((cliente) => cliente.risco === 'alto' || cliente.risco === 'critico').length
  const alertasAbertos = data.alertas.filter((alerta) => alerta.status !== 'resolvido' && alerta.status !== 'cancelado').length
  const scoreMedio = data.clientes.length
    ? Math.round(data.clientes.reduce((sum, cliente) => sum + cliente.score, 0) / data.clientes.length)
    : 0
  const regularidadeMedia = data.clientes.length
    ? Math.round(data.clientes.reduce((sum, cliente) => sum + cliente.regularidade, 0) / data.clientes.length)
    : 0

  const items = [
    { label: 'Clientes ativos', value: String(ativos), hint: 'base operacional' },
    { label: 'Em implantação', value: String(implantacao), hint: 'onboarding e novos' },
    { label: 'Risco alto', value: String(altoRisco), hint: 'atenção imediata' },
    { label: 'Alertas abertos', value: String(alertasAbertos), hint: 'fila operacional' },
    { label: 'Score médio', value: String(scoreMedio), hint: '0 a 100' },
    { label: 'Regularidade', value: `${regularidadeMedia}%`, hint: 'documental média' },
  ]

  return <OperationalKpiGrid className="ciclo-kpi-grid" items={items} />
}

export function CicloPriorityList({ clientes }: { clientes: CicloCliente[] }) {
  const rows = [...clientes].sort((a, b) => priorityScore(b) - priorityScore(a)).slice(0, 8)

  return (
    <section className="card ciclo-panel">
      <div className="ciclo-panel-heading">
        <div>
          <h2>Clientes prioritários</h2>
          <p>Fila por risco, score, regularidade, alertas e temperatura.</p>
        </div>
        <Link className="button secondary" href="/modulos/ciclo/clientes">Ver clientes</Link>
      </div>

      {rows.length ? (
        <div className="ciclo-ranking-list">
          {rows.map((cliente, index) => (
            <article key={cliente.id}>
              <span className="ciclo-rank-number">{index + 1}</span>
              <div className="ciclo-clientes-main">
                <h3>{cliente.nome}</h3>
                <p>{cliente.documento} · {cliente.carteira} · {cliente.administradora}</p>
              </div>
              <span className={`ciclo-pill ${riskTone(cliente.risco)}`}>{priorityLabel(cliente)}</span>
              <div className="ciclo-ranking-meta">
                <strong>{cliente.regularidade}%</strong>
                <span>score {cliente.score} · {cliente.alertasAbertos} alerta(s)</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label="Nenhum cliente cadastrado." />
      )}
    </section>
  )
}

export function CicloDocumentSignal({ documentos }: { documentos: CicloDocumento[] }) {
  const pendentes = documentos.filter((doc) => doc.status === 'pendente' || doc.status === 'vencido')
  const obrigatorios = documentos.filter((doc) => doc.obrigatorio)
  const validos = documentos.filter((doc) => doc.status === 'validado' || doc.validado)
  const cards = [
    { title: 'Pendentes', value: pendentes.length, tone: 'warning', desc: 'exigem regularização' },
    { title: 'Obrigatórios', value: obrigatorios.length, tone: 'primary', desc: 'na matriz documental' },
    { title: 'Validados', value: validos.length, tone: 'success', desc: 'prontos para operação' },
  ]

  return (
    <section className="ciclo-signal-grid">
      {cards.map((card) => (
        <article className="card ciclo-signal-card" key={card.title}>
          <span className={`ciclo-pill ${card.tone}`}>{card.title}</span>
          <strong>{card.value}</strong>
          <p>{card.desc}</p>
        </article>
      ))}
    </section>
  )
}

export function CicloAlertList({ alertas, canWrite = false }: { alertas: CicloAlerta[]; canWrite?: boolean }) {
  const rows = alertas.filter((alerta) => alerta.status !== 'resolvido' && alerta.status !== 'cancelado').slice(0, 8)

  return (
    <section className="card ciclo-panel">
      <div className="ciclo-panel-heading">
        <div>
          <h2>Alertas recentes</h2>
          <p>Fila de risco operacional, documentação e acompanhamento.</p>
        </div>
        <Link className="button secondary" href="/modulos/ciclo/alertas">Ver alertas</Link>
      </div>

      {rows.length ? (
        <div className="ciclo-alert-list">
          {rows.map((alerta) => (
            <article key={alerta.id}>
              <span className={`ciclo-pill ${riskTone(alerta.severidade)}`}>{alerta.severidade}</span>
              <div className="ciclo-clientes-main">
                <h3>{alerta.titulo}</h3>
                <p>{alerta.cliente} · {alerta.descricao || alerta.tipo}</p>
              </div>
              <small>{formatDate(alerta.vencimentoEm)}</small>
              {canWrite ? (
                <form action={resolveCicloAlertaAction}>
                  <input type="hidden" name="id" value={alerta.id} />
                  <input type="hidden" name="titulo" value={alerta.titulo} />
                  <button className="button secondary" type="submit">Resolver</button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label="Nenhum alerta aberto." />
      )}
    </section>
  )
}

export function CicloClienteList({
  canWrite = false,
  carteiraOptions,
  clientes,
  filters,
  totalClientes,
}: {
  canWrite?: boolean
  carteiraOptions: string[]
  clientes: CicloCliente[]
  filters: { carteira: string; dir: 'asc' | 'desc'; q: string; sort: 'cliente' | 'tipo' | 'carteira' | 'regularidade' | 'risco'; tipo: CicloTipoCliente | '' }
  totalClientes: number
}) {
  const hasFilters = Boolean(filters.carteira || filters.tipo || filters.q)
  const sortHref = (sort: typeof filters.sort) => {
    const params = new URLSearchParams()
    if (filters.q) params.set('q', filters.q)
    if (filters.tipo) params.set('tipo', filters.tipo)
    if (filters.carteira) params.set('carteira', filters.carteira)
    params.set('sort', sort)
    params.set('dir', filters.sort === sort && filters.dir === 'asc' ? 'desc' : 'asc')
    return `/modulos/ciclo/clientes?${params.toString()}`
  }
  const sortLabel = (sort: typeof filters.sort) => (filters.sort === sort ? (filters.dir === 'asc' ? '↑' : '↓') : '')

  return (
    <div className="ciclo-clientes-surface">
      <form className="ciclo-clientes-filter-bar" method="get">
        <input name="sort" type="hidden" value={filters.sort} />
        <input name="dir" type="hidden" value={filters.dir} />
        <label className="ciclo-clientes-search">
          <span>Busca</span>
          <input className="input" name="q" placeholder="Nome, CNPJ, carteira..." defaultValue={filters.q} />
        </label>
        <label>
          <span>Tipo</span>
          <select className="select" name="tipo" defaultValue={filters.tipo}>
            <option value="">Todos</option>
            <option value="mensal">Mensal</option>
            <option value="pontual">Pontual</option>
            <option value="cobranca">Cobrança</option>
          </select>
        </label>
        <label>
          <span>Carteira</span>
          <select className="select" name="carteira" defaultValue={filters.carteira}>
            <option value="">Todas</option>
            {carteiraOptions.map((carteira) => <option key={carteira} value={carteira}>{carteira}</option>)}
          </select>
        </label>
        <button className="button secondary" type="submit">Filtrar</button>
        {hasFilters ? <Link className="button secondary" href="/modulos/ciclo/clientes">Limpar</Link> : null}
        <span className="ciclo-clientes-count">{clientes.length} de {totalClientes}</span>
      </form>

      {clientes.length ? (
        <div className="ciclo-table-list ciclo-clientes-list">
          <div className="ciclo-clientes-head">
            <Link href={sortHref('cliente')}>Cliente {sortLabel('cliente')}</Link>
            <Link href={sortHref('tipo')}>Tipo {sortLabel('tipo')}</Link>
            <Link href={sortHref('carteira')}>Carteira {sortLabel('carteira')}</Link>
            <Link href={sortHref('regularidade')}>Regularidade {sortLabel('regularidade')}</Link>
            <Link href={sortHref('risco')}>Risco {sortLabel('risco')}</Link>
            <span>Ações</span>
          </div>
          {clientes.map((cliente) => (
            <article key={cliente.id}>
              <div className="ciclo-clientes-main">
                <h3>{cliente.nome}</h3>
                <p>{cliente.documento} · {cliente.razaoSocial || 'Cadastro mestre'}</p>
              </div>
              <div className="ciclo-clientes-type">
                <span className="ciclo-pill primary">{tipoClienteLabel(cliente.tipoCliente)}</span>
              </div>
              <div className="ciclo-clientes-meta">
                <strong>{cliente.carteira}</strong>
                <span>{cliente.administradora}</span>
              </div>
              <div className="ciclo-clientes-score">
                <strong>{cliente.regularidade}%</strong>
              </div>
              <div className="ciclo-clientes-risk">
                <span className={`ciclo-pill ${riskTone(cliente.risco)}`}>{cliente.risco}</span>
              </div>
              <div className="ciclo-clientes-actions">
                <Link className="button secondary" href={`/modulos/ciclo/clientes/${cliente.id}/cockpit`}>Cockpit</Link>
                {canWrite ? <Link className="button secondary" href={`/modulos/ciclo/clientes/${cliente.id}`}>Editar</Link> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label="Nenhum cliente encontrado com os filtros atuais." />
      )}
    </div>
  )
}

function atendimentoTabLabel(tab: CicloAtendimentoTab) {
  if (tab === 'responsavel') return 'Responsável'
  if (tab === 'carteira') return 'Carteira'
  if (tab === 'tipo') return 'Tipo de atendimento'
  return 'Cliente'
}

function atendimentoHref(tab: CicloAtendimentoTab, filters: { dataDe?: string; dataAte?: string; status?: string }) {
  const params = new URLSearchParams()
  params.set('aba', tab)
  if (filters.dataDe) params.set('de', filters.dataDe)
  if (filters.dataAte) params.set('ate', filters.dataAte)
  if (filters.status) params.set('status', filters.status)
  return `/modulos/ciclo/atendimento?${params.toString()}`
}

function onboardingPercent(value: string) {
  const parsed = Number(String(value).replace('%', '').trim())
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0
}

function onboardingMeta(meta: string) {
  const [carteira, risco] = meta.split(' - risco ')
  return {
    carteira: carteira || 'Sem carteira',
    risco: risco || 'medio',
  }
}

function workflowStatusLabel(status: CicloOnboardingDetail['atividades'][number]['status']) {
  if (status === 'em_andamento') return 'Em andamento'
  if (status === 'concluido') return 'Concluido'
  if (status === 'dispensado') return 'Dispensado'
  return 'Pendente'
}

function workflowTone(status: CicloOnboardingDetail['atividades'][number]['status']) {
  if (status === 'concluido') return 'success'
  if (status === 'dispensado') return 'primary'
  if (status === 'em_andamento') return 'warning'
  return 'danger'
}

export function CicloOnboardingOverview({ rows }: { rows: CicloListRow[] }) {
  const novos = rows.filter((row) => row.status === 'novo').length
  const implantacao = rows.filter((row) => row.status === 'implantacao').length
  const concluidos = rows.filter((row) => onboardingPercent(row.value) >= 100).length
  const semChecklist = rows.filter((row) => onboardingPercent(row.value) === 0).length
  const progressoMedio = rows.length
    ? Math.round(rows.reduce((total, row) => total + onboardingPercent(row.value), 0) / rows.length)
    : 0

  return (
    <div className="ciclo-onboarding-dashboard">
      <section className="ciclo-atendimento-kpis ciclo-onboarding-kpis">
        <article>
          <span>Total</span>
          <strong>{rows.length}</strong>
          <small>clientes na fila</small>
        </article>
        <article>
          <span>Novos</span>
          <strong>{novos}</strong>
          <small>aguardando inicio</small>
        </article>
        <article>
          <span>Em implantacao</span>
          <strong>{implantacao}</strong>
          <small>checklist em curso</small>
        </article>
        <article>
          <span>Concluidos</span>
          <strong>{concluidos}</strong>
          <small>100% documental</small>
        </article>
        <article>
          <span>Sem checklist</span>
          <strong>{semChecklist}</strong>
          <small>sem documentos iniciados</small>
        </article>
        <article>
          <span>Progresso medio</span>
          <strong>{progressoMedio}%</strong>
          <small>documental</small>
        </article>
      </section>

      <section className="ciclo-clientes-surface">
        {rows.length ? (
          <div className="ciclo-table-list ciclo-onboarding-list">
            <div className="ciclo-onboarding-head">
              <span>Cliente</span>
              <span>Etapa</span>
              <span>Progresso</span>
              <span>Carteira</span>
              <span>Acoes</span>
            </div>
            {rows.map((row) => {
              const progress = onboardingPercent(row.value)
              const meta = onboardingMeta(row.meta)
              return (
                <article key={row.id}>
                  <div className="ciclo-clientes-main">
                    <h3>{row.title}</h3>
                    <p>{row.subtitle}</p>
                  </div>
                  <div className="ciclo-clientes-type">
                    <span className={`ciclo-pill ${row.tone ?? 'primary'}`}>{row.status}</span>
                  </div>
                  <div className="ciclo-onboarding-progress">
                    <strong>{row.value}</strong>
                    <div aria-hidden="true"><span style={{ width: `${Math.max(4, progress)}%` }} /></div>
                  </div>
                  <div className="ciclo-clientes-meta">
                    <strong>{meta.carteira}</strong>
                    <span>risco {meta.risco}</span>
                  </div>
                  <div className="ciclo-clientes-actions">
                    <Link className="button secondary" href={`/modulos/ciclo/onboarding/${row.id}`}>Checklist</Link>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyBlock label="Nenhum onboarding encontrado." />
        )}
      </section>
    </div>
  )
}

export function CicloAtendimentoDashboardView({
  activeTab,
  data,
  filters,
}: {
  activeTab: CicloAtendimentoTab
  data: CicloAtendimentoDashboard
  filters: { dataDe?: string; dataAte?: string; status?: string }
}) {
  const groups = data.groups[activeTab] ?? []
  const topGroups = groups.slice(0, 10)
  const maxGroup = Math.max(...topGroups.map((item) => item.total), 1)
  const maxMonth = Math.max(...data.months.map((item) => item.total), 1)

  if (!data.databaseReady) {
    return <EmptyBlock label="A base de atendimentos ainda não está disponível. Execute a carga ASTREA para iniciar o dashboard." />
  }

  return (
    <div className="ciclo-atendimento-dashboard">
      <form className="ciclo-atendimento-filters" method="get">
        <input name="aba" type="hidden" value={activeTab} />
        <label>
          <span>Criação de</span>
          <input className="input" name="de" type="date" defaultValue={filters.dataDe ?? ''} />
        </label>
        <label>
          <span>Criação até</span>
          <input className="input" name="ate" type="date" defaultValue={filters.dataAte ?? ''} />
        </label>
        <label>
          <span>Status</span>
          <select className="select" name="status" defaultValue={filters.status ?? ''}>
            <option value="">Todos</option>
            <option value="aberto">Aberto</option>
            <option value="encerrado">Encerrado</option>
          </select>
        </label>
        <button className="button secondary" type="submit">Filtrar</button>
        <Link className="button secondary" href="/modulos/ciclo/atendimento">Limpar</Link>
      </form>

      <section className="ciclo-atendimento-kpis">
        <article>
          <span>Total</span>
          <strong>{data.kpis.total}</strong>
          <small>atendimentos ASTREA</small>
        </article>
        <article>
          <span>Abertos</span>
          <strong>{data.kpis.abertos}</strong>
          <small>em acompanhamento</small>
        </article>
        <article>
          <span>Encerrados</span>
          <strong>{data.kpis.encerrados}</strong>
          <small>finalizados</small>
        </article>
        <article>
          <span>Clientes</span>
          <strong>{data.kpis.clientes}</strong>
          <small>com atendimento</small>
        </article>
        <article>
          <span>Responsáveis</span>
          <strong>{data.kpis.responsaveis}</strong>
          <small>na operação</small>
        </article>
        <article>
          <span>Tipos</span>
          <strong>{data.kpis.tipos}</strong>
          <small>por etiqueta</small>
        </article>
      </section>

      <nav className="suite-tabs ciclo-atendimento-tabs" aria-label="Visões de atendimento">
        {(['cliente', 'responsavel', 'carteira', 'tipo'] as CicloAtendimentoTab[]).map((tab) => (
          <Link className={activeTab === tab ? 'active' : ''} href={atendimentoHref(tab, filters)} key={tab}>
            {atendimentoTabLabel(tab)}
          </Link>
        ))}
      </nav>

      <section className="ciclo-atendimento-grid">
        <article className="ciclo-atendimento-panel">
          <div className="ciclo-panel-heading">
            <div>
              <h2>Top 10 por {atendimentoTabLabel(activeTab).toLowerCase()}</h2>
              <p>Volume, abertos e encerrados dentro do filtro atual.</p>
            </div>
          </div>
          <div className="ciclo-atendimento-ranking">
            {topGroups.map((item) => (
              <div key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.abertos} abertos · {item.encerrados} encerrados</span>
                </div>
                <div className="ciclo-atendimento-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(6, Math.round((item.total / maxGroup) * 100))}%` }} />
                </div>
                <b>{item.total}</b>
              </div>
            ))}
          </div>
        </article>

        <article className="ciclo-atendimento-panel">
          <div className="ciclo-panel-heading">
            <div>
              <h2>Mês a mês</h2>
              <p>Atendimentos por data de criação.</p>
            </div>
          </div>
          <div className="ciclo-atendimento-months">
            {data.months.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <div className="ciclo-atendimento-column" title={`${item.total} atendimentos`}>
                  <i style={{ height: `${Math.max(8, Math.round((item.total / maxMonth) * 100))}%` }} />
                </div>
                <strong>{item.total}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}

export function CicloDocumentoList({ canWrite = false, documentos }: { canWrite?: boolean; documentos: CicloDocumento[] }) {
  return (
    <section className="card ciclo-panel">
      <div className="ciclo-panel-heading">
        <div>
          <h2>Documentos operacionais</h2>
          <p>Checklist documental por cliente, status e vencimento.</p>
        </div>
      </div>

      {documentos.length ? (
        <div className="ciclo-table-list docs">
          {documentos.map((documento) => (
            <article key={documento.id}>
              <div>
                <h3>{documento.titulo}</h3>
                <p>{documento.cliente} · {documento.tipo}</p>
              </div>
              <span className={`ciclo-pill ${riskTone(documento.status)}`}>{documento.status}</span>
              <strong>{documento.obrigatorio ? 'Obrigatório' : 'Opcional'}</strong>
              <small>
                {formatDate(documento.dataRenovacao)}
                {canWrite ? <Link className="button secondary" href={`/modulos/ciclo/documentos/${documento.id}`}>Editar</Link> : null}
              </small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label="Nenhum documento cadastrado." />
      )}
    </section>
  )
}

export function CicloClienteForm({
  action,
  cliente,
  formData,
}: {
  action: (formData: FormData) => Promise<void>
  cliente?: CicloClienteRecord
  formData: CicloClienteFormData
}) {
  return (
    <form action={action} className="card ciclo-panel module-form-grid">
      {cliente ? <input type="hidden" name="id" value={cliente.id} /> : null}

      <div>
        <label className="label" htmlFor="nome">Nome operacional</label>
        <input className="input" id="nome" name="nome" required defaultValue={cliente?.nome ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="nome_fantasia">Nome fantasia</label>
        <input className="input" id="nome_fantasia" name="nome_fantasia" defaultValue={cliente?.nome_fantasia ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="razao_social">Razao social</label>
        <input className="input" id="razao_social" name="razao_social" defaultValue={cliente?.razao_social ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="documento">Documento</label>
        <input className="input" id="documento" name="documento" defaultValue={cliente?.documento ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="carteira_id">Carteira</label>
        <select className="select" id="carteira_id" name="carteira_id" defaultValue={cliente?.carteira_id ?? ''}>
          <option value="">Sem carteira</option>
          {formData.carteiras.map((carteira) => (
            <option key={carteira.id} value={carteira.id}>{carteira.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="administradora_id">Administradora</label>
        <select className="select" id="administradora_id" name="administradora_id" defaultValue={cliente?.administradora_id ?? ''}>
          <option value="">Sem administradora</option>
          {formData.administradoras.map((administradora) => (
            <option key={administradora.id} value={administradora.id}>{administradora.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="tipo_cliente">Tipo de cliente</label>
        <select className="select" id="tipo_cliente" name="tipo_cliente" defaultValue={cliente?.tipo_cliente ?? 'mensal'}>
          <option value="mensal">Mensal</option>
          <option value="pontual">Pontual</option>
          <option value="cobranca">Cobrança</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="status_operacional">Status operacional</label>
        <select className="select" id="status_operacional" name="status_operacional" defaultValue={cliente?.status_operacional ?? 'novo'}>
          <option value="novo">Novo</option>
          <option value="implantacao">Implantação</option>
          <option value="ativo">Ativo</option>
          <option value="pausado">Pausado</option>
          <option value="encerrado">Encerrado</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="score_atual">Score</label>
        <input className="input" id="score_atual" name="score_atual" type="number" min={0} max={100} defaultValue={cliente?.score_atual ?? 75} />
      </div>

      <div>
        <label className="label" htmlFor="risco_atual">Risco</label>
        <select className="select" id="risco_atual" name="risco_atual" defaultValue={cliente?.risco_atual ?? 'medio'}>
          <option value="baixo">Baixo</option>
          <option value="medio">Médio</option>
          <option value="alto">Alto</option>
          <option value="critico">Critico</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="temperatura">Temperatura</label>
        <select className="select" id="temperatura" name="temperatura" defaultValue={cliente?.temperatura ?? 'neutro'}>
          <option value="quente">Quente</option>
          <option value="neutro">Neutro</option>
          <option value="frio">Frio</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" defaultValue={cliente?.email ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="telefone">Telefone</label>
        <input className="input" id="telefone" name="telefone" defaultValue={cliente?.telefone ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="cidade">Cidade</label>
        <input className="input" id="cidade" name="cidade" defaultValue={cliente?.cidade ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="estado">Estado</label>
        <input className="input" id="estado" name="estado" maxLength={2} defaultValue={cliente?.estado ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="pasta_url">Pasta operacional</label>
        <input className="input" id="pasta_url" name="pasta_url" defaultValue={cliente?.pasta_url ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="observacoes">Observações</label>
        <textarea className="textarea" id="observacoes" name="observacoes" defaultValue={cliente?.observacoes ?? ''} />
      </div>

      <label className="checkbox-row module-form-wide">
        <input name="ativo" type="checkbox" value="on" defaultChecked={cliente?.ativo ?? true} />
        <span>Cliente ativo no Ciclo</span>
      </label>

      <div className="form-actions module-form-wide">
        <CicloSubmitButton>Salvar cliente</CicloSubmitButton>
        <Link className="button secondary" href="/modulos/ciclo/clientes">Cancelar</Link>
      </div>
    </form>
  )
}

export function CicloAdministradoraForm({
  action,
  administradora,
}: {
  action: (formData: FormData) => Promise<void>
  administradora?: CicloAdministradoraRecord
}) {
  return (
    <form action={action} className="card ciclo-panel module-form-grid">
      {administradora ? <input type="hidden" name="id" value={administradora.id} /> : null}

      <div className="module-form-wide">
        <label className="label" htmlFor="nome">Nome</label>
        <input className="input" id="nome" name="nome" required defaultValue={administradora?.nome ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="documento">Documento</label>
        <input className="input" id="documento" name="documento" defaultValue={administradora?.documento ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" defaultValue={administradora?.email ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="telefone">Telefone</label>
        <input className="input" id="telefone" name="telefone" defaultValue={administradora?.telefone ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="site">Site</label>
        <input className="input" id="site" name="site" defaultValue={administradora?.site ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="observacoes">Observações</label>
        <textarea className="textarea" id="observacoes" name="observacoes" defaultValue={administradora?.observacoes ?? ''} />
      </div>

      <label className="checkbox-row module-form-wide">
        <input name="ativo" type="checkbox" value="on" defaultChecked={administradora?.ativo ?? true} />
        <span>Administradora ativa</span>
      </label>

      <div className="form-actions module-form-wide">
        <CicloSubmitButton>Salvar administradora</CicloSubmitButton>
        <Link className="button secondary" href="/modulos/ciclo/administradoras">Cancelar</Link>
      </div>
    </form>
  )
}

export function CicloDocumentoForm({
  action,
  documento,
  formData,
}: {
  action: (formData: FormData) => Promise<void>
  documento?: CicloDocumentoRecord
  formData: CicloDocumentoFormData
}) {
  return (
    <form action={action} className="card ciclo-panel module-form-grid">
      {documento ? <input type="hidden" name="id" value={documento.id} /> : null}

      <div className="module-form-wide">
        <label className="label" htmlFor="cliente_id">Cliente</label>
        <select className="select" id="cliente_id" name="cliente_id" required defaultValue={documento?.cliente_id ?? ''}>
          <option value="">Selecione</option>
          {formData.clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>{cliente.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="tipo_documento">Tipo</label>
        <select className="select" id="tipo_documento" name="tipo_documento" required defaultValue={documento?.tipo_documento ?? ''}>
          <option value="">Selecione</option>
          {cicloDocumentoTipos.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="titulo">Titulo</label>
        <input className="input" id="titulo" name="titulo" defaultValue={documento?.titulo ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={documento?.status ?? 'pendente'}>
          <option value="pendente">Pendente</option>
          <option value="recebido">Recebido</option>
          <option value="validado">Validado</option>
          <option value="vencido">Vencido</option>
          <option value="dispensado">Dispensado</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="data_assinatura">Data assinatura</label>
        <input className="input" id="data_assinatura" name="data_assinatura" type="date" defaultValue={documento?.data_assinatura ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="data_realizacao">Data realizacao</label>
        <input className="input" id="data_realizacao" name="data_realizacao" type="date" defaultValue={documento?.data_realizacao ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="data_renovacao">Data vencimento</label>
        <input className="input" id="data_renovacao" name="data_renovacao" type="date" defaultValue={documento?.data_renovacao ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="arquivo_url">Link do arquivo</label>
        <input className="input" id="arquivo_url" name="arquivo_url" defaultValue={documento?.arquivo_url ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="observacoes">Observações</label>
        <textarea className="textarea" id="observacoes" name="observacoes" defaultValue={documento?.observacoes ?? ''} />
      </div>

      <label className="checkbox-row">
        <input name="obrigatorio" type="checkbox" value="on" defaultChecked={documento?.obrigatorio ?? true} />
        <span>Obrigatorio</span>
      </label>

      <label className="checkbox-row">
        <input name="aplicavel" type="checkbox" value="on" defaultChecked={documento?.aplicavel ?? true} />
        <span>Aplicavel</span>
      </label>

      <label className="checkbox-row">
        <input name="validado" type="checkbox" value="on" defaultChecked={documento?.validado ?? false} />
        <span>Validado</span>
      </label>

      <div className="form-actions module-form-wide">
        <CicloSubmitButton>Salvar documento</CicloSubmitButton>
        <Link className="button secondary" href="/modulos/ciclo/documentos">Cancelar</Link>
      </div>
    </form>
  )
}

export function CicloAlertaForm({
  action,
  alerta,
  formData,
}: {
  action: (formData: FormData) => Promise<void>
  alerta?: CicloAlertaRecord
  formData: CicloDocumentoFormData
}) {
  return (
    <form action={action} className="card ciclo-panel module-form-grid">
      {alerta ? <input type="hidden" name="id" value={alerta.id} /> : null}
      <input type="hidden" name="origem" value={alerta?.origem ?? 'manual'} />
      <input type="hidden" name="referencia_id" value={alerta?.referencia_id ?? ''} />

      <div className="module-form-wide">
        <label className="label" htmlFor="cliente_id">Cliente</label>
        <select className="select" id="cliente_id" name="cliente_id" defaultValue={alerta?.cliente_id ?? ''}>
          <option value="">Sem cliente vinculado</option>
          {formData.clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>{cliente.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="tipo">Tipo</label>
        <select className="select" id="tipo" name="tipo" defaultValue={alerta?.tipo ?? 'operacional'}>
          <option value="operacional">Operacional</option>
          <option value="documental">Documental</option>
          <option value="prazo">Prazo</option>
          <option value="risco">Risco</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="severidade">Severidade</label>
        <select className="select" id="severidade" name="severidade" defaultValue={alerta?.severidade ?? 'media'}>
          {cicloAlertaSeveridades.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={alerta?.status ?? 'aberto'}>
          <option value="aberto">Aberto</option>
          <option value="em_tratamento">Em tratamento</option>
          <option value="resolvido">Resolvido</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="vencimento_em">Vencimento</label>
        <input className="input" id="vencimento_em" name="vencimento_em" type="datetime-local" defaultValue={alerta?.vencimento_em ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="titulo">Titulo</label>
        <input className="input" id="titulo" name="titulo" required defaultValue={alerta?.titulo ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="descricao">Descrição</label>
        <textarea className="textarea" id="descricao" name="descricao" defaultValue={alerta?.descricao ?? ''} />
      </div>

      <div className="form-actions module-form-wide">
        <CicloSubmitButton>Salvar alerta</CicloSubmitButton>
        <Link className="button secondary" href="/modulos/ciclo/alertas">Cancelar</Link>
      </div>
    </form>
  )
}

export function CicloOcorrenciaForm({
  action,
  formData,
  ocorrencia,
}: {
  action: (formData: FormData) => Promise<void>
  formData: CicloDocumentoFormData
  ocorrencia?: CicloOcorrenciaRecord
}) {
  return (
    <form action={action} className="card ciclo-panel module-form-grid">
      {ocorrencia ? <input type="hidden" name="id" value={ocorrencia.id} /> : null}

      <div className="module-form-wide">
        <label className="label" htmlFor="cliente_id">Cliente</label>
        <select className="select" id="cliente_id" name="cliente_id" defaultValue={ocorrencia?.cliente_id ?? ''}>
          <option value="">Sem cliente vinculado</option>
          {formData.clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>{cliente.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="tipo">Tipo</label>
        <select className="select" id="tipo" name="tipo" defaultValue={ocorrencia?.tipo ?? 'operacional'}>
          <option value="operacional">Operacional</option>
          <option value="documental">Documental</option>
          <option value="financeiro">Financeiro</option>
          <option value="relacionamento">Relacionamento</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="impacto">Impacto</label>
        <select className="select" id="impacto" name="impacto" defaultValue={ocorrencia?.impacto ?? 'neutro'}>
          <option value="baixo">Baixo</option>
          <option value="neutro">Neutro</option>
          <option value="medio">Médio</option>
          <option value="alto">Alto</option>
          <option value="critico">Critico</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={ocorrencia?.status ?? 'aberta'}>
          <option value="aberta">Aberta</option>
          <option value="em_tratamento">Em tratamento</option>
          <option value="resolvida">Resolvida</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="data_ocorrencia">Data</label>
        <input className="input" id="data_ocorrencia" name="data_ocorrencia" type="date" defaultValue={ocorrencia?.data_ocorrencia ?? new Date().toISOString().slice(0, 10)} />
      </div>

      <div>
        <label className="label" htmlFor="prazo">Prazo</label>
        <input className="input" id="prazo" name="prazo" type="date" defaultValue={ocorrencia?.prazo ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="responsavel">Responsável</label>
        <input className="input" id="responsavel" name="responsavel" defaultValue={ocorrencia?.responsavel ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="peso">Peso</label>
        <input className="input" id="peso" name="peso" type="number" min={1} max={10} defaultValue={ocorrencia?.peso ?? 1} />
      </div>

      <div>
        <label className="label" htmlFor="impacto_score">Impacto score</label>
        <input className="input" id="impacto_score" name="impacto_score" type="number" min={-100} max={100} defaultValue={ocorrencia?.impacto_score ?? 0} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="titulo">Titulo</label>
        <input className="input" id="titulo" name="titulo" required defaultValue={ocorrencia?.titulo ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="descricao">Descrição</label>
        <textarea className="textarea" id="descricao" name="descricao" defaultValue={ocorrencia?.descricao ?? ''} />
      </div>

      {!ocorrencia ? (
        <label className="checkbox-row module-form-wide">
          <input name="criar_alerta" type="checkbox" value="on" defaultChecked />
          <span>Criar alerta para acompanhamento</span>
        </label>
      ) : null}

      <div className="form-actions module-form-wide">
        <CicloSubmitButton>Salvar ocorrência</CicloSubmitButton>
        <Link className="button secondary" href="/modulos/ciclo/ocorrencias">Cancelar</Link>
      </div>
    </form>
  )
}

export function CicloContratoForm({
  action,
  contrato,
  formData,
}: {
  action: (formData: FormData) => Promise<void>
  contrato?: CicloContratoRecord
  formData: CicloDocumentoFormData
}) {
  return (
    <form action={action} className="card ciclo-panel module-form-grid">
      {contrato ? <input type="hidden" name="id" value={contrato.id} /> : null}

      <div className="module-form-wide">
        <label className="label" htmlFor="cliente_id">Cliente</label>
        <select className="select" id="cliente_id" name="cliente_id" defaultValue={contrato?.cliente_id ?? ''}>
          <option value="">Sem cliente vinculado</option>
          {formData.clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>{cliente.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="numero_contrato">Numero</label>
        <input className="input" id="numero_contrato" name="numero_contrato" defaultValue={contrato?.numero_contrato ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={contrato?.status ?? 'ativo'}>
          <option value="ativo">Ativo</option>
          <option value="vigente">Vigente</option>
          <option value="renovacao">Renovacao</option>
          <option value="encerrado">Encerrado</option>
          <option value="suspenso">Suspenso</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="data_assinatura">Assinatura</label>
        <input className="input" id="data_assinatura" name="data_assinatura" type="date" defaultValue={contrato?.data_assinatura ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="data_inicio">Inicio</label>
        <input className="input" id="data_inicio" name="data_inicio" type="date" defaultValue={contrato?.data_inicio ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="data_fim">Fim</label>
        <input className="input" id="data_fim" name="data_fim" type="date" defaultValue={contrato?.data_fim ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="valor">Valor</label>
        <input className="input" id="valor" name="valor" inputMode="decimal" defaultValue={contrato?.valor ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="indice_reajuste">Indice reajuste</label>
        <input className="input" id="indice_reajuste" name="indice_reajuste" defaultValue={contrato?.indice_reajuste ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="proximo_reajuste">Proximo reajuste</label>
        <input className="input" id="proximo_reajuste" name="proximo_reajuste" type="date" defaultValue={contrato?.proximo_reajuste ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="observacoes">Observações</label>
        <textarea className="textarea" id="observacoes" name="observacoes" defaultValue={contrato?.observacoes ?? ''} />
      </div>

      <label className="checkbox-row module-form-wide">
        <input name="ativo" type="checkbox" value="on" defaultChecked={contrato?.ativo ?? true} />
        <span>Contrato ativo</span>
      </label>

      <div className="form-actions module-form-wide">
        <CicloSubmitButton>Salvar contrato</CicloSubmitButton>
        <Link className="button secondary" href="/modulos/ciclo/contratos">Cancelar</Link>
      </div>
    </form>
  )
}

export function CicloAtaForm({
  action,
  ata,
  formData,
}: {
  action: (formData: FormData) => Promise<void>
  ata?: CicloAtaRecord
  formData: CicloDocumentoFormData
}) {
  return (
    <form action={action} className="card ciclo-panel module-form-grid">
      {ata ? <input type="hidden" name="id" value={ata.id} /> : null}

      <div className="module-form-wide">
        <label className="label" htmlFor="cliente_id">Cliente</label>
        <select className="select" id="cliente_id" name="cliente_id" defaultValue={ata?.cliente_id ?? ''}>
          <option value="">Sem cliente vinculado</option>
          {formData.clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>{cliente.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="tipo">Tipo</label>
        <select className="select" id="tipo" name="tipo" required defaultValue={ata?.tipo ?? 'ata_eleicao'}>
          <option value="ata_eleicao">Ata eleicao</option>
          <option value="ata_previsao_orcamentaria">Ata previsao orcamentaria</option>
          <option value="assembleia_ordinaria">Assembleia ordinaria</option>
          <option value="assembleia_extraordinaria">Assembleia extraordinaria</option>
          <option value="outra">Outra</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="status">Status</label>
        <select className="select" id="status" name="status" defaultValue={ata?.status ?? 'vigente'}>
          <option value="vigente">Vigente</option>
          <option value="pendente">Pendente</option>
          <option value="vencida">Vencida</option>
          <option value="substituida">Substituida</option>
          <option value="dispensada">Dispensada</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="data_ata">Data da ata</label>
        <input className="input" id="data_ata" name="data_ata" type="date" defaultValue={ata?.data_ata ?? ''} />
      </div>

      <div>
        <label className="label" htmlFor="data_validade">Validade</label>
        <input className="input" id="data_validade" name="data_validade" type="date" defaultValue={ata?.data_validade ?? ''} />
      </div>

      <div className="module-form-wide">
        <label className="label" htmlFor="observacoes">Observações</label>
        <textarea className="textarea" id="observacoes" name="observacoes" defaultValue={ata?.observacoes ?? ''} />
      </div>

      <label className="checkbox-row module-form-wide">
        <input name="ativo" type="checkbox" value="on" defaultChecked={ata?.ativo ?? true} />
        <span>Ata ativa</span>
      </label>

      <div className="form-actions module-form-wide">
        <CicloSubmitButton>Salvar ata</CicloSubmitButton>
        <Link className="button secondary" href="/modulos/ciclo/atas">Cancelar</Link>
      </div>
    </form>
  )
}

export function CicloClienteIntegralCockpit({ detail }: { detail: CicloClienteIntegral }) {
  const { alertas, cliente, documentos, ocorrencias, pendencias, regularidade, timeline } = detail
  const alertasAbertos = alertas.filter((alerta) => alerta.status !== 'resolvido' && alerta.status !== 'cancelado')
  const ocorrenciasAbertas = ocorrencias.filter((ocorrencia) => !['resolvida', 'cancelada'].includes(ocorrencia.status))
  const documentosPendentes = documentos.filter((documento) => documento.status === 'pendente' || documento.status === 'vencido')
  const documentosVencidos = documentosPendentes.filter((documento) => documento.status === 'vencido').length

  const kpis = [
    { label: 'Regularidade', value: `${regularidade}%`, hint: `${pendencias.length} pendência(s)` },
    { label: 'Docs pendentes', value: String(documentosPendentes.length), hint: `${documentosVencidos} vencido(s)` },
    { label: 'Score', value: String(cliente.score_atual), hint: `risco ${cliente.risco_atual}` },
    { label: 'Alertas', value: String(alertasAbertos.length), hint: 'em aberto' },
    { label: 'Ocorrências', value: String(ocorrenciasAbertas.length), hint: 'em acompanhamento' },
  ]

  return (
    <>
      <section className="card ciclo-panel ciclo-integral-hero">
        <div>
          <span className={`ciclo-pill ${riskTone(cliente.risco_atual)}`}>{cliente.risco_atual}</span>
          <h2>{cliente.nome}</h2>
          <p>{cliente.documento ?? 'Sem documento'} - {detail.carteira} - {detail.administradora}</p>
        </div>
        <div className="ciclo-quick-actions">
          <Link className="button secondary" href={`/modulos/ciclo/clientes/${cliente.id}`}>Editar cliente</Link>
          <Link className="button secondary" href="/modulos/ciclo/documentos/novo">Novo documento</Link>
          <Link className="button secondary" href="/modulos/ciclo/ocorrencias/nova">Nova ocorrência</Link>
          <Link className="button secondary" href="/modulos/ciclo/alertas/novo">Novo alerta</Link>
        </div>
      </section>

      <OperationalKpiGrid className="ciclo-kpi-grid" items={kpis} />

      <section className="ciclo-split-grid">
        <section className="card ciclo-panel">
          <div className="ciclo-panel-heading">
            <div>
              <h2>Pendencias acionaveis</h2>
              <p>Itens que pedem acompanhamento imediato.</p>
            </div>
          </div>
          {pendencias.length || documentosPendentes.length || alertasAbertos.length ? (
            <div className="ciclo-table-list compact">
              {pendencias.slice(0, 5).map((pendencia) => (
                <article key={pendencia}>
                  <div>
                    <h3>{pendencia}</h3>
                    <p>Regularidade documental</p>
                  </div>
                  <span className="ciclo-pill warning">pendente</span>
                  <strong>Doc</strong>
                  <small>regularidade</small>
                </article>
              ))}
              {alertasAbertos.slice(0, 5).map((alerta) => (
                <article key={alerta.id}>
                  <div>
                    <h3>{alerta.titulo}</h3>
                    <p>{alerta.descricao ?? alerta.tipo}</p>
                  </div>
                  <span className={`ciclo-pill ${riskTone(alerta.severidade)}`}>{alerta.severidade}</span>
                  <strong>{alerta.status}</strong>
                  <small>{formatDate(alerta.vencimento_em ?? '')}</small>
                </article>
              ))}
            </div>
          ) : (
            <EmptyBlock label="Nenhuma pendencia aberta para este cliente." />
          )}
        </section>

        <section className="card ciclo-panel">
          <div className="ciclo-panel-heading">
            <div>
              <h2>Timeline recente</h2>
              <p>Movimentos operacionais registrados.</p>
            </div>
          </div>
          {timeline.length ? (
            <div className="ciclo-table-list compact">
              {timeline.slice(0, 8).map((item) => (
                <article key={item.id}>
                  <div>
                    <h3>{item.titulo}</h3>
                    <p>{item.descricao || item.cliente}</p>
                  </div>
                  <span className="ciclo-pill primary">{item.tipo}</span>
                  <strong>{formatDate(item.createdAt)}</strong>
                  <small>evento</small>
                </article>
              ))}
            </div>
          ) : (
            <EmptyBlock label="Nenhum evento registrado." />
          )}
        </section>
      </section>

      <section className="ciclo-integral-grid">
        <CicloIntegralList
          empty="Nenhum documento cadastrado."
          items={documentos.slice(0, 8).map((documento) => ({
            href: `/modulos/ciclo/documentos/${documento.id}`,
            meta: formatDate(documento.data_renovacao ?? ''),
            status: documento.status,
            title: documento.titulo ?? documento.tipo_documento,
            tone: riskTone(documento.status),
            value: documento.obrigatorio ? 'Obrigatorio' : 'Opcional',
          }))}
          title="Documentos"
        />
        <CicloIntegralList
          empty="Nenhuma ocorrência registrada."
          items={ocorrencias.slice(0, 8).map((ocorrencia) => ({
            href: `/modulos/ciclo/ocorrencias/${ocorrencia.id}`,
            meta: ocorrencia.responsavel ?? 'Sem responsável',
            status: ocorrencia.status,
            title: ocorrencia.titulo,
            tone: impactoTone(ocorrencia.impacto),
            value: formatDate(ocorrencia.data_ocorrencia),
          }))}
          title="Ocorrencias"
        />
      </section>
    </>
  )
}

function CicloIntegralList({
  empty,
  items,
  title,
}: {
  empty: string
  items: Array<{ href: string; meta: string; status: string; title: string; tone?: string; value: string }>
  title: string
}) {
  return (
    <section className="card ciclo-panel">
      <div className="ciclo-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>Resumo vinculado ao cliente.</p>
        </div>
      </div>
      {items.length ? (
        <div className="ciclo-table-list compact">
          {items.map((item) => (
            <article key={item.href}>
              <div>
                <h3>{item.title}</h3>
                <p>{item.meta}</p>
              </div>
              <span className={`ciclo-pill ${item.tone ?? 'primary'}`}>{item.status}</span>
              <strong>{item.value}</strong>
              <small><Link className="button secondary" href={item.href}>Abrir</Link></small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label={empty} />
      )}
    </section>
  )
}

export function CicloOnboardingWorkflowConfig({ atividades }: { atividades: CicloOnboardingWorkflowAtividade[] }) {
  return (
    <div className="ciclo-workflow-config">
      <section className="card ciclo-panel">
        <div className="ciclo-panel-heading">
          <div>
            <h2>Nova atividade</h2>
            <p>Cadastre a etapa padrao do fluxo de recepcao.</p>
          </div>
        </div>
        <form action={createCicloOnboardingWorkflowAtividadeAction} className="ciclo-workflow-config-form">
          <label>
            <span>Ordem</span>
            <input className="input" min="1" name="ordem" required type="number" />
          </label>
          <label>
            <span>Descricao</span>
            <input className="input" name="descricao" required />
          </label>
          <label>
            <span>Responsavel padrao</span>
            <input className="input" name="responsavel_padrao" placeholder="Nome ou area" />
          </label>
          <label className="checkbox-row ciclo-workflow-check">
            <input name="obrigatoria" type="checkbox" value="on" defaultChecked />
            <span>Obrigatoria</span>
          </label>
          <CicloSubmitButton>Criar atividade</CicloSubmitButton>
        </form>
      </section>

      <section className="card ciclo-panel">
        <div className="ciclo-panel-heading">
          <div>
            <h2>Atividades do workflow</h2>
            <p>Ordem, descricao e responsavel usados ao iniciar o onboarding.</p>
          </div>
          <Link className="button secondary" href="/modulos/ciclo/onboarding">Voltar</Link>
        </div>

        {atividades.length ? (
          <div className="ciclo-workflow-config-list">
            {atividades.map((atividade) => (
              <form action={updateCicloOnboardingWorkflowAtividadeAction} className="ciclo-workflow-config-row" key={atividade.id}>
                <input type="hidden" name="id" value={atividade.id} />
                <label>
                  <span>Ordem</span>
                  <input className="input" name="ordem" type="number" defaultValue={atividade.ordem} />
                </label>
                <label>
                  <span>Descricao</span>
                  <input className="input" name="descricao" defaultValue={atividade.descricao} required />
                </label>
                <label>
                  <span>Responsavel</span>
                  <input className="input" name="responsavel_padrao" defaultValue={atividade.responsavel_padrao ?? ''} />
                </label>
                <label className="checkbox-row">
                  <input name="obrigatoria" type="checkbox" value="on" defaultChecked={atividade.obrigatoria} />
                  <span>Obrigatoria</span>
                </label>
                <label className="checkbox-row">
                  <input name="ativo" type="checkbox" value="on" defaultChecked={atividade.ativo} />
                  <span>Ativa</span>
                </label>
                <button className="button secondary" type="submit">Salvar</button>
              </form>
            ))}
          </div>
        ) : (
          <EmptyBlock label="Nenhuma atividade cadastrada." />
        )}
      </section>
    </div>
  )
}

export function CicloOnboardingDetalhe({ detail }: { detail: CicloOnboardingDetail }) {
  const { atividades, cliente, documentos, progresso, timeline, workflow } = detail
  const canConcluir = progresso.total > 0 && workflow.total > 0 && progresso.pendentes === 0 && workflow.pendentes === 0

  return (
    <>
      <section className="ciclo-atendimento-kpis ciclo-onboarding-kpis">
        <article>
          <span>Documentos</span>
          <strong>{progresso.percentual}%</strong>
          <small>{progresso.concluidos}/{progresso.total} documentos</small>
        </article>
        <article>
          <span>Workflow</span>
          <strong>{workflow.percentual}%</strong>
          <small>{workflow.concluidas}/{workflow.total} atividades</small>
        </article>
        <article>
          <span>Status</span>
          <strong>{cliente.status_operacional}</strong>
          <small>etapa operacional</small>
        </article>
        <article>
          <span>Pend. docs</span>
          <strong>{progresso.pendentes}</strong>
          <small>documentos obrigatorios</small>
        </article>
        <article>
          <span>Pend. fluxo</span>
          <strong>{workflow.pendentes}</strong>
          <small>atividades obrigatorias</small>
        </article>
        <article>
          <span>Risco</span>
          <strong>{cliente.risco_atual}</strong>
          <small>score {cliente.score_atual}</small>
        </article>
      </section>

      <section className="card ciclo-panel">
        <div className="ciclo-panel-heading">
          <div>
            <h2>Workflow de recepcao</h2>
            <p>Atividades operacionais com responsavel e status.</p>
          </div>
          <div className="form-actions">
            <form action={startCicloOnboardingAction}>
              <input type="hidden" name="cliente_id" value={cliente.id} />
              <button className="button secondary" type="submit">Iniciar workflow</button>
            </form>
            <form action={completeCicloOnboardingAction}>
              <input type="hidden" name="cliente_id" value={cliente.id} />
              <button className="button" disabled={!canConcluir} type="submit">Concluir onboarding</button>
            </form>
          </div>
        </div>

        {atividades.length ? (
          <div className="ciclo-workflow-list">
            {atividades.map((atividade) => (
              <form action={updateCicloOnboardingAtividadeAction} className="ciclo-workflow-row" key={atividade.id}>
                <input type="hidden" name="id" value={atividade.id} />
                <input type="hidden" name="cliente_id" value={cliente.id} />
                <input type="hidden" name="descricao" value={atividade.descricao} />
                <div className="ciclo-workflow-main">
                  <span className={`ciclo-pill ${workflowTone(atividade.status)}`}>{workflowStatusLabel(atividade.status)}</span>
                  <h3>{atividade.descricao}</h3>
                  <p>{atividade.obrigatoria ? 'Obrigatoria' : 'Opcional'}</p>
                </div>
                <label>
                  <span>Status</span>
                  <select className="select" name="status" defaultValue={atividade.status}>
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluido">Concluido</option>
                    <option value="dispensado">Dispensado</option>
                  </select>
                </label>
                <label>
                  <span>Responsavel</span>
                  <input className="input" name="responsavel" defaultValue={atividade.responsavel ?? ''} />
                </label>
                <label>
                  <span>Observacoes</span>
                  <input className="input" name="observacoes" defaultValue={atividade.observacoes ?? ''} />
                </label>
                <button className="button secondary" type="submit">Atualizar</button>
              </form>
            ))}
          </div>
        ) : (
          <EmptyBlock label="Workflow ainda nao iniciado." />
        )}
      </section>

      <section className="card ciclo-panel">
        <div className="ciclo-panel-heading">
          <div>
            <h2>Checklist documental</h2>
            <p>{cliente.nome} - {cliente.documento ?? 'sem documento'}</p>
          </div>
        </div>

        {documentos.length ? (
          <div className="ciclo-document-form-list">
            {documentos.map((documento) => (
              <form action={updateCicloOnboardingDocumentoAction} className="ciclo-document-form" key={documento.id}>
                <input type="hidden" name="id" value={documento.id} />
                <input type="hidden" name="cliente_id" value={cliente.id} />
                <div>
                  <h3>{documento.titulo ?? documento.tipo_documento}</h3>
                  <p>{documento.tipo_documento}</p>
                </div>
                <select className="select" name="status" defaultValue={documento.status}>
                  <option value="pendente">Pendente</option>
                  <option value="recebido">Recebido</option>
                  <option value="validado">Validado</option>
                  <option value="vencido">Vencido</option>
                  <option value="dispensado">Dispensado</option>
                </select>
                <input className="input" name="data_renovacao" type="date" defaultValue={documento.data_renovacao ?? ''} />
                <input className="input" name="arquivo_url" placeholder="Link do arquivo" defaultValue={documento.arquivo_url ?? ''} />
                <textarea className="textarea" name="observacoes" placeholder="Observações" defaultValue={documento.observacoes ?? ''} />
                <label className="checkbox-row">
                  <input name="validado" type="checkbox" defaultChecked={documento.validado} />
                  <span>Validado</span>
                </label>
                <button className="button secondary" type="submit">Atualizar</button>
              </form>
            ))}
          </div>
        ) : (
          <EmptyBlock label="Checklist ainda nao iniciado." />
        )}
      </section>

      <section className="card ciclo-panel">
        <div className="ciclo-panel-heading">
          <div>
            <h2>Timeline</h2>
            <p>Eventos recentes do onboarding.</p>
          </div>
          <Link className="button secondary" href="/modulos/ciclo/onboarding">Voltar</Link>
        </div>
        {timeline.length ? (
          <div className="ciclo-table-list">
            {timeline.map((item) => (
              <article key={item.id}>
                <div>
                  <h3>{item.titulo}</h3>
                  <p>{item.descricao || item.cliente}</p>
                </div>
                <span className="ciclo-pill primary">{item.tipo}</span>
                <strong>{formatDate(item.createdAt)}</strong>
                <small>{item.cliente}</small>
              </article>
            ))}
          </div>
        ) : (
          <EmptyBlock label="Nenhum evento registrado." />
        )}
      </section>
    </>
  )
}

export function CicloListKpis({
  rows,
  secondaryLabel = 'Ativos',
}: {
  rows: CicloListRow[]
  secondaryLabel?: string
}) {
  const success = rows.filter((row) => row.tone === 'success').length
  const warning = rows.filter((row) => row.tone === 'warning').length
  const danger = rows.filter((row) => row.tone === 'danger').length

  return (
    <OperationalKpiGrid
      className="ciclo-kpi-grid"
      items={[
        { label: 'Total', value: String(rows.length), hint: 'registros carregados' },
        { label: secondaryLabel, value: String(success), hint: 'status positivo' },
        { label: 'Atenção', value: String(warning), hint: 'acompanhamento' },
        { label: 'Risco', value: String(danger), hint: 'corrigir ou revisar' },
      ]}
    />
  )
}

export function CicloGenericList({
  description,
  detailHrefBase,
  emptyLabel,
  rows,
  title,
}: {
  description: string
  detailHrefBase?: string
  emptyLabel: string
  rows: CicloListRow[]
  title: string
}) {
  return (
    <section className="card ciclo-panel">
      <div className="ciclo-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {rows.length ? (
        <div className="ciclo-table-list">
          {rows.map((row) => (
            <article key={row.id}>
              <div>
                <h3>{row.title}</h3>
                <p>{row.subtitle}</p>
              </div>
              <span className={`ciclo-pill ${row.tone ?? 'primary'}`}>{row.status}</span>
              <strong>{row.value}</strong>
              <small>
                {row.meta}
                {detailHrefBase ? <Link className="button secondary" href={`${detailHrefBase}/${row.id}`}>Detalhes</Link> : null}
              </small>
            </article>
          ))}
        </div>
      ) : (
        <EmptyBlock label={emptyLabel} />
      )}
    </section>
  )
}

export function CicloImportacaoDetalhe({
  itens,
  lote,
}: {
  itens: CicloImportacaoItem[]
  lote: CicloImportacaoLote
}) {
  const clientes = (lote.clientes_criados ?? 0) + (lote.clientes_atualizados ?? 0)
  const isAtendimento = lote.tipo === 'atendimentos_astrea_xlsx'

  return (
    <>
      <OperationalKpiGrid
        className="ciclo-kpi-grid"
        items={[
          { label: 'Linhas', value: String(lote.total_linhas ?? 0), hint: 'arquivo recebido' },
          { label: 'Válidas', value: String(lote.linhas_validas ?? 0), hint: 'aptas para carga' },
          { label: isAtendimento ? 'Atendimentos' : 'Clientes', value: String(clientes), hint: `${lote.clientes_criados ?? 0} novos` },
          { label: 'Ignoradas', value: String(lote.linhas_ignoradas ?? 0), hint: 'com erro ou duplicadas' },
        ]}
      />

      {lote.erro ? <div className="suite-empty-block danger">{lote.erro}</div> : null}

      <section className="card ciclo-panel">
        <div className="ciclo-panel-heading">
          <div>
            <h2>Itens do lote</h2>
            <p>Resultado linha a linha da importação.</p>
          </div>
          <Link className="button secondary" href="/modulos/ciclo/importacoes">Voltar</Link>
        </div>

        {itens.length ? (
          <div className="ciclo-table-list">
            {itens.map((item) => (
              <article key={item.id}>
                <div>
                  <h3>{item.cliente_nome ?? `Linha ${item.linha}`}</h3>
                  <p>{item.cnpj_normalizado ?? (isAtendimento ? 'Atendimento ASTREA' : 'Sem CNPJ')} - {item.mensagem ?? item.acao}</p>
                </div>
                <span className={`ciclo-pill ${item.status === 'sucesso' ? 'success' : item.status === 'erro' ? 'danger' : 'warning'}`}>{item.status}</span>
                <strong>Linha {item.linha}</strong>
                <small>{formatDate(item.created_at)}</small>
              </article>
            ))}
          </div>
        ) : (
          <EmptyBlock label="Nenhum item registrado para este lote." />
        )}
      </section>
    </>
  )
}

export function EmptyBlock({ label }: { label: string }) {
  return <div className="ciclo-empty-block">{label}</div>
}
