import Link from 'next/link'
import type { ReactNode } from 'react'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import { OperationalKpiGrid, OperationalQuickLinks, OperationalSection } from '@/features/shared/operational-ui'
import type { PlatformUsuario } from '@/lib/auth/platform'
import type {
  FlexCategoriaFinanceira,
  FlexColaborador,
  FlexComissao,
  FlexComissaoListItem,
  FlexDashboardData,
  FlexDespesaCategoriaMapeamento,
  FlexDespesaCategoriaPendencia,
  FlexDespesaInlineRow,
  FlexExtratoLancamento,
  FlexFechamento,
  FlexFormData,
  FlexListRow,
  FlexOption,
  FlexPagamento,
  FlexPagamentoAgenda,
  FlexPrevisaoDespesa,
  FlexReceita,
  FlexReceitaCategoriaMapeamento,
  FlexReceitaCategoriaPendencia,
  FlexReceitaMapeamento,
  FlexTipoComissao,
  FlexTipoPagamento,
  FlexTime,
  FlexTone,
  FlexValidacaoItem,
} from '@/features/flex/types'

type FlexTab =
  | 'cockpit'
  | 'importacoes'
  | 'financeiro'
  | 'receitas'
  | 'previsao'
  | 'despesas'
  | 'extratos'
  | 'orcamento'
  | 'validacao'
  | 'sugestoes'
  | 'comissoes'
  | 'comissoesAprovacao'
  | 'comissoesMapeamentos'
  | 'pagamentos'
  | 'calendario'
  | 'pagamentoAgenda'
  | 'fechamentos'
  | 'colaboradores'
  | 'times'
  | 'tiposComissao'
  | 'configuracoes'
  | 'categorias'
  | 'tiposPagamento'

const activeHref: Record<FlexTab, string> = {
  cockpit: '/modulos/flex',
  importacoes: '/modulos/flex/importacoes',
  financeiro: '/modulos/flex/financeiro',
  receitas: '/modulos/flex/financeiro/receitas',
  previsao: '/modulos/flex/financeiro/previsao',
  despesas: '/modulos/flex/financeiro/despesas',
  extratos: '/modulos/flex/financeiro/extratos',
  orcamento: '/modulos/flex/financeiro/orcamento',
  validacao: '/modulos/flex/financeiro/validacao',
  sugestoes: '/modulos/flex/financeiro/sugestoes',
  comissoes: '/modulos/flex/comissoes',
  comissoesAprovacao: '/modulos/flex/comissoes/aprovacao',
  comissoesMapeamentos: '/modulos/flex/comissoes/mapeamentos',
  pagamentos: '/modulos/flex/pagamentos',
  calendario: '/modulos/flex/pagamentos/calendario',
  pagamentoAgenda: '/modulos/flex/pagamentos/agenda',
  fechamentos: '/modulos/flex/fechamentos',
  colaboradores: '/modulos/flex/colaboradores',
  times: '/modulos/flex/times',
  tiposComissao: '/modulos/flex/tipos-comissao',
  configuracoes: '/modulos/flex/configuracoes',
  categorias: '/modulos/flex/configuracoes/categorias',
  tiposPagamento: '/modulos/flex/configuracoes/tipos-pagamento',
}

const navGroups: ModuleNavGroup[] = [
  { href: '/modulos/flex', title: 'Cockpit' },
  {
    title: 'Operação',
    items: [
      { href: '/modulos/flex/importacoes', label: 'Importações' },
      { href: '/modulos/flex/financeiro', label: 'Financeiro' },
      { href: '/modulos/flex/financeiro/receitas', label: 'Receitas' },
      { href: '/modulos/flex/financeiro/previsao', label: 'Previsão' },
      { href: '/modulos/flex/financeiro/despesas', label: 'Despesas' },
      { href: '/modulos/flex/financeiro/extratos', label: 'Extratos' },
      { href: '/modulos/flex/financeiro/orcamento', label: 'Orçamento' },
      { href: '/modulos/flex/financeiro/validacao', label: 'Validação' },
      { href: '/modulos/flex/financeiro/sugestoes', label: 'Sugestões' },
      { href: '/modulos/flex/comissoes', label: 'Comissões' },
      { href: '/modulos/flex/comissoes/aprovacao', label: 'Aprovação de comissões' },
      { href: '/modulos/flex/comissoes/mapeamentos', label: 'Mapeamento Omie' },
      { href: '/modulos/flex/pagamentos', label: 'Pagamentos' },
      { href: '/modulos/flex/pagamentos/agenda', label: 'Agenda de pagamentos' },
      { href: '/modulos/flex/fechamentos', label: 'Fechamentos' },
    ],
  },
  {
    title: 'Cadastros',
    items: [
      { href: '/modulos/flex/colaboradores', label: 'Colaboradores' },
      { href: '/modulos/flex/times', label: 'Times' },
      { href: '/modulos/flex/tipos-comissao', label: 'Tipos de comissão' },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { href: '/modulos/flex/configuracoes', label: 'Visão geral' },
      { href: '/modulos/flex/configuracoes/categorias', label: 'Categorias financeiras' },
      { href: '/modulos/flex/configuracoes/tipos-pagamento', label: 'Tipos de pagamento' },
    ],
  },
]

const operationNavGroups: ModuleNavGroup[] = navGroups.length ? [
  { href: '/modulos/flex', title: 'Cockpit' },
  { href: '/modulos/flex/importacoes', title: 'Importações' },
  { href: '/modulos/flex/financeiro/previsao', title: 'Previsão' },
  { href: '/modulos/flex/financeiro/receitas', title: 'Receitas' },
  { href: '/modulos/flex/financeiro/despesas', title: 'Despesas' },
  { href: '/modulos/flex/colaboradores', title: 'Colaboradores' },
  { href: '/modulos/flex/comissoes', title: 'Comissões' },
  { href: '/modulos/flex/financeiro', title: 'Gestão' },
] : []

const groupedActiveHref: Record<FlexTab, string> = {
  cockpit: '/modulos/flex',
  importacoes: '/modulos/flex/importacoes',
  financeiro: '/modulos/flex/financeiro',
  receitas: '/modulos/flex/financeiro/receitas',
  previsao: '/modulos/flex/financeiro/previsao',
  despesas: '/modulos/flex/financeiro/despesas',
  extratos: '/modulos/flex/financeiro',
  orcamento: '/modulos/flex/financeiro',
  validacao: '/modulos/flex/financeiro',
  sugestoes: '/modulos/flex/financeiro',
  comissoes: '/modulos/flex/comissoes',
  comissoesAprovacao: '/modulos/flex/comissoes',
  comissoesMapeamentos: '/modulos/flex/comissoes',
  pagamentos: '/modulos/flex/financeiro/previsao',
  calendario: '/modulos/flex/financeiro/previsao',
  pagamentoAgenda: '/modulos/flex/financeiro/previsao',
  fechamentos: '/modulos/flex/financeiro',
  colaboradores: '/modulos/flex/colaboradores',
  times: '/modulos/flex/colaboradores',
  tiposComissao: '/modulos/flex/comissoes',
  configuracoes: '/modulos/flex/financeiro',
  categorias: '/modulos/flex/financeiro',
  tiposPagamento: '/modulos/flex/financeiro',
}

export function FlexShell({
  active,
  actions,
  children,
  description,
  title,
  usuario,
}: {
  active: FlexTab
  actions?: ReactNode
  children: ReactNode
  description: string
  title: string
  usuario: PlatformUsuario
}) {
  return (
    <ModuleShell
      activeHref={groupedActiveHref[active] ?? activeHref[active]}
      actions={actions}
      brand="Operação financeira"
      description={description}
      eyebrow="GKIT Flex"
      navGroups={operationNavGroups}
      product="GKIT Flex"
      title={title}
      usuario={usuario}
      variantClassName={active === 'cockpit' ? 'flex-shell flex-cockpit-page' : 'flex-shell'}
    >
      {children}
    </ModuleShell>
  )
}

