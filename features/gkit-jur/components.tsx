import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import type { PlatformUsuario } from '@/lib/auth/platform'
import {
  gkitJurDocumentoTipoOptions,
  gkitJurEventoTipoOptions,
  gkitJurMonitoramentoOptions,
  gkitJurPublicacaoDecisaoOptions,
  gkitJurStatusOptions,
  gkitJurTarefaPrioridadeOptions,
  gkitJurTarefaStatusOptions,
  gkitJurTarefaTipoOptions,
} from './queries'
import { GkitJurSyncSubmitButton } from './sync-submit-button'
import type {
  GkitJurAgenteData,
  GkitJurAuditoriaData,
  GkitJurDashboardMetrics,
  GkitJurDocumento,
  GkitJurFormData,
  GkitJurGlobalSearchData,
  GkitJurGlobalSearchResult,
  GkitJurInboxData,
  GkitJurInboxFilaId,
  GkitJurInboxItem,
  GkitJurInboxPrioridade,
  GkitJurIntegracaoData,
  GkitJurIntegracaoSyncFeedback,
  GkitJurMovimentacaoTarefaData,
  GkitJurMovimentacaoFilters,
  GkitJurMovimentacoesData,
  GkitJurPendenciasData,
  GkitJurProcessDetailData,
  GkitJurProcessFilters,
  GkitJurProcessListData,
  GkitJurProcessListItem,
  GkitJurProcessSyncFeedback,
  GkitJurPublicacao,
  GkitJurPublicacaoFilters,
  GkitJurPublicacoesData,
  GkitJurSaneamentoSuggestion,
  GkitJurSelectOption,
  GkitJurTarefa,
  GkitJurTimelineItem,
} from './types'

type GkitJurTab = 'inbox' | 'processos' | 'pendencias' | 'publicacoes' | 'movimentacoes' | 'agente' | 'cadastros' | 'auditoria' | 'configuracoes'

const activeHref: Record<GkitJurTab, string> = {
  inbox: '/modulos/gkit-jur/inbox',
  processos: '/modulos/gkit-jur/processos',
  pendencias: '/modulos/gkit-jur/pendencias',
  publicacoes: '/modulos/gkit-jur/publicacoes',
  movimentacoes: '/modulos/gkit-jur/movimentacoes',
  agente: '/modulos/gkit-jur/agente',
  cadastros: '/modulos/gkit-jur/cadastros',
  auditoria: '/modulos/gkit-jur/auditoria',
  configuracoes: '/modulos/gkit-jur/configuracoes',
}

