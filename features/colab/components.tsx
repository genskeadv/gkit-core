import Link from 'next/link'
import {
  Banknote,
  CarFront,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Gift,
  Home,
  ReceiptText,
  SlidersHorizontal,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { ColabData, ColabUberData } from '@/features/colab/types'
import { ColabUberExpenseForm } from '@/features/colab/uber-expense-form'
import { BrandLogo } from '@/features/shared/brand-logo'
import type { PlatformUsuario } from '@/lib/auth/platform'

type ColabTab = 'dashboard' | 'pagamentos' | 'comissoes' | 'beneficios' | 'uber' | 'perfil'

const tabs: Array<{ id: ColabTab; href: string; icon: LucideIcon; label: string }> = [
  { id: 'dashboard', href: '/modulos/colab', icon: Home, label: 'Início' },
  { id: 'pagamentos', href: '/modulos/colab/pagamentos', icon: WalletCards, label: 'Pagamentos' },
  { id: 'uber', href: '/modulos/colab/uber', icon: CarFront, label: 'Uber' },
  { id: 'comissoes', href: '/modulos/colab/comissoes', icon: Banknote, label: 'Comissões' },
  { id: 'perfil', href: '/modulos/colab/perfil', icon: CircleUserRound, label: 'Perfil' },
]

function currency(value: number) {
  return new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' }).format(value)
}

function pillTone(status: string) {
  if (['pago', 'paga', 'aprovada', 'disponivel', 'ativo', 'sincronizado'].includes(status)) return 'success'
  if (['cancelado', 'cancelada', 'rejeitada', 'erro'].includes(status)) return 'danger'
  if (['previsto', 'pendente', 'em_processamento', 'calculada', 'em_conferencia'].includes(status)) return 'warning'
  return 'primary'
}

function readableStatus(status: string) {
  return status.replaceAll('_', ' ')
}

function firstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] ?? 'Colaborador'
}

function plural(count: number, singular: string, pluralLabel: string) {
  return `${count} ${count === 1 ? singular : pluralLabel}`
}