export function FlexSection({
  action,
  children,
  className,
  description,
  eyebrow,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  className?: string
  description?: string
  eyebrow?: string
  title: string
}) {
  return (
    <OperationalSection action={action} className={className} classPrefix="flex" description={description} eyebrow={eyebrow} title={title}>
      {children}
    </OperationalSection>
  )
}

export function FlexQuickLinks({
  items,
}: {
  items: Array<{ href: string; title: string; description: string; label?: string; meta?: string }>
}) {
  return <OperationalQuickLinks classPrefix="flex" defaultLabel="Flex" items={items} />
}

export function FlexKpis({ data }: { data: FlexDashboardData }) {
  return <OperationalKpiGrid className="flex-kpi-grid" items={data.cards} />
}

export function FlexReadinessCard({ data }: { data: FlexDashboardData }) {
  if (!data.pendencias.length) {
    return null
  }

  return (
    <section className="card suite-panel flex-attention-card">
      <div className="suite-panel-heading">
        <div>
          <h2>Fundação da Sprint 1</h2>
          <p>Complete os cadastros base para liberar importações, comissões, pagamentos e fechamento.</p>
        </div>
      </div>
      <FlexList rows={data.pendencias} empty="Nenhuma pendência de fundação." />
    </section>
  )
}

export function FlexList({
  bare = false,
  canWrite = false,
  createHref,
  empty,
  rows,
  title,
}: {
  bare?: boolean
  canWrite?: boolean
  createHref?: string
  empty: string
  rows: FlexListRow[]
  title?: string
}) {
  const content = (
    <>
      {title || createHref ? (
        <div className="suite-panel-heading">
          <div>
            {title ? <h2>{title}</h2> : null}
            <p>{rows.length} registro(s)</p>
          </div>
          {canWrite && createHref ? <Link className="button" href={createHref}>Novo</Link> : null}
        </div>
      ) : null}

      {rows.length ? (
        <div className="suite-table-list">
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

            if (row.detailHref) {
              return (
                <Link className="suite-row-link" href={row.detailHref} key={row.id}>
                  {content}
                </Link>
              )
            }

            return <article key={row.id}>{content}</article>
          })}
        </div>
      ) : (
        <div className="suite-empty-block">{empty}</div>
      )}
    </>
  )

  if (bare) return content

  return (
    <section className="card suite-panel">
      {content}
    </section>
  )
}

function moneyInputValue(value: number | string | null | undefined) {
  return Number(value || 0).toFixed(2)
}

export function FlexDespesasInlineList({
  action,
  formData,
  returnTo,
  rows,
}: {
  action: (formData: FormData) => void | Promise<void>
  formData: FlexFormData
  returnTo: string
  rows: FlexDespesaInlineRow[]
}) {
  if (!rows.length) return <div className="suite-empty-block">Nenhuma despesa encontrada para os filtros selecionados.</div>

  return (
    <div className="flex-inline-expense-list">
      {rows.map((row) => {
        const title = row.fornecedor || row.descricao || row.historico || 'Despesa'
        const detail = [row.categoria_nome || 'Sem categoria', row.data_lancamento].filter(Boolean).join(' - ')
        const hasCategory = Boolean(row.categoria_id)

        return (
          <form action={action} className="flex-inline-expense-row" key={row.id}>
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="return_to" value={returnTo} />
            <input type="hidden" name="data_lancamento" value={row.data_lancamento} />
            <input type="hidden" name="valor" value={moneyInputValue(row.valor)} />
            <input type="hidden" name="fornecedor" value={row.fornecedor ?? ''} />
            <input type="hidden" name="descricao" value={row.descricao ?? row.historico ?? ''} />
            <input type="hidden" name="historico" value={row.historico ?? ''} />
            <input type="hidden" name="previsao_despesa_id" value={row.previsao_despesa_id ?? ''} />
            <div className="flex-inline-expense-main">
              <h3>{title}</h3>
              <p>{detail}</p>
            </div>
            <label className="flex-inline-expense-field">
              <select aria-label="Categoria" name="categoria_id" defaultValue={row.categoria_id ?? ''}>
                <OptionList options={formData.categoriasDespesa} placeholder="Sem categoria" />
              </select>
            </label>
            <label className="flex-inline-expense-check">
              <input name="criar_previsao" type="checkbox" defaultChecked={Boolean(row.previsao_despesa_id)} disabled={Boolean(row.previsao_despesa_id)} />
              <span>{row.previsao_despesa_id ? 'Na base' : 'Base recorrente'}</span>
            </label>
            <span className={`suite-pill ${hasCategory ? 'success' : 'warning'}`}>{hasCategory ? 'Classificada' : 'Pendente'}</span>
            <strong>{Number(row.valor || 0).toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })}</strong>
            <button className="button secondary" type="submit">Salvar</button>
          </form>
        )
      })}
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

function StatusSelect({ defaultValue = 'ativo' }: { defaultValue?: string }) {
  return (
    <select name="status" defaultValue={defaultValue}>
      <option value="ativo">Ativo</option>
      <option value="inativo">Inativo</option>
      <option value="rascunho">Rascunho</option>
    </select>
  )
}

function OptionList({ options, placeholder }: { options: Array<{ id: string; label: string; meta?: string }>; placeholder: string }) {
  return (
    <>
      <option value="">{placeholder}</option>
      {options.map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}{item.meta ? ` - ${item.meta}` : ''}
        </option>
      ))}
    </>
  )
}

function competenciaSelectValue(value?: string | null) {
  return typeof value === 'string' ? value.slice(0, 7) : ''
}

function CompetenciaSelect({
  defaultValue,
  name,
  options,
  placeholder = 'Selecione uma competência',
  required = true,
}: {
  defaultValue?: string | null
  name: string
  options?: FlexOption[]
  placeholder?: string
  required?: boolean
}) {
  const selected = competenciaSelectValue(defaultValue)
  const items = options ?? []
  const selectedExists = selected ? items.some((item) => item.id === selected) : true

  return (
    <select name={name} defaultValue={selected} required={required}>
      <option value="">{placeholder}</option>
      {!selectedExists ? <option value={selected}>{selected}</option> : null}
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}{item.meta ? ` - ${item.meta}` : ''}
        </option>
      ))}
    </select>
  )
}

export function FlexReceitaForm({
  action,
  formData,
}: {
  action: (formData: FormData) => void | Promise<void>
  formData: FlexFormData
}) {
  return (
    <form action={action} className="card module-form">
      <div className="suite-panel-heading">
        <div>
          <h2>Nova receita</h2>
          <p>Entrada manual estruturada para ajustes pontuais fora da importação Omie.</p>
        </div>
      </div>
      <div className="module-form-grid">
        <Field label="Cliente">
          <input className="input" name="cliente" required />
        </Field>
        <Field label="Competência">
          <CompetenciaSelect name="competencia" options={formData.competencias} />
        </Field>
        <Field label="Data recebimento">
          <input className="input" name="data_recebimento" type="date" />
        </Field>
        <Field label="Categoria">
          <select name="categoria_id">
            <OptionList options={formData.categoriasReceita} placeholder="Sem categoria" />
          </select>
        </Field>
        <Field label="Colaborador">
          <select name="colaborador_id">
            <OptionList options={formData.colaboradores} placeholder="Sem colaborador" />
          </select>
        </Field>
        <Field label="Time">
          <select name="time_id">
            <OptionList options={formData.times} placeholder="Sem time" />
          </select>
        </Field>
        <Field label="Valor base">
          <input className="input" name="valor_base" type="number" step="0.01" min="0" />
        </Field>
        <Field label="Valor recebido">
          <input className="input" name="valor_recebido" type="number" step="0.01" min="0" required />
        </Field>
        <Field label="Origem">
          <input className="input" name="origem" defaultValue="manual" />
        </Field>
        <Field label="Descrição">
          <textarea className="textarea" name="descricao" />
        </Field>
      </div>
      <button className="button" type="submit">Salvar receita</button>
    </form>
  )
}

