import Link from 'next/link'
import type { ReactNode } from 'react'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import { OperationalKpiGrid, OperationalQuickLinks, type OperationalQuickLink } from '@/features/shared/operational-ui'
import { GkitNewSubmitButton } from '@/features/gkit-new/submit-button'
import type { PlatformUsuario } from '@/lib/auth/platform'
import type {
  GkitNewClienteRecord,
  GkitNewContatoRecord,
  GkitNewDashboardData,
  GkitNewFormData,
  GkitNewHealth,
  GkitNewListRow,
  GkitNewTarefa,
  GkitNewWorkflowRecord,
} from '@/features/gkit-new/types'

type GkitNewTab = 'cockpit' | 'clientes' | 'contatos' | 'oportunidades' | 'workflow' | 'gestao' | 'tarefas'

const activeHref: Record<GkitNewTab, string> = {
  cockpit: '/modulos/gkit-new',
  clientes: '/modulos/gkit-new/clientes',
  contatos: '/modulos/gkit-new/contatos',
  oportunidades: '/modulos/gkit-new/oportunidades',
  workflow: '/modulos/gkit-new/base/workflow',
  gestao: '/modulos/gkit-new/gestao',
  tarefas: '/modulos/gkit-new/tarefas',
}

const navGroups: ModuleNavGroup[] = [
  { href: '/modulos/gkit-new', title: 'Cockpit' },
  { href: '/modulos/gkit-new/clientes', title: 'Clientes' },
  { href: '/modulos/gkit-new/contatos', title: 'Contatos' },
  { href: '/modulos/gkit-new/oportunidades', title: 'Oportunidades' },
  { href: '/modulos/gkit-new/base/workflow', title: 'Workflow' },
  { href: '/modulos/gkit-new/tarefas', title: 'Tarefas' },
  { href: '/modulos/gkit-new/gestao', title: 'Gestão' },
]

export function GkitNewShell({
  active,
  actions,
  children,
  description,
  title,
  usuario,
}: {
  active: GkitNewTab
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
      brand="Novos negócios"
      description={description}
      eyebrow="GKIT New"
      navGroups={navGroups}
      product="GKIT New"
      title={title}
      usuario={usuario}
      variantClassName={active === 'cockpit' ? 'gkit-new-shell gkit-new-cockpit-page' : 'gkit-new-shell'}
    >
      {children}
    </ModuleShell>
  )
}

