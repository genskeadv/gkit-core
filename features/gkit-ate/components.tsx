import Link from 'next/link'
import type { ReactNode } from 'react'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import { OperationalKpiGrid, OperationalQuickLinks, type OperationalQuickLink } from '@/features/shared/operational-ui'
import type { PlatformUsuario } from '@/lib/auth/platform'
import type { GkitAteAtendimentoDetail, GkitAteDashboardData, GkitAteHealth, GkitAteListRow, GkitAteTarefa } from '@/features/gkit-ate/types'

type GkitAteTab = 'cockpit' | 'atendimentos' | 'tarefas' | 'importacoes' | 'cadastros'

const activeHref: Record<GkitAteTab, string> = {
  cockpit: '/modulos/gkit-ate',
  atendimentos: '/modulos/gkit-ate/atendimentos',
  tarefas: '/modulos/gkit-ate/tarefas',
  importacoes: '/modulos/gkit-ate/importacoes',
  cadastros: '/modulos/gkit-ate/cadastros',
}

const navGroups: ModuleNavGroup[] = [
  { href: '/modulos/gkit-ate', title: 'Cockpit' },
  { href: '/modulos/gkit-ate/atendimentos', title: 'Atendimentos' },
  { href: '/modulos/gkit-ate/tarefas', title: 'Tarefas' },
  { href: '/modulos/gkit-ate/importacoes', title: 'Importacoes' },
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

export function GkitAteQuickLinks({ items }: { items: OperationalQuickLink[] }) {
  return <OperationalQuickLinks classPrefix="gkit-ate" defaultLabel="Fluxo" items={items} />
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
  hiddenFields = [],
  resetHref,
  resultCount,
  sort,
  totalCount,
}: {
  fields: GkitAteFilterField[]
  hiddenFields?: Array<{ name: string; value: string }>
  resetHref: string
  resultCount: number
  sort: { dir: 'asc' | 'desc'; options: Array<{ label: string; value: string }>; value: string }
  totalCount: number
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
          <span>Direcao</span>
          <select name="dir" defaultValue={sort.dir}>
            <option value="asc">Crescente</option>
            <option value="desc">Decrescente</option>
          </select>
        </label>
      </div>

      <div className="gkit-ate-filter-actions">
        <span>{resultCount} de {totalCount}</span>
        <button className="button" type="submit">Filtrar</button>
        <Link className="button secondary" href={resetHref}>Limpar</Link>
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
      {rows.map((row) => {
        const content = (
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

        return row.detailHref ? (
          <Link className="suite-row-link" href={row.detailHref} key={row.id} role="listitem">
            {content}
          </Link>
        ) : (
          <article key={row.id} role="listitem">{content}</article>
        )
      })}
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

function InfoGrid({ items }: { items: Array<{ label: string; value: string | null | undefined }> }) {
  const visible = items.filter((item) => item.value)
  if (!visible.length) return null

  return (
    <div className="suite-executive-grid">
      {visible.map((item) => (
        <article className="suite-executive-card" key={item.label}>
          <span>{item.label}</span>
          <h2>{item.value}</h2>
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
  return (
    <div className="module-form-grid">
      <section className="card module-form module-form-wide">
        <div className="suite-panel-heading">
          <div>
            <h2>{atendimento.titulo}</h2>
            <p>{atendimento.cliente_nome}</p>
          </div>
          <span className={`suite-pill ${atendimento.status === 'encerrado' ? 'success' : 'warning'}`}>{atendimento.status}</span>
        </div>

        <InfoGrid
          items={[
            { label: 'Codigo ATE', value: atendimento.codigo_publico },
            { label: 'Codigo ASTREA', value: atendimento.astrea_codigo },
            { label: 'Tipo', value: atendimento.tipo },
            { label: 'Responsavel', value: atendimento.responsavel },
            { label: 'Criacao', value: atendimento.data_criacao },
            { label: 'Prazo', value: atendimento.prazo_finalizacao },
            { label: 'Ultimo historico', value: atendimento.data_ultimo_historico },
            { label: 'Encerramento', value: atendimento.data_encerramento },
            { label: 'Acesso', value: atendimento.acesso },
          ]}
        />

        <div className="suite-empty-block">
          <strong>{atendimento.objeto ?? 'Objeto nao informado'}</strong>
          <span>{atendimento.ultimo_historico ?? atendimento.observacoes ?? 'Sem historico textual no arquivo importado.'}</span>
          {atendimento.url_processo ? <a href={atendimento.url_processo} target="_blank" rel="noreferrer">Abrir no ASTREA</a> : null}
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

      <section className="card module-form module-form-wide">
        <div className="suite-panel-heading">
          <div>
            <h2>Tarefas vinculadas</h2>
            <p>Um atendimento pode ter varias tarefas operacionais.</p>
          </div>
        </div>

        <GkitAteList
          empty="Nenhuma tarefa vinculada a este atendimento."
          rows={atendimento.tarefas.map((tarefa) => ({
            id: tarefa.id,
            title: tarefa.descricao,
            subtitle: `${tarefa.tipo_nome ?? 'Tarefa'} - ${tarefa.responsavel ?? 'Sem responsavel'}`,
            status: tarefa.status,
            value: tarefa.data_prevista ?? 'Sem prazo',
            meta: tarefa.origem,
            detailHref: `/modulos/gkit-ate/tarefas/${tarefa.id}`,
            tone: tarefa.status === 'concluida' ? 'success' : tarefa.status === 'cancelada' ? 'danger' : 'warning',
          }))}
        />

        {canWrite ? (
          <form action={action} className="module-form-grid">
            <input type="hidden" name="atendimento_id" value={atendimento.id} />
            <label className="module-form-wide">
              <span>Descricao</span>
              <input name="descricao" required />
            </label>
            <label>
              <span>Tipo de tarefa</span>
              <input name="tipo_tarefa" placeholder="Ex.: Analisar contrato" />
            </label>
            <label>
              <span>Responsavel</span>
              <input name="responsavel" defaultValue={atendimento.responsavel ?? ''} />
            </label>
            <label>
              <span>Data prevista</span>
              <input name="data_prevista" type="date" />
            </label>
            <div className="form-actions module-form-wide">
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

  return (
    <section className="card module-form">
      <div className="suite-table-list compact">
        <article>
          <div>
            <h3>{tarefa.descricao}</h3>
            <p>{tarefa.cliente_nome} - {tarefa.atendimento_titulo}</p>
          </div>
          <span className={`suite-pill ${tarefa.status === 'concluida' ? 'success' : tarefa.status === 'cancelada' ? 'danger' : 'warning'}`}>{tarefa.status}</span>
          <strong>{tarefa.data_prevista ?? 'Sem prazo'}</strong>
          <small>{tarefa.tipo_nome ?? tarefa.responsavel ?? 'Sem responsavel'}</small>
        </article>
      </div>

      {canWrite && isOpenTask && isLastOpenTask ? (
        <div className="suite-empty-block warning">
          <strong>Ultima tarefa aberta deste atendimento</strong>
          <span>Para concluir, escolha se o atendimento deve ser encerrado ou se uma nova tarefa deve ser aberta.</span>
        </div>
      ) : null}

      <div className="form-actions">
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
        <Link className="button secondary" href={`/modulos/gkit-ate/atendimentos/${tarefa.atendimento_id}`}>Ver atendimento</Link>
        <Link className="button secondary" href="/modulos/gkit-ate/tarefas">Voltar</Link>
      </div>

      {canWrite && isLastOpenTask ? (
        <form action={action} className="module-form-grid">
          <input type="hidden" name="id" value={tarefa.id} />
          <input type="hidden" name="resolucao" value="adicionar_tarefa" />
          <label>
            <span>Tipo da nova tarefa</span>
            <input name="novo_tipo_tarefa" placeholder="Ex.: Elaborar parecer" />
          </label>
          <label className="module-form-wide">
            <span>Descricao da nova tarefa</span>
            <input name="nova_descricao" required />
          </label>
          <label>
            <span>Responsavel</span>
            <input name="novo_responsavel" defaultValue={tarefa.responsavel ?? ''} />
          </label>
          <label>
            <span>Prazo</span>
            <input name="nova_data_prevista" type="date" />
          </label>
          <div className="form-actions module-form-wide">
            <button className="button secondary" type="submit">Concluir e adicionar tarefa</button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