export function FlexReceitaClassificacaoForm({
  action,
  formData,
  receita,
}: {
  action: (formData: FormData) => void | Promise<void>
  formData: FlexFormData
  receita: FlexReceita
}) {
  const metadata = receita.metadata ?? {}
  const vendedorOmie = typeof metadata.vendedor_omie === 'string' ? metadata.vendedor_omie : ''
  const documento = typeof metadata.cliente_documento === 'string' ? metadata.cliente_documento : ''

  return (
    <form action={action} className="card module-form flex-receita-ajuste-form">
      <input name="id" type="hidden" value={receita.id} />
      <input name="status" type="hidden" value="realizada" />
      <div className="suite-panel-heading">
        <div>
          <h2>Ajustar receita</h2>
          <p>Complete categoria e destino operacional para remover a pendência da Gestão.</p>
        </div>
      </div>
      <div className="flex-receita-context">
        <article>
          <span>Cliente</span>
          <strong>{receita.cliente}</strong>
          <small>{documento || 'Documento não informado'}</small>
        </article>
        <article>
          <span>Recebimento</span>
          <strong>{Number(receita.valor_recebido).toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })}</strong>
          <small>{receita.data_recebimento ?? receita.competencia}</small>
        </article>
        <article>
          <span>Omie</span>
          <strong>{receita.descricao || 'Sem categoria'}</strong>
          <small>{vendedorOmie ? `Vendedor ${vendedorOmie}` : 'Sem vendedor Omie'}</small>
        </article>
      </div>
      <div className="module-form-grid">
        <Field label="Categoria Flex">
          <select name="categoria_id" defaultValue={receita.categoria_id ?? ''}>
            <OptionList options={formData.categoriasReceita} placeholder="Sem categoria" />
          </select>
        </Field>
        <Field label="Colaborador">
          <select name="colaborador_id" defaultValue={receita.colaborador_id ?? ''}>
            <OptionList options={formData.colaboradores} placeholder="Sem colaborador" />
          </select>
        </Field>
        <Field label="Time">
          <select name="time_id" defaultValue={receita.time_id ?? ''}>
            <OptionList options={formData.times} placeholder="Sem time" />
          </select>
        </Field>
        <Field label="Descrição">
          <textarea className="textarea" name="descricao" defaultValue={receita.descricao ?? ''} />
        </Field>
      </div>
      <div className="module-inline-actions">
        <Link className="button secondary" href="/modulos/flex/financeiro?pendencias=receitas">Cancelar</Link>
        <button className="button" type="submit">Salvar ajuste</button>
      </div>
    </form>
  )
}

export function FlexReceitaCategoriaPendenciasForm({
  action,
  categorias,
  rows,
}: {
  action: (formData: FormData) => void | Promise<void>
  categorias: FlexOption[]
  rows: FlexReceitaCategoriaPendencia[]
}) {
  if (!rows.length) {
    return <div className="suite-empty-block">Nenhuma categoria de receita pendente.</div>
  }

  return (
    <div className="suite-table-list flex-receita-categoria-list">
      {rows.map((row) => (
        <article key={row.categoriaOrigem}>
          <div>
            <h3>{row.categoriaOrigem}</h3>
            <p>
              {row.count} receita(s) - competência mais recente {row.latestCompetencia || '-'} - exemplo: {row.sample}
            </p>
          </div>
          <strong>{row.total.toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })}</strong>
          <form action={action} className="module-inline-actions flex-receita-categoria-action">
            <input name="categoria_origem" type="hidden" value={row.categoriaOrigem} />
            <select name="categoria_id" required>
              <OptionList options={categorias} placeholder="Categoria Flex" />
            </select>
            <button className="button" type="submit">Aplicar</button>
          </form>
        </article>
      ))}
    </div>
  )
}