export function ColabShell({
  active,
  children,
  description,
  title,
}: {
  active: ColabTab
  children: ReactNode
  description: string
  title: string
  usuario: PlatformUsuario
}) {
  return (
    <main className="suite-page">
      <div className="platform-bg" />
      <div className="suite-wrap no-sidebar colab-shell-wrap">
        <section className="suite-hero-card colab-app-hero">
          <div className="suite-hero-main">
            <BrandLogo className="suite-brand-mark" label="GKIT Colab" />
            <div>
              <p className="platform-kicker">GKIT Colab</p>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
          </div>
          <nav className="suite-tabs" aria-label="Navegacao do colaborador">
            {tabs.map((tab) => (
              <Link className={tab.id === active ? 'active' : ''} href={tab.href} key={tab.id}>
                <tab.icon aria-hidden="true" size={16} strokeWidth={2.2} />
                {tab.label}
              </Link>
            ))}
          </nav>
        </section>

        {children}

        <nav className="colab-mobile-dock" aria-label="Navegacao rápida do colaborador">
          {tabs.map((tab) => (
            <Link className={tab.id === active ? 'active' : ''} href={tab.href} key={tab.id}>
              <tab.icon aria-hidden="true" size={18} strokeWidth={2.2} />
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  )
}

export function ColabProfile({ data }: { data: ColabData }) {
  if (!data.collaborator) {
    return (
      <section className="suite-empty-card">
        <strong>Colaborador não localizado</strong>
        <span>O acesso ao Colab está liberado no Core, mas o e-mail do usuário ainda não tem cadastro ativo no GKIT Flex.</span>
      </section>
    )
  }

  const pendingTotal = data.summary.pendingPayments + data.summary.pendingUberExpenses
  const nextAction = data.summary.pendingUberExpenses
    ? { href: '/modulos/colab/uber', label: 'Enviar ou acompanhar Uber' }
    : data.summary.pendingPayments
      ? { href: '/modulos/colab/pagamentos', label: 'Conferir pagamentos' }
      : data.summary.openCommissions
        ? { href: '/modulos/colab/comissoes', label: 'Acompanhar comissões' }
        : { href: '/modulos/colab/perfil', label: 'Ver meu perfil' }

  return (
    <section className="colab-home-hero">
      <div className="colab-home-hero-copy">
        <span className={`suite-pill ${pillTone(data.source.status)}`}>{readableStatus(data.source.status)}</span>
        <h2>Olá, {firstName(data.collaborator.name)}</h2>
        <p>{data.collaborator.role} · {data.collaborator.department}</p>
        <Link className="colab-home-primary-action" href={nextAction.href}>
          {nextAction.label}
          <ChevronRight aria-hidden="true" size={18} strokeWidth={2.2} />
        </Link>
      </div>
      <div className="colab-home-balance">
        <span>Último pagamento</span>
        <strong>{currency(data.summary.latestPayment)}</strong>
        <small>{data.payments[0]?.competence ?? 'Sem demonstrativo publicado'}</small>
      </div>
      <div className="colab-home-metrics">
        <article>
          <span>Pendências</span>
          <strong>{String(pendingTotal)}</strong>
        </article>
        <article>
          <span>Comissões</span>
          <strong>{currency(data.summary.openCommissions)}</strong>
        </article>
        <article>
          <span>Benefícios</span>
          <strong>{String(data.benefits.length)}</strong>
        </article>
      </div>
    </section>
  )
}

export function ColabIntegrationStatus({ data }: { data: ColabData }) {
  const tone = data.source.status === 'sincronizado' ? 'success' : data.source.status === 'erro' ? 'danger' : 'warning'

  if (data.source.status === 'sincronizado') {
    return null
  }

  return (
    <section className={`suite-empty-block ${tone} colab-attention-banner`}>
      <strong>{data.source.label}: {data.source.status}</strong>
      <span>{data.source.message}</span>
    </section>
  )
}

export function ColabFinancialSummary({ data }: { data: ColabData }) {
  const actions = [
    {
      detail: plural(data.summary.pendingPayments, 'pendente', 'pendentes'),
      href: '/modulos/colab/pagamentos',
      icon: WalletCards,
      label: 'Pagamentos',
      tone: 'blue',
      value: currency(data.summary.latestPayment),
    },
    {
      detail: 'lançar e acompanhar',
      href: '/modulos/colab/uber',
      icon: CarFront,
      label: 'Uber',
      tone: 'green',
      value: String(data.summary.pendingUberExpenses),
    },
    {
      detail: `${currency(data.summary.paidCommissions)} pagas`,
      href: '/modulos/colab/comissoes',
      icon: Banknote,
      label: 'Comissões',
      tone: 'gold',
      value: currency(data.summary.openCommissions),
    },
    {
      detail: 'ativos no cadastro',
      href: '/modulos/colab/perfil',
      icon: Gift,
      label: 'Benefícios',
      tone: 'violet',
      value: String(data.benefits.length),
    },
  ]

  return (
    <section className="colab-action-grid" aria-label="Atalhos do Colab">
      {actions.map((action) => (
        <Link className={`colab-action-card ${action.tone}`} href={action.href} key={action.label}>
          <span className="colab-action-icon">
            <action.icon aria-hidden="true" size={18} strokeWidth={2.2} />
          </span>
          <span className="colab-action-copy">
            <small>{action.label}</small>
            <strong>{action.value}</strong>
            <em>{action.detail}</em>
          </span>
          <ChevronRight aria-hidden="true" className="colab-action-arrow" size={18} strokeWidth={2.2} />
        </Link>
      ))}
    </section>
  )
}

export function ColabActionCenter({ data }: { data: ColabData }) {
  if (!data.collaborator) {
    return (
      <section className="card suite-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Pendências</h2>
          <p>Vínculo do colaborador no GKIT Flex.</p>
          </div>
        </div>
        <div className="suite-empty-block warning">
          <strong>Cadastro não localizado</strong>
          <span>Seu acesso ao Colab está ativo, mas o cadastro de colaborador ainda não foi encontrado no GKIT Flex.</span>
        </div>
      </section>
    )
  }

  const actions = [
    data.summary.pendingPayments
      ? {
          href: '/modulos/colab/pagamentos',
          icon: ReceiptText,
          status: 'pendente',
          title: 'Pagamentos em aberto',
          value: String(data.summary.pendingPayments),
          detail: 'previstos ou em processamento',
        }
      : null,
    data.summary.openCommissions
      ? {
          href: '/modulos/colab/comissoes',
          icon: Banknote,
          status: 'em_conferencia',
          title: 'Comissões em acompanhamento',
          value: currency(data.summary.openCommissions),
          detail: 'calculadas, em conferência ou aprovadas',
        }
      : null,
    data.summary.pendingUberExpenses
      ? {
          href: '/modulos/colab/uber',
          icon: CarFront,
          status: 'pendente',
          title: 'Despesas Uber',
          value: String(data.summary.pendingUberExpenses),
          detail: 'lançamentos aguardando conciliação',
        }
      : null,
  ].filter(Boolean) as Array<{ detail: string; href: string; icon: LucideIcon; status: string; title: string; value: string }>

  return (
    <section className="card suite-panel colab-next-panel">
      <div className="suite-panel-heading">
        <div>
          <h2>Próximas ações</h2>
        </div>
      </div>
      {actions.length ? (
        <div className="colab-next-list">
          {actions.map((item) => (
            <Link className="colab-next-item" href={item.href} key={item.title}>
              <span className="colab-next-icon">
                <item.icon aria-hidden="true" size={18} strokeWidth={2.2} />
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </span>
              <span className={`suite-pill ${pillTone(item.status)}`}>{readableStatus(item.status)}</span>
              <em>{item.value}</em>
            </Link>
          ))}
        </div>
      ) : (
        <div className="suite-empty-block success colab-empty-state">
          <CheckCircle2 aria-hidden="true" size={20} strokeWidth={2.2} />
          <strong>Tudo em dia</strong>
          <span>Nenhuma pendência financeira publicada para este colaborador.</span>
        </div>
      )}
    </section>
  )
}

export function ColabPayments({
  competenceFilter = 'todos',
  data,
  showFilters = true,
  statusFilter = 'todos',
}: {
  competenceFilter?: string
  data: ColabData
  showFilters?: boolean
  statusFilter?: string
}) {
  const statusOptions = Array.from(new Set(data.payments.map((payment) => payment.status))).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const competenceOptions = Array.from(new Set(data.payments.map((payment) => payment.competence))).sort((a, b) => b.localeCompare(a, 'pt-BR'))
  const payments = data.payments.filter((payment) => {
    const matchesStatus = statusFilter === 'todos' || payment.status === statusFilter
    const matchesCompetence = competenceFilter === 'todos' || payment.competence === competenceFilter
    return matchesStatus && matchesCompetence
  })
  const hasFilter = statusFilter !== 'todos' || competenceFilter !== 'todos'

  return (
    <section className="card suite-panel colab-list-panel">
      {showFilters ? <form action="/modulos/colab/pagamentos" className="colab-panel-filter">
        <div className="colab-filter-title">
          <SlidersHorizontal aria-hidden="true" size={18} strokeWidth={2.2} />
          <strong>Filtrar demonstrativos</strong>
        </div>
        <label>
          <span>Status</span>
          <select name="status" defaultValue={statusFilter}>
            <option value="todos">Todos</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Competência</span>
          <select name="competencia" defaultValue={competenceFilter}>
            <option value="todos">Todas</option>
            {competenceOptions.map((competence) => (
              <option key={competence} value={competence}>{competence}</option>
            ))}
          </select>
        </label>
        <button className="button" type="submit">Filtrar</button>
        {hasFilter ? <Link className="button secondary" href="/modulos/colab/pagamentos">Limpar</Link> : null}
      </form> : (
        <div className="suite-panel-heading">
          <div>
            <h2>Pagamentos recentes</h2>
          </div>
          <Link className="colab-panel-link" href="/modulos/colab/pagamentos">Ver todos</Link>
        </div>
      )}
      <div className="colab-card-list">
        {payments.map((payment) => (
          <article className="colab-payment-card" key={payment.id}>
            <div className="colab-list-main">
              <h3>{payment.competence}</h3>
              <p>{payment.type} - {payment.description}</p>
            </div>
            <span className={`suite-pill ${pillTone(payment.status)}`}>{readableStatus(payment.status)}</span>
            <strong className="colab-card-amount">{currency(payment.netAmount)}</strong>
            <div className="colab-card-meta">
              <span>Bruto {currency(payment.grossAmount)}</span>
              <span>Descontos {currency(payment.discountAmount)}</span>
              <span>{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('pt-BR') : 'Sem data de pagamento'}</span>
            </div>
          </article>
        ))}
        {!payments.length ? <EmptyBlock label={hasFilter ? 'Nenhum pagamento encontrado para o filtro.' : 'Nenhum pagamento encontrado.'} /> : null}
      </div>
    </section>
  )
}

export function ColabCommissions({
  data,
  referenceFilter = 'todos',
  showFilters = true,
  statusFilter = 'todos',
}: {
  data: ColabData
  referenceFilter?: string
  showFilters?: boolean
  statusFilter?: string
}) {
  const statusOptions = Array.from(new Set(data.commissions.map((commission) => commission.status))).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const referenceOptions = Array.from(new Set(data.commissions.map((commission) => commission.reference))).sort((a, b) => b.localeCompare(a, 'pt-BR'))
  const commissions = data.commissions.filter((commission) => {
    const matchesStatus = statusFilter === 'todos' || commission.status === statusFilter
    const matchesReference = referenceFilter === 'todos' || commission.reference === referenceFilter
    return matchesStatus && matchesReference
  })
  const hasFilter = statusFilter !== 'todos' || referenceFilter !== 'todos'
  const totalAmount = commissions.reduce((sum, commission) => sum + commission.amount, 0)
  const totalBase = commissions.reduce((sum, commission) => sum + commission.baseAmount, 0)
  const clients = new Set(commissions.map((commission) => commission.client)).size

  return (
    <section className="card suite-panel colab-list-panel">
      {showFilters ? (
        <form action="/modulos/colab/comissoes" className="colab-panel-filter colab-commission-filter">
          <div className="colab-filter-title">
            <SlidersHorizontal aria-hidden="true" size={18} strokeWidth={2.2} />
            <strong>Filtrar comissões</strong>
          </div>
          <label>
            <span>Status</span>
            <select name="status" defaultValue={statusFilter}>
              <option value="todos">Todos</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{readableStatus(status)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Competência</span>
            <select name="competencia" defaultValue={referenceFilter}>
              <option value="todos">Todas</option>
              {referenceOptions.map((reference) => (
                <option key={reference} value={reference}>{reference}</option>
              ))}
            </select>
          </label>
          <button className="button" type="submit">Filtrar</button>
          {hasFilter ? <Link className="button secondary" href="/modulos/colab/comissoes">Limpar</Link> : null}
        </form>
      ) : (
        <div className="suite-panel-heading">
          <div>
            <h2>Comissões recentes</h2>
          </div>
          <Link className="colab-panel-link" href="/modulos/colab/comissoes">Ver todas</Link>
        </div>
      )}

      {showFilters ? (
        <div className="colab-commission-summary">
          <article>
            <span>Total filtrado</span>
            <strong>{currency(totalAmount)}</strong>
          </article>
          <article>
            <span>Base</span>
            <strong>{currency(totalBase)}</strong>
          </article>
          <article>
            <span>Clientes</span>
            <strong>{String(clients)}</strong>
          </article>
        </div>
      ) : null}

      <div className="colab-card-list">
        {commissions.map((commission, index) => (
          <details className="colab-commission-card colab-commission-detail-card" key={commission.id} open={showFilters && index === 0}>
            <summary>
              <div className="colab-list-main">
                <h3>{commission.reference}</h3>
                <p>{commission.client} - {commission.category}</p>
              </div>
              <span className={`suite-pill ${pillTone(commission.status)}`}>{readableStatus(commission.status)}</span>
              <strong className="colab-card-amount">{currency(commission.amount)}</strong>
            </summary>
            <div className="colab-card-meta">
              <span>Base {currency(commission.baseAmount)}</span>
              <span>{commission.percentage}%</span>
              <span>{commission.paidAt ? `Pago em ${new Date(commission.paidAt).toLocaleDateString('pt-BR')}` : 'Aguardando pagamento'}</span>
            </div>
            <div className="colab-commission-drilldown">
              <span>
                <small>Cliente</small>
                <strong>{commission.client}</strong>
              </span>
              <span>
                <small>Categoria</small>
                <strong>{commission.category}</strong>
              </span>
              <span>
                <small>Origem</small>
                <strong>{commission.origin}</strong>
              </span>
              <span>
                <small>Criada em</small>
                <strong>{new Date(commission.createdAt).toLocaleDateString('pt-BR')}</strong>
              </span>
            </div>
          </details>
        ))}
        {!commissions.length ? <EmptyBlock label={hasFilter ? 'Nenhuma comissão encontrada para o filtro.' : 'Nenhuma comissão encontrada.'} /> : null}
      </div>
    </section>
  )
}

export function ColabBenefits({ data }: { data: ColabData }) {
  return (
    <section className="colab-benefit-grid">
      {data.benefits.map((benefit) => (
        <article className="colab-benefit-card" key={benefit.id}>
          <span className="colab-benefit-icon">
            <Gift aria-hidden="true" size={18} strokeWidth={2.2} />
          </span>
          <div>
            <span className={`suite-pill ${pillTone(benefit.status)}`}>{readableStatus(benefit.status)}</span>
            <h2>{benefit.name}</h2>
            <p>{benefit.description}</p>
          </div>
          <strong>{benefit.monthlyValue ? currency(benefit.monthlyValue) : benefit.provider}</strong>
        </article>
      ))}
      {!data.benefits.length ? <EmptyBlock label="Nenhum benefício cadastrado no GKIT Flex." /> : null}
    </section>
  )
}

export function ColabProfileDetails({ data }: { data: ColabData }) {
  const collaborator = data.collaborator

  if (!collaborator) {
    return (
      <section className="suite-empty-card">
        <strong>Perfil não localizado</strong>
        <span>O e-mail do usuário ainda não tem cadastro ativo no GKIT Flex.</span>
      </section>
    )
  }

  const rows = [
    { label: 'E-mail', value: collaborator.email },
    { label: 'Telefone', value: collaborator.phone },
    { label: 'Cargo', value: collaborator.role },
    { label: 'Time', value: collaborator.department },
    { label: 'Gestor', value: collaborator.manager },
    { label: 'Admissão', value: new Date(collaborator.admissionDate).toLocaleDateString('pt-BR') },
    { label: 'Status', value: collaborator.status },
  ]

  return (
    <section className="card suite-panel colab-profile-panel">
      <div className="colab-profile-head">
        <span className="colab-profile-avatar">
          <CircleUserRound aria-hidden="true" size={24} strokeWidth={2.1} />
        </span>
        <div>
          <h2>{collaborator.name}</h2>
          <p>{collaborator.role} · {collaborator.department}</p>
        </div>
      </div>
      <div className="suite-table-list compact">
        {rows.map((row) => (
          <article key={row.label}>
            <div>
              <h3>{row.label}</h3>
              <p>{row.value || '-'}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="colab-profile-benefits">
        <strong>Benefícios ativos</strong>
        <div>
          {data.benefits.map((benefit) => (
            <span key={benefit.id}>{benefit.name}</span>
          ))}
          {!data.benefits.length ? <span>Nenhum benefício cadastrado</span> : null}
        </div>
      </div>
    </section>
  )
}

export function ColabUberExpenses({
  action,
  data,
  error,
  success,
}: {
  action: (formData: FormData) => Promise<void>
  data: ColabUberData
  error?: string
  success?: boolean
}) {
  if (!data.collaborator) {
    return (
      <section className="suite-empty-card">
        <strong>Cadastro não localizado</strong>
        <span>O e-mail do usuário precisa estar vinculado ao cadastro de colaborador no GKIT Flex.</span>
      </section>
    )
  }

  return (
    <>
      {success ? (
        <div className="suite-empty-block success">
          <strong>Despesa enviada</strong>
          <span>O recibo foi anexado e o lançamento ficou disponível para conciliação.</span>
        </div>
      ) : null}
      {error ? (
        <div className="suite-empty-block danger">
          <strong>Não foi possível gravar</strong>
          <span>{error}</span>
        </div>
      ) : null}

      <section className="card suite-panel colab-uber-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Lançar despesa</h2>
          </div>
        </div>
        <ColabUberExpenseForm action={action} clients={data.clients} />
      </section>

      <section className="card suite-panel colab-list-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Meus lançamentos</h2>
          </div>
        </div>
        <div className="colab-card-list">
          {data.expenses.map((expense) => (
            <article className="colab-uber-card" key={expense.id}>
              <div className="colab-list-main">
                <h3>{expense.client}</h3>
                <p>{expense.description}</p>
              </div>
              <span className={`suite-pill ${pillTone(expense.status)}`}>{readableStatus(expense.status)}</span>
              <strong className="colab-card-amount">{currency(expense.amount)}</strong>
              <div className="colab-card-meta">
                <span>{new Date(expense.date).toLocaleDateString('pt-BR')}</span>
                <span>{expense.competence}</span>
                {expense.receiptUrl ? <a href={expense.receiptUrl}>Recibo</a> : <span>Sem recibo</span>}
              </div>
            </article>
          ))}
          {!data.expenses.length ? <EmptyBlock label="Nenhuma despesa de Uber lançada." /> : null}
        </div>
      </section>
    </>
  )
}

function EmptyBlock({ label }: { label: string }) {
  return <div className="suite-empty-block colab-empty-state">{label}</div>
}
