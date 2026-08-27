import Link from 'next/link'
import type { ReactNode } from 'react'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import { OperationalKpiGrid, OperationalQuickLinks, type OperationalQuickLink } from '@/features/shared/operational-ui'
import type { PlatformUsuario } from '@/lib/auth/platform'
import type {
  GkitAteAtendimentoDashboardData,
  GkitAteAtendimentoDetail,
  GkitAteDashboardData,
  GkitAteDashboardTab,
  GkitAteHealth,
  GkitAteListRow,
  GkitAteTarefa,
} from '@/features/gkit-ate/types'

type GkitAteTab = 'cockpit' | 'dashboard' | 'atendimentos' | 'tarefas' | 'importacoes' | 'cadastros'

const activeHref: Record<GkitAteTab, string> = {
  cockpit: '/modulos/gkit-ate',
  dashboard: '/modulos/gkit-ate/dashboard',
  atendimentos: '/modulos/gkit-ate/atendimentos',
  tarefas: '/modulos/gkit-ate/tarefas',
  importacoes: '/modulos/gkit-ate/importacoes',
  cadastros: '/modulos/gkit-ate/cadastros',
}

const navGroups: ModuleNavGroup[] = [
  { href: '/modulos/gkit-ate', title: 'Cockpit' },
  { href: '/modulos/gkit-ate/dashboard', title: 'Dashboard' },
  { href: '/modulos/gkit-ate/atendimentos', title: 'Atendimentos' },
  { href: '/modulos/gkit-ate/tarefas', title: 'Tarefas' },
  { href: '/modulos/gkit-ate/importacoes', title: 'Importações' },
  { href: '/modulos/gkit-ate/cadastros', title: 'Cadastros' },
]

export function GkitAteShell({
  active,
  actions,
  children,
  description,
  title,
  usuario,
}: {
  active: GkitAteTab
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
      brand="Atendimento"
      description={description}
      eyebrow="GKIT ATE"
      navGroups={navGroups}
      product="GKIT ATE"
      title={title}
      usuario={usuario}
      variantClassName={active === 'cockpit' ? 'gkit-ate-shell gkit-ate-cockpit-page' : 'gkit-ate-shell'}
    >
      {children}
    </ModuleShell>
  )
}

