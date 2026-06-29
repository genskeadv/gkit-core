import Link from 'next/link'
import type { ReactNode } from 'react'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import type { PlatformUsuario } from '@/lib/auth/platform'
import {
  gkitJurMonitoramentoOptions,
  gkitJurStatusOptions,
} from './queries'
import type {
  GkitJurAgenteData,
  GkitJurAuditoriaData,
  GkitJurDashboardMetrics,
  GkitJurFormData,
  GkitJurInboxData,
  GkitJurInboxItem,
  GkitJurInboxPrioridade,
  GkitJurMovimentacoesData,
  GkitJurPendenciasData,
  GkitJurProcessDetailData,
  GkitJurProcessFilters,
  GkitJurProcessListData,
  GkitJurProcessListItem,
  GkitJurSaneamentoSuggestion,
  GkitJurSelectOption,
} from './types'

type GkitJurTab = 'inbox' | 'processos' | 'pendencias' | 'movimentacoes' | 'agente' | 'cadastros' | 'auditoria'

const activeHref: Record<GkitJurTab, string> = {
  inbox: '/modulos/gkit-jur/inbox',
  processos: '/modulos/gkit-jur/processos',
  pendencias: '/modulos/gkit-jur/pendencias',
  movimentacoes: '/modulos/gkit-jur/movimentacoes',
  agente: '/modulos/gkit-jur/agente',
  cadastros: '/modulos/gkit-jur/cadastros',
  auditoria: '/modulos/gkit-jur/auditoria',
}

const navGroups: ModuleNavGroup[] = [
  { href: '/modulos/gkit-jur/inbox', title: 'Inbox' },
  { href: '/modulos/gkit-jur/processos', title: 'Processos' },
  { href: '/modulos/gkit-jur/pendencias', title: 'Pendencias' },
  { href: '/modulos/gkit-jur/movimentacoes', title: 'Movimentacoes' },
  { href: '/modulos/gkit-jur/agente', title: 'Agente' },
  { href: '/modulos/gkit-jur/cadastros', title: 'Cadastros' },
  { href: '/modulos/gkit-jur/auditoria', title: 'Auditoria' },
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

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('pt-BR')
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

function InboxItemCard({ item, index }: { item: GkitJurInboxItem; index: number }) {
  return (
    <Link className="gkit-jur-inbox-item" href={item.acaoUrl}>
      <span className="gkit-jur-inbox-rank">{index + 1}</span>
      <div>
        <div className="gkit-jur-inbox-item-head">
          <span className={`suite-pill ${priorityTone(item.prioridade)}`}>{item.prioridade}</span>
          <span>{item.origem}</span>
          <small>{statusLabel(item.status)}</small>
        </div>
        <h3>{item.titulo}</h3>
        <p>{item.subtitulo}</p>
        <small>{item.motivo}</small>
      </div>
      <div className="gkit-jur-inbox-meta">
        <strong>{item.acaoLabel}</strong>
        <span>{item.responsavelNome || item.carteiraNome || 'Sem dono definido'}</span>
        <small>{formatDate(item.dataReferencia)}</small>
        <div className="gkit-jur-score" aria-label={`Score ${item.score}`}>
          <span style={{ width: `${Math.min(100, Math.max(0, item.score))}%` }} />
        </div>
      </div>
    </Link>
  )
}

export function GkitJurInboxPage({ data }: { data: GkitJurInboxData }) {
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
          <span className="metric-label">Automacoes</span>
          <strong className="metric-value">{data.metrics.automacoes}</strong>
          <span className="metric-hint">pedem intervencao</span>
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
              <Link className={fila.id === data.selected ? 'active' : ''} href={`/modulos/gkit-jur/inbox?fila=${fila.id}`} key={fila.id}>
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
          {data.items.length ? (
            <div className="gkit-jur-inbox-list" role="list">
              {data.items.map((item, index) => (
                <InboxItemCard index={index} item={item} key={item.id} />
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
        <div className="gkit-jur-next-actions">
          {data.proximasAcoes.map((action) => (
            <Link href={action.href} key={action.title}>
              <span className={`suite-pill ${priorityTone(action.priority)}`}>{action.count}</span>
              <strong>{action.title}</strong>
              <p>{action.description}</p>
              <small>{action.label}</small>
            </Link>
          ))}
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

export function GkitJurProcessDetailPage({
  action,
  canWrite,
  data,
}: {
  action: (formData: FormData) => Promise<void>
  canWrite: boolean
  data: GkitJurProcessDetailData
}) {
  const { formData, movimentacoes, processo } = data

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