const navGroups: ModuleNavGroup[] = [
  { href: '/modulos/gkit-jur/inbox', title: 'Inbox' },
  { href: '/modulos/gkit-jur/publicacoes', title: 'Publicacoes' },
  { href: '/modulos/gkit-jur/processos', title: 'Processos' },
  { href: '/modulos/gkit-jur/movimentacoes', title: 'Movimentações' },
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
  description?: string
  title: string
  usuario: PlatformUsuario
}) {
  const globalSearch = (
    <form action="/modulos/gkit-jur/busca" className="gkit-jur-global-search" method="get">
      <label>
        <span>Busca global</span>
        <input name="q" placeholder="Processo, cliente, tarefa..." type="search" />
      </label>
      <button className="button secondary" type="submit">Buscar</button>
    </form>
  )
  const settingsButton = <Link className="button secondary gkit-jur-settings-button" href="/modulos/gkit-jur/configuracoes">Configurações</Link>

  return (
    <ModuleShell
      activeHref={activeHref[active]}
      actions={actions ? <>{globalSearch}{settingsButton}{actions}</> : <>{globalSearch}{settingsButton}</>}
      brand="Jurídico"
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

function GkitJurCollapsibleSection({
  children,
  className,
  defaultOpen = true,
  description,
  id,
  title,
}: {
  children: ReactNode
  className?: string
  defaultOpen?: boolean
  description?: string
  id?: string
  title: string
}) {
  return (
    <details className={className ? `suite-panel gkit-jur-collapsible ${className}` : 'suite-panel gkit-jur-collapsible'} id={id} open={defaultOpen}>
      <summary className="suite-panel-heading gkit-jur-collapsible-summary">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <span className="button secondary gkit-jur-collapsible-toggle">
          <span className="when-open">Recolher</span>
          <span className="when-closed">Expandir</span>
        </span>
      </summary>
      <div className="gkit-jur-collapsible-body">
        {children}
      </div>
    </details>
  )
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('pt-BR')
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
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

function readinessLabel(value: string | null | undefined) {
  if (value === 'pronto') return 'Pronto'
  if (value === 'parcial') return 'Parcial'
  if (value === 'capa') return 'So com capa'
  if (value === 'desatualizado') return 'Desatualizado'
  if (value === 'erro') return 'Com erro'
  return 'Sem base'
}

function readinessTone(value: string | null | undefined) {
  if (value === 'pronto') return 'success'
  if (value === 'parcial' || value === 'capa' || value === 'desatualizado') return 'warning'
  if (value === 'erro') return 'danger'
  return 'muted'
}

function readinessScore(value: string | null | undefined) {
  if (value === 'pronto') return 100
  if (value === 'parcial') return 68
  if (value === 'desatualizado') return 48
  if (value === 'capa') return 34
  if (value === 'erro') return 12
  return 0
}

function listOrFallback(items: string[], fallback: string) {
  const unique = [...new Map(items
    .map((item) => [item.replace(/\s+/g, ' ').trim().toLowerCase(), item.trim()] as const)
    .filter(([key]) => Boolean(key))).values()]
  return unique.length ? unique : [fallback]
}

function executiveProcessSummary(data: GkitJurProcessDetailData, relevantMovements: number) {
  const { movimentacoes, processo, resumo } = data
  const classe = processo.classeNome || resumo?.faseProcessual
  const tribunal = processo.tribunalSigla
  const orgao = processo.orgaoJulgadorNome
  const latestDate = formatDate(resumo?.ultimaMovimentacaoConsideradaEm ?? processo.ultimaMovimentacaoEm)
  const movementCount = resumo?.movimentacoesConsideradas ?? movimentacoes.length
  const relevantCount = resumo?.movimentacoesRelevantes ?? relevantMovements
  const readiness = readinessLabel(resumo?.nivelProntidao).toLowerCase()
  const abertura = [
    `Processo ${processo.numeroCnj}`,
    tribunal ? `no ${tribunal}` : null,
    classe ? `classe ${classe}` : null,
    orgao ? `em tramitação no ${orgao}` : null,
  ].filter(Boolean).join(', ')
  const base = resumo
    ? `A base local está ${readiness}, com ${movementCount.toLocaleString('pt-BR')} movimentação(ões) analisada(s) e ${relevantCount.toLocaleString('pt-BR')} relevante(s).`
    : 'Ainda não existe resumo operacional salvo para este processo; a próxima sincronização deve consolidar capa, movimentações, tarefas e alertas.'
  const latest = latestDate !== '-' ? `Último marco considerado em ${latestDate}.` : 'Ainda sem marco processual recente consolidado.'
  const ownership = [
    processo.clienteNome ? `vinculado a ${processo.clienteNome}` : 'sem cliente vinculado',
    processo.carteiraNome ? `na carteira ${processo.carteiraNome}` : 'sem carteira operacional',
    processo.responsavelNome ? `sob responsabilidade de ${processo.responsavelNome}` : 'ainda sem responsável operacional definido',
  ].join(', ')

  return `${abertura}. ${latest} ${base} Na operação, está ${ownership}.`
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
        <span className="metric-hint">vínculo Ciclo pendente</span>
      </article>
      <article className="metric-card">
        <span className="metric-label">Sem carteira</span>
        <strong className="metric-value">{metrics.semCarteira}</strong>
        <span className="metric-hint">triagem operacional</span>
      </article>
      <article className="metric-card">
        <span className="metric-label">Sem responsável</span>
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
                <span>Responsável</span>
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
  if (data.filters.ordenacao !== 'prioridade') params.set('ordenacao', data.filters.ordenacao)
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
          description="Itens priorizados por risco, pendência, ausência de dono e automação."
        >
          <form className="gkit-jur-inbox-filter" method="get">
            {data.selected !== 'hoje' ? <input name="fila" type="hidden" value={data.selected} /> : null}
            <Field label="Carteira">
              <select name="carteira_id" defaultValue={data.filters.carteiraId}>
                {optionList(data.filterOptions.carteiras, 'Todas as carteiras')}
              </select>
            </Field>
            <Field label="Responsável">
              <select name="responsavel_id" defaultValue={data.filters.responsavelId}>
                {optionList(data.filterOptions.responsaveis, 'Todos os responsáveis')}
              </select>
            </Field>
            <Field label="Ordenar por">
              <select name="ordenacao" defaultValue={data.filters.ordenacao}>
                <option value="prioridade">Prioridade</option>
                <option value="tipo">Tipo operacional</option>
                <option value="responsavel">Responsavel</option>
                <option value="carteira">Carteira</option>
              </select>
            </Field>
            <div className="gkit-jur-inbox-filter-actions">
              <button className="button secondary" type="submit">Filtrar</button>
              <Link className="button secondary" href={inboxHref({ ...data, filters: { carteiraId: '', ordenacao: data.filters.ordenacao, responsavelId: '' } }, data.selected)}>Limpar</Link>
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

      <input className="gkit-jur-agent-dismiss" id="gkit-jur-agent-dismiss" type="checkbox" />
      <aside className="suite-panel gkit-jur-inbox-copilot-popup">
        <div className="suite-panel-heading">
          <div>
            <h2>Agente auxiliar</h2>
            <p>Melhores próximas ações.</p>
          </div>
          <label
            aria-label="Fechar agente auxiliar"
            className="gkit-jur-agent-close"
            htmlFor="gkit-jur-agent-dismiss"
            title="Fechar agente auxiliar"
          >
            x
          </label>
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
                      <label htmlFor={`gkit-jur-agent-action-${next}`}>Próximo</label>
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

function movimentacaoHref(filters: GkitJurMovimentacaoFilters, page: number) {
  const params = new URLSearchParams()
  Object.entries({ ...filters, page }).forEach(([key, value]) => {
    if (key === 'page') {
      if (Number(value) > 1) params.set(key, String(value))
      return
    }
    if (value) params.set(key, String(value))
  })
  const query = params.toString()
  return query ? `/modulos/gkit-jur/movimentacoes?${query}` : '/modulos/gkit-jur/movimentacoes'
}

function activeValueLabel(options: GkitJurSelectOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

function GkitJurActiveFilterChips({ items }: { items: Array<{ label: string; value: string }> }) {
  if (!items.length) return null
  return (
    <div className="gkit-jur-active-filters" aria-label="Filtros ativos">
      {items.map((item) => (
        <span key={`${item.label}-${item.value}`}>
          <strong>{item.label}</strong>
          {item.value}
        </span>
      ))}
    </div>
  )
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
  const activeFilters = [
    filters.q ? { label: 'Busca', value: filters.q } : null,
    filters.status ? { label: 'Status', value: optionLabel(gkitJurStatusOptions, filters.status) } : null,
    filters.carteiraId ? { label: 'Carteira', value: activeValueLabel(filterOptions.carteiras, filters.carteiraId) } : null,
    filters.responsavelId ? { label: 'Responsável', value: activeValueLabel(filterOptions.responsaveis, filters.responsavelId) } : null,
    filters.tribunal ? { label: 'Tribunal', value: filters.tribunal } : null,
    filters.monitoramento ? { label: 'Monitoramento', value: optionLabel(gkitJurMonitoramentoOptions, filters.monitoramento) } : null,
    filters.saneamento ? { label: 'Pendência', value: filters.saneamento.replace('sem_', 'Sem ').replace('_', ' ') } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>

  return (
    <form className="gkit-jur-filter-bar" method="get">
      <div className="gkit-jur-filter-fields">
        <label>
          <span>Busca</span>
          <input defaultValue={filters.q} name="q" placeholder="CNJ, cliente, pasta, título ou classe" type="search" />
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
          label="Responsável"
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
          label="Pendência"
          name="saneamento"
          options={[
            { label: 'Sem cliente', value: 'sem_cliente' },
            { label: 'Sem carteira', value: 'sem_carteira' },
            { label: 'Sem responsável', value: 'sem_responsavel' },
            { label: 'Sem tribunal', value: 'sem_tribunal' },
          ]}
          placeholder="Todas"
          value={filters.saneamento}
        />
        <SelectField
          label="Ordenar"
          name="sort"
          options={[
            { label: 'Atualização', value: 'updated_at' },
            { label: 'Última movimentação', value: 'ultima_movimentacao_em' },
            { label: 'Ajuizamento', value: 'data_ajuizamento' },
            { label: 'Cliente', value: 'cliente_nome' },
            { label: 'Tribunal', value: 'tribunal_sigla' },
          ]}
          placeholder="Atualização"
          value={filters.sort}
        />
        <SelectField
          label="Direção"
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
      <GkitJurActiveFilterChips items={activeFilters} />
    </form>
  )
}

export function GkitJurProcessesPage({ data }: { data: GkitJurProcessListData }) {
  return (
    <>
      <MetricCards metrics={data.metrics} />

      <GkitJurSection title="Processos acompanhados" description="Consulte, filtre e abra o processo para corrigir vínculos operacionais.">
        <div className="gkit-jur-list-note">
          <span>Padrão: processos ativos</span>
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

function GkitJurGlobalSearchGroup({
  empty,
  rows,
  title,
}: {
  empty: string
  rows: GkitJurGlobalSearchResult[]
  title: string
}) {
  return (
    <GkitJurSection title={title} description={`${rows.length.toLocaleString('pt-BR')} resultado(s) em processos ativos.`}>
      {rows.length ? (
        <div className="suite-table-list compact gkit-jur-global-search-results" role="list">
          {rows.map((row) => (
            <Link className="suite-row-link" href={row.href} key={row.id} role="listitem">
              <div>
                <h3>{row.title}</h3>
                <p>{row.subtitle}</p>
              </div>
              <span className="suite-pill primary">{row.type}</span>
              <small>{row.meta}</small>
            </Link>
          ))}
        </div>
      ) : (
        <div className="suite-empty-block">{empty}</div>
      )}
    </GkitJurSection>
  )
}

export function GkitJurGlobalSearchPage({ data }: { data: GkitJurGlobalSearchData }) {
  return (
    <>
      <section className="suite-kpi-grid compact">
        <article className="metric-card">
          <span className="metric-label">Busca</span>
          <strong className="metric-value">{data.total.toLocaleString('pt-BR')}</strong>
          <span className="metric-hint">{data.query ? `resultado(s) para "${data.query}"` : 'digite um termo no topo'}</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Processos</span>
          <strong className="metric-value">{data.processos.length.toLocaleString('pt-BR')}</strong>
          <span className="metric-hint">cadastro e identificadores</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Tarefas</span>
          <strong className="metric-value">{data.tarefas.length.toLocaleString('pt-BR')}</strong>
          <span className="metric-hint">providências abertas</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Movimentações</span>
          <strong className="metric-value">{data.movimentacoes.length.toLocaleString('pt-BR')}</strong>
          <span className="metric-hint">histórico dos processos ativos</span>
        </article>
      </section>

      {!data.query ? (
        <GkitJurSection title="Busca global" description="Use a busca no topo para localizar processos ativos, tarefas abertas e movimentações.">
          <div className="suite-empty-block">Digite um termo para iniciar a busca.</div>
        </GkitJurSection>
      ) : null}

      {data.query ? (
        <>
          <GkitJurGlobalSearchGroup empty="Nenhum processo ativo encontrado." rows={data.processos} title="Processos" />
          <GkitJurGlobalSearchGroup empty="Nenhuma tarefa aberta encontrada." rows={data.tarefas} title="Tarefas" />
          <GkitJurGlobalSearchGroup empty="Nenhuma movimentação encontrada." rows={data.movimentacoes} title="Movimentações" />
        </>
      ) : null}
    </>
  )
}

function GkitJurPager({ data }: { data: GkitJurProcessListData }) {
  const { filters, pagination } = data
  return (
    <div className="gkit-jur-pagination">
      <span>Página {pagination.currentPage} de {pagination.totalPages}</span>
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
          Próxima
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
            <p>{row.clienteNome || 'Cliente não vinculado'}{row.pasta ? ` - Pasta ${row.pasta}` : ''}</p>
          </div>
          <span className="suite-pill primary">{row.tribunalSigla || 'Sem tribunal'}</span>
          <strong>{row.carteiraNome || 'Sem carteira'}</strong>
          <small>{row.responsavelNome || 'Sem responsável'}</small>
          <div className="gkit-jur-row-stack">
            <span className={`suite-pill ${row.status === 'ativo' ? 'primary' : 'muted'}`}>{statusLabel(row.status)}</span>
            <small>{row.ultimaMovimentacaoEm ? `Mov. ${formatDate(row.ultimaMovimentacaoEm)}` : 'Sem movimentação'}</small>
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
                  <Field label="Responsável">
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
        <label htmlFor="timeline-filter-movimentacao">Movimentações</label>
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

function GkitJurProcessTimelinePreview({ rows }: { rows: GkitJurTimelineItem[] }) {
  const previewRows = rows.slice(0, 7)
  return (
    <div className="gkit-jur-process-timeline-preview">
      <div className="gkit-jur-process-timeline-head">
        <div>
          <span>Linha do tempo</span>
          <strong>Últimos acontecimentos</strong>
        </div>
        <Link className="button secondary" href="#timeline">Ver completa</Link>
      </div>
      {previewRows.length ? (
        <div className="gkit-jur-process-timeline-rail" role="list">
          {previewRows.map((row, index) => (
            <article className={`gkit-jur-process-timeline-node ${priorityTone(row.prioridade)} ${row.tipo}`} key={row.id} role="listitem">
              <span>{index + 1}</span>
              <div>
                <small>{formatDate(row.dataReferencia)} | {statusLabel(row.tipo)}</small>
                <strong>{row.titulo}</strong>
                {row.descricao ? <p>{row.descricao}</p> : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="suite-empty-block compact">Sem eventos registrados para montar a linha do tempo.</div>
      )}
    </div>
  )
}

function GkitJurProcessSignalList({
  fallback,
  items,
  title,
  tone,
}: {
  fallback: string
  items: string[]
  title: string
  tone: 'danger' | 'primary' | 'success' | 'warning'
}) {
  return (
    <article className={`gkit-jur-process-signal ${tone}`}>
      <span>{title}</span>
      <ul>
        {listOrFallback(items, fallback).slice(0, 4).map((item, index) => (
          <li key={`${title}-${index}-${item}`}>{item}</li>
        ))}
      </ul>
    </article>
  )
}

function withoutRepeatedSmartContext(summary: string, context?: string | null) {
  const cleanSummary = summary.trim()
  const cleanContext = String(context ?? '').trim()
  if (!cleanSummary || !cleanContext || !cleanSummary.startsWith(cleanContext)) return summary

  const deduped = cleanSummary
    .slice(cleanContext.length)
    .replace(/^[\s.,:;-]+/, '')
    .trim()

  return deduped || summary
}

function GkitJurProcessDashboard({
  canWrite,
  data,
  syncAction,
}: {
  canWrite: boolean
  data: GkitJurProcessDetailData
  syncAction?: (formData: FormData) => Promise<void>
}) {
  const { documentos, movimentacoes, processo, resumo, tarefas, timeline } = data
  const smartSummary = resumo?.resumoInteligente ?? null
  const readiness = resumo?.nivelProntidao ?? null
  const score = readinessScore(readiness)
  const relevantMovements = movimentacoes.filter((item) => item.relevante || item.geraAlerta).length
  const latestEvent = timeline[0]?.titulo ?? 'Sem evento recente registrado'
  const summaryText = withoutRepeatedSmartContext(
    smartSummary?.leituraExecutiva || executiveProcessSummary(data, relevantMovements),
    smartSummary?.doQueSeTrata,
  )
  const updatedAt = resumo?.geradoEm ?? resumo?.updatedAt ?? processo.updatedAt
  const summaryStatus = resumo
    ? `${readinessLabel(readiness)} | ${formatDateTime(updatedAt ?? null)}`
    : 'Sem registro em processos_resumos'
  const summaryTitle = smartSummary?.faseAtual || resumo?.faseProcessual || processo.titulo || 'Leitura executiva do processo'
  const summarySource = smartSummary?.fonte === 'openai' ? 'IA + base local' : resumo?.fonteResumo || 'sincronização pendente'
  const confidenceLabel = smartSummary?.nivelConfianca
    ? `${smartSummary.nivelConfianca}${smartSummary.precisaRevisaoHumana ? ' | revisar' : ''}`
    : '-'

  const cards = [
    { label: 'Tarefas abertas', value: tarefas.length.toLocaleString('pt-BR'), hint: tarefas[0]?.titulo ?? 'Sem tarefa aberta' },
    { label: 'Movimentações', value: movimentacoes.length.toLocaleString('pt-BR'), hint: `${relevantMovements.toLocaleString('pt-BR')} relevante(s) ou alerta(s)` },
    { label: 'Documentos', value: documentos.length.toLocaleString('pt-BR'), hint: documentos[0]?.titulo ?? 'Nenhum documento ativo' },
    { label: 'Último marco', value: formatDate(timeline[0]?.dataReferencia ?? processo.ultimaMovimentacaoEm), hint: latestEvent },
  ]

  return (
    <GkitJurSection
      action={(canWrite || syncAction) ? (
        <div className="gkit-jur-process-dashboard-actions">
          {syncAction ? (
            <form action={syncAction} className="gkit-jur-process-sync-form">
              <input name="processo_id" type="hidden" value={processo.id} />
              <input name="return_to" type="hidden" value={`/modulos/gkit-jur/processos/${processo.id}`} />
              <GkitJurSyncSubmitButton
                idleLabel="Atualizar agora"
                pendingHint="Consultando DataJud, atualizando resumo e aplicando retenção."
                pendingLabel="Atualizando..."
              />
            </form>
          ) : null}
          {canWrite ? <a className="button primary-button" href="#tarefas">Criar tarefa</a> : null}
          {canWrite ? <a className="button secondary" href="#ajustes-operacionais">Ajustes operacionais</a> : null}
        </div>
      ) : null}
      className="gkit-jur-process-dashboard"
      title="Dashboard do processo"
      description="Visão operacional para decidir o próximo movimento sem garimpar a página inteira."
    >
      <GkitJurProcessTimelinePreview rows={timeline} />

      <article className={`gkit-jur-process-summary-card ${resumo ? 'ready' : 'pending'}`}>
        <div className="gkit-jur-process-summary-head">
          <div>
            <span>{smartSummary ? 'Resumo inteligente' : 'Resumo operacional'}</span>
            <h3>{summaryTitle}</h3>
          </div>
          <span className={`suite-pill ${readinessTone(readiness)}`}>{summaryStatus}</span>
        </div>
        {smartSummary?.doQueSeTrata ? <small className="gkit-jur-smart-context">{smartSummary.doQueSeTrata}</small> : null}
        <p>{summaryText}</p>
        <div className="gkit-jur-process-summary-meta">
          <span>Fonte: <strong>{summarySource}</strong></span>
          <span>Modelo: <strong>{smartSummary?.modelo || resumo?.modeloVersao || '-'}</strong></span>
          <span>Confiança: <strong>{confidenceLabel}</strong></span>
          <span>Movimentações relevantes: <strong>{(resumo?.movimentacoesRelevantes ?? relevantMovements).toLocaleString('pt-BR')}</strong></span>
        </div>
        {smartSummary?.erroGeracaoIa ? <small className="gkit-jur-smart-warning">IA indisponível: usando leitura local.</small> : null}
      </article>

      <div className="gkit-jur-process-dashboard-main">
        <article className={`gkit-jur-process-readiness ${readinessTone(readiness)}`}>
          <div className="gkit-jur-readiness-ring" style={{ '--readiness': `${score}%` } as CSSProperties}>
            <strong>{score}%</strong>
            <span>prontidão</span>
          </div>
          <div>
            <span className={`suite-pill ${readinessTone(readiness)}`}>{readinessLabel(readiness)}</span>
            <h3>{processo.numeroCnj}</h3>
            <small>
              {processo.clienteNome || 'Sem cliente'} | {processo.carteiraNome || 'Sem carteira'} | {processo.responsavelNome || 'Sem responsável'}
            </small>
          </div>
        </article>

        <div className="gkit-jur-process-stat-grid">
          {cards.map((card) => (
            <article key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.hint}</small>
            </article>
          ))}
        </div>
      </div>

      <div className="gkit-jur-process-signals">
        <GkitJurProcessSignalList
          fallback={resumo ? 'Nenhuma pendência operacional destacada.' : 'Resumo ainda pendente de geração.'}
          items={resumo?.pendenciasIdentificadas ?? []}
          title="Pendências"
          tone="warning"
        />
        <GkitJurProcessSignalList
          fallback="Nenhum risco crítico destacado no resumo atual."
          items={smartSummary?.riscosAlertas?.length ? smartSummary.riscosAlertas : resumo?.riscosAlertas ?? []}
          title="Riscos e alertas"
          tone="danger"
        />
        <GkitJurProcessSignalList
          fallback="Sem próxima ação sugerida pelo resumo."
          items={smartSummary?.proximasAcoesSugeridas?.length ? smartSummary.proximasAcoesSugeridas : resumo?.proximasAcoesSugeridas ?? []}
          title="Próximas ações"
          tone="success"
        />
        <GkitJurProcessSignalList
          fallback="Sem principais andamentos destacados pelo agente."
          items={smartSummary?.principaisAndamentos ?? []}
          title="Andamentos chave"
          tone="primary"
        />
      </div>

      <div className="gkit-jur-process-facts">
        <span>Status: <strong>{optionLabel(gkitJurStatusOptions, processo.status)}</strong></span>
        <span>Monitoramento: <strong>{optionLabel(gkitJurMonitoramentoOptions, processo.statusMonitoramento)}</strong></span>
        <span>Tribunal: <strong>{processo.tribunalSigla || '-'}</strong></span>
        <span>Classe: <strong>{processo.classeNome || resumo?.faseProcessual || '-'}</strong></span>
        <span>Órgão: <strong>{processo.orgaoJulgadorNome || '-'}</strong></span>
        <span>Sincronização: <strong>{formatDateTime(processo.ultimaSincronizacaoEm ?? resumo?.baseSincronizacaoEm ?? null)}</strong></span>
        <span>Resumo: <strong>{formatDateTime(updatedAt ?? null)}</strong></span>
        <span>Eventos considerados: <strong>{(resumo?.movimentacoesConsideradas ?? movimentacoes.length).toLocaleString('pt-BR')}</strong></span>
      </div>
    </GkitJurSection>
  )
}

export function GkitJurProcessDetailPage({
  action,
  canSync,
  canWrite,
  createDocumentoAction,
  createEventoAction,
  createTarefaAction,
  createTarefaFromReferenceAction,
  data,
  syncAction,
  syncFeedback,
  updateTarefaPlanejamentoAction,
  updateTarefaStatusAction,
}: {
  action: (formData: FormData) => Promise<void>
  canSync: boolean
  canWrite: boolean
  createDocumentoAction: (formData: FormData) => Promise<void>
  createEventoAction: (formData: FormData) => Promise<void>
  createTarefaAction: (formData: FormData) => Promise<void>
  createTarefaFromReferenceAction: (formData: FormData) => Promise<void>
  data: GkitJurProcessDetailData
  syncAction: (formData: FormData) => Promise<void>
  syncFeedback: GkitJurProcessSyncFeedback
  updateTarefaPlanejamentoAction: (formData: FormData) => Promise<void>
  updateTarefaStatusAction: (formData: FormData) => Promise<void>
}) {
  const { documentos, formData, movimentacoes, processo, statusSuggestion, tarefas, timeline } = data
  const encerramentoObservacoes = [
    processo.observacoes,
    statusSuggestion
      ? `Sugestao aplicada pelo GKIT Jur: ${statusSuggestion.motivo}`
      : null,
  ].filter(Boolean).join('\n\n')

  return (
    <>
      {syncFeedback ? (
        <div className={`suite-alert ${syncFeedback.status === 'erro' || syncFeedback.erros ? 'warning' : 'success'} gkit-jur-process-sync-feedback`}>
          {syncFeedback.status === 'erro' ? (
            <span>{syncFeedback.mensagem || 'Não foi possível atualizar o processo agora.'}</span>
          ) : (
            <span>
              Processo atualizado. {syncFeedback.novas.toLocaleString('pt-BR')} movimentação(ões) nova(s), {syncFeedback.tarefas.toLocaleString('pt-BR')} tarefa(s) gerada(s).
              {syncFeedback.semResultado ? ` ${syncFeedback.semResultado.toLocaleString('pt-BR')} consulta(s) sem resultado.` : ''}
              {syncFeedback.erros ? ` ${syncFeedback.erros.toLocaleString('pt-BR')} erro(s) registrado(s).` : ''}
            </span>
          )}
        </div>
      ) : null}
      <GkitJurProcessDashboard canWrite={canWrite} data={data} syncAction={canSync ? syncAction : undefined} />
      {statusSuggestion ? (
        <GkitJurSection title="Sugestão operacional" description="Movimentação encontrada pela integração indica possível encerramento.">
          <div className="suite-alert warning gkit-jur-status-suggestion">
            <div>
              <strong>{statusSuggestion.tarefaTitulo}</strong>
              <p>{statusSuggestion.motivo}</p>
              <small>
                Status sugerido: {optionLabel(gkitJurStatusOptions, statusSuggestion.status)}
                {' '}| Monitoramento: {optionLabel(gkitJurMonitoramentoOptions, statusSuggestion.statusMonitoramento)}
              </small>
            </div>
            {canWrite ? (
              <form action={action}>
                <input name="id" type="hidden" value={processo.id} />
                <input name="cliente_id" type="hidden" value={processo.clienteId ?? ''} />
                <input name="carteira_id" type="hidden" value={processo.carteiraId ?? ''} />
                <input name="responsavel_id" type="hidden" value={processo.responsavelId ?? ''} />
                <input name="status" type="hidden" value={statusSuggestion.status} />
                <input name="status_monitoramento" type="hidden" value={statusSuggestion.statusMonitoramento} />
                <input name="observacoes" type="hidden" value={encerramentoObservacoes} />
                <button className="button primary-button" type="submit">Aplicar encerramento</button>
              </form>
            ) : null}
          </div>
        </GkitJurSection>
      ) : null}

      <GkitJurCollapsibleSection
        id="ajustes-operacionais"
        title="Ajustes operacionais"
        description="Corrija os vinculos usados por inbox, filtros e futuras rotinas."
      >
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

          <Field label="Responsável">
            <select disabled={!canWrite} name="responsavel_id" defaultValue={processo.responsavelId ?? ''}>
              {optionList(formData.responsaveis, 'Sem responsável')}
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
            <Field label="Observações internas">
              <textarea disabled={!canWrite} name="observacoes" defaultValue={processo.observacoes ?? ''} />
            </Field>
          </div>

          <div className="form-actions module-form-wide">
            {canWrite ? <button className="button primary-button" type="submit">Salvar processo</button> : null}
            <Link className="button secondary" href="/modulos/gkit-jur/processos">Voltar</Link>
            {processo.urlProcesso ? <Link className="button secondary" href={processo.urlProcesso}>Abrir origem</Link> : null}
          </div>
        </form>
      </GkitJurCollapsibleSection>

      <GkitJurCollapsibleSection
        className="gkit-jur-task-panel"
        title="Tarefas do processo"
        description="Providências manuais agora; depois a integração passa a criar tarefas nesta mesma fila."
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
            <Field label="Responsável">
              <select name="responsavel_id" defaultValue={processo.responsavelId ?? ''}>
                {optionList(formData.responsaveis, processo.responsavelNome || 'Herdar do processo')}
              </select>
            </Field>
            <div className="module-form-wide">
              <Field label="Título">
                <input name="titulo" placeholder="Ex.: revisar movimentação, preparar petição, confirmar prazo" />
              </Field>
            </div>
            <div className="module-form-wide">
              <Field label="Descrição">
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
      </GkitJurCollapsibleSection>

      <GkitJurSection
        className="gkit-jur-timeline-panel"
        title="Timeline operacional"
        description="Eventos relevantes do processo, combinando registros manuais, tarefas, documentos e movimentações."
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
            <Field label="Responsável">
              <select name="responsavel_id" defaultValue={processo.responsavelId ?? ''}>
                {optionList(formData.responsaveis, processo.responsavelNome || 'Herdar do processo')}
              </select>
            </Field>
            <div className="module-form-wide">
              <Field label="Título">
                <input name="titulo" placeholder="Ex.: protocolo realizado, contato com cliente, audiência designada" />
              </Field>
            </div>
            <div className="module-form-wide">
              <Field label="Descrição">
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
        description="Referências documentais do caso; upload e integração entram depois sobre esta mesma base."
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
            <Field label="Responsável">
              <select name="responsavel_id" defaultValue={processo.responsavelId ?? ''}>
                {optionList(formData.responsaveis, processo.responsavelNome || 'Herdar do processo')}
              </select>
            </Field>
            <div className="module-form-wide">
              <Field label="Título">
                <input name="titulo" placeholder="Ex.: petição inicial, decisão, comprovante, procuração" />
              </Field>
            </div>
            <div className="module-form-wide">
              <Field label="Link externo">
                <input name="url_externa" placeholder="https://..." />
              </Field>
            </div>
            <div className="module-form-wide">
              <Field label="Descrição">
                <textarea name="descricao" placeholder="Observação curta sobre o documento." />
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

      <GkitJurSection title="Movimentações" description="Histórico já preparado para receber as sincronizações futuras.">
        {movimentacoes.length ? <GkitJurMovimentacaoList rows={movimentacoes} /> : (
          <div className="suite-empty-block">Nenhuma movimentação registrada para este processo.</div>
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

function suggestionSourceLabel(value: GkitJurSaneamentoSuggestion['clienteFonte']) {
  if (value === 'cliente_nome') return 'cliente_nome'
  if (value === 'titulo_parte') return 'titulo'
  if (value === 'metadata') return 'dados do processo'
  return null
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
      description={`Sugestões encontradas: ${totals.total} processos, ${totals.cliente} cliente(s) (${totals.clienteAltaConfianca} alta confiança, ${totals.clienteMediaConfianca} revisar), ${totals.carteira} carteira(s), ${totals.responsavel} responsável(is).`}
      title="Sugestões de saneamento"
    >
      {rows.length ? (
        <form action={action} className="gkit-jur-suggestion-form">
          <div className="gkit-jur-suggestion-list" role="list">
            {rows.map((row) => (
              <label className="gkit-jur-suggestion-row" key={row.processo.id} role="listitem">
                <input
                  defaultChecked={row.clienteConfianca !== 'media'}
                  disabled={!canWrite}
                  name="processo_id"
                  type="checkbox"
                  value={row.processo.id}
                />
                <div>
                  <h3>{row.processo.numeroCnj}</h3>
                  <p>{row.processo.clienteNome || row.processo.titulo || 'Processo sem cliente identificado'}</p>
                </div>
                <SuggestionValue label="Cliente" value={row.clienteNome} />
                <SuggestionValue label="Carteira" value={row.carteiraNome} />
                <SuggestionValue label="Responsável" value={row.responsavelNome} />
                <small>
                  {[
                    row.motivo,
                    row.clienteConfianca ? `confiança ${row.clienteConfianca}` : null,
                    suggestionSourceLabel(row.clienteFonte),
                    row.clienteCandidato ? `candidato: ${row.clienteCandidato}` : null,
                  ].filter(Boolean).join(' | ')}
                </small>
              </label>
            ))}
          </div>
          <div className="gkit-jur-suggestion-actions">
            <span>{rows.length} sugestão(ões) exibida(s)</span>
            {canWrite ? <button className="button primary-button" type="submit">Aplicar selecionadas</button> : null}
          </div>
        </form>
      ) : (
        <div className="suite-empty-block">
          Nenhuma sugestão automática segura encontrada agora. Use as listas de pendências para ajustar manualmente.
        </div>
      )}
    </GkitJurSection>
  )
}

function GkitJurPendenciaQuickFilters({ data }: { data: GkitJurPendenciasData }) {
  const items = [
    { label: 'Inbox de pendências', href: '/modulos/gkit-jur/inbox?fila=pendencias', value: data.metrics.semCliente + data.metrics.semCarteira + data.metrics.semResponsavel, hint: 'fila operacional' },
    { label: 'Sem cliente', href: '/modulos/gkit-jur/processos?saneamento=sem_cliente', value: data.metrics.semCliente, hint: 'vínculo Ciclo' },
    { label: 'Sem carteira', href: '/modulos/gkit-jur/processos?saneamento=sem_carteira', value: data.metrics.semCarteira, hint: 'distribuição' },
    { label: 'Sem responsável', href: '/modulos/gkit-jur/processos?saneamento=sem_responsavel', value: data.metrics.semResponsavel, hint: 'dono operacional' },
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
              <div className="suite-empty-block success">Sem pendências nesta fila.</div>
            )}
          </GkitJurSection>
        ))}
      </div>
    </>
  )
}

function publicacaoHref(filters: GkitJurPublicacaoFilters, page: number) {
  const params = new URLSearchParams()
  Object.entries({ ...filters, page }).forEach(([key, value]) => {
    if (key === 'page') {
      if (Number(value) > 1) params.set(key, String(value))
      return
    }
    if (value) params.set(key, String(value))
  })
  const query = params.toString()
  return query ? `/modulos/gkit-jur/publicacoes?${query}` : '/modulos/gkit-jur/publicacoes'
}

function publicacaoStatusLabel(status: GkitJurPublicacao['status']) {
  const labels: Record<GkitJurPublicacao['status'], string> = {
    duplicada: 'Duplicada',
    dispensada: 'Dispensada',
    em_tratamento: 'Em tratamento',
    erro: 'Erro',
    pendente: 'Pendente',
    tratada: 'Tratada',
    triada_ia: 'Triada por IA',
  }
  return labels[status]
}

function publicacaoStatusTone(status: GkitJurPublicacao['status']) {
  if (status === 'tratada' || status === 'dispensada' || status === 'duplicada') return 'success'
  if (status === 'erro') return 'danger'
  if (status === 'em_tratamento' || status === 'triada_ia') return 'warning'
  return 'primary'
}

function GkitJurPublicacaoFilterBar({ data }: { data: GkitJurPublicacoesData }) {
  const { filterOptions, filters, pagination } = data
  const activeFilters = [
    filters.q ? { label: 'Busca', value: filters.q } : null,
    filters.status ? { label: 'Status', value: activeValueLabel(filterOptions.statuses, filters.status) } : null,
    filters.fonte ? { label: 'Fonte', value: filters.fonte } : null,
    filters.carteiraId ? { label: 'Carteira', value: activeValueLabel(filterOptions.carteiras, filters.carteiraId) } : null,
    filters.responsavelId ? { label: 'Responsavel', value: activeValueLabel(filterOptions.responsaveis, filters.responsavelId) } : null,
    filters.tribunal ? { label: 'Tribunal', value: filters.tribunal } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>

  return (
    <form className="gkit-jur-filter-bar" method="get">
      <div className="gkit-jur-filter-fields">
        <label>
          <span>Busca</span>
          <input defaultValue={filters.q} name="q" placeholder="CNJ, cliente, orgao ou texto" type="search" />
        </label>
        <SelectField label="Status" name="status" options={filterOptions.statuses} placeholder="Todos" value={filters.status} />
        <SelectField label="Fonte" name="fonte" options={filterOptions.fontes} placeholder="Todas" value={filters.fonte} />
        <SelectField label="Carteira" name="carteira_id" options={filterOptions.carteiras} placeholder="Todas" value={filters.carteiraId} />
        <SelectField label="Responsavel" name="responsavel_id" options={filterOptions.responsaveis} placeholder="Todos" value={filters.responsavelId} />
        <SelectField label="Tribunal" name="tribunal" options={filterOptions.tribunais} placeholder="Todos" value={filters.tribunal} />
        <SelectField
          label="Ordenar"
          name="sort"
          options={[
            { label: 'Data da publicacao', value: 'data_disponibilizacao' },
            { label: 'Criacao na caixa', value: 'created_at' },
            { label: 'Tratamento', value: 'tratado_em' },
            { label: 'Processo', value: 'processo' },
            { label: 'Fonte', value: 'fonte' },
            { label: 'Status', value: 'status' },
          ]}
          placeholder="Data da publicacao"
          value={filters.sort}
        />
        <SelectField
          label="Direcao"
          name="dir"
          options={[
            { label: 'Mais recentes', value: 'desc' },
            { label: 'Mais antigas', value: 'asc' },
          ]}
          placeholder="Mais recentes"
          value={filters.dir}
        />
      </div>
      <div className="gkit-jur-filter-actions">
        <span>{pagination.from}-{pagination.to} de {pagination.total}</span>
        <button className="button" type="submit">Filtrar</button>
        <Link className="button secondary" href="/modulos/gkit-jur/publicacoes">Limpar</Link>
      </div>
      <GkitJurActiveFilterChips items={activeFilters} />
    </form>
  )
}

function GkitJurPublicacaoPager({ data }: { data: GkitJurPublicacoesData }) {
  const { filters, pagination } = data
  return (
    <div className="gkit-jur-pagination">
      <span>Pagina {pagination.currentPage} de {pagination.totalPages}</span>
      <div>
        <Link
          aria-disabled={pagination.currentPage <= 1}
          className={pagination.currentPage <= 1 ? 'button secondary disabled' : 'button secondary'}
          href={publicacaoHref(filters, Math.max(1, pagination.currentPage - 1))}
        >
          Anterior
        </Link>
        <Link
          aria-disabled={pagination.currentPage >= pagination.totalPages}
          className={pagination.currentPage >= pagination.totalPages ? 'button secondary disabled' : 'button secondary'}
          href={publicacaoHref(filters, Math.min(pagination.totalPages, pagination.currentPage + 1))}
        >
          Proxima
        </Link>
      </div>
    </div>
  )
}

function GkitJurPublicacaoCard({
  canWrite,
  item,
  returnTo,
  tratamentoAction,
}: {
  canWrite: boolean
  item: GkitJurPublicacao
  returnTo: string
  tratamentoAction: (formData: FormData) => Promise<void>
}) {
  const done = ['tratada', 'dispensada', 'duplicada'].includes(item.status)
  return (
    <article className="suite-row-card gkit-jur-publication-card">
      <div className="suite-row-card-main">
        <div>
          <span className={`suite-pill ${publicacaoStatusTone(item.status)}`}>{publicacaoStatusLabel(item.status)}</span>
          <span className="suite-pill primary">{item.fonte}</span>
        </div>
        <h3>{item.numeroCnj}</h3>
        <p>{item.textoPreview || 'Publicacao sem preview textual.'}</p>
        <small>
          {[item.jornal, item.origemOrgao, item.arq ? `Arq ${item.arq}` : null, item.pub ? `Pub ${item.pub}` : null].filter(Boolean).join(' - ') || 'Metadados pendentes'}
        </small>
      </div>
      <div className="suite-row-card-meta">
        <strong>{formatDate(item.dataDisponibilizacao || item.dataPublicacao)}</strong>
        <span>{item.clienteNome || item.processoTitulo || 'Processo sem vinculo operacional'}</span>
        <small>{item.responsavelNome || item.carteiraNome || 'Sem responsavel definido'}</small>
        {item.tratadoEm ? <small>Tratada em {formatDateTime(item.tratadoEm)}</small> : null}
      </div>
      {item.sugestaoIa || item.motivoTratamento ? (
        <div className="suite-row-card-note">
          {item.sugestaoIa ? <p><strong>IA:</strong> {item.sugestaoIa}</p> : null}
          {item.motivoTratamento ? <p><strong>Tratamento:</strong> {item.motivoTratamento}</p> : null}
        </div>
      ) : null}
      {canWrite ? (
        <details className="gkit-jur-inline-form">
          <summary>{done ? 'Revisar tratamento' : 'Tratar publicacao'}</summary>
          <form action={tratamentoAction}>
            <input name="publicacao_id" type="hidden" value={item.id} />
            <input name="return_to" type="hidden" value={returnTo} />
            <div className="form-grid compact">
              <Field label="Status">
                <select name="status" defaultValue={item.status === 'pendente' ? 'em_tratamento' : item.status}>
                  <option value="pendente">Pendente</option>
                  <option value="triada_ia">Triada por IA</option>
                  <option value="em_tratamento">Em tratamento</option>
                  <option value="tratada">Tratada</option>
                  <option value="dispensada">Dispensada</option>
                  <option value="duplicada">Duplicada</option>
                  <option value="erro">Erro</option>
                </select>
              </Field>
              <Field label="Decisao">
                <select name="decisao_tratamento" defaultValue={item.decisaoTratamento ?? ''}>
                  <option value="">Sem decisao</option>
                  {gkitJurPublicacaoDecisaoOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
              <Field label="Prazo sugerido">
                <input name="prazo_at" type="datetime-local" />
              </Field>
              <label className="suite-checkbox">
                <input name="criar_tarefa" type="checkbox" value="on" />
                <span>Criar tarefa vinculada</span>
              </label>
            </div>
            <label>
              <span>Motivo ou orientacao</span>
              <textarea name="motivo_tratamento" placeholder="Registre a decisao humana, dispensa ou providencia tomada." rows={3} defaultValue={item.motivoTratamento ?? ''} />
            </label>
            <button className="button" type="submit">Salvar tratamento</button>
          </form>
        </details>
      ) : null}
      {item.processoId ? <Link className="button secondary" href={`/modulos/gkit-jur/processos/${item.processoId}`}>Abrir processo</Link> : null}
    </article>
  )
}

export function GkitJurPublicacoesPage({
  canWrite,
  data,
  returnTo,
  tratamentoAction,
}: {
  canWrite: boolean
  data: GkitJurPublicacoesData
  returnTo: string
  tratamentoAction: (formData: FormData) => Promise<void>
}) {
  return (
    <>
      <section className="suite-kpi-grid compact">
        <article className="metric-card">
          <span className="metric-label">Pendentes</span>
          <strong className="metric-value">{data.metrics.pendentes}</strong>
          <span className="metric-hint">aguardando triagem</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Em tratamento</span>
          <strong className="metric-value">{data.metrics.emTratamento + data.metrics.triadasIa}</strong>
          <span className="metric-hint">IA ou humano em curso</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Tratadas</span>
          <strong className="metric-value">{data.metrics.tratadas}</strong>
          <span className="metric-hint">com decisao registrada</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Sem processo</span>
          <strong className="metric-value">{data.metrics.semProcesso}</strong>
          <span className="metric-hint">exigem vinculacao</span>
        </article>
      </section>
      <GkitJurSection title="Publicacoes e intimacoes" description="Caixa de entrada para triagem, confirmacao humana e registro de tratamento.">
        <GkitJurPublicacaoFilterBar data={data} />
        {data.publicacoes.length ? (
          <div className="suite-card-list compact">
            {data.publicacoes.map((item) => (
              <GkitJurPublicacaoCard
                canWrite={canWrite}
                item={item}
                key={item.id}
                returnTo={returnTo}
                tratamentoAction={tratamentoAction}
              />
            ))}
          </div>
        ) : (
          <div className="suite-empty-block success">
            Nenhuma publicacao encontrada para os filtros atuais.
          </div>
        )}
        <GkitJurPublicacaoPager data={data} />
      </GkitJurSection>
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
            <p>{row.numeroCnj} - {row.clienteNome || 'Cliente não vinculado'}</p>
          </div>
          <span className={`suite-pill ${row.relevante ? 'warning' : 'primary'}`}>{row.origem}</span>
          <strong>{formatDate(row.dataHora)}</strong>
          <small>{row.geraAlerta ? 'gera alerta' : 'sem alerta'}</small>
        </Link>
      ))}
    </div>
  )
}

function GkitJurMovimentacaoFilterBar({ data }: { data: GkitJurMovimentacoesData }) {
  const { filterOptions, filters, pagination } = data
  const activeFilters = [
    filters.q ? { label: 'Busca', value: filters.q } : null,
    filters.origem ? { label: 'Origem', value: filters.origem } : null,
    filters.relevancia ? { label: 'Relevância', value: filters.relevancia === 'alerta' ? 'Gera alerta' : filters.relevancia === 'relevante' ? 'Relevante' : 'Informativa' } : null,
    filters.carteiraId ? { label: 'Carteira', value: activeValueLabel(filterOptions.carteiras, filters.carteiraId) } : null,
    filters.responsavelId ? { label: 'Responsável', value: activeValueLabel(filterOptions.responsaveis, filters.responsavelId) } : null,
    filters.tribunal ? { label: 'Tribunal', value: filters.tribunal } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>

  return (
    <form className="gkit-jur-filter-bar" method="get">
      <div className="gkit-jur-filter-fields">
        <label>
          <span>Busca</span>
          <input defaultValue={filters.q} name="q" placeholder="CNJ, cliente ou texto da movimentação" type="search" />
        </label>
        <SelectField label="Origem" name="origem" options={filterOptions.origens} placeholder="Todas" value={filters.origem} />
        <SelectField
          label="Relevância"
          name="relevancia"
          options={[
            { label: 'Relevante', value: 'relevante' },
            { label: 'Gera alerta', value: 'alerta' },
            { label: 'Informativa', value: 'informativa' },
          ]}
          placeholder="Todas"
          value={filters.relevancia}
        />
        <SelectField label="Carteira" name="carteira_id" options={filterOptions.carteiras} placeholder="Todas" value={filters.carteiraId} />
        <SelectField label="Responsável" name="responsavel_id" options={filterOptions.responsaveis} placeholder="Todos" value={filters.responsavelId} />
        <SelectField label="Tribunal" name="tribunal" options={filterOptions.tribunais} placeholder="Todos" value={filters.tribunal} />
        <SelectField
          label="Ordenar"
          name="sort"
          options={[
            { label: 'Data', value: 'data_hora' },
            { label: 'Movimentação', value: 'nome' },
            { label: 'Processo', value: 'processo' },
            { label: 'Origem', value: 'origem' },
          ]}
          placeholder="Data"
          value={filters.sort}
        />
        <SelectField
          label="Direção"
          name="dir"
          options={[
            { label: 'Mais recentes', value: 'desc' },
            { label: 'Mais antigas', value: 'asc' },
          ]}
          placeholder="Mais recentes"
          value={filters.dir}
        />
      </div>
      <div className="gkit-jur-filter-actions">
        <span>{pagination.from}-{pagination.to} de {pagination.total}</span>
        <button className="button" type="submit">Filtrar</button>
        <Link className="button secondary" href="/modulos/gkit-jur/movimentacoes">Limpar</Link>
      </div>
      <GkitJurActiveFilterChips items={activeFilters} />
    </form>
  )
}

function GkitJurMovimentacaoPager({ data }: { data: GkitJurMovimentacoesData }) {
  const { filters, pagination } = data
  return (
    <div className="gkit-jur-pagination">
      <span>Página {pagination.currentPage} de {pagination.totalPages}</span>
      <div>
        <Link
          aria-disabled={pagination.currentPage <= 1}
          className={pagination.currentPage <= 1 ? 'button secondary disabled' : 'button secondary'}
          href={movimentacaoHref(filters, Math.max(1, pagination.currentPage - 1))}
        >
          Anterior
        </Link>
        <Link
          aria-disabled={pagination.currentPage >= pagination.totalPages}
          className={pagination.currentPage >= pagination.totalPages ? 'button secondary disabled' : 'button secondary'}
          href={movimentacaoHref(filters, Math.min(pagination.totalPages, pagination.currentPage + 1))}
        >
          Próxima
        </Link>
      </div>
    </div>
  )
}

export function GkitJurMovimentacoesPage({ data }: { data: GkitJurMovimentacoesData }) {
  return (
    <>
      <MetricCards metrics={data.metrics} />
      <GkitJurSection title="Movimentações registradas" description="Filtre o histórico processual por origem, relevância e vínculos operacionais.">
        <GkitJurMovimentacaoFilterBar data={data} />
        {data.movimentacoes.length ? <GkitJurMovimentacaoList rows={data.movimentacoes} /> : (
          <div className="suite-empty-block">
            Nenhuma movimentação encontrada para os filtros atuais.
          </div>
        )}
        <GkitJurMovimentacaoPager data={data} />
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
          <span className="metric-label">Sincronizações</span>
          <strong className="metric-value">{data.sincronizacoes.length}</strong>
          <span className="metric-hint">últimas execuções</span>
        </article>
      </section>

      <GkitJurSection title="Sincronizações" description="Trilha preparada para registrar execuções DataJud quando a conexão for ligada.">
        {data.sincronizacoes.length ? (
          <div className="suite-table-list compact gkit-jur-audit-list" role="list">
            {data.sincronizacoes.map((item) => (
              <article key={item.id} role="listitem">
                <div>
                  <h3>{item.numeroCnj}</h3>
                  <p>{item.tribunalAlias} - {item.erroMensagem || 'Execução registrada'}</p>
                </div>
                <span className={`suite-pill ${item.status === 'sucesso' ? 'success' : item.status === 'erro' ? 'danger' : 'warning'}`}>{item.status}</span>
                <strong>{item.totalMovimentacoes}/{item.totalNovas}</strong>
                <small>{formatDate(item.startedAt)}</small>
              </article>
            ))}
          </div>
        ) : (
          <div className="suite-empty-block">Ainda não existem sincronizações registradas.</div>
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
  runMonitoramentoAction,
  runReceitaAction,
  validateExecucaoAction,
}: {
  canWrite: boolean
  createFonteAction: (formData: FormData) => Promise<void>
  createReceitaAction: (formData: FormData) => Promise<void>
  data: GkitJurAgenteData
  runMonitoramentoAction: (formData: FormData) => Promise<void>
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
          <span className="metric-hint">portais, diários, e-mails e APIs</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Receitas</span>
          <strong className="metric-value">{data.metrics.receitasAtivas}</strong>
          <span className="metric-hint">rotinas configuradas</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Pendentes</span>
          <strong className="metric-value">{data.metrics.pendentes}</strong>
          <span className="metric-hint">aguardam worker ou validação</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Falhas</span>
          <strong className="metric-value">{data.metrics.falhas}</strong>
          <span className="metric-hint">pedem intervenção humana</span>
        </article>
      </section>

      <GkitJurSection
        title="Monitoramento do resumo inteligente"
        description="Agente auxiliar acompanha cobertura, confiança e reprocessamento dos resumos dos processos ativos."
        action={canWrite ? (
          <form action={runMonitoramentoAction} className="gkit-jur-agent-monitor-action">
            <input name="limit" type="hidden" value="25" />
            <GkitJurSyncSubmitButton
              idleLabel="Rodar monitoramento"
              pendingHint="Analisando processos pendentes e atualizando os resumos inteligentes."
              pendingLabel="Monitorando..."
            />
          </form>
        ) : null}
      >
        <div className="gkit-jur-agent-monitor">
          <article className="gkit-jur-agent-monitor-hero">
            <span>Cobertura</span>
            <strong>{data.monitoramento.coberturaPercentual}%</strong>
            <small>
              {data.monitoramento.resumosInteligentes.toLocaleString('pt-BR')} de {data.monitoramento.totalAtivos.toLocaleString('pt-BR')} processo(s) ativo(s)
            </small>
          </article>
          <div className="gkit-jur-agent-monitor-grid">
            <span>OpenAI <strong>{data.monitoramento.openAiConfigurado ? 'configurado' : 'modo local'}</strong></span>
            <span>Modelo <strong>{data.monitoramento.modeloConfigurado}</strong></span>
            <span>IA <strong>{data.monitoramento.fonteOpenAi.toLocaleString('pt-BR')}</strong></span>
            <span>Local <strong>{data.monitoramento.fonteLocal.toLocaleString('pt-BR')}</strong></span>
            <span>Pendentes <strong>{data.monitoramento.pendentesResumo.toLocaleString('pt-BR')}</strong></span>
            <span>Revisão <strong>{data.monitoramento.precisaRevisaoHumana.toLocaleString('pt-BR')}</strong></span>
            <span>Baixa confiança <strong>{data.monitoramento.baixaConfianca.toLocaleString('pt-BR')}</strong></span>
            <span>Desatualizados <strong>{data.monitoramento.desatualizados.toLocaleString('pt-BR')}</strong></span>
          </div>
        </div>

        {data.monitoramento.fila.length ? (
          <div className="suite-table-list compact gkit-jur-agent-monitor-list" role="list">
            {data.monitoramento.fila.map((item) => (
              <Link href={`/modulos/gkit-jur/processos/${item.processoId}`} key={item.processoId} role="listitem">
                <div>
                  <h3>{item.numeroCnj}</h3>
                  <p>{item.titulo || item.clienteNome || 'Processo sem título operacional'}</p>
                </div>
                <span className={`suite-pill ${item.motivo.includes('Baixa') || item.motivo.includes('Falha') ? 'danger' : item.precisaRevisaoHumana ? 'warning' : 'primary'}`}>
                  {item.motivo}
                </span>
                <strong>{item.faseAtual || '-'}</strong>
                <small>{item.resumoUpdatedAt ? formatDateTime(item.resumoUpdatedAt) : 'Sem resumo'}</small>
              </Link>
            ))}
          </div>
        ) : (
          <div className="suite-empty-block success">Nenhum processo ativo exige reprocessamento do resumo inteligente agora.</div>
        )}
      </GkitJurSection>

      <div className="gkit-jur-agent-grid">
        <GkitJurSection title="Fonte" description="Cadastre uma origem técnica para futuras coletas.">
          <form action={createFonteAction} className="gkit-jur-agent-form">
            <AgentField label="Nome">
              <input className="text-input" disabled={!canWrite} name="nome" placeholder="DJe, PJe, e-SAJ, e-mail jurídico" />
            </AgentField>
            <AgentField label="Tipo">
              <select disabled={!canWrite} name="tipo" defaultValue="portal_web">
                <option value="portal_web">Portal web</option>
                <option value="diario">Diário</option>
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

        <GkitJurSection title="Receita" description="Defina uma rotina executável pelo agente.">
          <form action={createReceitaAction} className="gkit-jur-agent-form">
            <AgentField label="Nome">
              <input className="text-input" disabled={!canWrite} name="nome" placeholder="Coletar publicações do dia" />
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
                <option value="publicacao">Publicação</option>
                <option value="movimentacao">Movimentação</option>
                <option value="documento">Documento</option>
                <option value="prazo">Prazo</option>
                <option value="andamento">Andamento</option>
                <option value="email">E-mail</option>
              </select>
            </AgentField>
            <AgentField label="Periodicidade">
              <select disabled={!canWrite} name="periodicidade" defaultValue="manual">
                <option value="manual">Manual</option>
                <option value="diaria">Diária</option>
                <option value="horaria">Horária</option>
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

      <GkitJurSection title="Receitas configuradas" description="Dispare execuções manuais enquanto o worker externo não estiver ligado.">
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

      <GkitJurSection title="Execuções recentes" description="Histórico operacional do agente e validações humanas.">
        {data.execucoes.length ? (
          <div className="suite-table-list compact gkit-jur-agent-list" role="list">
            {data.execucoes.map((execucao) => (
              <article key={execucao.id} role="listitem">
                <div>
                  <h3>{execucao.receitaNome}</h3>
                  <p>{execucao.fonteNome || 'Fonte não definida'} - {execucao.erroMensagem || 'Execução registrada'}</p>
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
                    <input className="text-input" name="observacao" placeholder="Observação" />
                    <button className="button secondary" type="submit">Salvar</button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="suite-empty-block">Ainda não existem execuções do agente.</div>
        )}
      </GkitJurSection>
    </>
  )
}

const gkitJurConfiguracoesItems = [
  {
    title: 'Saneamento',
    description: 'Pendências de cliente, carteira, responsável e tribunal antes da operação jurídica.',
    href: '/modulos/gkit-jur/pendencias',
    label: 'Abrir saneamento',
  },
  {
    title: 'Integração jurídica',
    description: 'DataJud, AASP, fila de consulta, execuções e retornos das fontes.',
    href: '/modulos/gkit-jur/configuracoes/integracao',
    label: 'Configurar integração',
  },
  {
    title: 'Movimentação -> tarefa',
    description: 'De/para que transforma movimentações do DataJud em tarefas do inbox.',
    href: '/modulos/gkit-jur/configuracoes/movimentacao-tarefa',
    label: 'Configurar regras',
  },
  {
    title: 'Agente auxiliar',
    description: 'Fontes, receitas, validações e execuções assistidas do módulo jurídico.',
    href: '/modulos/gkit-jur/agente',
    label: 'Abrir agente',
  },
  {
    title: 'Cadastros',
    description: 'Tabelas de apoio, tipos e parâmetros operacionais do Jur.',
    href: '/modulos/gkit-jur/cadastros',
    label: 'Abrir cadastros',
  },
  {
    title: 'Auditoria',
    description: 'Histórico técnico de importações, sincronizações e eventos operacionais.',
    href: '/modulos/gkit-jur/auditoria',
    label: 'Abrir auditoria',
  },
]

export function GkitJurConfiguracoesPage() {
  return (
    <GkitJurSection title="Áreas de configuração" description="Centralize parâmetros, saneamento e integrações fora da rotina diária do inbox.">
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

function termsText(terms: string[]) {
  return terms.join(', ')
}

function GkitJurMovimentacaoTarefaForm({
  action,
  canWrite,
  regra,
}: {
  action: (formData: FormData) => Promise<void>
  canWrite: boolean
  regra?: GkitJurMovimentacaoTarefaData['regras'][number]
}) {
  return (
    <form action={action} className="module-form module-form-grid gkit-jur-rule-form">
      {regra ? <input name="id" type="hidden" value={regra.id} /> : null}
      <label>
        Nome
        <input disabled={!canWrite} name="nome" required defaultValue={regra?.nome ?? ''} placeholder="Ex.: Publicação ou intimação" />
      </label>
      <label>
        Código CNJ
        <input disabled={!canWrite} name="codigo_movimento" type="number" defaultValue={regra?.codigoMovimento ?? ''} placeholder="Opcional" />
      </label>
      <label className="span-2">
        Termos da movimentação
        <input disabled={!canWrite} name="termos" defaultValue={regra ? termsText(regra.termos) : ''} placeholder="publicação, intimação, audiência" />
      </label>
      <label>
        Tipo da tarefa
        <select disabled={!canWrite} name="tipo_tarefa" defaultValue={regra?.tipoTarefa ?? 'providencia_interna'}>
          {gkitJurTarefaTipoOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label>
        Prioridade
        <select disabled={!canWrite} name="prioridade" defaultValue={regra?.prioridade ?? 'media'}>
          {gkitJurTarefaPrioridadeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label>
        Prazo em dias
        <input disabled={!canWrite} name="prazo_dias" type="number" defaultValue={regra?.prazoDias ?? ''} placeholder="Sem prazo" />
      </label>
      <label className="span-2">
        Título da tarefa
        <input disabled={!canWrite} name="titulo_template" required defaultValue={regra?.tituloTemplate ?? ''} placeholder="Ex.: Analisar publicação/intimação" />
      </label>
      <label className="span-2">
        Descrição da tarefa
        <textarea disabled={!canWrite} name="descricao_template" rows={3} defaultValue={regra?.descricaoTemplate ?? ''} placeholder="Use {{movimentacao}} e {{numero_cnj}} se quiser puxar dados da movimentação." />
      </label>
      <label className="span-2">
        Descrição interna da regra
        <input disabled={!canWrite} name="descricao" defaultValue={regra?.descricao ?? ''} placeholder="Quando esta regra deve ser aplicada." />
      </label>
      <div className="gkit-jur-rule-switches span-2">
        <label>
          <input disabled={!canWrite} name="gerar_automaticamente" type="checkbox" defaultChecked={regra?.gerarAutomaticamente ?? true} />
          Gerar tarefa automaticamente
        </label>
        <label>
          <input disabled={!canWrite} name="ativo" type="checkbox" defaultChecked={regra?.ativo ?? true} />
          Regra ativa
        </label>
      </div>
      {canWrite ? <button className="button primary-button" type="submit">{regra ? 'Salvar regra' : 'Criar regra'}</button> : null}
    </form>
  )
}

function GkitJurMovimentacaoTarefaPageOld({
  canWrite,
  data,
  saved,
  saveAction,
  toggleAction,
}: {
  canWrite: boolean
  data: GkitJurMovimentacaoTarefaData
  saved: boolean
  saveAction: (formData: FormData) => Promise<void>
  toggleAction: (formData: FormData) => Promise<void>
}) {
  const cards = [
    { title: 'Regras', value: data.metrics.total.toLocaleString('pt-BR'), hint: 'mapeamentos cadastrados' },
    { title: 'Ativas', value: data.metrics.ativas.toLocaleString('pt-BR'), hint: 'em uso na sincronização' },
    { title: 'Automáticas', value: data.metrics.automaticas.toLocaleString('pt-BR'), hint: 'geram tarefa sem revisão prévia' },
  ]

  return (
    <>
      {saved ? <div className="suite-alert success">Regra salva. A próxima sincronização já considera este de/para.</div> : null}
      <section className="suite-kpi-grid compact">
        {cards.map((card) => (
          <article className="metric-card" key={card.title}>
            <span className="metric-label">{card.title}</span>
            <strong className="metric-value">{card.value}</strong>
            <span className="metric-hint">{card.hint}</span>
          </article>
        ))}
      </section>

      <GkitJurSection title="Nova regra" description="Cadastre a relação entre uma movimentação do DataJud e a tarefa que deve entrar no inbox.">
        <GkitJurMovimentacaoTarefaForm action={saveAction} canWrite={canWrite} />
      </GkitJurSection>

      <GkitJurSection title="Regras configuradas" description="Ajuste termos, prioridade, prazo e geração automática sem mexer no código.">
        {data.regras.length ? (
          <div className="suite-table-list compact gkit-jur-rule-list" role="list">
            {data.regras.map((regra) => (
              <article key={regra.id} role="listitem">
                <div className="gkit-jur-rule-head">
                  <div>
                    <h3>{regra.nome}</h3>
                    <p>{regra.descricao || 'Sem descrição interna.'}</p>
                  </div>
                  <div className="gkit-jur-rule-actions">
                    <span className={`suite-pill ${regra.ativo ? 'success' : 'muted'}`}>{regra.ativo ? 'Ativa' : 'Inativa'}</span>
                    <span className={`suite-pill ${regra.gerarAutomaticamente ? 'success' : 'warning'}`}>{regra.gerarAutomaticamente ? 'Automática' : 'Manual'}</span>
                    {canWrite ? (
                      <form action={toggleAction}>
                        <input name="id" type="hidden" value={regra.id} />
                        <input name="ativo" type="hidden" value={regra.ativo ? 'false' : 'true'} />
                        <button className="button secondary" type="submit">{regra.ativo ? 'Desativar' : 'Ativar'}</button>
                      </form>
                    ) : null}
                  </div>
                </div>
                <div className="gkit-jur-rule-summary-grid">
                  <span><strong>Gatilho</strong>{regra.codigoMovimento ? `CNJ ${regra.codigoMovimento}` : termsText(regra.termos) || 'Termos nao definidos'}</span>
                  <span><strong>Tarefa</strong>{gkitJurTarefaTipoOptions.find((option) => option.value === regra.tipoTarefa)?.label ?? regra.tipoTarefa}</span>
                  <span><strong>Prioridade</strong>{gkitJurTarefaPrioridadeOptions.find((option) => option.value === regra.prioridade)?.label ?? regra.prioridade}</span>
                  <span><strong>Prazo</strong>{regra.prazoDias ? `${regra.prazoDias} dia(s)` : 'Sem prazo'}</span>
                </div>
                <details className="gkit-jur-rule-edit">
                  <summary>Editar regra</summary>
                  <GkitJurMovimentacaoTarefaForm action={saveAction} canWrite={canWrite} regra={regra} />
                </details>
              </article>
            ))}
          </div>
        ) : (
          <div className="suite-empty-block">Nenhuma regra cadastrada ainda.</div>
        )}
      </GkitJurSection>
    </>
  )
}

function GkitJurRuleFormClean({
  action,
  canWrite,
  regra,
}: {
  action: (formData: FormData) => Promise<void>
  canWrite: boolean
  regra?: GkitJurMovimentacaoTarefaData['regras'][number]
}) {
  return (
    <form action={action} className="module-form module-form-grid gkit-jur-rule-form gkit-jur-rule-form-clean">
      {regra ? <input name="id" type="hidden" value={regra.id} /> : null}
      <label>
        Nome da regra
      <input disabled={!canWrite} name="nome" required defaultValue={regra?.nome ?? ''} placeholder="Ex.: Intimação publicada" />
      </label>
      <label>
        Código CNJ
        <input disabled={!canWrite} name="codigo_movimento" type="number" defaultValue={regra?.codigoMovimento ?? ''} placeholder="Opcional" />
      </label>
      <label className="span-2">
        Termos que disparam a regra
        <input disabled={!canWrite} name="termos" defaultValue={regra ? termsText(regra.termos) : ''} placeholder="publicação, intimação, audiência" />
      </label>
      <label>
        Tipo da tarefa
        <select disabled={!canWrite} name="tipo_tarefa" defaultValue={regra?.tipoTarefa ?? 'providencia_interna'}>
          {gkitJurTarefaTipoOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label>
        Prioridade
        <select disabled={!canWrite} name="prioridade" defaultValue={regra?.prioridade ?? 'media'}>
          {gkitJurTarefaPrioridadeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label>
        Prazo
        <input disabled={!canWrite} name="prazo_dias" type="number" defaultValue={regra?.prazoDias ?? ''} placeholder="Sem prazo" />
      </label>
      <label className="span-2">
        Título gerado no inbox
        <input disabled={!canWrite} name="titulo_template" required defaultValue={regra?.tituloTemplate ?? ''} placeholder="Ex.: Analisar intimação do processo {{numero_cnj}}" />
      </label>
      <label className="span-2">
        Descrição da tarefa
        <textarea disabled={!canWrite} name="descricao_template" rows={3} defaultValue={regra?.descricaoTemplate ?? ''} placeholder="Use {{movimentacao}} e {{numero_cnj}} para montar a orientação do advogado." />
      </label>
      <label className="span-2">
        Observação interna
        <input disabled={!canWrite} name="descricao" defaultValue={regra?.descricao ?? ''} placeholder="Quando aplicar esta regra." />
      </label>
      <div className="gkit-jur-rule-switches span-2">
        <label>
          <input disabled={!canWrite} name="gerar_automaticamente" type="checkbox" defaultChecked={regra?.gerarAutomaticamente ?? true} />
          Gerar automaticamente
        </label>
        <label>
          <input disabled={!canWrite} name="ativo" type="checkbox" defaultChecked={regra?.ativo ?? true} />
          Regra ativa
        </label>
      </div>
      {canWrite ? <button className="button primary-button" type="submit">{regra ? 'Salvar alterações' : 'Criar regra'}</button> : null}
    </form>
  )
}

function ruleOptionLabel(options: Array<{ label: string; value: string }>, value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

function GkitJurRuleCardClean({
  canWrite,
  regra,
  saveAction,
  toggleAction,
}: {
  canWrite: boolean
  regra: GkitJurMovimentacaoTarefaData['regras'][number]
  saveAction: (formData: FormData) => Promise<void>
  toggleAction: (formData: FormData) => Promise<void>
}) {
  const trigger = regra.codigoMovimento ? `CNJ ${regra.codigoMovimento}` : termsText(regra.termos) || 'Sem gatilho definido'

  return (
    <article role="listitem">
      <div className="gkit-jur-rule-head">
        <div>
          <h3>{regra.nome}</h3>
          <p>{regra.descricao || 'Sem observação interna.'}</p>
        </div>
        <div className="gkit-jur-rule-actions">
          <span className={`suite-pill ${regra.ativo ? 'success' : 'muted'}`}>{regra.ativo ? 'Ativa' : 'Inativa'}</span>
          <span className={`suite-pill ${regra.gerarAutomaticamente ? 'success' : 'warning'}`}>{regra.gerarAutomaticamente ? 'Automática' : 'Manual'}</span>
          {canWrite ? (
            <form action={toggleAction}>
              <input name="id" type="hidden" value={regra.id} />
              <input name="ativo" type="hidden" value={regra.ativo ? 'false' : 'true'} />
              <button className="button secondary" type="submit">{regra.ativo ? 'Desativar' : 'Ativar'}</button>
            </form>
          ) : null}
        </div>
      </div>
      <div className="gkit-jur-rule-summary-grid">
        <span><strong>Gatilho</strong>{trigger}</span>
        <span><strong>Tarefa</strong>{ruleOptionLabel(gkitJurTarefaTipoOptions, regra.tipoTarefa)}</span>
        <span><strong>Prioridade</strong>{ruleOptionLabel(gkitJurTarefaPrioridadeOptions, regra.prioridade)}</span>
        <span><strong>Prazo</strong>{regra.prazoDias ? `${regra.prazoDias} dia(s)` : 'Sem prazo'}</span>
      </div>
      <details className="gkit-jur-rule-edit">
        <summary>Editar regra</summary>
        <GkitJurRuleFormClean action={saveAction} canWrite={canWrite} regra={regra} />
      </details>
    </article>
  )
}

export function GkitJurMovimentacaoTarefaPage({
  canWrite,
  data,
  saved,
  saveAction,
  toggleAction,
}: {
  canWrite: boolean
  data: GkitJurMovimentacaoTarefaData
  saved: boolean
  saveAction: (formData: FormData) => Promise<void>
  toggleAction: (formData: FormData) => Promise<void>
}) {
  const cards = [
    { title: 'Regras', value: data.metrics.total.toLocaleString('pt-BR'), hint: 'mapeamentos cadastrados' },
    { title: 'Ativas', value: data.metrics.ativas.toLocaleString('pt-BR'), hint: 'em uso na sincronização' },
    { title: 'Automáticas', value: data.metrics.automaticas.toLocaleString('pt-BR'), hint: 'geram tarefa sem revisão prévia' },
  ]

  return (
    <>
      {saved ? <div className="suite-alert success">Regra salva. A próxima sincronização já considera este de/para.</div> : null}
      <section className="suite-kpi-grid compact">
        {cards.map((card) => (
          <article className="metric-card" key={card.title}>
            <span className="metric-label">{card.title}</span>
            <strong className="metric-value">{card.value}</strong>
            <span className="metric-hint">{card.hint}</span>
          </article>
        ))}
      </section>

      <GkitJurSection title="Nova regra" description="Cadastre o de/para entre movimentação recebida e tarefa operacional do inbox.">
        <GkitJurRuleFormClean action={saveAction} canWrite={canWrite} />
      </GkitJurSection>

      <GkitJurSection title="Regras configuradas" description="Revise gatilhos, prazos e status. Abra a edição somente quando precisar ajustar uma regra.">
        {data.regras.length ? (
          <div className="suite-table-list compact gkit-jur-rule-list" role="list">
            {data.regras.map((regra) => (
              <GkitJurRuleCardClean
                canWrite={canWrite}
                key={regra.id}
                regra={regra}
                saveAction={saveAction}
                toggleAction={toggleAction}
              />
            ))}
          </div>
        ) : (
          <div className="suite-empty-block">Nenhuma regra cadastrada ainda.</div>
        )}
      </GkitJurSection>
    </>
  )
}

export function GkitJurIntegracaoPage({
  canSync,
  data,
  feedback,
  syncAction,
}: {
  canSync: boolean
  data: GkitJurIntegracaoData
  feedback: GkitJurIntegracaoSyncFeedback
  syncAction: (formData: FormData) => Promise<void>
}) {
  const totalSincronizado = Math.max(0, data.metrics.totalAtivos - data.metrics.semSincronizacao)
  const prontidaoProgress = data.metrics.totalAtivos ? Math.round((data.prontidao.aceitaveis / data.metrics.totalAtivos) * 100) : 0
  const cards = [
    { title: 'Processos ativos', value: data.metrics.totalAtivos.toLocaleString('pt-BR'), hint: 'base operacional monitorável' },
    { title: 'Prontos', value: data.prontidao.aceitaveis.toLocaleString('pt-BR'), hint: 'com resumo operacional aceitável' },
    { title: 'Não prontos', value: data.prontidao.naoProntos.toLocaleString('pt-BR'), hint: 'prioridade da fila automática' },
    { title: 'Críticos', value: data.metrics.criticos.toLocaleString('pt-BR'), hint: 'sem mapeamento ou com erro' },
  ]

  const cronPillClass = data.cron.status === 'erro'
    ? 'danger'
    : data.cron.status === 'em_execucao'
      ? 'warning'
      : data.cron.ativo
        ? 'success'
        : 'muted'
  const cronStatusLabel = data.cron.status === 'em_execucao'
    ? 'Em execução'
    : data.cron.status === 'erro'
      ? 'Com erro'
      : data.cron.ativo
        ? 'Ativo'
        : 'Inativo'

  return (
    <>
      {feedback ? (
        <div className={`suite-alert ${feedback.erros ? 'warning' : 'success'}`}>
          Sincronização executada: {feedback.processos.toLocaleString('pt-BR')} processo(s), {feedback.novas.toLocaleString('pt-BR')} movimento(s) novo(s), {feedback.tarefas.toLocaleString('pt-BR')} tarefa(s) gerada(s), {feedback.semResultado.toLocaleString('pt-BR')} sem resultado e {feedback.erros.toLocaleString('pt-BR')} erro(s).
        </div>
      ) : null}

      <section className="suite-kpi-grid compact">
        {cards.map((card) => (
          <article className="metric-card" key={card.title}>
            <span className="metric-label">{card.title}</span>
            <strong className="metric-value">{card.value}</strong>
            <span className="metric-hint">{card.hint}</span>
          </article>
        ))}
      </section>

      <GkitJurSection title="Agendamento automático" description="Sincronização redundante diária para manter processos ativos atualizados sem operação manual.">
        <div className="gkit-jur-cron-panel">
          <div className="gkit-jur-cron-summary">
            <span className={`suite-pill ${cronPillClass}`}>{cronStatusLabel}</span>
            <div>
              <strong>{data.cron.horarioLocal}</strong>
              <small>Todos os dias em {data.cron.timezone}</small>
            </div>
            <div>
              <strong>{data.cron.provider}</strong>
              <small>{data.cron.schedule} | {data.cron.batchLimit} por lote, até {data.cron.maxBatches} lotes</small>
            </div>
          </div>

          <dl className="gkit-jur-cron-details">
            <div>
              <dt>Próximo disparo</dt>
              <dd>{formatDateTime(data.cron.nextRunAt)}</dd>
            </div>
            <div>
              <dt>Último início</dt>
              <dd>{formatDateTime(data.cron.lastStartedAt)}</dd>
            </div>
            <div>
              <dt>Última conclusão</dt>
              <dd>{formatDateTime(data.cron.lastFinishedAt)}</dd>
            </div>
            <div>
              <dt>Janela máxima</dt>
              <dd>{Math.round(data.cron.timeBudgetMs / 1000)}s</dd>
            </div>
          </dl>

          {data.cron.lastResult ? (
            <div className="gkit-jur-cron-result">
              <span>{data.cron.lastResult.processos.toLocaleString('pt-BR')} processo(s)</span>
              <span>{data.cron.lastResult.movimentosNovos.toLocaleString('pt-BR')} movimento(s) novo(s)</span>
              <span>{data.cron.lastResult.tarefasGeradas.toLocaleString('pt-BR')} tarefa(s)</span>
              <span>{data.cron.lastResult.erros.toLocaleString('pt-BR')} erro(s)</span>
            </div>
          ) : (
            <div className="suite-empty-block compact">A execução automática ainda não registrou resultado.</div>
          )}

          {data.cron.lastError ? <div className="suite-alert warning">Último erro: {data.cron.lastError}</div> : null}

          <form action={syncAction} className="gkit-jur-cron-action">
            <input name="provider" type="hidden" value="redundante" />
            <input name="tribunal" type="hidden" value="todos" />
            <input name="limit" type="hidden" value={String(data.cron.batchLimit)} />
            <input name="aasp_diferencial" type="hidden" value="on" />
            {canSync ? (
              <GkitJurSyncSubmitButton
                idleLabel="Executar agora"
                pendingHint="Executando sincronização redundante e atualizando o painel."
                pendingLabel="Executando..."
              />
            ) : (
              <span className="suite-pill muted">Sem permissão de sincronização</span>
            )}
          </form>
        </div>
      </GkitJurSection>

      <GkitJurSection title="Executar sincronização" description="Busca processos e intimações nas fontes configuradas, grava movimentações novas e registra auditoria da execução.">
        <form action={syncAction} className="gkit-jur-sync-form">
          <label>
            <span>Provedor</span>
            <select disabled={!canSync} name="provider" defaultValue="datajud">
              <option value="redundante">Redundante: DataJud + AASP</option>
              <option value="datajud">DataJud</option>
              <option value="aasp">AASP Intimações</option>
            </select>
          </label>
          <label>
            <span>Tribunal</span>
            <select disabled={!canSync} name="tribunal" defaultValue="todos">
              <option value="todos">Todos os tribunais configurados</option>
              {data.tribunais.filter((tribunal) => tribunal.alias && tribunal.tribunal !== 'SEM_TRIBUNAL').map((tribunal) => (
                <option key={tribunal.tribunal} value={tribunal.tribunal}>{tribunal.tribunal} - {tribunal.nome}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Limite</span>
            <select disabled={!canSync} name="limit" defaultValue="5">
              <option value="1">1 processo</option>
              <option value="5">5 processos</option>
              <option value="10">10 processos</option>
              <option value="25">25 processos</option>
            </select>
          </label>
          <label>
            <span>Data AASP</span>
            <input disabled={!canSync} name="aasp_data" type="date" />
          </label>
          <label className="gkit-jur-sync-check">
            <input disabled={!canSync} name="aasp_diferencial" type="checkbox" />
            <span>AASP diferencial</span>
          </label>
          {canSync ? (
            <GkitJurSyncSubmitButton />
          ) : (
            <span className="suite-pill muted">Sem permissão de sincronização</span>
          )}
        </form>
      </GkitJurSection>

      <GkitJurSection title="Semáforo de monitoramento" description="Acompanhe a prontidão da integração por tribunal, priorizando processos ativos.">
        <div className="gkit-jur-sync-overview">
          <div>
            <span>Prontidão operacional</span>
            <strong>{prontidaoProgress}% pronto</strong>
            <small>
              {data.prontidao.aceitaveis.toLocaleString('pt-BR')} pronto(s), {data.prontidao.parcial.toLocaleString('pt-BR')} parcial(is), {data.prontidao.capa.toLocaleString('pt-BR')} só com capa e {data.prontidao.semResumo.toLocaleString('pt-BR')} sem resumo recalculado.
            </small>
          </div>
          <div aria-hidden="true" className="gkit-jur-sync-progress">
            <span style={{ width: `${prontidaoProgress}%` }} />
          </div>
          <small>{totalSincronizado.toLocaleString('pt-BR')} de {data.metrics.totalAtivos.toLocaleString('pt-BR')} processos ativos já têm primeira sincronização.</small>
        </div>
        <div className="gkit-jur-monitoring-list">
          {data.tribunais.map((tribunal) => {
            const synced = Math.max(0, tribunal.totalAtivos - tribunal.semSincronizacao)
            const progress = tribunal.totalAtivos ? Math.round((synced / tribunal.totalAtivos) * 100) : 0
            const pendencias = [
              tribunal.semSincronizacao ? `${tribunal.semSincronizacao.toLocaleString('pt-BR')} sem primeira sincronização` : '',
              tribunal.atrasados ? `${tribunal.atrasados.toLocaleString('pt-BR')} atrasado(s)` : '',
              tribunal.erro ? `${tribunal.erro.toLocaleString('pt-BR')} com erro` : '',
              tribunal.saneamentoProcessos ? `${tribunal.saneamentoProcessos.toLocaleString('pt-BR')} em saneamento` : '',
            ].filter(Boolean)

            return (
              <article className={`gkit-jur-monitoring-row ${tribunal.nivel}`} key={tribunal.tribunal}>
                <div className="gkit-jur-monitoring-status">
                  <span aria-hidden="true" />
                  <strong>{tribunal.status}</strong>
                  <small>{progress}% sincronizado</small>
                </div>
                <div className="gkit-jur-monitoring-main">
                  <strong>{tribunal.tribunal}</strong>
                  <span>{tribunal.nome}</span>
                  <div aria-hidden="true" className="gkit-jur-sync-progress compact">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <small>
                    {synced.toLocaleString('pt-BR')} de {tribunal.totalAtivos.toLocaleString('pt-BR')} processos com sincronização
                  </small>
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
                    <dt>Sem sincronização</dt>
                    <dd>{tribunal.semSincronizacao.toLocaleString('pt-BR')}</dd>
                  </div>
                  <div>
                    <dt>Saneamento</dt>
                    <dd>{tribunal.saneamentoProcessos.toLocaleString('pt-BR')}</dd>
                  </div>
                </dl>
                <div className="gkit-jur-monitoring-actions">
                  <small>{pendencias.length ? pendencias.join(' | ') : 'Fila em dia'}</small>
                  <Link className="button secondary" href={tribunal.tribunal === 'SEM_TRIBUNAL' ? '/modulos/gkit-jur/pendencias' : `/modulos/gkit-jur/processos?status=ativo&tribunal=${encodeURIComponent(tribunal.tribunal)}`}>
                    Ver processos
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      </GkitJurSection>

      <GkitJurSection title="Roteiro DataJud" description="Próximos passos para sair do monitoramento manual para a sincronização automática.">
        <div className="gkit-jur-integration-steps">
          <article>
            <span>1</span>
            <div>
              <h3>Configurar chave pública</h3>
              <p>Guardar a API Key em variável de ambiente e validar o header Authorization.</p>
            </div>
          </article>
          <article>
            <span>2</span>
            <div>
              <h3>Habilitar tribunais</h3>
              <p>Começar pelos tribunais existentes na base ativa de processos.</p>
            </div>
          </article>
          <article>
            <span>3</span>
            <div>
              <h3>Sincronizar processo</h3>
              <p>Buscar por CNJ, gravar movimentações novas e atualizar a timeline.</p>
            </div>
          </article>
          <article>
            <span>4</span>
            <div>
              <h3>Monitorar execuções</h3>
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
        Estrutura criada. O próximo passo é definir campos, regras e integrações desta área.
      </div>
    </GkitJurSection>
  )
}