export function FlexReceitaCategoriaMapeamentosPanel({
  action,
  categorias,
  mapeamentos,
  pendencias,
}: {
  action: (formData: FormData) => void | Promise<void>
  categorias: FlexOption[]
  mapeamentos: FlexReceitaCategoriaMapeamento[]
  pendencias: FlexReceitaCategoriaPendencia[]
}) {
  return (
    <div className="flex-receita-rotas-panel">
      <form action={action} className="module-form flex-receita-rota-form">
        <div className="module-form-grid">
          <Field label="Categoria Omie">
            <input className="input" list="flex-categorias-omie-pendentes" name="categoria_origem" placeholder="Ex.: Mensalidade de Assessoria Jurídica" required />
          </Field>
          <Field label="Categoria Flex">
            <select name="categoria_id" required>
              <OptionList options={categorias} placeholder="Selecione" />
            </select>
          </Field>
          <Field label="Observação">
            <input className="input" name="observacao" placeholder="Opcional" />
          </Field>
        </div>
        <datalist id="flex-categorias-omie-pendentes">
          {pendencias.map((row) => (
            <option key={row.categoriaOrigem} value={row.categoriaOrigem} />
          ))}
        </datalist>
        <button className="button" type="submit">Salvar rota</button>
      </form>

      {mapeamentos.length ? (
        <div className="suite-table-list flex-receita-rota-list">
          {mapeamentos.map((row) => (
            <article key={row.id}>
              <div>
                <h3>{row.categoria_origem}</h3>
                <p>{row.observacao || 'Classificação automática na importação Omie.'}</p>
              </div>
              <span className={`suite-pill ${row.status === 'ativo' ? 'success' : 'warning'}`}>{row.status}</span>
              <strong>{row.categoria?.nome ?? 'Categoria Flex'}</strong>
              <small>{row.categoria?.macrogrupo ?? 'receita'}</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="suite-empty-block">Nenhuma rota de receita cadastrada.</div>
      )}
    </div>
  )
}

export function FlexDespesaCategoriaMapeamentosPanel({
  action,
  categorias,
  mapeamentos,
  pendencias,
}: {
  action: (formData: FormData) => void | Promise<void>
  categorias: FlexOption[]
  mapeamentos: FlexDespesaCategoriaMapeamento[]
  pendencias: FlexDespesaCategoriaPendencia[]
}) {
  return (
    <div className="flex-receita-rotas-panel">
      <form action={action} className="module-form flex-receita-rota-form">
        <div className="module-form-grid">
          <Field label="Termo do extrato">
            <input className="input" list="flex-termos-despesa-pendentes" name="termo_origem" placeholder="Ex.: GOOGLE, OMIE, AASP" required />
          </Field>
          <Field label="Categoria Flex">
            <select name="categoria_id" required>
              <OptionList options={categorias} placeholder="Selecione" />
            </select>
          </Field>
          <Field label="Macrogrupo">
            <input className="input" name="macrogrupo" placeholder="operacional" />
          </Field>
        </div>
        <datalist id="flex-termos-despesa-pendentes">
          {pendencias.map((row) => (
            <option key={row.termoOrigem} value={row.termoOrigem} />
          ))}
        </datalist>
        <button className="button" type="submit">Salvar rota</button>
      </form>

      {mapeamentos.length ? (
        <div className="suite-table-list flex-receita-rota-list">
          {mapeamentos.map((row) => (
            <article key={row.id}>
              <div>
                <h3>{row.termo_origem}</h3>
                <p>{row.observacao || 'Classificação automática na importação OFX.'}</p>
              </div>
              <span className={`suite-pill ${row.status === 'ativo' ? 'success' : 'warning'}`}>{row.status}</span>
              <strong>{row.categoria?.nome ?? 'Categoria Flex'}</strong>
              <small>{row.macrogrupo || row.categoria?.macrogrupo || 'operacional'}</small>
            </article>
          ))}
        </div>
      ) : (
        <div className="suite-empty-block">Nenhuma rota de despesa cadastrada.</div>
      )}
    </div>
  )
}

export function FlexExtratoLancamentoForm({
  action,
  formData,
}: {
  action: (formData: FormData) => void | Promise<void>
  formData: FlexFormData
}) {
  return (
    <form action={action} className="card module-form">
      <div className="suite-panel-heading">
        <div>
          <h2>Registrar extrato</h2>
          <p>Cria um extrato com um lançamento inicial para alimentar despesas e validação.</p>
        </div>
      </div>
      <div className="module-form-grid">
        <Field label="Banco">
          <input className="input" name="banco" defaultValue="Manual" required />
        </Field>
        <Field label="Conta">
          <input className="input" name="conta" />
        </Field>
        <Field label="Período início">
          <input className="input" name="periodo_inicio" type="date" />
        </Field>
        <Field label="Período fim">
          <input className="input" name="periodo_fim" type="date" />
        </Field>
        <Field label="Saldo inicial">
          <input className="input" name="saldo_inicial" type="number" step="0.01" />
        </Field>
        <Field label="Saldo final">
          <input className="input" name="saldo_final" type="number" step="0.01" />
        </Field>
        <Field label="Data lançamento">
          <input className="input" name="data_lancamento" type="date" required />
        </Field>
        <Field label="Tipo">
          <select name="tipo" defaultValue="saida">
            <option value="saida">Saída</option>
            <option value="entrada">Entrada</option>
          </select>
        </Field>
        <Field label="Valor">
          <input className="input" name="valor" type="number" step="0.01" min="0" required />
        </Field>
        <Field label="Fornecedor">
          <input className="input" name="fornecedor" />
        </Field>
        <Field label="Categoria">
          <select name="categoria_id">
            <OptionList options={formData.categorias} placeholder="Sem categoria" />
          </select>
        </Field>
        <Field label="Macrogrupo">
          <input className="input" name="macrogrupo" />
        </Field>
        <Field label="Descrição">
          <input className="input" name="descricao" />
        </Field>
        <Field label="Histórico">
          <textarea className="textarea" name="historico" />
        </Field>
      </div>
      <button className="button" type="submit">Salvar extrato</button>
    </form>
  )
}

export function FlexDespesaLancamentoForm({
  action,
  formData,
  lancamento,
}: {
  action: (formData: FormData) => void | Promise<void>
  formData: FlexFormData
  lancamento: FlexExtratoLancamento
}) {
  return (
    <form action={action} className="card module-form flex-despesa-lancamento-form">
      <input name="id" type="hidden" value={lancamento.id} />
      <div className="suite-panel-heading">
        <div>
          <h2>Classificar despesa</h2>
          <p>Atualize a categoria, ajuste os dados do lançamento e decida se ele entra na previsão mensal.</p>
        </div>
      </div>
      <div className="module-form-grid">
        <Field label="Fornecedor">
          <input className="input" name="fornecedor" defaultValue={lancamento.fornecedor ?? ''} />
        </Field>
        <Field label="Data">
          <input className="input" name="data_lancamento" type="date" defaultValue={lancamento.data_lancamento} required />
        </Field>
        <Field label="Valor">
          <input className="input" name="valor" type="number" step="0.01" min="0" defaultValue={lancamento.valor} required />
        </Field>
        <Field label="Categoria">
          <select name="categoria_id" defaultValue={lancamento.categoria_id ?? ''}>
            <OptionList options={formData.categoriasDespesa} placeholder="Sem categoria" />
          </select>
        </Field>
        <Field label="Macrogrupo">
          <input className="input" name="macrogrupo" defaultValue={lancamento.macrogrupo ?? 'operacional'} />
        </Field>
        <Field label="Previsão mensal">
          <select name="previsao_despesa_id" defaultValue={lancamento.previsao_despesa_id ?? ''}>
            <OptionList options={formData.previsoesDespesa} placeholder="Não vincular" />
          </select>
        </Field>
        <Field label="Descrição">
          <input className="input" name="descricao" defaultValue={lancamento.descricao ?? ''} />
        </Field>
        <Field label="Histórico">
          <textarea className="textarea" name="historico" defaultValue={lancamento.historico ?? ''} />
        </Field>
      </div>
      <label className="module-check-row">
        <input name="criar_previsao" type="checkbox" />
        <span>Criar previsão recorrente com os dados deste lançamento se não houver previsão vinculada.</span>
      </label>
      <div className="module-inline-actions">
        <Link className="button secondary" href={`/modulos/flex/financeiro/despesas?competencia=${lancamento.data_lancamento.slice(0, 7)}`}>Cancelar</Link>
        <button className="button" type="submit">Salvar despesa</button>
      </div>
    </form>
  )
}

export function FlexOfxImportForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>
}) {
  return (
    <form action={action} className="card module-form">
      <div className="suite-panel-heading">
        <div>
          <h2>Importar OFX</h2>
          <p>Extrato Banco Inter com lançamentos, datas, valores e chave FITID.</p>
        </div>
      </div>
      <div className="module-form-grid">
        <Field label="Arquivo OFX">
          <input className="input" name="arquivo" type="file" accept=".ofx,application/x-ofx,application/vnd.intu.qfx" required />
        </Field>
      </div>
      <button className="button" type="submit">Importar extrato</button>
    </form>
  )
}

export function FlexOmieReceitasImportForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>
}) {
  return (
    <form action={action} className="card module-form">
      <div className="suite-panel-heading">
        <div>
          <h2>Importar receitas Omie</h2>
          <p>Planilha Finanças - Movimentação da Conta Corrente exportada do Omie.</p>
        </div>
      </div>
      <div className="module-form-grid">
        <Field label="Arquivo XLSX">
          <input className="input" name="arquivo" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required />
        </Field>
      </div>
      <button className="button" type="submit">Importar receitas</button>
    </form>
  )
}

export function FlexCompetenciaForm({
  action,
  button,
  competencias,
  description,
  defaultCompetencia,
  fields = 'competencia',
  required = true,
  title,
}: {
  action: (formData: FormData) => void | Promise<void>
  button: string
  competencias?: FlexOption[]
  description: string
  defaultCompetencia?: string
  fields?: 'competencia' | 'orcamento'
  required?: boolean
  title: string
}) {
  return (
    <form action={action} className="card module-form">
      <div className="suite-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="module-form-grid">
        {fields === 'orcamento' ? (
          <>
            <Field label="Competência base">
              <CompetenciaSelect name="competencia_base" options={competencias} />
            </Field>
            <Field label="Meses previstos">
              <input className="input" name="meses_previsao" type="number" min="1" max="12" defaultValue="3" />
            </Field>
          </>
        ) : (
          <Field label="Competência">
            <CompetenciaSelect defaultValue={defaultCompetencia} name="competencia" options={competencias} required={required} />
          </Field>
        )}
      </div>
      <button className="button" type="submit">{button}</button>
    </form>
  )
}

export function FlexPrevisaoDespesaForm({
  action,
  formData,
  previsao,
}: {
  action: (formData: FormData) => void | Promise<void>
  formData: FlexFormData
  previsao?: FlexPrevisaoDespesa
}) {
  return (
    <form action={action} className="card module-form flex-previsao-form">
      {previsao ? <input name="id" type="hidden" value={previsao.id} /> : null}
      <div className="suite-panel-heading">
        <div>
          <h2>{previsao ? 'Editar previsão' : 'Nova previsão'}</h2>
          <p>Base mensal recorrente para comparação com o extrato Banco Inter.</p>
        </div>
      </div>
      <div className="module-form-grid">
        <Field label="Fornecedor">
          <input className="input" name="fornecedor" defaultValue={previsao?.fornecedor ?? ''} required />
        </Field>
        <Field label="Tipo de despesa">
          <input className="input" name="tipo_despesa" defaultValue={previsao?.tipo_despesa ?? ''} required />
        </Field>
        <Field label="Aliases no extrato">
          <textarea className="textarea" name="aliases" defaultValue={previsao?.aliases?.join('\n') ?? ''} placeholder="Um termo por linha" />
        </Field>
        <Field label="Valor previsto">
          <input className="input" name="valor_previsto" type="number" step="0.01" min="0" defaultValue={previsao?.valor_previsto ?? 0} required />
        </Field>
        <Field label="Dia previsto">
          <input className="input" name="dia_previsto" type="number" min="1" max="31" defaultValue={previsao?.dia_previsto ?? 5} />
        </Field>
        <Field label="Início">
          <CompetenciaSelect defaultValue={previsao?.competencia_inicio?.slice(0, 7) ?? new Date().toISOString().slice(0, 7)} name="competencia_inicio" options={formData.competencias} />
        </Field>
        <Field label="Fim">
          <input className="input" name="competencia_fim" type="date" defaultValue={previsao?.competencia_fim ?? ''} />
        </Field>
        <Field label="Categoria">
          <select name="categoria_id" defaultValue={previsao?.categoria_id ?? ''}>
            <OptionList options={formData.categoriasDespesa} placeholder="Sem categoria" />
          </select>
        </Field>
        <Field label="Macrogrupo">
          <input className="input" name="macrogrupo" defaultValue={previsao?.macrogrupo ?? 'operacional'} />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={previsao?.status ?? 'ativo'}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </Field>
        <Field label="Origem">
          <input className="input" name="origem" defaultValue={previsao?.origem ?? 'manual'} />
        </Field>
        <Field label="Observação">
          <textarea className="textarea" name="observacao" defaultValue={previsao?.observacao ?? ''} />
        </Field>
      </div>
      <button className="button" type="submit">Salvar previsão</button>
    </form>
  )
}

