import Link from 'next/link'
import type { ReactNode } from 'react'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import { OperationalKpiGrid, OperationalQuickLinks } from '@/features/shared/operational-ui'
import type { PlatformUsuario } from '@/lib/auth/platform'
import { statusLabel, tone } from '@/features/gkit-fat/queries'
import type { GkitFatContrato, GkitFatDashboardData, GkitFatFormData, GkitFatHealth, GkitFatOrdemServico } from '@/features/gkit-fat/types'

type GkitFatTab = 'cockpit' | 'contratos' | 'faturas'

const activeHref: Record<GkitFatTab, string> = {
  cockpit: '/modulos/gkit-fat',
  contratos: '/modulos/gkit-fat/contratos',
  faturas: '/modulos/gkit-fat/faturas',
}

const navGroups: ModuleNavGroup[] = [
  { href: '/modulos/gkit-fat', title: 'Cockpit' },
  { href: '/modulos/gkit-fat/contratos', title: 'Contratos' },
  { href: '/modulos/gkit-fat/faturas', title: 'OS e Faturas' },
]

export function GkitFatShell({
  active,
  actions,
  children,
  description,
  title,
  usuario,
}: {
  active: GkitFatTab
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
      brand="Faturamento"
      description={description}
      eyebrow="GKIT FAT"
      navGroups={navGroups}
      product="GKIT FAT"
      title={title}
      usuario={usuario}
      variantClassName="gkit-fat-shell"
    >
      {children}
    </ModuleShell>
  )
}

export function GkitFatSection({
  action,
  children,
  description,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  description?: string
  title: string
}) {
  return (
    <section className="suite-panel">
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

export function GkitFatHealthNotice({ health }: { health: GkitFatHealth }) {
  if (health.ok) return null

  return (
    <div className="suite-empty-block danger">
      <strong>{health.title}</strong>
      <span>{health.message}</span>
      {health.detail ? <small>{health.detail}</small> : null}
    </div>
  )
}

export function GkitFatDashboard({ data }: { data: GkitFatDashboardData }) {
  return (
    <>
      <OperationalKpiGrid className="suite-kpi-grid compact" items={data.cards} />
      <OperationalQuickLinks classPrefix="gkit-ate" defaultLabel="Fluxo" items={data.quickLinks} />
      <GkitFatSection
        action={<Link className="button secondary" href="/modulos/gkit-fat/contratos">Ver contratos</Link>}
        description="Base de faturamento para mensalidade, pontual e cobranca."
        title="Contratos recentes"
      >
        <GkitFatContratosList canWrite={false} contratos={data.contratosRecentes} empty="Nenhum contrato cadastrado ainda." />
      </GkitFatSection>
      <GkitFatSection
        action={<Link className="button secondary" href="/modulos/gkit-fat/faturas">Ver OS</Link>}
        description="Ordens de servico geradas com snapshot para NFS-e 03220."
        title="OS recentes"
      >
        <GkitFatOrdensList empty="Nenhuma OS gerada ainda." ordens={data.ordensRecentes} />
      </GkitFatSection>
    </>
  )
}

export function GkitFatContratosList({
  canWrite,
  contratos,
  empty,
}: {
  canWrite: boolean
  contratos: GkitFatContrato[]
  empty: string
}) {
  if (!contratos.length) return <div className="suite-empty-block">{empty}</div>

  return (
    <div className="suite-table-list compact" role="list">
      {contratos.map((contrato) => (
        <article key={contrato.id} role="listitem">
          <div>
            <h3>{contrato.cliente_nome}</h3>
            <p>{contrato.numero} - {contrato.descricao_servico}</p>
          </div>
          <span className={`suite-pill ${tone(contrato.status)}`}>{statusLabel(contrato.status)}</span>
          <strong>{contrato.valor_label}</strong>
          <small>{contrato.tipo_faturamento} - {contrato.carteira_nome ?? 'Sem carteira'}</small>
          {canWrite ? <Link className="button secondary" href={`/modulos/gkit-fat/contratos/${contrato.id}`}>Editar</Link> : null}
        </article>
      ))}
    </div>
  )
}

export function GkitFatOrdensList({
  empty,
  ordens,
}: {
  empty: string
  ordens: GkitFatOrdemServico[]
}) {
  if (!ordens.length) return <div className="suite-empty-block">{empty}</div>

  return (
    <div className="suite-table-list compact" role="list">
      {ordens.map((ordem) => (
        <article key={ordem.id} role="listitem">
          <div>
            <h3>{ordem.cliente_nome}</h3>
            <p>{ordem.numero} - {ordem.descricao_servico}</p>
          </div>
          <span className={`suite-pill ${tone(ordem.situacao_operacional)}`}>{statusLabel(ordem.situacao_operacional)}</span>
          <strong>{ordem.valor_label}</strong>
          <small>{ordem.competencia ?? 'Sem competencia'} - {statusLabel(ordem.situacao_fiscal)}</small>
        </article>
      ))}
    </div>
  )
}

function optionLabel(tipo: string) {
  const labels: Record<string, string> = {
    mensal: 'Mensal',
    pontual: 'Pontual',
    cobranca: 'Cobranca',
    pessoa_fisica: 'Pessoa fisica',
    pessoa_juridica: 'Pessoa juridica',
    condominio: 'Condominio',
  }
  return labels[tipo] ?? tipo
}

export function GkitFatContratoForm({
  action,
  contrato,
  formData,
}: {
  action: (formData: FormData) => Promise<void>
  contrato?: GkitFatContrato | null
  formData: GkitFatFormData
}) {
  return (
    <form action={action} className="card module-form module-form-grid">
      {contrato ? <input name="id" type="hidden" value={contrato.id} /> : null}
      <label className="module-form-wide">
        <span>Cliente</span>
        {contrato ? (
          <input disabled value={`${contrato.cliente_nome} - ${optionLabel(contrato.cliente_tipo)} - ${optionLabel(contrato.cliente_tipo_pessoa)}`} />
        ) : (
          <select name="cliente_id" required>
            <option value="">Selecione</option>
            {formData.clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>{cliente.label} - {cliente.meta}</option>
            ))}
          </select>
        )}
      </label>
      {!contrato ? (
        <label>
          <span>Numero</span>
          <input name="numero" placeholder="Automatico" />
        </label>
      ) : null}
      <label>
        <span>Tipo</span>
        <select name="tipo_faturamento" defaultValue={contrato?.tipo_faturamento ?? 'mensal'}>
          <option value="mensal">Mensal</option>
          <option value="pontual">Pontual</option>
          <option value="cobranca">Cobranca</option>
        </select>
      </label>
      <label>
        <span>Status</span>
        <select name="status" defaultValue={contrato?.status ?? 'em_elaboracao'}>
          <option value="em_elaboracao">Em elaboracao</option>
          <option value="ativo">Ativo</option>
          <option value="suspenso">Suspenso</option>
          <option value="cancelado">Cancelado</option>
          <option value="encerrado">Encerrado</option>
        </select>
      </label>
      <label>
        <span>Valor padrao</span>
        <input name="valor_padrao" inputMode="decimal" required defaultValue={contrato?.valor_padrao ?? 0} />
      </label>
      <label>
        <span>Periodicidade (meses)</span>
        <input name="periodicidade_meses" min={1} type="number" defaultValue={contrato?.periodicidade_meses ?? 1} />
      </label>
      <label>
        <span>Dia faturamento</span>
        <input name="dia_faturamento" min={1} max={31} type="number" defaultValue={contrato?.dia_faturamento ?? ''} />
      </label>
      <label>
        <span>Dia vencimento</span>
        <input name="dia_vencimento" min={1} max={31} type="number" defaultValue={contrato?.dia_vencimento ?? ''} />
      </label>
      <label>
        <span>Inicio vigencia</span>
        <input name="inicio_vigencia" type="date" defaultValue={contrato?.inicio_vigencia ?? ''} />
      </label>
      <label>
        <span>Fim vigencia</span>
        <input name="fim_vigencia" type="date" defaultValue={contrato?.fim_vigencia ?? ''} />
      </label>
      <label className="module-form-wide">
        <span>Descricao fiscal/servico</span>
        <input name="descricao_servico" defaultValue={contrato?.descricao_servico ?? 'Servicos advocaticios'} />
      </label>
      <label>
        <span>ISS retido</span>
        <input name="iss_retido" type="checkbox" defaultChecked={contrato?.iss_retido ?? false} />
      </label>
      <label>
        <span>Nao gerar financeiro</span>
        <input name="nao_gerar_financeiro" type="checkbox" defaultChecked={contrato ? !contrato.gerar_financeiro : false} />
      </label>
      {contrato ? (
        <label className="module-form-wide">
          <span>Motivo status</span>
          <input name="motivo_status" placeholder="Obrigatorio quando suspender/cancelar no processo interno" />
        </label>
      ) : null}
      <label className="module-form-wide">
        <span>Observacoes</span>
        <textarea name="observacoes" defaultValue={contrato?.observacoes ?? ''} rows={4} />
      </label>
      <div className="form-actions module-form-wide">
        <button className="button" type="submit">{contrato ? 'Atualizar contrato' : 'Criar contrato'}</button>
        <Link className="button secondary" href="/modulos/gkit-fat/contratos">Cancelar</Link>
      </div>
    </form>
  )
}