export function GkitAteSection({
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

export function GkitAteKpis({ data }: { data: GkitAteDashboardData }) {
  return <OperationalKpiGrid className="suite-kpi-grid compact gkit-ate-kpi-grid" items={data.cards} />
}

export function GkitAteSummaryCards({
  items,
}: {
  items: Array<{ label: string; value: number | string }>
}) {
  return (
    <section className="gkit-ate-dashboard-kpis gkit-ate-summary-cards">
      {items.map((item) => (
        <article key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </section>
  )
}

export function GkitAteQuickLinks({ items }: { items: OperationalQuickLink[] }) {
  return <OperationalQuickLinks classPrefix="gkit-ate" defaultLabel="Fluxo" items={items} />
}

function atendimentoDashboardTabLabel(tab: GkitAteDashboardTab) {
  if (tab === 'responsavel') return 'Responsável'
  if (tab === 'carteira') return 'Carteira'
  if (tab === 'tipo') return 'Tipo de atendimento'
  return 'Cliente'
}

function atendimentoDashboardHref(tab: GkitAteDashboardTab, filters: { dataDe?: string; dataAte?: string; status?: string }) {
  const params = new URLSearchParams()
  params.set('aba', tab)
  if (filters.dataDe) params.set('de', filters.dataDe)
  if (filters.dataAte) params.set('ate', filters.dataAte)
  if (filters.status) params.set('status', filters.status)
  return `/modulos/gkit-ate/dashboard?${params.toString()}`
}

export function GkitAteAtendimentoDashboard({
  activeTab,
  data,
  filters,
}: {
  activeTab: GkitAteDashboardTab
  data: GkitAteAtendimentoDashboardData
  filters: { dataDe?: string; dataAte?: string; status?: string }
}) {
  const groups = data.groups[activeTab] ?? []
  const topGroups = groups.slice(0, 10)
  const maxGroup = Math.max(...topGroups.map((item) => item.total), 1)
  const maxMonth = Math.max(...data.months.map((item) => item.total), 1)
  const hasFilters = Boolean(filters.dataDe || filters.dataAte || filters.status)

  if (!data.databaseReady) {
    return <GkitAteHealthNotice health={data.health} />
  }

  return (
    <div className="gkit-ate-dashboard">
      <form className="gkit-ate-dashboard-filters" method="get">
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
        {hasFilters ? <Link className="button secondary" href="/modulos/gkit-ate/dashboard">Limpar</Link> : null}
      </form>

      <section className="gkit-ate-dashboard-kpis">
        <article>
          <span>Total</span>
          <strong>{data.kpis.total}</strong>
        </article>
        <article>
          <span>Abertos</span>
          <strong>{data.kpis.abertos}</strong>
        </article>
        <article>
          <span>Encerrados</span>
          <strong>{data.kpis.encerrados}</strong>
        </article>
        <article>
          <span>Clientes</span>
          <strong>{data.kpis.clientes}</strong>
        </article>
        <article>
          <span>Responsáveis</span>
          <strong>{data.kpis.responsaveis}</strong>
        </article>
        <article>
          <span>Tipos</span>
          <strong>{data.kpis.tipos}</strong>
        </article>
      </section>

      <nav className="suite-tabs gkit-ate-dashboard-tabs" aria-label="Visões de atendimento">
        {(['cliente', 'responsavel', 'carteira', 'tipo'] as GkitAteDashboardTab[]).map((tab) => (
          <Link className={activeTab === tab ? 'active' : ''} href={atendimentoDashboardHref(tab, filters)} key={tab}>
            {atendimentoDashboardTabLabel(tab)}
          </Link>
        ))}
      </nav>

      <section className="gkit-ate-dashboard-grid">
        <article className="gkit-ate-dashboard-panel">
          <div className="gkit-ate-panel-heading">
            <div>
              <h2>Top 10 por {atendimentoDashboardTabLabel(activeTab).toLowerCase()}</h2>
              <p>Volume, abertos e encerrados dentro do filtro atual.</p>
            </div>
          </div>
          <div className="gkit-ate-dashboard-ranking">
            {topGroups.map((item) => (
              <div key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.abertos} abertos - {item.encerrados} encerrados</span>
                </div>
                <div className="gkit-ate-dashboard-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(6, Math.round((item.total / maxGroup) * 100))}%` }} />
                </div>
                <b>{item.total}</b>
              </div>
            ))}
          </div>
        </article>

        <article className="gkit-ate-dashboard-panel">
          <div className="gkit-ate-panel-heading">
            <div>
              <h2>Mês a mês</h2>
              <p>Atendimentos por data de criação.</p>
            </div>
          </div>
          <div className="gkit-ate-dashboard-months">
            {data.months.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <div className="gkit-ate-dashboard-column" title={`${item.total} atendimentos`}>
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

export type GkitAteFilterField = {
  label: string
  name: string
  options?: Array<{ label: string; value: string }>
  placeholder?: string
  type?: 'search' | 'select'
  value: string
}

export function GkitAteFilterBar({
  fields,
  hasFilters = false,
  hiddenFields = [],
  resetHref,
  sort,
}: {
  fields: GkitAteFilterField[]
  hasFilters?: boolean
  hiddenFields?: Array<{ name: string; value: string }>
  resetHref: string
  sort: { dir: 'asc' | 'desc'; options: Array<{ label: string; value: string }>; value: string }
}) {
  return (
    <form className="gkit-ate-filter-bar" method="get">
      {hiddenFields.map((field) => (
        <input key={field.name} name={field.name} type="hidden" value={field.value} />
      ))}

      <div className="gkit-ate-filter-fields">
        {fields.map((field) => (
          <label key={field.name}>
            <span>{field.label}</span>
            {field.type === 'select' ? (
              <select name={field.name} defaultValue={field.value}>
                <option value="">{field.placeholder ?? 'Todos'}</option>
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            ) : (
              <input name={field.name} placeholder={field.placeholder ?? 'Buscar'} type="search" defaultValue={field.value} />
            )}
          </label>
        ))}

        <label>
          <span>Ordenar por</span>
          <select name="sort" defaultValue={sort.value}>
            {sort.options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Direção</span>
          <select name="dir" defaultValue={sort.dir}>
            <option value="asc">Crescente</option>
            <option value="desc">Decrescente</option>
          </select>
        </label>
      </div>

      <div className="gkit-ate-filter-actions">
        <button className="button" type="submit">Filtrar</button>
        {hasFilters ? <Link className="button secondary" href={resetHref}>Limpar</Link> : null}
      </div>
    </form>
  )
}

export function GkitAteTabs({
  items,
}: {
  items: Array<{ active: boolean; count: number; href: string; label: string }>
}) {
  return (
    <nav aria-label="Cadastros do ATE" className="gkit-ate-tabs">
      {items.map((item) => (
        <Link aria-current={item.active ? 'page' : undefined} className={item.active ? 'active' : ''} href={item.href} key={item.href}>
          <span>{item.label}</span>
          <small>{item.count}</small>
        </Link>
      ))}
    </nav>
  )
}

function GkitAteRowContent({ row }: { row: GkitAteListRow }) {
  return (
    <>
      <div>
        <h3>{row.title}</h3>
        <p>{row.subtitle}</p>
      </div>
      <span className={`suite-pill ${row.tone ?? 'primary'}`}>{row.status}</span>
      <strong>{row.value}</strong>
      <small>{row.meta}</small>
    </>
  )
}

function GkitAteRow({ row }: { row: GkitAteListRow }) {
  return row.detailHref ? (
    <Link className="suite-row-link" href={row.detailHref} role="listitem">
      <GkitAteRowContent row={row} />
    </Link>
  ) : (
    <article role="listitem">
      <GkitAteRowContent row={row} />
    </article>
  )
}

export function GkitAteList({
  empty,
  rows,
}: {
  empty: string
  rows: GkitAteListRow[]
}) {
  if (!rows.length) return <div className="suite-empty-block">{empty}</div>

  return (
    <div className="suite-table-list compact" role="list">
      {rows.map((row) => <GkitAteRow key={row.id} row={row} />)}
    </div>
  )
}

export function GkitAteGroupedList({
  empty,
  hrefForPage,
  itemLabel = 'item(ns)',
  page,
  rows,
}: {
  empty: string
  hrefForPage: (page: number) => string
  itemLabel?: string
  page: number
  rows: GkitAteListRow[]
}) {
  const groups = [...rows.reduce((acc, row) => {
    const label = row.group || 'Sem cliente'
    acc.set(label, [...(acc.get(label) ?? []), row])
    return acc
  }, new Map<string, GkitAteListRow[]>())]
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([label, items]) => ({ label, items }))
  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(groups.length / pageSize))
  const currentPage = Math.min(Math.max(page, 1), totalPages)
  const visibleGroups = groups.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  if (!groups.length) return <div className="suite-empty-block">{empty}</div>

  const pagination = totalPages > 1 ? (
    <div className="gkit-ate-group-pagination">
      <span>Página {currentPage} de {totalPages}</span>
      <div>
        <Link aria-disabled={currentPage === 1} className="button secondary" href={hrefForPage(Math.max(1, currentPage - 1))}>Anterior</Link>
        <Link aria-disabled={currentPage === totalPages} className="button secondary" href={hrefForPage(Math.min(totalPages, currentPage + 1))}>Próxima</Link>
      </div>
    </div>
  ) : null

  return (
    <div className="gkit-ate-grouped-list">
      {pagination}
      {visibleGroups.map((group) => (
        <details className="gkit-ate-client-group" key={group.label}>
          <summary>
            <span aria-hidden="true">+</span>
            <strong>{group.label}</strong>
            <small>{group.items.length} {itemLabel}</small>
          </summary>
          <div className="suite-table-list compact" role="list" aria-label={`${group.label} - ${group.items.length} ${itemLabel}`}>
            {group.items.map((row) => <GkitAteRow key={row.id} row={row} />)}
          </div>
        </details>
      ))}
      {pagination}
    </div>
  )
}

export function GkitAteHealthNotice({ health }: { health?: GkitAteHealth }) {
  if (!health || health.ok) return null

  return (
    <div className="suite-empty-block danger">
      <strong>{health.title}</strong>
      <span>{health.message}</span>
      {health.detail ? <small>{health.detail}</small> : null}
    </div>
  )
}

const ateDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
  year: 'numeric',
})

function formatAteDate(value: string | null | undefined) {
  const raw = value?.trim()
  if (!raw) return null

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  if (date.getUTCFullYear() < 1990) return 'Data inconsistente'

  return ateDateFormatter.format(date)
}

function formatAteStatus(value: string | null | undefined) {
  const raw = value?.trim()
  if (!raw) return 'Sem status'

  return raw
    .replace(/_/g, ' ')
    .split(' ')
    .map((part) => (part ? `${part.charAt(0).toLocaleUpperCase('pt-BR')}${part.slice(1)}` : part))
    .join(' ')
}

function InfoGrid({ items }: { items: Array<{ label: string; value: string | null | undefined }> }) {
  const visible = items.filter((item) => item.value)
  if (!visible.length) return null

  return (
    <div className="gkit-ate-detail-grid">
      {visible.map((item) => (
        <article className="gkit-ate-detail-field" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  )
}

export function GkitAteAtendimentoDetailView({
  action,
  atendimento,
  canWrite,
}: {
  action: (formData: FormData) => Promise<void>
  atendimento: GkitAteAtendimentoDetail
  canWrite?: boolean
}) {
  const tarefasTotal = atendimento.tarefas.length
  const tarefasPendentes = atendimento.tarefas.filter((tarefa) => tarefa.status !== 'concluida' && tarefa.status !== 'cancelada').length
  const statusTone = atendimento.status === 'encerrado' ? 'success' : 'warning'
  const statusLabel = formatAteStatus(atendimento.status)

  return (
    <div className="gkit-ate-detail-layout">
      <section className="card module-form module-form-wide gkit-ate-detail-card">
        <div className="gkit-ate-detail-head">
          <div>
            <span>Registro importado</span>
            <h2>{atendimento.titulo}</h2>
            <p>{atendimento.cliente_nome}</p>
          </div>
          <div className="gkit-ate-detail-actions">
            <span className={`suite-pill ${statusTone}`}>{statusLabel}</span>
            {atendimento.url_processo ? <a className="button secondary" href={atendimento.url_processo} target="_blank" rel="noreferrer">Abrir no ASTREA</a> : null}
          </div>
        </div>

        <InfoGrid
          items={[
            { label: 'Código ATE', value: atendimento.codigo_publico },
            { label: 'Código ASTREA', value: atendimento.astrea_codigo },
            { label: 'Tipo', value: atendimento.tipo },
            { label: 'Responsável', value: atendimento.responsavel },
            { label: 'Criação', value: formatAteDate(atendimento.data_criacao) },
            { label: 'Prazo', value: formatAteDate(atendimento.prazo_finalizacao) },
            { label: 'Último histórico', value: formatAteDate(atendimento.data_ultimo_historico) },
            { label: 'Encerramento', value: formatAteDate(atendimento.data_encerramento) },
            { label: 'Acesso', value: atendimento.acesso },
          ]}
        />

        <div className="gkit-ate-detail-story">
          <span>Objeto e histórico</span>
          <strong>{atendimento.objeto ?? 'Objeto não informado'}</strong>
          <p>{atendimento.ultimo_historico ?? atendimento.observacoes ?? 'Sem histórico textual no arquivo importado.'}</p>
        </div>

        <InfoGrid
          items={[
            { label: 'Outros envolvidos', value: atendimento.outros_envolvidos },
            { label: 'Materia', value: atendimento.materia },
            { label: 'Foro', value: atendimento.foro },
            { label: 'Vara', value: atendimento.vara },
            { label: 'Instancia atual', value: atendimento.instancia_atual },
            { label: 'Resultado', value: atendimento.resultado_processo },
          ]}
        />
      </section>

      <section className="card module-form module-form-wide gkit-ate-detail-card">
        <div className="suite-panel-heading">
          <div>
            <h2>Tarefas vinculadas</h2>
            <p>{tarefasTotal} no total, {tarefasPendentes} em aberto.</p>
          </div>
        </div>

        <GkitAteList
          empty="Nenhuma tarefa vinculada a este atendimento."
          rows={atendimento.tarefas.map((tarefa) => ({
            id: tarefa.id,
            title: tarefa.descricao,
            subtitle: `${tarefa.tipo_nome ?? 'Tarefa'} - ${tarefa.responsavel ?? 'Sem responsável'}`,
            status: formatAteStatus(tarefa.status),
            value: formatAteDate(tarefa.data_prevista) ?? 'Sem prazo',
            meta: tarefa.origem,
            detailHref: `/modulos/gkit-ate/tarefas/${tarefa.id}`,
            tone: tarefa.status === 'concluida' ? 'success' : tarefa.status === 'cancelada' ? 'danger' : 'warning',
          }))}
        />

        {canWrite ? (
          <form action={action} className="gkit-ate-task-form">
            <input type="hidden" name="atendimento_id" value={atendimento.id} />
            <div className="gkit-ate-task-form-heading">
              <span>Nova tarefa</span>
              <p>Inclua a próxima ação operacional vinculada a este atendimento.</p>
            </div>
            <label className="gkit-ate-task-description">
              <span>Descrição</span>
              <input name="descricao" placeholder="Ex.: Revisar minuta enviada pelo cliente" required />
            </label>
            <div className="gkit-ate-task-fields">
              <label>
                <span>Tipo de tarefa</span>
                <input name="tipo_tarefa" placeholder="Ex.: Analisar contrato" />
              </label>
              <label>
                <span>Responsável</span>
                <input name="responsavel" defaultValue={atendimento.responsavel ?? ''} />
              </label>
              <label>
                <span>Data prevista</span>
                <input name="data_prevista" type="date" />
              </label>
            </div>
            <div className="gkit-ate-task-actions">
              <button className="button" type="submit">Adicionar tarefa</button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  )
}

export function GkitAteTarefaDetail({
  action,
  canWrite,
  tarefa,
}: {
  action: (formData: FormData) => Promise<void>
  canWrite?: boolean
  tarefa: GkitAteTarefa
}) {
  const isOpenTask = tarefa.status === 'pendente' || tarefa.status === 'em_andamento'
  const isLastOpenTask = tarefa.atendimento_status === 'aberto' && isOpenTask && tarefa.outras_tarefas_abertas === 0
  const statusLabel = formatAteStatus(tarefa.status)
  const statusTone = tarefa.status === 'concluida' ? 'success' : tarefa.status === 'cancelada' ? 'danger' : 'warning'

  return (
    <section className="card module-form gkit-ate-detail-card gkit-ate-task-detail-card">
      <div className="gkit-ate-detail-head">
        <div>
          <span>Tarefa vinculada</span>
          <h2>{tarefa.descricao}</h2>
          <p>{tarefa.cliente_nome} - {tarefa.atendimento_titulo}</p>
        </div>
        <div className="gkit-ate-detail-actions">
          <span className={`suite-pill ${statusTone}`}>{statusLabel}</span>
        </div>
      </div>

      <InfoGrid
        items={[
          { label: 'Tipo', value: tarefa.tipo_nome },
          { label: 'Responsável', value: tarefa.responsavel },
          { label: 'Prazo', value: formatAteDate(tarefa.data_prevista) ?? 'Sem prazo' },
          { label: 'Conclusão', value: formatAteDate(tarefa.data_conclusao) },
          { label: 'Origem', value: tarefa.origem },
          { label: 'Outras abertas', value: isOpenTask ? String(tarefa.outras_tarefas_abertas) : null },
        ]}
      />

      <div className="suite-table-list compact gkit-ate-task-context">
        <Link className="suite-row-link" href={`/modulos/gkit-ate/atendimentos/${tarefa.atendimento_id}`}>
          <div>
            <h3>{tarefa.atendimento_titulo}</h3>
            <p>{tarefa.cliente_nome}</p>
          </div>
          <span className={`suite-pill ${tarefa.atendimento_status === 'encerrado' ? 'success' : 'warning'}`}>{formatAteStatus(tarefa.atendimento_status)}</span>
          <strong>Ver atendimento</strong>
          <small>{tarefa.origem}</small>
        </Link>
      </div>

      {canWrite && isOpenTask && isLastOpenTask ? (
        <div className="suite-empty-block warning">
          <strong>Última tarefa aberta deste atendimento</strong>
          <span>Para concluir, escolha se o atendimento deve ser encerrado ou se uma nova tarefa deve ser aberta.</span>
        </div>
      ) : null}

      <div className="form-actions gkit-ate-task-command-row">
        {canWrite && isOpenTask && !isLastOpenTask ? (
          <form action={action}>
            <input type="hidden" name="id" value={tarefa.id} />
            <button className="button" type="submit">Concluir tarefa</button>
          </form>
        ) : null}
        {canWrite && isLastOpenTask ? (
          <form action={action}>
            <input type="hidden" name="id" value={tarefa.id} />
            <input type="hidden" name="resolucao" value="encerrar_atendimento" />
            <button className="button" type="submit">Concluir e encerrar atendimento</button>
          </form>
        ) : null}
        <Link className="button secondary" href="/modulos/gkit-ate/tarefas">Voltar</Link>
      </div>

      {canWrite && isLastOpenTask ? (
        <form action={action} className="gkit-ate-task-form">
          <input type="hidden" name="id" value={tarefa.id} />
          <input type="hidden" name="resolucao" value="adicionar_tarefa" />
          <div className="gkit-ate-task-form-heading">
            <span>Nova tarefa</span>
            <p>Conclua a atual e deixe a próxima tarefa aberta para manter o atendimento ativo.</p>
          </div>
          <label className="gkit-ate-task-description">
            <span>Descrição da nova tarefa</span>
            <input name="nova_descricao" placeholder="Ex.: Elaborar parecer" required />
          </label>
          <div className="gkit-ate-task-fields">
            <label>
              <span>Tipo da nova tarefa</span>
              <input name="novo_tipo_tarefa" placeholder="Ex.: Elaborar parecer" />
            </label>
            <label>
              <span>Responsável</span>
              <input name="novo_responsavel" defaultValue={tarefa.responsavel ?? ''} />
            </label>
            <label>
              <span>Prazo</span>
              <input name="nova_data_prevista" type="date" />
            </label>
          </div>
          <div className="gkit-ate-task-actions">
            <button className="button secondary" type="submit">Concluir e adicionar tarefa</button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
