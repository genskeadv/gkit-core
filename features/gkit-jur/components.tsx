import Link from 'next/link'
import type { ReactNode } from 'react'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import type { PlatformUsuario } from '@/lib/auth/platform'
import {
  gkitJurDocumentoTipoOptions,
  gkitJurEventoTipoOptions,
  gkitJurMonitoramentoOptions,
  gkitJurStatusOptions,
  gkitJurTarefaPrioridadeOptions,
  gkitJurTarefaStatusOptions,
  gkitJurTarefaTipoOptions,
} from './queries'
import type {
  GkitJurAgenteData,
  GkitJurAuditoriaData,
  GkitJurDashboardMetrics,
  GkitJurDocumento,
  GkitJurFormData,
  GkitJurInboxData,
  GkitJurInboxFilaId,
  GkitJurInboxItem,
  GkitJurInboxPrioridade,
  GkitJurIntegracaoData,
  GkitJurMovimentacoesData,
  GkitJurPendenciasData,
  GkitJurProcessDetailData,
  GkitJurProcessFilters,
  GkitJurProcessListData,
  GkitJurProcessListItem,
  GkitJurSaneamentoSuggestion,
  GkitJurSelectOption,
  GkitJurTarefa,
  GkitJurTimelineItem,
} from './types'

type GkitJurTab = 'inbox' | 'processos' | 'pendencias' | 'movimentacoes' | 'agente' | 'cadastros' | 'auditoria' | 'configuracoes'

const activeHref: Record<GkitJurTab, string> = {
  inbox: '/modulos/gkit-jur/inbox',
  processos: '/modulos/gkit-jur/processos',
  pendencias: '/modulos/gkit-jur/pendencias',
  movimentacoes: '/modulos/gkit-jur/movimentacoes',
  agente: '/modulos/gkit-jur/agente',
  cadastros: '/modulos/gkit-jur/cadastros',
  auditoria: '/modulos/gkit-jur/auditoria',
  configuracoes: '/modulos/gkit-jur/configuracoes',
}

