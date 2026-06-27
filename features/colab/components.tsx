import Link from 'next/link'
import type { ReactNode } from 'react'
import type { ColabData } from '@/features/colab/types'
import { BrandLogo } from '@/features/shared/brand-logo'
import type { PlatformUsuario } from '@/lib/auth/platform'

type ColabTab = 'dashboard' | 'pagamentos' | 'comissoes' | 'beneficios' | 'documentos' | 'perfil'

const tabs: Array<{ id: ColabTab; href: string; label: string }> = [
  { id: 'dashboard', href: '/modulos/colab', label: 'Inicio' },
  { id: 'pagamentos', href: '/modulos/colab/pagamentos', label: 'Pagamentos' },
  { id: 'comissoes', href: '/modulos/colab/comissoes', label: 'Comissoes' },
  { id: 'beneficios', href: '/modulos/colab/beneficios', label: 'Beneficios' },
  { id: 'documentos', href: '/modulos/colab/documentos', label: 'Documentos' },
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

        <nav className="colab-mobile-dock" aria-label="Navegacao rapida do colaborador">
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
        <strong>Colaborador nao localizado</strong>
        <span>O acesso ao Colab esta liberado no Core, mas o e-mail do usuario ainda nao tem cadastro ativo no GKIT Flex.</span>
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
        <p className="metric-label">Ultimo pagamento</p>
        <p className="metric-value">{currency(data.summary.latestPayment)}</p>
        <p className="metric-hint">{data.payments[0]?.competence ?? 'Sem demonstrativo'}</p>
      </article>
      <article className="card metric-card">
        <p className="metric-label">Comissoes abertas</p>
        <p className="metric-value">{currency(data.summary.openCommissions)}</p>
        <p className="metric-hint">calculadas e em conferencia</p>
      </article>
      <article className="card metric-card">
        <p className="metric-label">Beneficios</p>
        <p className="metric-value">{String(data.benefits.length)}</p>
        <p className="metric-hint">ativos no cadastro</p>
      </article>
      <article className="card metric-card">
        <p className="metric-label">Documentos</p>
        <p className="metric-value">{String(data.documents.length)}</p>
        <p className="metric-hint">demonstrativos e resumos</p>
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
        <p className="metric-label">Comissoes aprovadas</p>
        <p className="metric-value">{currency(data.summary.approvedCommissions)}</p>
        <p className="metric-hint">aguardando pagamento</p>
      </article>
      <article className="card metric-card">
        <p className="metric-label">Comissoes pagas</p>
        <p className="metric-value">{currency(data.summary.paidCommissions)}</p>
        <p className="metric-hint">historico publicado</p>
      </article>
      <article className="card metric-card">
        <p className="metric-label">Pagamentos pendentes</p>
        <p className="metric-value">{String(data.summary.pendingPayments)}</p>
        <p className="metric-hint">previstos ou em processamento</p>
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
            <h2>Pendencias</h2>
          <p>Vinculo do colaborador no GKIT Flex.</p>
          </div>
        </div>
        <div className="suite-empty-block warning">
          <strong>Cadastro nao localizado</strong>
          <span>Seu acesso ao Colab esta ativo, mas o cadastro de colaborador ainda nao foi encontrado no GKIT Flex.</span>
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
          title: 'Comissoes em acompanhamento',
          value: currency(data.summary.openCommissions),
          detail: 'calculadas, em conferencia ou aprovadas',
        }
      : null,
    data.documents.filter((item) => item.status === 'disponivel').length
      ? {
          href: '/modulos/colab/documentos',
          status: 'disponivel',
          title: 'Documentos disponiveis',
          value: String(data.documents.filter((item) => item.status === 'disponivel').length),
          detail: 'demonstrativos e resumos publicados',
        }
      : null,
  ].filter(Boolean) as Array<{ detail: string; href: string; status: string; title: string; value: string }>

  return (
    <section className="card suite-panel">
      <div className="suite-panel-heading">
        <div>
          <h2>Pendencias</h2>
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
          <span>Nenhuma pendencia financeira publicada para este colaborador.</span>
        </div>
      )}
    </section>
  )
}