export function GkitNewSection({
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

export function GkitNewKpis({ data }: { data: GkitNewDashboardData }) {
  return <GkitNewKpiCards cards={data.cards} />
}

export function GkitNewKpiCards({ cards }: { cards: Array<{ label: string; value: string; hint: string }> }) {
  return <OperationalKpiGrid className="suite-kpi-grid compact" items={cards} />
}

export function GkitNewQuickLinks({ items }: { items: OperationalQuickLink[] }) {
  return <OperationalQuickLinks classPrefix="gkit-new" defaultLabel="Fluxo" items={items} />
}

export function GkitNewList({
  canWrite = false,
  createHref,
  empty,
  rows,
}: {
  canWrite?: boolean
  createHref?: string
  empty: string
  rows: GkitNewListRow[]
}) {
  return (
    <>
      {canWrite && createHref ? (
        <div className="suite-list-toolbar">
          <Link className="button" href={createHref}>Novo</Link>
        </div>
      ) : null}

      {rows.length ? (
        <div className="suite-table-list compact gkit-new-table-list" role="list">
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
      ) : (
        <div className="suite-empty-block">{empty}</div>
      )}
    </>
  )
}

export function GkitNewReadiness({ data }: { data: GkitNewDashboardData }) {
  if (!data.readiness.length) {
    return <div className="suite-empty-block success">Base pronta para operar cadastros.</div>
  }

  return <GkitNewList empty="Nenhuma pendência." rows={data.readiness} />
}

export function GkitNewHealthNotice({ health }: { health?: GkitNewHealth }) {
  if (!health || health.ok) return null

  return (
    <div className="suite-empty-block danger gkit-new-health-notice">
      <strong>{health.title}</strong>
      <span>{health.message}</span>
      {health.detail ? <small>{health.detail}</small> : null}
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

export function GkitNewClienteForm({
  action,
  cliente,
}: {
  action: (formData: FormData) => Promise<void>
  cliente?: GkitNewClienteRecord
}) {
  return (
    <form action={action} className="card module-form module-form-grid">
      {cliente ? <input type="hidden" name="id" value={cliente.id} /> : null}

      <Field label="Nome">
        <input name="nome" required defaultValue={cliente?.nome ?? ''} />
      </Field>

      <Field label="CPF ou CNPJ">
        <input inputMode="numeric" name="documento" required defaultValue={cliente?.documento ?? ''} />
      </Field>

      <div className="module-form-wide">
        <Field label="Observações">
          <textarea name="observacoes" defaultValue={cliente?.observacoes ?? ''} />
        </Field>
      </div>

      {cliente ? (
        <div>
          <span>Status</span>
          <p className={`suite-pill ${cliente.status === 'ativo' ? 'success' : 'warning'}`}>{cliente.status === 'ativo' ? 'Ativo' : 'Prospecto'}</p>
        </div>
      ) : null}

      <div className="form-actions module-form-wide">
        <GkitNewSubmitButton>Salvar cliente</GkitNewSubmitButton>
        <Link className="button secondary" href="/modulos/gkit-new/clientes">Cancelar</Link>
      </div>
    </form>
  )
}

export function GkitNewContatoForm({
  action,
  clientes,
  contato,
}: {
  action: (formData: FormData) => Promise<void>
  clientes: GkitNewFormData['clientes']
  contato?: GkitNewContatoRecord
}) {
  const selectedClientes = new Set(contato?.cliente_ids ?? [])

  return (
    <form action={action} className="card module-form module-form-grid">
      {contato ? <input type="hidden" name="id" value={contato.id} /> : null}

      <Field label="Nome">
        <input name="nome" required defaultValue={contato?.nome ?? ''} />
      </Field>

      <Field label="E-mail">
        <input name="email" type="email" defaultValue={contato?.email ?? ''} />
      </Field>

      <Field label="Celular">
        <input name="celular" defaultValue={contato?.celular ?? ''} />
      </Field>

      <div className="module-form-wide">
        <Field label="Descrição">
          <textarea name="descricao" defaultValue={contato?.descricao ?? ''} />
        </Field>
      </div>

      <fieldset className="module-form-wide crm-checkbox-group">
        <legend>Clientes vinculados</legend>
        {clientes.length ? (
          clientes.map((cliente) => (
            <label className="checkbox-row" key={cliente.id}>
              <input name="cliente_ids" type="checkbox" value={cliente.id} defaultChecked={selectedClientes.has(cliente.id)} />
              <span>{cliente.label}</span>
            </label>
          ))
        ) : (
          <div className="suite-empty-block">Cadastre clientes antes de vincular contatos.</div>
        )}
      </fieldset>

      <div className="form-actions module-form-wide">
        <GkitNewSubmitButton>Salvar contato</GkitNewSubmitButton>
        <Link className="button secondary" href="/modulos/gkit-new/contatos">Cancelar</Link>
      </div>
    </form>
  )
}

export function GkitNewWorkflowForm({
  action,
  formData,
  modelo,
}: {
  action: (formData: FormData) => Promise<void>
  formData: GkitNewFormData
  modelo?: GkitNewWorkflowRecord
}) {
  return (
    <form action={action} className="card module-form module-form-grid">
      {modelo ? <input type="hidden" name="id" value={modelo.id} /> : null}

      <div className="module-form-wide">
        <Field label="Descrição">
          <input name="descricao" required defaultValue={modelo?.descricao ?? ''} />
        </Field>
      </div>

      <Field label="Dias">
        <input min={0} name="dias" required type="number" defaultValue={modelo?.dias ?? 0} />
      </Field>

      <Field label="Ordem">
        <input min={0} name="ordem" required type="number" defaultValue={modelo?.ordem ?? 100} />
      </Field>

      <Field label="Responsável">
        <select name="responsavel_id" defaultValue={modelo?.responsavel_id ?? ''}>
          <option value="">Sem responsável</option>
          {formData.usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>{usuario.label}</option>
          ))}
        </select>
      </Field>

      <label className="checkbox-row module-form-wide">
        <input name="ativo" type="checkbox" defaultChecked={modelo?.ativo ?? true} />
        <span>Modelo ativo</span>
      </label>

      <div className="form-actions module-form-wide">
        <GkitNewSubmitButton>Salvar modelo</GkitNewSubmitButton>
        <Link className="button secondary" href="/modulos/gkit-new/base/workflow">Cancelar</Link>
      </div>
    </form>
  )
}

export function GkitNewTarefaDetail({
  action,
  canWrite,
  tarefa,
}: {
  action: (formData: FormData) => Promise<void>
  canWrite?: boolean
  tarefa: GkitNewTarefa
}) {
  return (
    <section className="card module-form">
      <div className="suite-table-list compact">
        <article>
          <div>
            <h3>{tarefa.descricao}</h3>
            <p>{tarefa.cliente_nome} - {tarefa.oportunidade_descricao}</p>
          </div>
          <span className={`suite-pill ${tarefa.status === 'concluida' ? 'success' : tarefa.status === 'cancelada' ? 'danger' : 'warning'}`}>{tarefa.status}</span>
          <strong>{tarefa.data_prevista}</strong>
          <small>{tarefa.responsavel_nome}</small>
        </article>
      </div>

      <div className="form-actions">
        {canWrite && tarefa.status === 'pendente' ? (
          <form action={action}>
            <input type="hidden" name="id" value={tarefa.id} />
            <GkitNewSubmitButton>Concluir tarefa</GkitNewSubmitButton>
          </form>
        ) : null}
        <Link className="button secondary" href="/modulos/gkit-new/tarefas">Voltar</Link>
      </div>
    </section>
  )
}
