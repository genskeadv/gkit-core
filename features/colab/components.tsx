import Link from 'next/link'
import type { ReactNode } from 'react'
import type { ColabData, ColabUberData } from '@/features/colab/types'
import { BrandLogo } from '@/features/shared/brand-logo'
import type { PlatformUsuario } from '@/lib/auth/platform'

type ColabTab = 'dashboard' | 'pagamentos' | 'comissoes' | 'beneficios' | 'uber' | 'perfil'

const tabs: Array<{ id: ColabTab; href: string; label: string }> = [
  { id: 'dashboard', href: '/modulos/colab', label: 'Início' },
  { id: 'pagamentos', href: '/modulos/colab/pagamentos', label: 'Pagamentos' },
  { id: 'comissoes', href: '/modulos/colab/comissoes', label: 'Comissões' },
  { id: 'beneficios', href: '/modulos/colab/beneficios', label: 'Benefícios' },
  { id: 'uber', href: '/modulos/colab/uber', label: 'Uber' },
  { id: 'perfil', href: '/modulos/colab/perfil', label: 'Perfil' },
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
        <section className="suite-hero-card">
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
                {tab.label}
              </Link>
            ))}
          </nav>
        </section>

        {children}

        <nav className="colab-mobile-dock" aria-label="Navegacao rápida do colaborador">
          {tabs.map((tab) => (
            <Link className={tab.id === active ? 'active' : ''} href={tab.href} key={tab.id}>
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

  return (
    <section className="suite-kpi-grid compact colab-kpi-grid">
      <article className="card metric-card">
        <p className="metric-label">Colaborador</p>
        <p className="metric-value">{data.collaborator.name}</p>
        <p className="metric-hint">{data.collaborator.role}</p>
      </article>
      <article className="card metric-card">
        <p className="metric-label">Time</p>
        <p className="metric-value">{data.collaborator.department}</p>
        <p className="metric-hint">Gestor: {data.collaborator.manager}</p>
      </article>
      <article className="card metric-card">
        <p className="metric-label">Último pagamento</p>
        <p className="metric-value">{currency(data.summary.latestPayment)}</p>
        <p className="metric-hint">{data.payments[0]?.competence ?? 'Sem demonstrativo'}</p>
      </article>
      <article className="card metric-card">
        <p className="metric-label">Comissões abertas</p>
        <p className="metric-value">{currency(data.summary.openCommissions)}</p>
        <p className="metric-hint">calculadas e em conferência</p>
      </article>
      <article className="card metric-card">
        <p className="metric-label">Benefícios</p>
        <p className="metric-value">{String(data.benefits.length)}</p>
        <p className="metric-hint">ativos no cadastro</p>
      </article>
    </section>
  )
}

export function ColabIntegrationStatus({ data }: { data: ColabData }) {
  const tone = data.source.status === 'sincronizado' ? 'success' : data.source.status === 'erro' ? 'danger' : 'warning'

  return (
    <section className={`suite-empty-block ${tone}`}>
      <strong>{data.source.label}: {data.source.status}</strong>
      <span>{data.source.message}</span>
    </section>
  )
}

export function ColabFinancialSummary({ data }: { data: ColabData }) {
  return (
    <section className="suite-kpi-grid compact colab-financial-grid">
      <article className="card metric-card">
        <p className="metric-label">Comissões aprovadas</p>
        <p className="metric-value">{currency(data.summary.approvedCommissions)}</p>
        <p className="metric-hint">aguardando pagamento</p>
      </article>
      <article className="card metric-card">
        <p className="metric-label">Comissões pagas</p>
        <p className="metric-value">{currency(data.summary.paidCommissions)}</p>
        <p className="metric-hint">histórico publicado</p>
      </article>
      <article className="card metric-card">
        <p className="metric-label">Pagamentos pendentes</p>
        <p className="metric-value">{String(data.summary.pendingPayments)}</p>
        <p className="metric-hint">previstos ou em processamento</p>
      </article>
      <article className="card metric-card">
        <p className="metric-label">Uber pendente</p>
        <p className="metric-value">{String(data.summary.pendingUberExpenses)}</p>
        <p className="metric-hint">lançamentos aguardando conferência</p>
      </article>
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
          status: 'pendente',
          title: 'Pagamentos em aberto',
          value: String(data.summary.pendingPayments),
          detail: 'previstos ou em processamento',
        }
      : null,
    data.summary.openCommissions
      ? {
          href: '/modulos/colab/comissoes',
          status: 'em_conferencia',
          title: 'Comissões em acompanhamento',
          value: currency(data.summary.openCommissions),
          detail: 'calculadas, em conferência ou aprovadas',
        }
      : null,
    data.summary.pendingUberExpenses
      ? {
          href: '/modulos/colab/uber',
          status: 'pendente',
          title: 'Despesas Uber',
          value: String(data.summary.pendingUberExpenses),
          detail: 'lançamentos aguardando conciliação',
        }
      : null,
  ].filter(Boolean) as Array<{ detail: string; href: string; status: string; title: string; value: string }>

  return (
    <section className="card suite-panel">
      <div className="suite-panel-heading">
        <div>
          <h2>Pendências</h2>
          <p>Itens publicados pelo GKIT Flex para acompanhamento individual.</p>
        </div>
      </div>
      {actions.length ? (
        <div className="suite-table-list">
          {actions.map((item) => (
            <article key={item.title}>
              <div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
              <span className={`suite-pill ${pillTone(item.status)}`}>{item.status}</span>
              <strong>{item.value}</strong>
              <small><Link href={item.href}>Abrir</Link></small>
            </article>
          ))}
        </div>
      ) : (
        <div className="suite-empty-block success">
          <strong>Tudo em dia</strong>
          <span>Nenhuma pendência financeira publicada para este colaborador.</span>
        </div>
      )}
    </section>
  )
}

export function ColabModuleMap({ data }: { data: ColabData }) {
  const modules = [
    {
      href: '/modulos/colab/perfil',
      status: data.collaborator ? 'sincronizado' : 'pendente',
      title: 'Perfil',
      description: data.collaborator ? `${data.collaborator.role} - ${data.collaborator.department}` : 'Cadastro pendente no GKIT Flex',
      value: data.collaborator?.status ?? '-',
    },
    {
      href: '/modulos/colab/pagamentos',
      status: data.summary.pendingPayments ? 'pendente' : 'sincronizado',
      title: 'Pagamentos',
      description: 'Demonstrativos vindos do GKIT Flex',
      value: String(data.payments.length),
    },
    {
      href: '/modulos/colab/comissoes',
      status: data.summary.openCommissions ? 'em_conferencia' : 'sincronizado',
      title: 'Comissões',
      description: 'Valores variáveis por competência',
      value: currency(data.summary.openCommissions + data.summary.paidCommissions),
    },
    {
      href: '/modulos/colab/beneficios',
      status: data.benefits.length ? 'ativo' : 'pendente',
      title: 'Benefícios',
      description: 'Benefícios cadastrados no GKIT Flex',
      value: String(data.benefits.length),
    },
    {
      href: '/modulos/colab/uber',
      status: data.summary.pendingUberExpenses ? 'pendente' : 'sincronizado',
      title: 'Uber',
      description: 'Reembolsos com cliente, descrição e recibo',
      value: String(data.uber.length),
    },
  ]

  return (
    <section className="suite-module-grid colab-module-grid">
      {modules.map((item) => (
        <Link className="suite-module-card" href={item.href} key={item.title}>
          <span className={`suite-pill ${pillTone(item.status)}`}>{item.status}</span>
          <h2>{item.title}</h2>
          <p>{item.description}</p>
          <strong>{item.value}</strong>
        </Link>
      ))}
    </section>
  )
}

export function ColabPayments({
  competenceFilter = 'todos',
  data,
  statusFilter = 'todos',
}: {
  competenceFilter?: string
  data: ColabData
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
    <section className="card suite-panel">
      <form action="/modulos/colab/pagamentos" className="colab-panel-filter">
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
      </form>
      <div className="suite-table-list colab-record-list">
        {payments.map((payment) => (
          <article key={payment.id}>
            <div>
              <h3>{payment.competence}</h3>
              <p>{payment.type} - {payment.description}</p>
            </div>
            <span className={`suite-pill ${pillTone(payment.status)}`}>{payment.status}</span>
            <strong className="colab-record-amount">{currency(payment.netAmount)}</strong>
            <small>
              Bruto {currency(payment.grossAmount)}
              {payment.discountAmount ? ` - Descontos ${currency(payment.discountAmount)}` : ''}
            </small>
          </article>
        ))}
        {!payments.length ? <EmptyBlock label={hasFilter ? 'Nenhum pagamento encontrado para o filtro.' : 'Nenhum pagamento encontrado.'} /> : null}
      </div>
    </section>
  )
}

export function ColabCommissions({ data }: { data: ColabData }) {
  return (
    <section className="card suite-panel">
      <div className="suite-panel-heading">
        <div>
          <h2>Comissões</h2>
          <p>Valores variáveis vinculados ao cadastro do colaborador.</p>
        </div>
      </div>
      <div className="suite-table-list colab-record-list">
        {data.commissions.map((commission) => (
          <article key={commission.id}>
            <div>
              <h3>{commission.reference}</h3>
              <p>{commission.client} - {commission.category}</p>
            </div>
            <span className={`suite-pill ${pillTone(commission.status)}`}>{commission.status}</span>
            <strong className="colab-record-amount">{currency(commission.amount)}</strong>
            <small>{commission.percentage}% sobre {currency(commission.baseAmount)}</small>
          </article>
        ))}
        {!data.commissions.length ? <EmptyBlock label="Nenhuma comissão encontrada." /> : null}
      </div>
    </section>
  )
}

export function ColabBenefits({ data }: { data: ColabData }) {
  return (
    <section className="suite-module-grid">
      {data.benefits.map((benefit) => (
        <article className="suite-module-card" key={benefit.id}>
          <span className={`suite-pill ${pillTone(benefit.status)}`}>{benefit.status}</span>
          <h2>{benefit.name}</h2>
          <p>{benefit.description}</p>
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
    { label: 'Admissao', value: new Date(collaborator.admissionDate).toLocaleDateString('pt-BR') },
    { label: 'Status', value: collaborator.status },
  ]

  return (
    <section className="card suite-panel">
      <div className="suite-panel-heading">
        <div>
          <h2>Dados profissionais</h2>
          <p>Informações sincronizadas a partir do cadastro administrativo.</p>
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
            <h2>Lançar despesa de Uber</h2>
            <p>Informe o cliente do Ciclo, descreva a corrida e anexe o recibo emitido pela Uber.</p>
          </div>
        </div>
        <form action={action} className="colab-uber-form">
          <label className="colab-uber-field colab-uber-field-client">
            <span>Cliente Ciclo</span>
            <select name="cliente_id" required>
              <option value="">Selecione</option>
              {data.clients.map((client) => (
                <option key={client.id} value={client.id}>{client.label}{client.meta ? ` - ${client.meta}` : ''}</option>
              ))}
            </select>
          </label>
          <label className="colab-uber-field">
            <span>Data</span>
            <input name="data_despesa" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </label>
          <label className="colab-uber-field">
            <span>Valor</span>
            <input name="valor" inputMode="decimal" placeholder="0,00" required />
          </label>
          <label className="colab-uber-field colab-uber-field-receipt">
            <span>Recibo Uber</span>
            <input name="recibo" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required />
          </label>
          <label className="colab-uber-field colab-uber-field-description">
            <span>Descrição</span>
            <textarea name="descricao" rows={3} placeholder="Ex.: ida ao cliente para assembleia / protocolo / reunião" required />
          </label>
          <div className="colab-uber-actions">
            <button className="button" type="submit">Enviar despesa</button>
          </div>
        </form>
      </section>

      <section className="card suite-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Meus lançamentos</h2>
            <p>Despesas enviadas para conferência e pedido de reembolso.</p>
          </div>
        </div>
        <div className="suite-table-list colab-record-list">
          {data.expenses.map((expense) => (
            <article key={expense.id}>
              <div>
                <h3>{expense.client}</h3>
                <p>{expense.description}</p>
              </div>
              <span className={`suite-pill ${pillTone(expense.status)}`}>{expense.status}</span>
              <strong className="colab-record-amount">{currency(expense.amount)}</strong>
              <small>
                {new Date(expense.date).toLocaleDateString('pt-BR')}
                {expense.receiptUrl ? <> · <a href={expense.receiptUrl}>Recibo</a></> : null}
              </small>
            </article>
          ))}
          {!data.expenses.length ? <EmptyBlock label="Nenhuma despesa de Uber lançada." /> : null}
        </div>
      </section>
    </>
  )
}

function EmptyBlock({ label }: { label: string }) {
  return <div className="suite-empty-block">{label}</div>
}