const navGroups: ModuleNavGroup[] = [
  { href: '/modulos/gkit-jur/inbox', title: 'Inbox' },
  { href: '/modulos/gkit-jur/processos', title: 'Processos' },
  { href: '/modulos/gkit-jur/movimentacoes', title: 'Movimentacoes' },
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
  const settingsButton = <Link className="button secondary gkit-jur-settings-button" href="/modulos/gkit-jur/configuracoes">Configuracoes</Link>

  return (
    <ModuleShell
      activeHref={activeHref[active]}
      actions={actions ? <>{settingsButton}{actions}</> : settingsButton}
      brand="Juridico"
      description={description}
      eyebrow="GKIT Jur"
      navGroups={navGroups}
      product="GKIT Jur"
      title={title}
      usuario={usuario}
      variantClassName="gkit-new-shell gkit-jur-shell"
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
  id,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  className?: string
  description?: string
  id?: string
  title: string
}) {
  return (
    <section className={className ? `suite-panel ${className}` : 'suite-panel'} id={id}>
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

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('pt-BR')
}

function formatDateTimeLocal(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function statusLabel(value: string) {
  return value.replace(/_/g, ' ')
}

function ProcessStatusBadge({ status }: { status: string }) {
  const tone = status === 'ativo' || status === 'monitorando' ? 'ok' : status === 'erro' ? 'danger' : 'warn'
  return <span className={`status-badge ${tone}`}>{statusLabel(status)}</span>
}

function MetricCards({ metrics }: { metrics: GkitJurDashboardMetrics }) {
  return (
    <section className="suite-kpi-grid compact">
      <article className="metric-card">
        <span className="metric-label">Ativos</span>
        <strong className="metric-value">{metrics.processosAtivos}</strong>
        <span className="metric-hint">em acompanhamento</span>
      </article>
      <article className="metric-card">
        <span className="metric-label">Sem cliente</span>
        <strong className="metric-value">{metrics.semCliente}</strong>
        <span className="metric-hint">vinculo Ciclo pendente</span>
      </article>
      <article className="metric-card">
        <span className="metric-label">Sem carteira</span>
        <strong className="metric-value">{metrics.semCarteira}</strong>
        <span className="metric-hint">triagem operacional</span>
      </article>
      <article className="metric-card">
        <span className="metric-label">Sem responsavel</span>
        <strong className="metric-value">{metrics.semResponsavel}</strong>
        <span className="metric-hint">dono do caso</span>
      </article>
    </section>
  )
}

function priorityTone(priority: GkitJurInboxPrioridade) {
  if (priority === 'critica') return 'danger'
  if (priority === 'alta') return 'warning'
  if (priority === 'media') return 'primary'
  return 'muted'
}

function InboxItemCard({
  canWrite,
  formData,
  item,
  index,
  planejamentoAction,
  returnTo,
  statusAction,
}: {
  canWrite: boolean
  formData: GkitJurFormData
  item: GkitJurInboxItem
  index: number
  planejamentoAction: (formData: FormData) => Promise<void>
  returnTo: string
  statusAction: (formData: FormData) => Promise<void>
}) {
  const isTask = item.tipo === 'tarefa' && item.entidadeId && item.processoId

  return (
    <article className={isTask ? 'gkit-jur-inbox-item actionable' : 'gkit-jur-inbox-item'}>
      <span className="gkit-jur-inbox-rank">{index + 1}</span>
      <Link className="gkit-jur-inbox-content" href={item.acaoUrl}>
        <div className="gkit-jur-inbox-item-head">
          <span className={`suite-pill ${priorityTone(item.prioridade)}`}>{item.prioridade}</span>
          <span>{item.origem}</span>
          <small>{statusLabel(item.status)}</small>
        </div>
        <h3>{item.titulo}</h3>
        <p>{item.subtitulo}</p>
        <small>{item.motivo}</small>
      </Link>
      <Link className="gkit-jur-inbox-meta" href={item.acaoUrl}>
        <strong>{item.acaoLabel}</strong>
        <span>{item.responsavelNome || item.carteiraNome || 'Sem dono definido'}</span>
        <small>{formatDate(item.dataReferencia)}</small>
        <div className="gkit-jur-score" aria-label={`Score ${item.score}`}>
          <span style={{ width: `${Math.min(100, Math.max(0, item.score))}%` }} />
        </div>
      </Link>
      {isTask && canWrite ? (
        <div className="gkit-jur-inbox-actions">
          <div className="gkit-jur-inbox-action-buttons">
            {item.status === 'aberta' ? (
              <form action={statusAction}>
                <input name="tarefa_id" type="hidden" value={item.entidadeId ?? ''} />
                <input name="processo_id" type="hidden" value={item.processoId ?? ''} />
                <input name="status" type="hidden" value="em_andamento" />
                <input name="return_to" type="hidden" value={returnTo} />
                <button className="button secondary" type="submit">Iniciar</button>
              </form>
            ) : null}
            <form action={statusAction}>
              <input name="tarefa_id" type="hidden" value={item.entidadeId ?? ''} />
              <input name="processo_id" type="hidden" value={item.processoId ?? ''} />
              <input name="status" type="hidden" value="concluida" />
              <input name="return_to" type="hidden" value={returnTo} />
              <button className="button primary-button" type="submit">Concluir</button>
            </form>
          </div>
          <details>
            <summary>Remarcar / delegar</summary>
            <form action={planejamentoAction} className="gkit-jur-inbox-plan-form">
              <input name="tarefa_id" type="hidden" value={item.entidadeId ?? ''} />
              <input name="processo_id" type="hidden" value={item.processoId ?? ''} />
              <input name="return_to" type="hidden" value={returnTo} />
              <label>
                <span>Prazo</span>
                <input name="prazo_at" type="datetime-local" defaultValue={formatDateTimeLocal(item.prazoAt)} />
              </label>
              <label>
                <span>Responsavel</span>
                <select name="responsavel_id" defaultValue={item.responsavelId ?? ''}>
                  {optionList(formData.responsaveis, item.responsavelNome || 'Herdar do processo')}
                </select>
              </label>
              <label>
                <span>Prioridade</span>
                <select name="prioridade" defaultValue={item.prioridade}>
                  {gkitJurTarefaPrioridadeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <button className="button secondary" type="submit">Salvar</button>
            </form>
          </details>
        </div>
      ) : null}
    </article>
  )
}

function inboxHref(data: GkitJurInboxData, fila: GkitJurInboxFilaId) {
  const params = new URLSearchParams()
  if (fila !== 'hoje') params.set('fila', fila)
  if (data.filters.carteiraId) params.set('carteira_id', data.filters.carteiraId)
  if (data.filters.responsavelId) params.set('responsavel_id', data.filters.responsavelId)
  const query = params.toString()
  return query ? `/modulos/gkit-jur/inbox?${query}` : '/modulos/gkit-jur/inbox'
}

export function GkitJurInboxPage({
  canWrite,
  data,
  planejamentoAction,
  returnTo,
  statusAction,
}: {
  canWrite: boolean
  data: GkitJurInboxData
  planejamentoAction: (formData: FormData) => Promise<void>
  returnTo: string
  statusAction: (formData: FormData) => Promise<void>
}) {
  return (
    <>
      <section className="suite-kpi-grid compact">
        <article className="metric-card">
          <span className="metric-label">Fila do dia</span>
          <strong className="metric-value">{data.metrics.hoje}</strong>
          <span className="metric-hint">itens acionaveis</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Criticos</span>
          <strong className="metric-value">{data.metrics.criticos}</strong>
          <span className="metric-hint">risco ou bloqueio</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Tarefas</span>
          <strong className="metric-value">{data.metrics.prazos}</strong>
          <span className="metric-hint">providencias abertas</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Pendencias</span>
          <strong className="metric-value">{data.metrics.pendencias}</strong>
          <span className="metric-hint">travas abertas</span>
        </article>
      </section>

      <section className="gkit-jur-inbox-layout">
        <aside className="suite-panel gkit-jur-inbox-queues">
          <div className="suite-panel-heading">
            <div>
              <h2>Filas inteligentes</h2>
              <p>Escolha o recorte operacional.</p>
            </div>
          </div>
          <nav>
            {data.filas.map((fila) => (
              <Link className={fila.id === data.selected ? 'active' : ''} href={inboxHref(data, fila.id)} key={fila.id}>
                <span>
                  <strong>{fila.title}</strong>
                  <small>{fila.description}</small>
                </span>
                <em>{fila.count}</em>
              </Link>
            ))}
          </nav>
        </aside>

        <GkitJurSection
          className="gkit-jur-inbox-main"
          title="Caixa de entrada"
          description="Itens priorizados por risco, pendencia, ausencia de dono e automacao."
        >
          <form className="gkit-jur-inbox-filter" method="get">
            {data.selected !== 'hoje' ? <input name="fila" type="hidden" value={data.selected} /> : null}
            <Field label="Carteira">
              <select name="carteira_id" defaultValue={data.filters.carteiraId}>
                {optionList(data.filterOptions.carteiras, 'Todas as carteiras')}
              </select>
            </Field>
            <Field label="Responsavel">
              <select name="responsavel_id" defaultValue={data.filters.responsavelId}>
                {optionList(data.filterOptions.responsaveis, 'Todos os responsaveis')}
              </select>
            </Field>
            <div className="gkit-jur-inbox-filter-actions">
              <button className="button secondary" type="submit">Filtrar</button>
              <Link className="button secondary" href={inboxHref({ ...data, filters: { carteiraId: '', responsavelId: '' } }, data.selected)}>Limpar</Link>
            </div>
          </form>
          {data.items.length ? (
            <div className="gkit-jur-inbox-list" role="list">
              {data.items.map((item, index) => (
                <InboxItemCard
                  canWrite={canWrite}
                  formData={{
                    carteiras: data.filterOptions.carteiras,
                    clientes: [],
                    responsaveis: data.filterOptions.responsaveis,
                  }}
                  index={index}
                  item={item}
                  key={item.id}
                  planejamentoAction={planejamentoAction}
                  returnTo={returnTo}
                  statusAction={statusAction}
                />
              ))}
            </div>
          ) : (
            <div className="suite-empty-block success">Nenhum item nesta fila agora.</div>
          )}
        </GkitJurSection>
      </section>

      <aside className="suite-panel gkit-jur-inbox-copilot-popup">
        <div className="suite-panel-heading">
          <div>
            <h2>Agente auxiliar</h2>
            <p>Melhores proximas acoes.</p>
          </div>
        </div>
        <div className="gkit-jur-agent-carousel">
          {data.proximasAcoes.map((action, index) => (
            <input
              defaultChecked={index === 0}
              id={`gkit-jur-agent-action-${index}`}
              key={`control-${action.title}`}
              name="gkit-jur-agent-action"
              type="radio"
            />
          ))}
          <div className="gkit-jur-next-actions">
            {data.proximasAcoes.map((action, index) => {
              const total = data.proximasAcoes.length
              const previous = index === 0 ? total - 1 : index - 1
              const next = index === total - 1 ? 0 : index + 1

              return (
                <article className={`gkit-jur-agent-slide slide-${index}`} key={action.title}>
                  <Link className="gkit-jur-agent-action-card" href={action.href}>
                    <div className="gkit-jur-agent-action-head">
                      <span className={`suite-pill ${priorityTone(action.priority)}`}>{action.count}</span>
                      <small>{index + 1}/{total}</small>
                    </div>
                    <strong>{action.title}</strong>
                    <p>{action.description}</p>
                    <small>{action.label}</small>
                  </Link>
                  {total > 1 ? (
                    <div className="gkit-jur-agent-carousel-controls">
                      <label htmlFor={`gkit-jur-agent-action-${previous}`}>Anterior</label>
                      <span>{index + 1}/{total}</span>
                      <label htmlFor={`gkit-jur-agent-action-${next}`}>Proximo</label>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </div>
      </aside>
    </>
  )
}

function filterHref(filters: GkitJurProcessFilters, page: number) {
  const params = new URLSearchParams()
  Object.entries({ ...filters, page }).forEach(([key, value]) => {
    if (key === 'page') {
      if (Number(value) > 1) params.set(key, String(value))
      return
    }
    if (value) params.set(key, String(value))
  })
  const query = params.toString()
  return query ? `/modulos/gkit-jur/processos?${query}` : '/modulos/gkit-jur/processos'
}

function SelectField({
  label,
  name,
  options,
  placeholder,
  value,
}: {
  label: string
  name: string
  options: GkitJurSelectOption[]
  placeholder: string
  value: string
}) {
  return (
    <label>
      <span>{label}</span>
      <select name={name} defaultValue={value}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function GkitJurFilterBar({ data }: { data: GkitJurProcessListData }) {
  const { filterOptions, filters, pagination } = data

  return (
    <form className="gkit-jur-filter-bar" method="get">
      <div className="gkit-jur-filter-fields">
        <label>
          <span>Busca</span>
          <input defaultValue={filters.q} name="q" placeholder="CNJ, cliente, pasta, titulo ou classe" type="search" />
        </label>
        <SelectField
          label="Status"
          name="status"
          options={gkitJurStatusOptions}
          placeholder="Ativos"
          value={filters.status}
        />
        <SelectField
          label="Carteira"
          name="carteira_id"
          options={filterOptions.carteiras}
          placeholder="Todas"
          value={filters.carteiraId}
        />
        <SelectField
          label="Responsavel"
          name="responsavel_id"
          options={filterOptions.responsaveis}
          placeholder="Todos"
          value={filters.responsavelId}
        />
        <SelectField
          label="Tribunal"
          name="tribunal"
          options={filterOptions.tribunais}
          placeholder="Todos"
          value={filters.tribunal}
        />
        <SelectField
          label="Monitoramento"
          name="monitoramento"
          options={gkitJurMonitoramentoOptions}
          placeholder="Todos"
          value={filters.monitoramento}
        />
        <SelectField
          label="Pendencia"
          name="saneamento"
          options={[
            { label: 'Sem cliente', value: 'sem_cliente' },
            { label: 'Sem carteira', value: 'sem_carteira' },
            { label: 'Sem responsavel', value: 'sem_responsavel' },
            { label: 'Sem tribunal', value: 'sem_tribunal' },
          ]}
          placeholder="Todas"
          value={filters.saneamento}
        />
        <SelectField
          label="Ordenar"
          name="sort"
          options={[
            { label: 'Atualizacao', value: 'updated_at' },
            { label: 'Ultima movimentacao', value: 'ultima_movimentacao_em' },
            { label: 'Ajuizamento', value: 'data_ajuizamento' },
            { label: 'Cliente', value: 'cliente_nome' },
            { label: 'Tribunal', value: 'tribunal_sigla' },
          ]}
          placeholder="Atualizacao"
          value={filters.sort}
        />
        <SelectField
          label="Direcao"
          name="dir"
          options={[
            { label: 'Decrescente', value: 'desc' },
            { label: 'Crescente', value: 'asc' },
          ]}
          placeholder="Decrescente"
          value={filters.dir}
        />
      </div>

      <div className="gkit-jur-filter-actions">
        <span>{pagination.from}-{pagination.to} de {pagination.total}</span>
        <button className="button" type="submit">Filtrar</button>
        <Link className="button secondary" href="/modulos/gkit-jur/processos">Limpar</Link>
      </div>
    </form>
  )
}

export function GkitJurProcessesPage({ data }: { data: GkitJurProcessListData }) {
  return (
    <>
      <MetricCards metrics={data.metrics} />

      <GkitJurSection title="Processos acompanhados" description="Consulte, filtre e abra o processo para corrigir vinculos operacionais.">
        <div className="gkit-jur-list-note">
          <span>Padrao: processos ativos</span>
          <small>Encerrados aparecem apenas quando o status for selecionado no filtro.</small>
        </div>
        <GkitJurFilterBar data={data} />
        {data.processes.length ? <GkitJurProcessList rows={data.processes} /> : (
          <div className="suite-empty-block">
            Nenhum processo encontrado com os filtros atuais.
          </div>
        )}
        <GkitJurPager data={data} />
      </GkitJurSection>
    </>
  )
}

function GkitJurPager({ data }: { data: GkitJurProcessListData }) {
  const { filters, pagination } = data
  return (
    <div className="gkit-jur-pagination">
      <span>Pagina {pagination.currentPage} de {pagination.totalPages}</span>
      <div>
        <Link
          aria-disabled={pagination.currentPage <= 1}
          className={pagination.currentPage <= 1 ? 'button secondary disabled' : 'button secondary'}
          href={filterHref(filters, Math.max(1, pagination.currentPage - 1))}
        >
          Anterior
        </Link>
        <Link
          aria-disabled={pagination.currentPage >= pagination.totalPages}
          className={pagination.currentPage >= pagination.totalPages ? 'button secondary disabled' : 'button secondary'}
          href={filterHref(filters, Math.min(pagination.totalPages, pagination.currentPage + 1))}
        >
          Proxima
        </Link>
      </div>
    </div>
  )
}

function GkitJurProcessList({ rows }: { rows: GkitJurProcessListItem[] }) {
  return (
    <div className="suite-table-list compact gkit-jur-process-list" role="list">
      {rows.map((row) => (
        <Link className="suite-row-link" href={`/modulos/gkit-jur/processos/${row.id}`} key={row.id} role="listitem">
          <div>
            <h3>{row.numeroCnj} {row.titulo ? `- ${row.titulo}` : ''}</h3>
            <p>{row.clienteNome || 'Cliente nao vinculado'}{row.pasta ? ` - Pasta ${row.pasta}` : ''}</p>
          </div>
          <span className="suite-pill primary">{row.tribunalSigla || 'Sem tribunal'}</span>
          <strong>{row.carteiraNome || 'Sem carteira'}</strong>
          <small>{row.responsavelNome || 'Sem responsavel'}</small>
          <div className="gkit-jur-row-stack">
            <span className={`suite-pill ${row.status === 'ativo' ? 'primary' : 'muted'}`}>{statusLabel(row.status)}</span>
            <small>{row.ultimaMovimentacaoEm ? `Mov. ${formatDate(row.ultimaMovimentacaoEm)}` : 'Sem movimentacao'}</small>
          </div>
        </Link>
      ))}
    </div>
  )
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label>
      <span>{label}</span>
      {children}
    </label>
  )
}

function optionList(options: GkitJurSelectOption[], emptyLabel: string) {
  return (
    <>
      <option value="">{emptyLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </>
  )
}

function optionLabel(options: GkitJurSelectOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? statusLabel(value)
}

function GkitJurTarefaList({
  canWrite,
  formData,
  planejamentoAction,
  rows,
  updateAction,
}: {
  canWrite: boolean
  formData: GkitJurFormData
  planejamentoAction: (formData: FormData) => Promise<void>
  rows: GkitJurTarefa[]
  updateAction: (formData: FormData) => Promise<void>
}) {
  return (
    <div className="suite-table-list compact gkit-jur-task-list" role="list">
      {rows.map((row) => (
        <article key={row.id} role="listitem">
          <div>
            <div className="gkit-jur-task-head">
              <span className={`suite-pill ${priorityTone(row.prioridade)}`}>{row.prioridade}</span>
              <small>{optionLabel(gkitJurTarefaTipoOptions, row.tipo)}</small>
            </div>
            <h3>{row.titulo}</h3>
            {row.descricao ? <p>{row.descricao}</p> : null}
          </div>
          <span className="suite-pill primary">{optionLabel(gkitJurTarefaStatusOptions, row.status)}</span>
          <strong>{row.responsavelNome || row.carteiraNome || 'Sem dono definido'}</strong>
          <small>{row.prazoAt ? formatDate(row.prazoAt) : 'Sem prazo'}</small>
          {canWrite ? (
            <div className="gkit-jur-task-actions">
              {row.status === 'aberta' ? (
                <form action={updateAction}>
                  <input name="tarefa_id" type="hidden" value={row.id} />
                  <input name="processo_id" type="hidden" value={row.processoId} />
                  <input name="status" type="hidden" value="em_andamento" />
                  <input name="return_to" type="hidden" value={`/modulos/gkit-jur/processos/${row.processoId}#tarefas`} />
                  <button className="button secondary" type="submit">Iniciar</button>
                </form>
              ) : null}
              <form action={updateAction}>
                <input name="tarefa_id" type="hidden" value={row.id} />
                <input name="processo_id" type="hidden" value={row.processoId} />
                <input name="status" type="hidden" value="concluida" />
                <input name="return_to" type="hidden" value={`/modulos/gkit-jur/processos/${row.processoId}#tarefas`} />
                <button className="button primary-button" type="submit">Concluir</button>
              </form>
              <details>
                <summary>Remarcar / delegar</summary>
                <form action={planejamentoAction} className="gkit-jur-inline-plan-form">
                  <input name="tarefa_id" type="hidden" value={row.id} />
                  <input name="processo_id" type="hidden" value={row.processoId} />
                  <input name="return_to" type="hidden" value={`/modulos/gkit-jur/processos/${row.processoId}#tarefas`} />
                  <Field label="Prazo">
                    <input name="prazo_at" type="datetime-local" defaultValue={formatDateTimeLocal(row.prazoAt)} />
                  </Field>
                  <Field label="Responsavel">
                    <select name="responsavel_id" defaultValue={row.responsavelId ?? ''}>
                      {optionList(formData.responsaveis, row.responsavelNome || 'Herdar do processo')}
                    </select>
                  </Field>
                  <Field label="Prioridade">
                    <select name="prioridade" defaultValue={row.prioridade}>
                      {gkitJurTarefaPrioridadeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </Field>
                  <button className="button secondary" type="submit">Salvar</button>
                </form>
              </details>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  )
}

function ReferenceTaskForm({
  action,
  canWrite,
  label = 'Gerar tarefa',
  processoId,
  sourceId,
  sourceTipo,
  sourceTitle,
}: {
  action: (formData: FormData) => Promise<void>
  canWrite: boolean
  label?: string
  processoId: string
  sourceId: string
  sourceTipo: 'documento' | 'evento'
  sourceTitle: string
}) {
  if (!canWrite) return null
  return (
    <form action={action} className="gkit-jur-reference-task-form">
      <input name="processo_id" type="hidden" value={processoId} />
      <input name="source_id" type="hidden" value={sourceId} />
      <input name="source_tipo" type="hidden" value={sourceTipo} />
      <input name="source_title" type="hidden" value={sourceTitle} />
      <input name="tipo" type="hidden" value={sourceTipo === 'documento' ? 'documento_pendente' : 'providencia_interna'} />
      <input name="prioridade" type="hidden" value="media" />
      <input name="return_to" type="hidden" value={`/modulos/gkit-jur/processos/${processoId}#tarefas`} />
      <button className="button secondary" type="submit">{label}</button>
    </form>
  )
}

function GkitJurTimelineList({
  canWrite,
  createTarefaAction,
  rows,
}: {
  canWrite: boolean
  createTarefaAction: (formData: FormData) => Promise<void>
  rows: GkitJurTimelineItem[]
}) {
  return (
    <div className="gkit-jur-timeline-filterable">
      <input defaultChecked id="timeline-filter-all" name="timeline-filter" type="radio" />
      <input id="timeline-filter-evento" name="timeline-filter" type="radio" />
      <input id="timeline-filter-documento" name="timeline-filter" type="radio" />
      <input id="timeline-filter-tarefa" name="timeline-filter" type="radio" />
      <input id="timeline-filter-movimentacao" name="timeline-filter" type="radio" />
      <nav className="gkit-jur-timeline-tabs">
        <label htmlFor="timeline-filter-all">Todos</label>
        <label htmlFor="timeline-filter-evento">Eventos</label>
        <label htmlFor="timeline-filter-documento">Documentos</label>
        <label htmlFor="timeline-filter-tarefa">Tarefas</label>
        <label htmlFor="timeline-filter-movimentacao">Movimentacoes</label>
      </nav>
      <div className="gkit-jur-timeline-list" role="list">
        {rows.map((row) => (
          <article className={`gkit-jur-timeline-item ${priorityTone(row.prioridade)} ${row.tipo}`} key={row.id} role="listitem">
            <span />
            <div>
              <div className="gkit-jur-task-head">
                <small>{statusLabel(row.tipo)}</small>
                <small>{formatDate(row.dataReferencia)}</small>
                <span className="suite-pill muted">{statusLabel(row.status)}</span>
              </div>
              <h3>{row.titulo}</h3>
              {row.descricao ? <p>{row.descricao}</p> : null}
            </div>
            <div className="gkit-jur-timeline-actions">
              {row.href ? <Link className="button secondary" href={row.href}>Abrir</Link> : null}
              {row.tipo === 'evento' || row.tipo === 'documento' ? (
                <ReferenceTaskForm
                  action={createTarefaAction}
                  canWrite={canWrite}
                  processoId={row.processoId}
                  sourceId={row.sourceId}
                  sourceTipo={row.tipo}
                  sourceTitle={row.titulo}
                />
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function GkitJurDocumentoList({
  canWrite,
  createTarefaAction,
  rows,
}: {
  canWrite: boolean
  createTarefaAction: (formData: FormData) => Promise<void>
  rows: GkitJurDocumento[]
}) {
  return (
    <div className="suite-table-list compact gkit-jur-document-list" role="list">
      {rows.map((row) => (
        <article key={row.id} role="listitem">
          <div>
            <div className="gkit-jur-task-head">
              <small>{optionLabel(gkitJurDocumentoTipoOptions, row.tipo)}</small>
              <span className="suite-pill muted">{statusLabel(row.status)}</span>
            </div>
            <h3>{row.titulo}</h3>
            {row.descricao ? <p>{row.descricao}</p> : null}
          </div>
          <strong>{row.responsavelNome || row.carteiraNome || 'Sem dono definido'}</strong>
          <small>{row.dataDocumento ? formatDate(row.dataDocumento) : 'Sem data'}</small>
          <div className="gkit-jur-document-actions">
            {row.urlExterna ? <Link className="button secondary" href={row.urlExterna}>Abrir</Link> : null}
            <ReferenceTaskForm
              action={createTarefaAction}
              canWrite={canWrite}
              processoId={row.processoId}
              sourceId={row.id}
              sourceTipo="documento"
              sourceTitle={row.titulo}
            />
          </div>
        </article>
      ))}
    </div>
  )
}

export function GkitJurProcessDetailPage({
  action,
  canWrite,
  createDocumentoAction,
  createEventoAction,
  createTarefaAction,
  createTarefaFromReferenceAction,
  data,
  updateTarefaPlanejamentoAction,
  updateTarefaStatusAction,
}: {
  action: (formData: FormData) => Promise<void>
  canWrite: boolean
  createDocumentoAction: (formData: FormData) => Promise<void>
  createEventoAction: (formData: FormData) => Promise<void>
  createTarefaAction: (formData: FormData) => Promise<void>
  createTarefaFromReferenceAction: (formData: FormData) => Promise<void>
  data: GkitJurProcessDetailData
  updateTarefaPlanejamentoAction: (formData: FormData) => Promise<void>
  updateTarefaStatusAction: (formData: FormData) => Promise<void>
}) {
  const { documentos, formData, movimentacoes, processo, tarefas, timeline } = data

  return (
    <>
      <GkitJurSection title="Resumo do processo" description="Dados principais vindos da importacao e dos vinculos operacionais.">
        <div className="gkit-jur-detail-grid">
          <article>
            <span>CNJ</span>
            <strong>{processo.numeroCnj}</strong>
          </article>
          <article>
            <span>Cliente</span>
            <strong>{processo.clienteNome || 'Nao vinculado'}</strong>
          </article>
          <article>
            <span>Carteira</span>
            <strong>{processo.carteiraNome || 'Nao definida'}</strong>
          </article>
          <article>
            <span>Responsavel</span>
            <strong>{processo.responsavelNome || 'Nao definido'}</strong>
          </article>
          <article>
            <span>Tribunal</span>
            <strong>{processo.tribunalSigla || '-'}</strong>
          </article>
          <article>
            <span>Ultima movimentacao</span>
            <strong>{formatDate(processo.ultimaMovimentacaoEm)}</strong>
          </article>
        </div>
      </GkitJurSection>

      <GkitJurSection title="Ajustes operacionais" description="Corrija os vinculos usados por cockpit, filtros e futuras rotinas.">
        <form action={action} className="card module-form module-form-grid gkit-jur-process-form">
          <input name="id" type="hidden" value={processo.id} />

          <Field label="Cliente Ciclo">
            <select disabled={!canWrite} name="cliente_id" defaultValue={processo.clienteId ?? ''}>
              {optionList(formData.clientes, 'Sem cliente vinculado')}
            </select>
          </Field>

          <Field label="Carteira">
            <select disabled={!canWrite} name="carteira_id" defaultValue={processo.carteiraId ?? ''}>
              {optionList(formData.carteiras, 'Sem carteira')}
            </select>
          </Field>

          <Field label="Responsavel">
            <select disabled={!canWrite} name="responsavel_id" defaultValue={processo.responsavelId ?? ''}>
              {optionList(formData.responsaveis, 'Sem responsavel')}
            </select>
          </Field>

          <Field label="Status">
            <select disabled={!canWrite} name="status" defaultValue={processo.status}>
              {gkitJurStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Monitoramento">
            <select disabled={!canWrite} name="status_monitoramento" defaultValue={processo.statusMonitoramento}>
              {gkitJurMonitoramentoOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>

          <div className="module-form-wide">
            <Field label="Observacoes internas">
              <textarea disabled={!canWrite} name="observacoes" defaultValue={processo.observacoes ?? ''} />
            </Field>
          </div>

          <div className="form-actions module-form-wide">
            {canWrite ? <button className="button primary-button" type="submit">Salvar processo</button> : null}
            <Link className="button secondary" href="/modulos/gkit-jur/processos">Voltar</Link>
            {processo.urlProcesso ? <Link className="button secondary" href={processo.urlProcesso}>Abrir origem</Link> : null}
          </div>
        </form>
      </GkitJurSection>

      <GkitJurSection
        className="gkit-jur-task-panel"
        title="Tarefas do processo"
        description="Providencias manuais agora; depois a integracao passa a criar tarefas nesta mesma fila."
        id="tarefas"
      >
        {canWrite ? (
          <form action={createTarefaAction} className="card module-form module-form-grid gkit-jur-task-form">
            <input name="processo_id" type="hidden" value={processo.id} />
            <Field label="Tipo">
              <select name="tipo" defaultValue="providencia_interna">
                {gkitJurTarefaTipoOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Prioridade">
              <select name="prioridade" defaultValue="media">
                {gkitJurTarefaPrioridadeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Prazo">
              <input name="prazo_at" type="datetime-local" />
            </Field>
            <Field label="Responsavel">
              <select name="responsavel_id" defaultValue={processo.responsavelId ?? ''}>
                {optionList(formData.responsaveis, processo.responsavelNome || 'Herdar do processo')}
              </select>
            </Field>
            <div className="module-form-wide">
              <Field label="Titulo">
                <input name="titulo" placeholder="Ex.: Revisar movimentacao, preparar peticao, confirmar prazo" />
              </Field>
            </div>
            <div className="module-form-wide">
              <Field label="Descricao">
                <textarea name="descricao" placeholder="Contexto operacional para quem vai executar." />
              </Field>
            </div>
            <div className="form-actions module-form-wide">
              <button className="button primary-button" type="submit">Criar tarefa</button>
            </div>
          </form>
        ) : null}

        {tarefas.length ? (
          <GkitJurTarefaList
            canWrite={canWrite}
            formData={formData}
            planejamentoAction={updateTarefaPlanejamentoAction}
            rows={tarefas}
            updateAction={updateTarefaStatusAction}
          />
        ) : (
          <div className="suite-empty-block success">Nenhuma tarefa aberta para este processo.</div>
        )}
      </GkitJurSection>

      <GkitJurSection
        className="gkit-jur-timeline-panel"
        title="Timeline operacional"
        description="Eventos relevantes do processo, combinando registros manuais, tarefas, documentos e movimentacoes."
        id="timeline"
      >
        {canWrite ? (
          <form action={createEventoAction} className="card module-form module-form-grid gkit-jur-event-form">
            <input name="processo_id" type="hidden" value={processo.id} />
            <Field label="Tipo">
              <select name="tipo" defaultValue="providencia_interna">
                {gkitJurEventoTipoOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Data">
              <input name="data_evento" type="datetime-local" />
            </Field>
            <Field label="Responsavel">
              <select name="responsavel_id" defaultValue={processo.responsavelId ?? ''}>
                {optionList(formData.responsaveis, processo.responsavelNome || 'Herdar do processo')}
              </select>
            </Field>
            <div className="module-form-wide">
              <Field label="Titulo">
                <input name="titulo" placeholder="Ex.: Protocolo realizado, contato com cliente, audiencia designada" />
              </Field>
            </div>
            <div className="module-form-wide">
              <Field label="Descricao">
                <textarea name="descricao" placeholder="Contexto curto para a linha do tempo." />
              </Field>
            </div>
            <div className="form-actions module-form-wide">
              <button className="button primary-button" type="submit">Registrar evento</button>
            </div>
          </form>
        ) : null}

        {timeline.length ? (
          <GkitJurTimelineList
            canWrite={canWrite}
            createTarefaAction={createTarefaFromReferenceAction}
            rows={timeline}
          />
        ) : (
          <div className="suite-empty-block">Nenhum evento na timeline deste processo.</div>
        )}
      </GkitJurSection>

      <GkitJurSection
        className="gkit-jur-document-panel"
        title="Documentos do processo"
        description="Referencias documentais do caso; upload e integracao entram depois sobre esta mesma base."
        id="documentos"
      >
        {canWrite ? (
          <form action={createDocumentoAction} className="card module-form module-form-grid gkit-jur-document-form">
            <input name="processo_id" type="hidden" value={processo.id} />
            <Field label="Tipo">
              <select name="tipo" defaultValue="documento_interno">
                {gkitJurDocumentoTipoOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Data">
              <input name="data_documento" type="datetime-local" />
            </Field>
            <Field label="Responsavel">
              <select name="responsavel_id" defaultValue={processo.responsavelId ?? ''}>
                {optionList(formData.responsaveis, processo.responsavelNome || 'Herdar do processo')}
              </select>
            </Field>
            <div className="module-form-wide">
              <Field label="Titulo">
                <input name="titulo" placeholder="Ex.: Peticao inicial, decisao, comprovante, procuracao" />
              </Field>
            </div>
            <div className="module-form-wide">
              <Field label="Link externo">
                <input name="url_externa" placeholder="https://..." />
              </Field>
            </div>
            <div className="module-form-wide">
              <Field label="Descricao">
                <textarea name="descricao" placeholder="Observacao curta sobre o documento." />
              </Field>
            </div>
            <div className="form-actions module-form-wide">
              <button className="button primary-button" type="submit">Registrar documento</button>
            </div>
          </form>
        ) : null}

        {documentos.length ? (
          <GkitJurDocumentoList
            canWrite={canWrite}
            createTarefaAction={createTarefaFromReferenceAction}
            rows={documentos}
          />
        ) : (
          <div className="suite-empty-block">Nenhum documento registrado para este processo.</div>
        )}
      </GkitJurSection>

      <GkitJurSection title="Movimentacoes" description="Historico ja preparado para receber as sincronizacoes futuras.">
        {movimentacoes.length ? <GkitJurMovimentacaoList rows={movimentacoes} /> : (
          <div className="suite-empty-block">Nenhuma movimentacao registrada para este processo.</div>
        )}
      </GkitJurSection>
    </>
  )
}

function SuggestionValue({ label, value }: { label: string; value: string | null }) {
  return (
    <span>
      <small>{label}</small>
      <strong>{value || '-'}</strong>
    </span>
  )
}

function GkitJurSaneamentoSuggestions({
  action,
  canWrite,
  rows,
  totals,
}: {
  action: (formData: FormData) => Promise<void>
  canWrite: boolean
  rows: GkitJurSaneamentoSuggestion[]
  totals: GkitJurPendenciasData['suggestionTotals']
}) {
  return (
    <GkitJurSection
      description={`Sugestoes encontradas: ${totals.total} processos, ${totals.cliente} cliente(s), ${totals.carteira} carteira(s), ${totals.responsavel} responsavel(is).`}
      title="Sugestoes de saneamento"
    >
      {rows.length ? (
        <form action={action} className="gkit-jur-suggestion-form">
          <div className="gkit-jur-suggestion-list" role="list">
            {rows.map((row) => (
              <label className="gkit-jur-suggestion-row" key={row.processo.id} role="listitem">
                <input disabled={!canWrite} name="processo_id" type="checkbox" value={row.processo.id} defaultChecked />
                <div>
                  <h3>{row.processo.numeroCnj}</h3>
                  <p>{row.processo.clienteNome || row.processo.titulo || 'Processo sem cliente identificado'}</p>
                </div>
                <SuggestionValue label="Cliente" value={row.clienteNome} />
                <SuggestionValue label="Carteira" value={row.carteiraNome} />
                <SuggestionValue label="Responsavel" value={row.responsavelNome} />
                <small>{row.motivo}</small>
              </label>
            ))}
          </div>
          <div className="gkit-jur-suggestion-actions">
            <span>{rows.length} sugestao(oes) exibida(s)</span>
            {canWrite ? <button className="button primary-button" type="submit">Aplicar selecionadas</button> : null}
          </div>
        </form>
      ) : (
        <div className="suite-empty-block">
          Nenhuma sugestao automatica segura encontrada agora. Use as listas de pendencias para ajustar manualmente.
        </div>
      )}
    </GkitJurSection>
  )
}

function GkitJurPendenciaQuickFilters({ data }: { data: GkitJurPendenciasData }) {
  const items = [
    { label: 'Inbox de pendencias', href: '/modulos/gkit-jur/inbox?fila=pendencias', value: data.metrics.semCliente + data.metrics.semCarteira + data.metrics.semResponsavel, hint: 'fila operacional' },
    { label: 'Sem cliente', href: '/modulos/gkit-jur/processos?saneamento=sem_cliente', value: data.metrics.semCliente, hint: 'vinculo Ciclo' },
    { label: 'Sem carteira', href: '/modulos/gkit-jur/processos?saneamento=sem_carteira', value: data.metrics.semCarteira, hint: 'distribuicao' },
    { label: 'Sem responsavel', href: '/modulos/gkit-jur/processos?saneamento=sem_responsavel', value: data.metrics.semResponsavel, hint: 'dono operacional' },
  ]

  return (
    <div className="gkit-jur-pendencia-shortcuts">
      {items.map((item) => (
        <Link href={item.href} key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.hint}</small>
        </Link>
      ))}
    </div>
  )
}

export function GkitJurPendenciasPage({
  action,
  canWrite,
  data,
}: {
  action: (formData: FormData) => Promise<void>
  canWrite: boolean
  data: GkitJurPendenciasData
}) {
  return (
    <>
      <MetricCards metrics={data.metrics} />
      <GkitJurPendenciaQuickFilters data={data} />
      <GkitJurSaneamentoSuggestions
        action={action}
        canWrite={canWrite}
        rows={data.suggestions}
        totals={data.suggestionTotals}
      />
      <div className="gkit-jur-pendencia-grid">
        {data.groups.map((group) => (
          <GkitJurSection
            action={<Link className="button secondary" href={group.href}>Ver lista</Link>}
            description={group.description}
            key={group.title}
            title={`${group.title} (${group.total})`}
          >
            {group.items.length ? <GkitJurProcessList rows={group.items} /> : (
              <div className="suite-empty-block success">Sem pendencias nesta fila.</div>
            )}
          </GkitJurSection>
        ))}
      </div>
    </>
  )
}

function GkitJurMovimentacaoList({ rows }: { rows: GkitJurMovimentacoesData['movimentacoes'] }) {
  return (
    <div className="suite-table-list compact gkit-jur-movement-list" role="list">
      {rows.map((row) => (
        <Link className="suite-row-link" href={`/modulos/gkit-jur/processos/${row.processoId}`} key={row.id} role="listitem">
          <div>
            <h3>{row.nome}</h3>
            <p>{row.numeroCnj} - {row.clienteNome || 'Cliente nao vinculado'}</p>
          </div>
          <span className={`suite-pill ${row.relevante ? 'warning' : 'primary'}`}>{row.origem}</span>
          <strong>{formatDate(row.dataHora)}</strong>
          <small>{row.geraAlerta ? 'gera alerta' : 'sem alerta'}</small>
        </Link>
      ))}
    </div>
  )
}

export function GkitJurMovimentacoesPage({ data }: { data: GkitJurMovimentacoesData }) {
  return (
    <>
      <MetricCards metrics={data.metrics} />
      <GkitJurSection title="Movimentacoes registradas" description="Lista das movimentacoes gravadas na base juridica.">
        {data.movimentacoes.length ? <GkitJurMovimentacaoList rows={data.movimentacoes} /> : (
          <div className="suite-empty-block">
            Nenhuma movimentacao importada ainda. A lista sera preenchida na sprint de sincronizacao DataJud ou por registros manuais.
          </div>
        )}
      </GkitJurSection>
    </>
  )
}

export function GkitJurAuditoriaPage({ data }: { data: GkitJurAuditoriaData }) {
  return (
    <>
      <section className="suite-kpi-grid compact">
        <article className="metric-card">
          <span className="metric-label">Importados</span>
          <strong className="metric-value">{data.importados}</strong>
          <span className="metric-hint">processos com origem registrada</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Sincronizacoes</span>
          <strong className="metric-value">{data.sincronizacoes.length}</strong>
          <span className="metric-hint">ultimas execucoes</span>
        </article>
      </section>

      <GkitJurSection title="Sincronizacoes" description="Trilha preparada para registrar execucoes DataJud quando a conexao for ligada.">
        {data.sincronizacoes.length ? (
          <div className="suite-table-list compact gkit-jur-audit-list" role="list">
            {data.sincronizacoes.map((item) => (
              <article key={item.id} role="listitem">
                <div>
                  <h3>{item.numeroCnj}</h3>
                  <p>{item.tribunalAlias} - {item.erroMensagem || 'Execucao registrada'}</p>
                </div>
                <span className={`suite-pill ${item.status === 'sucesso' ? 'success' : item.status === 'erro' ? 'danger' : 'warning'}`}>{item.status}</span>
                <strong>{item.totalMovimentacoes}/{item.totalNovas}</strong>
                <small>{formatDate(item.startedAt)}</small>
              </article>
            ))}
          </div>
        ) : (
          <div className="suite-empty-block">Ainda nao existem sincronizacoes registradas.</div>
        )}
      </GkitJurSection>
    </>
  )
}

function AgentField({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <label>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function GkitJurAgentePage({
  canWrite,
  createFonteAction,
  createReceitaAction,
  data,
  runReceitaAction,
  validateExecucaoAction,
}: {
  canWrite: boolean
  createFonteAction: (formData: FormData) => Promise<void>
  createReceitaAction: (formData: FormData) => Promise<void>
  data: GkitJurAgenteData
  runReceitaAction: (formData: FormData) => Promise<void>
  validateExecucaoAction: (formData: FormData) => Promise<void>
}) {
  const fonteOptions = data.fontes.map((fonte) => ({ label: fonte.nome, value: fonte.id }))

  return (
    <>
      <section className="suite-kpi-grid compact">
        <article className="metric-card">
          <span className="metric-label">Fontes ativas</span>
          <strong className="metric-value">{data.metrics.fontesAtivas}</strong>
          <span className="metric-hint">portais, diarios, e-mails e APIs</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Receitas</span>
          <strong className="metric-value">{data.metrics.receitasAtivas}</strong>
          <span className="metric-hint">rotinas configuradas</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Pendentes</span>
          <strong className="metric-value">{data.metrics.pendentes}</strong>
          <span className="metric-hint">aguardam worker ou validacao</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Falhas</span>
          <strong className="metric-value">{data.metrics.falhas}</strong>
          <span className="metric-hint">pedem intervencao humana</span>
        </article>
      </section>

      <div className="gkit-jur-agent-grid">
        <GkitJurSection title="Fonte" description="Cadastre uma origem tecnica para futuras coletas.">
          <form action={createFonteAction} className="gkit-jur-agent-form">
            <AgentField label="Nome">
              <input className="text-input" disabled={!canWrite} name="nome" placeholder="DJe, PJe, e-SAJ, e-mail juridico" />
            </AgentField>
            <AgentField label="Tipo">
              <select disabled={!canWrite} name="tipo" defaultValue="portal_web">
                <option value="portal_web">Portal web</option>
                <option value="diario">Diario</option>
                <option value="email">E-mail</option>
                <option value="api">API</option>
                <option value="interno">Interno</option>
              </select>
            </AgentField>
            <AgentField label="Carteira">
              <select disabled={!canWrite} name="carteira_id">
                {optionList(data.carteiras, 'Geral')}
              </select>
            </AgentField>
            <AgentField label="URL base">
              <input className="text-input" disabled={!canWrite} name="url_base" placeholder="https://" />
            </AgentField>
            <div className="gkit-jur-agent-checks">
              <label><input disabled={!canWrite} name="exige_captcha" type="checkbox" /> Captcha</label>
              <label><input disabled={!canWrite} name="exige_2fa" type="checkbox" /> 2FA</label>
            </div>
            <div className="form-actions">
              {canWrite ? <button className="button primary-button" type="submit">Salvar fonte</button> : null}
            </div>
          </form>
        </GkitJurSection>

        <GkitJurSection title="Receita" description="Defina uma rotina executavel pelo agente.">
          <form action={createReceitaAction} className="gkit-jur-agent-form">
            <AgentField label="Nome">
              <input className="text-input" disabled={!canWrite} name="nome" placeholder="Coletar publicacoes do dia" />
            </AgentField>
            <AgentField label="Fonte">
              <select disabled={!canWrite} name="fonte_id">
                {optionList(fonteOptions, 'Sem fonte')}
              </select>
            </AgentField>
            <AgentField label="Carteira">
              <select disabled={!canWrite} name="carteira_id">
                {optionList(data.carteiras, 'Geral')}
              </select>
            </AgentField>
            <AgentField label="Tipo de coleta">
              <select disabled={!canWrite} name="tipo_coleta" defaultValue="movimentacao">
                <option value="publicacao">Publicacao</option>
                <option value="movimentacao">Movimentacao</option>
                <option value="documento">Documento</option>
                <option value="prazo">Prazo</option>
                <option value="andamento">Andamento</option>
                <option value="email">E-mail</option>
              </select>
            </AgentField>
            <AgentField label="Periodicidade">
              <select disabled={!canWrite} name="periodicidade" defaultValue="manual">
                <option value="manual">Manual</option>
                <option value="diaria">Diaria</option>
                <option value="horaria">Horaria</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
              </select>
            </AgentField>
            <AgentField label="Script key">
              <input className="text-input" disabled={!canWrite} name="script_key" placeholder="jur.publicacoes.diarias" />
            </AgentField>
            <div className="form-actions">
              {canWrite ? <button className="button primary-button" type="submit">Salvar receita</button> : null}
            </div>
          </form>
        </GkitJurSection>
      </div>

      <GkitJurSection title="Receitas configuradas" description="Dispare execucoes manuais enquanto o worker externo nao estiver ligado.">
        {data.receitas.length ? (
          <div className="suite-table-list compact gkit-jur-agent-list" role="list">
            {data.receitas.map((receita) => (
              <article key={receita.id} role="listitem">
                <div>
                  <h3>{receita.nome}</h3>
                  <p>{receita.fonteNome || 'Sem fonte'} - {receita.tipoColeta} - {receita.periodicidade}</p>
                </div>
                <span className={`suite-pill ${receita.ativo ? 'success' : 'warning'}`}>{receita.ativo ? 'Ativa' : 'Pausada'}</span>
                <strong>{receita.carteiraNome || 'Geral'}</strong>
                {canWrite ? (
                  <form action={runReceitaAction}>
                    <input name="receita_id" type="hidden" value={receita.id} />
                    <button className="button secondary" type="submit">Executar</button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="suite-empty-block">Nenhuma receita configurada ainda.</div>
        )}
      </GkitJurSection>

      <GkitJurSection title="Execucoes recentes" description="Historico operacional do agente e validacoes humanas.">
        {data.execucoes.length ? (
          <div className="suite-table-list compact gkit-jur-agent-list" role="list">
            {data.execucoes.map((execucao) => (
              <article key={execucao.id} role="listitem">
                <div>
                  <h3>{execucao.receitaNome}</h3>
                  <p>{execucao.fonteNome || 'Fonte nao definida'} - {execucao.erroMensagem || 'Execucao registrada'}</p>
                </div>
                <span className={`suite-pill ${execucao.status === 'sucesso' ? 'success' : execucao.status === 'falha' || execucao.status === 'precisa_intervencao' ? 'danger' : 'warning'}`}>
                  {statusLabel(execucao.status)}
                </span>
                <strong>{execucao.carteiraNome || 'Geral'}</strong>
                <small>{formatDate(execucao.createdAt)}</small>
                {canWrite && ['aguardando_validacao', 'falha', 'precisa_intervencao'].includes(execucao.status) ? (
                  <form action={validateExecucaoAction} className="gkit-jur-agent-validation">
                    <input name="execucao_id" type="hidden" value={execucao.id} />
                    <select name="status" defaultValue="validado">
                      <option value="validado">Validado</option>
                      <option value="rejeitado">Rejeitado</option>
                      <option value="reenviar_coleta">Reenviar coleta</option>
                      <option value="importado_manual">Importado manual</option>
                    </select>
                    <input className="text-input" name="observacao" placeholder="Observacao" />
                    <button className="button secondary" type="submit">Salvar</button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="suite-empty-block">Ainda nao existem execucoes do agente.</div>
        )}
      </GkitJurSection>
    </>
  )
}

const gkitJurConfiguracoesItems = [
  {
    title: 'Saneamento',
    description: 'Pendencias de cliente, carteira, responsavel e tribunal antes da operacao juridica.',
    href: '/modulos/gkit-jur/pendencias',
    label: 'Abrir saneamento',
  },
  {
    title: 'Integracao DataJud',
    description: 'Conexao, tribunais, fila de consulta, execucoes e retornos da API publica do CNJ.',
    href: '/modulos/gkit-jur/configuracoes/integracao',
    label: 'Configurar integracao',
  },
  {
    title: 'Agente auxiliar',
    description: 'Fontes, receitas, validacoes e execucoes assistidas do modulo juridico.',
    href: '/modulos/gkit-jur/agente',
    label: 'Abrir agente',
  },
  {
    title: 'Cadastros',
    description: 'Tabelas de apoio, tipos e parametros operacionais do Jur.',
    href: '/modulos/gkit-jur/cadastros',
    label: 'Abrir cadastros',
  },
  {
    title: 'Auditoria',
    description: 'Historico tecnico de importacoes, sincronizacoes e eventos operacionais.',
    href: '/modulos/gkit-jur/auditoria',
    label: 'Abrir auditoria',
  },
]

export function GkitJurConfiguracoesPage() {
  return (
    <GkitJurSection title="Areas de configuracao" description="Centralize parametros, saneamento e integracoes fora da rotina diaria do inbox.">
      <div className="gkit-jur-settings-grid">
        {gkitJurConfiguracoesItems.map((item) => (
          <Link className="gkit-jur-settings-card" href={item.href} key={item.title}>
            <span>{item.title}</span>
            <p>{item.description}</p>
            <strong>{item.label}</strong>
          </Link>
        ))}
      </div>
    </GkitJurSection>
  )
}

export function GkitJurIntegracaoPage({ data }: { data: GkitJurIntegracaoData }) {
  const cards = [
    { title: 'Processos ativos', value: data.metrics.totalAtivos.toLocaleString('pt-BR'), hint: 'base operacional monitoravel' },
    { title: 'Tribunais cobertos', value: data.metrics.configurados.toLocaleString('pt-BR'), hint: 'com alias DataJud configurado' },
    { title: 'Criticos', value: data.metrics.criticos.toLocaleString('pt-BR'), hint: 'sem mapeamento ou com erro' },
    { title: 'Sem primeira sync', value: data.metrics.semSincronizacao.toLocaleString('pt-BR'), hint: 'aguardam primeira consulta' },
  ]

  return (
    <>
      <section className="suite-kpi-grid compact">
        {cards.map((card) => (
          <article className="metric-card" key={card.title}>
            <span className="metric-label">{card.title}</span>
            <strong className="metric-value">{card.value}</strong>
            <span className="metric-hint">{card.hint}</span>
          </article>
        ))}
      </section>

      <GkitJurSection title="Semaforo de monitoramento" description="Acompanhe a prontidao da integracao por tribunal, priorizando processos ativos.">
        <div className="gkit-jur-monitoring-list">
          {data.tribunais.map((tribunal) => (
            <article className={`gkit-jur-monitoring-row ${tribunal.nivel}`} key={tribunal.tribunal}>
              <div className="gkit-jur-monitoring-status">
                <span aria-hidden="true" />
                <strong>{tribunal.status}</strong>
              </div>
              <div className="gkit-jur-monitoring-main">
                <strong>{tribunal.tribunal}</strong>
                <span>{tribunal.nome}</span>
              </div>
              <dl>
                <div>
                  <dt>Ativos</dt>
                  <dd>{tribunal.totalAtivos.toLocaleString('pt-BR')}</dd>
                </div>
                <div>
                  <dt>Monitorando</dt>
                  <dd>{tribunal.monitorando.toLocaleString('pt-BR')}</dd>
                </div>
                <div>
                  <dt>Sem sync</dt>
                  <dd>{tribunal.semSincronizacao.toLocaleString('pt-BR')}</dd>
                </div>
                <div>
                  <dt>Saneamento</dt>
                  <dd>{(tribunal.semCarteira + tribunal.semResponsavel).toLocaleString('pt-BR')}</dd>
                </div>
              </dl>
              <Link className="button secondary" href={tribunal.tribunal === 'SEM_TRIBUNAL' ? '/modulos/gkit-jur/pendencias' : `/modulos/gkit-jur/processos?status=ativo&tribunal=${encodeURIComponent(tribunal.tribunal)}`}>
                Ver processos
              </Link>
            </article>
          ))}
        </div>
      </GkitJurSection>

      <GkitJurSection title="Roteiro DataJud" description="Proximos passos para sair do monitoramento manual para a sincronizacao automatica.">
        <div className="gkit-jur-integration-steps">
          <article>
            <span>1</span>
            <div>
              <h3>Configurar chave publica</h3>
              <p>Guardar a API Key em variavel de ambiente e validar o header Authorization.</p>
            </div>
          </article>
          <article>
            <span>2</span>
            <div>
              <h3>Habilitar tribunais</h3>
              <p>Comecar pelos tribunais existentes na base ativa de processos.</p>
            </div>
          </article>
          <article>
            <span>3</span>
            <div>
              <h3>Sincronizar processo</h3>
              <p>Buscar por CNJ, gravar movimentacoes novas e atualizar a timeline.</p>
            </div>
          </article>
          <article>
            <span>4</span>
            <div>
              <h3>Monitorar execucoes</h3>
              <p>Registrar sucesso, erro, timeout, sem resultado e movimentos recebidos.</p>
            </div>
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