export function FlexValidacaoItensList({
  action,
  rows,
}: {
  action: (formData: FormData) => void | Promise<void>
  rows: FlexValidacaoItem[]
}) {
  if (!rows.length) return <FlexList rows={[]} empty="Nenhuma divergência item a item gerada." />

  return (
    <section className="card suite-panel">
      <div className="suite-panel-heading">
        <div>
          <h2>Validação item a item</h2>
          <p>{rows.length} ocorrência(s)</p>
        </div>
      </div>
      <div className="suite-table-list flex-validation-list">
        {rows.map((row) => {
          const pendente = row.status === 'pendente'
          const podeAtualizarPrevisao = Boolean(row.previsao_id && (row.valor_realizado !== null || row.data_realizada))
          return (
            <article id={`item-${row.id}`} key={row.id}>
              <div>
                <h3>{row.fornecedor || row.descricao || 'Despesa'}</h3>
                <p>
                  {[row.tipo, row.descricao, row.data_prevista ? `previsto ${row.data_prevista}` : '', row.data_realizada ? `real ${row.data_realizada}` : ''].filter(Boolean).join(' - ')}
                </p>
              </div>
              <span className={`suite-pill ${pendente ? 'warning' : 'success'}`}>{row.status}</span>
              <strong>
                {Number(row.diferenca ?? 0).toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })}
              </strong>
              <small>
                Previsto {Number(row.valor_previsto ?? 0).toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })} / Real {Number(row.valor_realizado ?? 0).toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })}
              </small>
              {pendente ? (
                <form action={action} className="module-inline-actions">
                  <input type="hidden" name="id" value={row.id} />
                  <input className="input" name="justificativa" placeholder="Justificativa" />
                  {podeAtualizarPrevisao ? <button className="button secondary" name="decisao" value="atualizar_previsao" type="submit">Atualizar previsão</button> : null}
                  {row.tipo === 'pago_sem_previsao' ? <button className="button secondary" name="decisao" value="incluir_previsao" type="submit">Incluir previsão</button> : null}
                  <button className="button secondary" name="decisao" value="manter_diferenca" type="submit">Manter diferença</button>
                  <button className="button secondary" name="decisao" value="ignorado" type="submit">Ignorar</button>
                </form>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}

export function FlexSugestoesList({
  action,
  rows,
}: {
  action: (formData: FormData) => void | Promise<void>
  rows: FlexListRow[]
}) {
  if (!rows.length) return <FlexList rows={[]} empty="Nenhuma sugestão gerada." />

  return (
    <section className="card suite-panel">
      <div className="suite-panel-heading">
        <div>
          <h2>Sugestões</h2>
          <p>{rows.length} item(ns)</p>
        </div>
      </div>
      <div className="suite-table-list">
        {rows.map((row) => (
          <article id={`sugestao-${row.id}`} key={row.id}>
            <div>
              <h3>{row.title}</h3>
              <p>{row.subtitle}</p>
            </div>
            <span className={`suite-pill ${row.tone ?? 'primary'}`}>{row.status}</span>
            <strong>{row.value}</strong>
            <form action={action} className="module-inline-actions">
              <input type="hidden" name="id" value={row.id} />
              <button className="button secondary" name="status" value="aceita" type="submit">Aceitar</button>
              <button className="button secondary" name="status" value="rejeitada" type="submit">Rejeitar</button>
            </form>
          </article>
        ))}
      </div>
    </section>
  )
}

export function FlexComissaoForm({
  action,
  comissao,
  formData,
}: {
  action: (formData: FormData) => void | Promise<void>
  comissao?: FlexComissao
  formData: FlexFormData
}) {
  return (
    <form action={action} className="card module-form">
      {comissao ? <input name="id" type="hidden" value={comissao.id} /> : null}
      <div className="suite-panel-heading">
        <div>
          <h2>{comissao ? 'Editar comissão' : 'Nova comissão'}</h2>
          <p>Registro manual ou ajuste aprovado antes de gerar pagamentos.</p>
        </div>
      </div>
      <div className="module-form-grid">
        <Field label="Colaborador">
          <select name="colaborador_id" defaultValue={comissao?.colaborador_id ?? ''} required>
            <OptionList options={formData.colaboradores} placeholder="Selecione um colaborador" />
          </select>
        </Field>
        <Field label="Tipo">
          <select name="tipo_comissao_id" defaultValue={comissao?.tipo_comissao_id ?? ''}>
            <OptionList options={formData.tiposComissao} placeholder="Sem tipo" />
          </select>
        </Field>
        <Field label="Receita">
          <select name="receita_id" defaultValue={comissao?.receita_id ?? ''}>
            <option value="">Sem receita vinculada</option>
          </select>
        </Field>
        <Field label="Competência">
          <CompetenciaSelect defaultValue={comissao?.competencia} name="competencia" options={formData.competencias} />
        </Field>
        <Field label="Valor base">
          <input className="input" name="valor_base" type="number" step="0.01" min="0" defaultValue={comissao?.valor_base ?? 0} />
        </Field>
        <Field label="Percentual">
          <input className="input" name="percentual" type="number" step="0.0001" min="0" defaultValue={comissao?.percentual ?? 0} />
        </Field>
        <Field label="Valor comissão">
          <input className="input" name="valor_comissao" type="number" step="0.01" min="0" defaultValue={comissao?.valor_comissao ?? 0} />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={comissao?.status ?? 'calculada'}>
            <option value="calculada">Calculada</option>
            <option value="em_conferencia">Em conferência</option>
            <option value="aprovada">Aprovada</option>
            <option value="rejeitada">Rejeitada</option>
            <option value="paga">Paga</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </Field>
        <Field label="Origem">
          <input className="input" name="origem" defaultValue={comissao?.origem ?? 'manual'} />
        </Field>
        <Field label="Observação">
          <textarea className="textarea" name="observacao" defaultValue={comissao?.observacao ?? ''} />
        </Field>
      </div>
      <button className="button" type="submit">Salvar comissão</button>
    </form>
  )
}

const comissaoStatusOptions = [
  { id: 'todos', label: 'Todos' },
  { id: 'calculada', label: 'Calculadas' },
  { id: 'em_conferencia', label: 'Em conferência' },
  { id: 'rejeitada', label: 'Rejeitadas' },
  { id: 'aprovada', label: 'Aprovadas' },
  { id: 'paga', label: 'Pagas' },
  { id: 'cancelada', label: 'Canceladas' },
]

function flexMoney(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })
}

function canApproveComissao(status: string) {
  return ['calculada', 'em_conferencia', 'rejeitada'].includes(status)
}