export function ColabModuleMap({ data }: { data: ColabData }) {
  const availableDocuments = data.documents.filter((item) => item.status === 'disponivel').length
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
      title: 'Comissoes',
      description: 'Valores variaveis por competencia',
      value: currency(data.summary.openCommissions + data.summary.paidCommissions),
    },
    {
      href: '/modulos/colab/beneficios',
      status: data.benefits.length ? 'ativo' : 'pendente',
      title: 'Beneficios',
      description: 'Beneficios cadastrados no GKIT Flex',
      value: String(data.benefits.length),
    },
    {
      href: '/modulos/colab/documentos',
      status: availableDocuments ? 'disponivel' : 'pendente',
      title: 'Documentos',
      description: 'Demonstrativos gerados por pagamentos e comissoes',
      value: String(data.documents.length),
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

export function ColabPayments({ data }: { data: ColabData }) {
  return (
    <section className="card suite-panel">
      <div className="suite-panel-heading">
        <div>
          <h2>Pagamentos</h2>
          <p>Demonstrativos financeiros derivados do GKIT Flex.</p>
        </div>
      </div>
      <div className="suite-table-list colab-record-list">
        {data.payments.map((payment) => (
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
        {!data.payments.length ? <EmptyBlock label="Nenhum pagamento encontrado." /> : null}
      </div>
    </section>
  )
}

export function ColabCommissions({ data }: { data: ColabData }) {
  return (
    <section className="card suite-panel">
      <div className="suite-panel-heading">
        <div>
          <h2>Comissoes</h2>
          <p>Valores variaveis vinculados ao cadastro do colaborador.</p>
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
        {!data.commissions.length ? <EmptyBlock label="Nenhuma comissao encontrada." /> : null}
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
      {!data.benefits.length ? <EmptyBlock label="Nenhum beneficio cadastrado no GKIT Flex." /> : null}
    </section>
  )
}

export function ColabDocuments({ data }: { data: ColabData }) {
  const available = data.documents.filter((item) => item.status === 'disponivel').length
  const pending = data.documents.filter((item) => item.status === 'pendente').length

  return (
    <>
      <section className="suite-kpi-grid compact">
        <article className="card metric-card">
          <p className="metric-label">Total</p>
          <p className="metric-value">{String(data.documents.length)}</p>
          <p className="metric-hint">documentos gerados</p>
        </article>
        <article className="card metric-card">
          <p className="metric-label">Disponiveis</p>
          <p className="metric-value">{String(available)}</p>
          <p className="metric-hint">prontos para consulta</p>
        </article>
        <article className="card metric-card">
          <p className="metric-label">Pendentes</p>
          <p className="metric-value">{String(pending)}</p>
          <p className="metric-hint">aguardando fechamento</p>
        </article>
      </section>

      <section className="card suite-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Documentos</h2>
            <p>Demonstrativos e resumos derivados de pagamentos e comissoes.</p>
          </div>
        </div>
        <div className="suite-table-list">
          {data.documents.map((document) => (
            <article key={document.id}>
              <div>
                <h3>{document.title}</h3>
                <p>{document.type} - {document.reference}</p>
              </div>
              <span className={`suite-pill ${pillTone(document.status)}`}>{document.status}</span>
              <strong>{new Date(document.updatedAt).toLocaleDateString('pt-BR')}</strong>
            </article>
          ))}
          {!data.documents.length ? <EmptyBlock label="Nenhum documento disponivel." /> : null}
        </div>
      </section>
    </>
  )
}

export function ColabProfileDetails({ data }: { data: ColabData }) {
  const collaborator = data.collaborator

  if (!collaborator) {
    return (
      <section className="suite-empty-card">
        <strong>Perfil nao localizado</strong>
        <span>O e-mail do usuario ainda nao tem cadastro ativo no GKIT Flex.</span>
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
          <p>Informacoes sincronizadas a partir do cadastro administrativo.</p>
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

function EmptyBlock({ label }: { label: string }) {
  return <div className="suite-empty-block">{label}</div>
}