export function GkitFatOrdemForm({
  action,
  formData,
}: {
  action: (formData: FormData) => Promise<void>
  formData: GkitFatFormData
}) {
  return (
    <form action={action} className="card module-form module-form-grid">
      <label className="module-form-wide">
        <span>Contrato</span>
        <select name="contrato_id">
          <option value="">OS avulsa sem contrato</option>
          {formData.contratos.map((contrato) => (
            <option key={contrato.id} value={contrato.id}>{contrato.label}</option>
          ))}
        </select>
      </label>
      <label className="module-form-wide">
        <span>Cliente para OS avulsa</span>
        <select name="cliente_id">
          <option value="">Usar cliente do contrato</option>
          {formData.clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>{cliente.label} - {cliente.meta}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Competencia</span>
        <input name="competencia" type="date" />
      </label>
      <label>
        <span>Vencimento</span>
        <input name="data_vencimento" type="date" />
      </label>
      <label>
        <span>Periodo inicio</span>
        <input name="periodo_inicio" type="date" />
      </label>
      <label>
        <span>Periodo fim</span>
        <input name="periodo_fim" type="date" />
      </label>
      <label>
        <span>Previsao faturamento</span>
        <input name="data_prevista_faturamento" type="date" />
      </label>
      <label>
        <span>Valor</span>
        <input name="valor_unitario" inputMode="decimal" placeholder="Usar valor do contrato" />
      </label>
      <label>
        <span>Situacao</span>
        <select name="situacao_operacional" defaultValue="rascunho">
          <option value="rascunho">Rascunho</option>
          <option value="em_conferencia">Em conferencia</option>
          <option value="pronta_para_faturar">Pronta para faturar</option>
        </select>
      </label>
      <label className="module-form-wide">
        <span>Descricao fiscal/servico</span>
        <input name="descricao_servico" placeholder="Usar descricao do contrato" />
      </label>
      <div className="form-actions module-form-wide">
        <button className="button" type="submit">Gerar OS</button>
      </div>
    </form>
  )
}