function flexStatusTone(status: string): FlexTone {
  if (['ativo', 'aprovada', 'paga', 'concluido', 'realizada', 'classificado'].includes(status)) return 'success'
  if (['pendente', 'calculada', 'em_conferencia', 'rejeitada', 'previsto'].includes(status)) return 'warning'
  if (['cancelada', 'vencido', 'erro'].includes(status)) return 'danger'
  return 'primary'
}

export function FlexComissoesOperacionaisList({
  approveAction,
  bulkApproveAction,
  canApprove,
  competencia,
  competencias,
  returnBaseHref = '/modulos/flex/comissoes',
  rows,
  status,
}: {
  approveAction: (formData: FormData) => void | Promise<void>
  bulkApproveAction: (formData: FormData) => void | Promise<void>
  canApprove: boolean
  competencia: string
  competencias: FlexOption[]
  returnBaseHref?: string
  rows: FlexComissaoListItem[]
  status: string
}) {
  const returnTo = `${returnBaseHref}?competencia=${competencia}&status=${status}`
  const approvableRows = rows.filter((row) => canApproveComissao(row.status))

  return (
    <div className="flex-comissoes-operacionais">
      <form className="flex-filter-bar">
        <label>
          <span>Competência</span>
          <select name="competencia" defaultValue={competencia}>
            <option value="todas">Todas</option>
            {competencias.map((item) => (
              <option key={item.id} value={item.id}>{item.label}{item.meta ? ` - ${item.meta}` : ''}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select name="status" defaultValue={status}>
            {comissaoStatusOptions.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <button className="button secondary" type="submit">Aplicar filtros</button>
      </form>

      {rows.length ? (
        <form action={bulkApproveAction} className="flex-comissoes-operacionais-table">
          <input type="hidden" name="return_to" value={returnTo} />
          <div className="flex-comissoes-bulkbar">
            <span>{rows.length} comissão(ões) encontrada(s)</span>
            {canApprove ? <button className="button" disabled={!approvableRows.length} type="submit">Aprovar selecionadas</button> : null}
          </div>
          <table>
            <thead>
              <tr>
                <th>Sel.</th>
                <th>Colaborador</th>
                <th>Receita</th>
                <th>Regra</th>
                <th>Base</th>
                <th>%</th>
                <th>Comissão</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const approvable = canApprove && canApproveComissao(row.status)

                return (
                  <tr key={row.id}>
                    <td>{approvable ? <input name="ids" type="checkbox" value={row.id} defaultChecked /> : null}</td>
                    <td>
                      <strong>{row.colaborador}</strong>
                      <small>{row.competencia.slice(0, 7)}</small>
                    </td>
                    <td>
                      <strong>{row.receita}</strong>
                      <small>{row.origem ?? 'receita'}</small>
                    </td>
                    <td>
                      <strong>{row.tipo}</strong>
                      <small>{row.observacao ?? 'sem observação'}</small>
                    </td>
                    <td>{flexMoney(row.valor_base)}</td>
                    <td>{row.percentual.toLocaleString('pt-BR')}%</td>
                    <td>{flexMoney(row.valor_comissao)}</td>
                    <td><span className={`suite-pill ${flexStatusTone(row.status)}`}>{row.status}</span></td>
                    <td>
                      {approvable ? (
                        <button
                          className="button secondary"
                          formAction={approveAction}
                          name="id"
                          type="submit"
                          value={row.id}
                        >
                          Aprovar
                        </button>
                      ) : (
                        <Link className="button secondary" href={`/modulos/flex/comissoes/${row.id}`}>Abrir</Link>
                      )}
                      <input type="hidden" name="status" value="aprovada" />
                      <input type="hidden" name="return_to" value={returnTo} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </form>
      ) : (
        <div className="suite-empty-block">Nenhuma comissão encontrada para os filtros selecionados.</div>
      )}
    </div>
  )
}

export function FlexStatusActionList({
  action,
  rows,
}: {
  action: (formData: FormData) => void | Promise<void>
  rows: FlexListRow[]
}) {
  if (!rows.length) return <FlexList rows={[]} empty="Nenhuma comissão aguardando aprovação." />

  return (
    <section className="card suite-panel">
      <div className="suite-panel-heading">
        <div>
          <h2>Aprovação de comissões</h2>
          <p>{rows.length} item(ns) para conferência.</p>
        </div>
      </div>
      <div className="suite-table-list">
        {rows.map((row) => (
          <article key={row.id}>
            <div>
              <h3>{row.title}</h3>
              <p>{row.subtitle}</p>
            </div>
            <span className={`suite-pill ${row.tone ?? 'primary'}`}>{row.status}</span>
            <strong>{row.value}</strong>
            <form action={action} className="module-inline-actions">
              <input type="hidden" name="id" value={row.id} />
              <button className="button secondary" name="status" value="aprovada" type="submit">Aprovar</button>
              <button className="button secondary" name="status" value="rejeitada" type="submit">Rejeitar</button>
            </form>
          </article>
        ))}
      </div>
    </section>
  )
}

export function FlexPagamentoAgendaForm({
  action,
  agenda,
  formData,
}: {
  action: (formData: FormData) => void | Promise<void>
  agenda?: FlexPagamentoAgenda
  formData: FlexFormData
}) {
  return (
    <form action={action} className="card module-form">
      {agenda ? <input name="id" type="hidden" value={agenda.id} /> : null}
      <div className="suite-panel-heading">
        <div>
          <h2>{agenda ? 'Editar agenda' : 'Nova agenda'}</h2>
          <p>Regra recorrente para gerar pagamentos mensais.</p>
        </div>
      </div>
      <div className="module-form-grid">
        <Field label="Tipo de pagamento">
          <select name="tipo_pagamento_id" defaultValue={agenda?.tipo_pagamento_id ?? ''}>
            <OptionList options={formData.tiposPagamento} placeholder="Sem tipo" />
          </select>
        </Field>
        <Field label="Colaborador">
          <select name="colaborador_id" defaultValue={agenda?.colaborador_id ?? ''}>
            <OptionList options={formData.colaboradores} placeholder="Sem colaborador" />
          </select>
        </Field>
        <Field label="Time">
          <select name="time_id" defaultValue={agenda?.time_id ?? ''}>
            <OptionList options={formData.times} placeholder="Sem time" />
          </select>
        </Field>
        <Field label="Descrição">
          <input className="input" name="descricao" defaultValue={agenda?.descricao ?? ''} />
        </Field>
        <Field label="Dia previsto">
          <input className="input" name="dia_previsto" type="number" min="1" max="31" defaultValue={agenda?.dia_previsto ?? 5} />
        </Field>
        <Field label="Valor bruto">
          <input className="input" name="valor_bruto" type="number" step="0.01" min="0" defaultValue={agenda?.valor_bruto ?? 0} />
        </Field>
        <Field label="Descontos">
          <input className="input" name="valor_descontos" type="number" step="0.01" min="0" defaultValue={agenda?.valor_descontos ?? 0} />
        </Field>
        <Field label="Percentual">
          <input className="input" name="percentual" type="number" step="0.0001" min="0" defaultValue={agenda?.percentual ?? 0} />
        </Field>
        <Field label="Início competência">
          <CompetenciaSelect defaultValue={agenda?.inicio_competencia} name="inicio_competencia" options={formData.competencias} />
        </Field>
        <Field label="Fim competência">
          <input className="input" name="fim_competencia" type="date" defaultValue={agenda?.fim_competencia ?? ''} />
        </Field>
        <Field label="Status">
          <StatusSelect defaultValue={agenda?.status ?? 'ativo'} />
        </Field>
      </div>
      <button className="button" type="submit">Salvar agenda</button>
    </form>
  )
}

export function FlexPagamentoForm({
  action,
  formData,
  pagamento,
}: {
  action: (formData: FormData) => void | Promise<void>
  formData: FlexFormData
  pagamento?: FlexPagamento
}) {
  return (
    <form action={action} className="card module-form">
      {pagamento ? <input name="id" type="hidden" value={pagamento.id} /> : null}
      <div className="suite-panel-heading">
        <div>
          <h2>{pagamento ? 'Editar pagamento' : 'Novo pagamento'}</h2>
          <p>Pagamento manual, de agenda ou vinculado a comissão aprovada.</p>
        </div>
      </div>
      <div className="module-form-grid">
        <Field label="Colaborador">
          <select name="colaborador_id" defaultValue={pagamento?.colaborador_id ?? ''} required>
            <OptionList options={formData.colaboradores} placeholder="Selecione um colaborador" />
          </select>
        </Field>
        <Field label="Tipo">
          <select name="tipo_pagamento_id" defaultValue={pagamento?.tipo_pagamento_id ?? ''}>
            <OptionList options={formData.tiposPagamento} placeholder="Sem tipo" />
          </select>
        </Field>
        <Field label="Comissão">
          <select name="comissao_id" defaultValue={pagamento?.comissao_id ?? ''}>
            <OptionList options={formData.comissoes} placeholder="Sem comissão" />
          </select>
        </Field>
        <Field label="Competência">
          <CompetenciaSelect defaultValue={pagamento?.competencia} name="competencia" options={formData.competencias} />
        </Field>
        <Field label="Descrição">
          <input className="input" name="descricao" defaultValue={pagamento?.descricao ?? ''} />
        </Field>
        <Field label="Data prevista">
          <input className="input" name="data_prevista" type="date" defaultValue={pagamento?.data_prevista ?? ''} />
        </Field>
        <Field label="Data pagamento">
          <input className="input" name="data_pagamento" type="date" defaultValue={pagamento?.data_pagamento ?? ''} />
        </Field>
        <Field label="Valor bruto">
          <input className="input" name="valor_bruto" type="number" step="0.01" min="0" defaultValue={pagamento?.valor_bruto ?? 0} />
        </Field>
        <Field label="Descontos">
          <input className="input" name="valor_descontos" type="number" step="0.01" min="0" defaultValue={pagamento?.valor_descontos ?? 0} />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={pagamento?.status ?? 'previsto'}>
            <option value="previsto">Previsto</option>
            <option value="em_processamento">Em processamento</option>
            <option value="pago">Pago</option>
            <option value="conciliado">Conciliado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </Field>
        <Field label="Origem">
          <input className="input" name="origem" defaultValue={pagamento?.origem ?? 'manual'} />
        </Field>
        <Field label="Observação">
          <textarea className="textarea" name="observacao" defaultValue={pagamento?.observacao ?? ''} />
        </Field>
      </div>
      <button className="button" type="submit">Salvar pagamento</button>
    </form>
  )
}

export function FlexPagamentoQuickActions({
  conciliarAction,
  formData,
  marcarPagoAction,
  pagamento,
}: {
  conciliarAction: (formData: FormData) => void | Promise<void>
  formData: FlexFormData
  marcarPagoAction: (formData: FormData) => void | Promise<void>
  pagamento: FlexPagamento
}) {
  return (
    <section className="ciclo-kpi-grid">
      <form action={marcarPagoAction} className="card module-form">
        <input type="hidden" name="id" value={pagamento.id} />
        <Field label="Data pagamento">
          <input className="input" name="data_pagamento" type="date" defaultValue={pagamento.data_pagamento ?? ''} />
        </Field>
        <button className="button" type="submit">Marcar como pago</button>
      </form>
      <form action={conciliarAction} className="card module-form">
        <input type="hidden" name="pagamento_id" value={pagamento.id} />
        <Field label="Lançamento de extrato">
          <select name="extrato_lancamento_id" required>
            <OptionList options={formData.extratoLancamentos} placeholder="Selecione o lançamento" />
          </select>
        </Field>
        <button className="button" type="submit">Conciliar</button>
      </form>
    </section>
  )
}

export function FlexFechamentoActions({
  fechamento,
  fecharAction,
  reabrirAction,
}: {
  fechamento: FlexFechamento
  fecharAction: (formData: FormData) => void | Promise<void>
  reabrirAction: (formData: FormData) => void | Promise<void>
}) {
  const isClosed = fechamento.status === 'fechado'
  const canClose = !isClosed && Number(fechamento.pendencias_total) === 0

  return (
    <section className="ciclo-kpi-grid">
      {!isClosed ? <form action={fecharAction} className="card module-form">
        <input type="hidden" name="id" value={fechamento.id} />
        <div>
          <h2>Fechar competência</h2>
          <p>{fechamento.pendencias_total} pendência(s) bloqueante(s).</p>
        </div>
        <button className="button" disabled={!canClose} type="submit">Fechar</button>
      </form> : null}
      {isClosed ? <form action={reabrirAction} className="card module-form">
        <input type="hidden" name="id" value={fechamento.id} />
        <Field label="Motivo de reabertura">
          <textarea className="textarea" name="reabertura_motivo" required defaultValue={fechamento.reabertura_motivo ?? ''} />
        </Field>
        <button className="button secondary" type="submit">Reabrir</button>
      </form> : null}
    </section>
  )
}

export function FlexTimeForm({
  action,
  time,
}: {
  action: (formData: FormData) => void | Promise<void>
  time?: FlexTime
}) {
  return (
    <form action={action} className="card module-form">
      {time ? <input name="id" type="hidden" value={time.id} /> : null}
      <div className="module-form-grid">
        <Field label="Nome">
          <input className="input" name="nome" defaultValue={time?.nome ?? ''} required />
        </Field>
        <Field label="Status">
          <StatusSelect defaultValue={time?.status ?? 'ativo'} />
        </Field>
        <Field label="Descrição">
          <textarea className="textarea" name="descricao" defaultValue={time?.descricao ?? ''} />
        </Field>
      </div>
      <button className="button" type="submit">Salvar</button>
    </form>
  )
}

export function FlexCategoriaForm({
  action,
  categoria,
}: {
  action: (formData: FormData) => void | Promise<void>
  categoria?: FlexCategoriaFinanceira
}) {
  return (
    <form action={action} className="card module-form">
      {categoria ? <input name="id" type="hidden" value={categoria.id} /> : null}
      <div className="module-form-grid">
        <Field label="Nome">
          <input className="input" name="nome" defaultValue={categoria?.nome ?? ''} required />
        </Field>
        <Field label="Macrogrupo">
          <input className="input" name="macrogrupo" defaultValue={categoria?.macrogrupo ?? ''} required />
        </Field>
        <Field label="Tipo">
          <select name="tipo" defaultValue={categoria?.tipo ?? 'despesa'}>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
            <option value="ambos">Ambos</option>
          </select>
        </Field>
        <Field label="Status">
          <StatusSelect defaultValue={categoria?.status ?? 'ativo'} />
        </Field>
      </div>
      <button className="button" type="submit">Salvar</button>
    </form>
  )
}

export function FlexTipoPagamentoForm({
  action,
  tipo,
}: {
  action: (formData: FormData) => void | Promise<void>
  tipo?: FlexTipoPagamento
}) {
  return (
    <form action={action} className="card module-form">
      {tipo ? <input name="id" type="hidden" value={tipo.id} /> : null}
      <div className="module-form-grid">
        <Field label="Código">
          <input className="input" name="codigo" defaultValue={tipo?.codigo ?? ''} required />
        </Field>
        <Field label="Nome">
          <input className="input" name="nome" defaultValue={tipo?.nome ?? ''} required />
        </Field>
        <Field label="Status">
          <StatusSelect defaultValue={tipo?.status ?? 'ativo'} />
        </Field>
      </div>
      <button className="button" type="submit">Salvar</button>
    </form>
  )
}

export function FlexTipoComissaoForm({
  action,
  formData,
  tipo,
}: {
  action: (formData: FormData) => void | Promise<void>
  formData: FlexFormData
  tipo?: FlexTipoComissao
}) {
  return (
    <form action={action} className="card module-form">
      {tipo ? <input name="id" type="hidden" value={tipo.id} /> : null}
      <div className="module-form-grid">
        <Field label="Nome">
          <input className="input" name="nome" defaultValue={tipo?.nome ?? ''} required />
        </Field>
        <Field label="Categoria">
          <select name="categoria_id" defaultValue={tipo?.categoria_id ?? ''}>
            <OptionList options={formData.categoriasReceita} placeholder="Sem categoria" />
          </select>
        </Field>
        <Field label="Percentual">
          <input className="input" name="percentual" type="number" step="0.0001" min="0" defaultValue={tipo?.percentual ?? 0} />
        </Field>
        <Field label="Base de cálculo">
          <select name="base_calculo" defaultValue={tipo?.base_calculo ?? 'valor_recebido'}>
            <option value="valor_recebido">Valor recebido</option>
            <option value="valor_base">Valor base</option>
          </select>
        </Field>
        <Field label="Escopo">
          <select name="escopo" defaultValue={tipo?.escopo ?? 'individual'}>
            <option value="individual">Individual</option>
            <option value="time">Time</option>
          </select>
        </Field>
        <Field label="Início da vigência">
          <input className="input" name="inicio_vigencia" type="date" defaultValue={tipo?.inicio_vigencia ?? ''} />
        </Field>
        <Field label="Fim da vigência">
          <input className="input" name="fim_vigencia" type="date" defaultValue={tipo?.fim_vigencia ?? ''} />
        </Field>
        <Field label="Status">
          <StatusSelect defaultValue={tipo?.status ?? 'ativo'} />
        </Field>
        <Field label="Observação">
          <textarea className="textarea" name="observacao" defaultValue={tipo?.observacao ?? ''} />
        </Field>
      </div>
      <button className="button" type="submit">Salvar</button>
    </form>
  )
}

export function FlexReceitaMapeamentoForm({
  action,
  formData,
  mapeamento,
}: {
  action: (formData: FormData) => void | Promise<void>
  formData: FlexFormData
  mapeamento?: FlexReceitaMapeamento
}) {
  return (
    <form action={action} className="card module-form">
      {mapeamento ? <input name="id" type="hidden" value={mapeamento.id} /> : null}
      <div className="suite-panel-heading">
        <div>
          <h2>{mapeamento ? 'Editar mapeamento' : 'Novo mapeamento'}</h2>
          <p>Vincule o vendedor informado pelo Omie a um colaborador ou time do Flex.</p>
        </div>
      </div>
      <div className="module-form-grid">
        <Field label="Origem">
          <input className="input" name="origem" defaultValue={mapeamento?.origem ?? 'omie'} />
        </Field>
        <Field label="Vendedor Omie">
          <input className="input" name="vendedor_nome" defaultValue={mapeamento?.vendedor_nome ?? ''} required />
        </Field>
        <Field label="Categoria">
          <select name="categoria_id" defaultValue={mapeamento?.categoria_id ?? ''}>
            <OptionList options={formData.categoriasReceita} placeholder="Todas as categorias" />
          </select>
        </Field>
        <Field label="Destino">
          <select name="destino_tipo" defaultValue={mapeamento?.destino_tipo ?? 'time'}>
            <option value="time">Time</option>
            <option value="colaborador">Colaborador</option>
          </select>
        </Field>
        <Field label="Time">
          <select name="time_id" defaultValue={mapeamento?.time_id ?? ''}>
            <OptionList options={formData.times} placeholder="Sem time" />
          </select>
        </Field>
        <Field label="Colaborador">
          <select name="colaborador_id" defaultValue={mapeamento?.colaborador_id ?? ''}>
            <OptionList options={formData.colaboradores} placeholder="Sem colaborador" />
          </select>
        </Field>
        <Field label="Prioridade">
          <input className="input" name="prioridade" type="number" min="0" defaultValue={mapeamento?.prioridade ?? 100} />
        </Field>
        <Field label="Status">
          <StatusSelect defaultValue={mapeamento?.status ?? 'ativo'} />
        </Field>
        <Field label="Observação">
          <textarea className="textarea" name="observacao" defaultValue={mapeamento?.observacao ?? ''} />
        </Field>
      </div>
      <button className="button" type="submit">Salvar mapeamento</button>
    </form>
  )
}

export function FlexColaboradorForm({
  action,
  colaborador,
  formData,
}: {
  action: (formData: FormData) => void | Promise<void>
  colaborador?: FlexColaborador
  formData: FlexFormData
}) {
  const recebeComissoes = colaborador ? colaborador.recebe_comissoes : true
  const usuariosCore = colaborador ? formData.usuarios : formData.usuariosColaborador

  return (
    <form action={action} className="card module-form flex-colaborador-form">
      {colaborador ? <input name="id" type="hidden" value={colaborador.id} /> : null}
      <section className="flex-form-block">
        <h2>Vínculo operacional</h2>
        <div className="flex-colaborador-core-grid">
          <Field label="Usuário Core">
            <select name="usuario_id" defaultValue={colaborador?.usuario_id ?? ''} required>
            <OptionList options={usuariosCore} placeholder="Selecione um usuário" />
            </select>
          </Field>
        <Field label="Carteira">
          <select name="carteira_id" defaultValue={colaborador?.carteira_id ?? ''}>
            <OptionList options={formData.carteiras} placeholder="Sem carteira" />
          </select>
        </Field>
        <Field label="Time">
          <select name="time_id" defaultValue={colaborador?.time_id ?? ''}>
            <OptionList options={formData.times} placeholder="Sem time" />
          </select>
        </Field>
        <Field label="Gestor">
          <select name="gestor_usuario_id" defaultValue={colaborador?.gestor_usuario_id ?? ''}>
            <OptionList options={formData.usuarios} placeholder="Sem gestor" />
          </select>
        </Field>
        <Field label="Função">
          <input className="input" name="cargo_operacional" defaultValue={colaborador?.cargo_operacional ?? ''} />
        </Field>
        <Field label="Data de início">
          <input className="input" name="data_inicio" type="date" defaultValue={colaborador?.data_inicio ?? ''} />
        </Field>
        <Field label="Status">
          <StatusSelect defaultValue={colaborador?.status ?? 'ativo'} />
        </Field>
        </div>
      </section>

      <section className="flex-form-block">
        <h2>Recebimentos</h2>
        <div className="flex-comissao-toggle">
          <label className="checkbox-row">
            <input name="recebe_comissoes" type="checkbox" defaultChecked={recebeComissoes} />
            <span>Participa da apuração de comissões</span>
          </label>
        </div>
      </section>

      <section className="flex-form-block">
        <h2>Valores</h2>
        <div className="flex-colaborador-values-grid">
        <Field label="Salário">
          <input className="input" name="salario" type="number" step="0.01" min="0" defaultValue={colaborador?.salario ?? 0} />
        </Field>
        <Field label="Participação em honorários">
          <input className="input" name="participacao_honorarios" type="number" step="0.01" min="0" defaultValue={colaborador?.participacao_honorarios ?? 0} />
        </Field>
        <Field label="Pró-labore">
          <input className="input" name="pro_labore" type="number" step="0.01" min="0" defaultValue={colaborador?.pro_labore ?? 0} />
        </Field>
        <Field label="Ajuda de custo">
          <input className="input" name="ajuda_custo" type="number" step="0.01" min="0" defaultValue={colaborador?.ajuda_custo ?? 0} />
        </Field>
        <Field label="Outros vencimentos">
          <input className="input" name="outros_vencimentos" type="number" step="0.01" min="0" defaultValue={colaborador?.outros_vencimentos ?? 0} />
        </Field>
        <Field label="Benefício">
          <input className="input" name="beneficio_descricao" defaultValue={colaborador?.beneficio_descricao ?? ''} />
        </Field>
        <Field label="Valor do benefício">
          <input className="input" name="beneficio_valor" type="number" step="0.01" min="0" defaultValue={colaborador?.beneficio_valor ?? 0} />
        </Field>
        <Field label="Observações">
          <textarea className="textarea" name="observacoes" defaultValue={colaborador?.observacoes ?? ''} />
        </Field>
        </div>
      </section>

      <div className="form-actions">
        <button className="button" type="submit">Salvar</button>
      </div>
    </form>
  )
}
