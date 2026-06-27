import Link from 'next/link'
import type { ReactNode } from 'react'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import type { PlatformUsuario } from '@/lib/auth/platform'
import { ImportarReceitasForm } from '@/features/fix/_legacy/intr-components'
import {
  FixGerarInteligenciaForm,
  FixImportarExtratoCsvForm,
  FixMacrogrupoResumo,
  FixResumoCards,
  FixSugestoesAcionaveis,
  IntrGenericList,
  IntrListKpis,
  type FixResumoItem,
} from '@/features/fix/_legacy/intr-components'
import type { IntrListRow } from '@/features/fix/_legacy/intr-types'

export {
  FixGerarInteligenciaForm,
  FixImportarExtratoCsvForm,
  FixMacrogrupoResumo,
  FixResumoCards,
  FixSugestoesAcionaveis,
  IntrGenericList,
  IntrListKpis,
}
export type { FixResumoItem, IntrListRow }
export * from '@/features/fix/_legacy/intr-components'

type FixTab =
  | 'cockpit'
  | 'importacoes'
  | 'financeiro'
  | 'dashboard'
  | 'inteligencia'
  | 'extratos'
  | 'receitas'
  | 'despesas'
  | 'orcamento'
  | 'validacao'
  | 'sugestoes'
  | 'colaboradores'
  | 'times'
  | 'tiposComissao'
  | 'comissoes'
  | 'pagamentos'
  | 'fechamentos'
  | 'relatorios'
  | 'configuracoes'

const activeHref: Record<FixTab, string> = {
  cockpit: '/modulos/fix',
  importacoes: '/modulos/fix/importacoes',
  financeiro: '/modulos/fix/financeiro',
  dashboard: '/modulos/fix/dashboard',
  inteligencia: '/modulos/fix/financeiro/inteligencia',
  extratos: '/modulos/fix/financeiro/extratos',
  receitas: '/modulos/fix/financeiro/receitas',
  despesas: '/modulos/fix/financeiro/despesas',
  orcamento: '/modulos/fix/financeiro/orcamento',
  validacao: '/modulos/fix/financeiro/validacao',
  sugestoes: '/modulos/fix/financeiro/sugestoes',
  colaboradores: '/modulos/fix/colaboradores',
  times: '/modulos/fix/times',
  tiposComissao: '/modulos/fix/tipos-comissao',
  comissoes: '/modulos/fix/comissoes',
  pagamentos: '/modulos/fix/pagamentos',
  fechamentos: '/modulos/fix/fechamentos',
  relatorios: '/modulos/fix/relatorios',
  configuracoes: '/modulos/fix/configuracoes',
}

const navGroups: ModuleNavGroup[] = [
  {
    href: '/modulos/fix',
    title: 'Cockpit',
  },
  {
    href: '/modulos/fix/importacoes',
    title: 'Importações',
  },
  {
    title: 'Operação',
    items: [
      { href: '/modulos/fix/financeiro', label: 'Financeiro' },
      { href: '/modulos/fix/comissoes', label: 'Comissões' },
      { href: '/modulos/fix/pagamentos', label: 'Pagamentos' },
      { href: '/modulos/fix/fechamentos', label: 'Fechamentos' },
    ],
  },
  {
    title: 'Cadastros',
    items: [
      { href: '/modulos/fix/colaboradores', label: 'Colaboradores' },
      { href: '/modulos/fix/times', label: 'Times' },
      { href: '/modulos/fix/tipos-comissao', label: 'Tipos de comissão' },
      { href: '/modulos/fix/configuracoes/categorias', label: 'Categorias financeiras' },
      { href: '/modulos/fix/configuracoes/regras', label: 'Regras de classificação' },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { href: '/modulos/fix/dashboard', label: 'Dashboard' },
      { href: '/modulos/fix/relatorios', label: 'Relatórios' },
      { href: '/modulos/fix/configuracoes', label: 'Configurações' },
    ],
  },
]

export function FixShell({
  active,
  actions,
  children,
  description,
  eyebrow = 'FIX — Financial Xperience',
  title,
  usuario,
}: {
  active: FixTab
  actions?: ReactNode
  children: ReactNode
  description: string
  eyebrow?: string
  title: string
  usuario: PlatformUsuario
}) {
  return (
    <ModuleShell
      activeHref={activeHref[active]}
      actions={actions}
      brand="FIX"
      description={description}
      eyebrow={eyebrow}
      navGroups={navGroups}
      product="GKIT FIX"
      title={title}
      usuario={usuario}
    >
      {children}
    </ModuleShell>
  )
}

function countRowsByStatus(rows: IntrListRow[], terms: string[]) {
  return rows.filter((row) => {
    const searchable = `${row.status} ${row.title} ${row.subtitle} ${row.meta}`.toLowerCase()
    return terms.some((term) => searchable.includes(term))
  }).length
}

function cleanTask({
  action,
  count,
  detail,
  href,
  priority,
  title,
  tone = 'primary',
}: {
  action: string
  count: number
  detail: string
  href: string
  priority: 'Alta' | 'Média' | 'Baixa'
  title: string
  tone?: IntrListRow['tone']
}) {
  if (!count) return null
  return (
    <Link className={`fix-clean-task ${tone ?? 'primary'}`} href={href} key={title}>
      <div>
        <span>{priority}</span>
        <strong>{count}</strong>
      </div>
      <h4>{title}</h4>
      <small>{detail}</small>
      <em>{action} →</em>
    </Link>
  )
}

export function FixCockpit({
  cards,
  colaboradoresCards,
  comissoes,
  contasPagar,
  extratos,
  fechamentos,
  importacoes,
  macrogrupos,
  pagamentos,
  previsao,
  sugestoes,
}: {
  cards: FixResumoItem[]
  colaboradoresCards: FixResumoItem[]
  comissoes: IntrListRow[]
  contasPagar: IntrListRow[]
  extratos: IntrListRow[]
  fechamentos: IntrListRow[]
  importacoes: IntrListRow[]
  macrogrupos: IntrListRow[]
  pagamentos: IntrListRow[]
  previsao: IntrListRow[]
  sugestoes: IntrListRow[]
}) {
  void cards
  void colaboradoresCards
  void macrogrupos

  const financeiroPendencias = contasPagar.length ? contasPagar : previsao
  const importacoesPendentes = countRowsByStatus(importacoes, ['erro', 'alerta', 'pendente'])
  const extratosPendentes = countRowsByStatus(extratos, ['pendente', 'aberto', 'importado'])
  const despesasPendentes = financeiroPendencias.length
  const comissoesPendentes = countRowsByStatus(comissoes, ['pendente', 'calculada', 'conferencia', 'aprovação', 'aprovacao', 'rascunho']) || comissoes.length
  const pagamentosPendentes = countRowsByStatus(pagamentos, ['previsto', 'pendente', 'aberto', 'agendado'])
  const fechamentosAbertos = countRowsByStatus(fechamentos, ['aberto', 'reaberto', 'conferencia', 'pendente']) || fechamentos.length
  const sugestoesPendentes = sugestoes.length
  const totalPendencias = importacoesPendentes + despesasPendentes + comissoesPendentes + pagamentosPendentes + sugestoesPendentes

  const tarefas = [
    cleanTask({
      action: 'Resolver agora',
      count: despesasPendentes,
      detail: 'Extrato Banco Inter',
      href: '/modulos/fix/financeiro/validacao',
      priority: 'Alta',
      title: 'Despesas sem classificação',
      tone: 'danger',
    }),
    cleanTask({
      action: 'Conferir agora',
      count: comissoesPendentes,
      detail: 'Competência atual',
      href: '/modulos/fix/comissoes/conferir',
      priority: 'Alta',
      title: 'Comissões aguardando conferência',
      tone: 'warning',
    }),
    cleanTask({
      action: 'Confirmar agora',
      count: pagamentosPendentes,
      detail: 'Próximos 7 dias',
      href: '/modulos/fix/pagamentos',
      priority: 'Média',
      title: 'Pagamentos previstos para confirmar',
      tone: 'primary',
    }),
    cleanTask({
      action: 'Revisar agora',
      count: importacoesPendentes || extratosPendentes,
      detail: 'Arquivos com alerta',
      href: '/modulos/fix/importacoes',
      priority: 'Média',
      title: 'Importações para revisar',
      tone: 'primary',
    }),
    cleanTask({
      action: 'Analisar agora',
      count: sugestoesPendentes,
      detail: 'Classificação e orçamento',
      href: '/modulos/fix/financeiro/sugestoes',
      priority: 'Baixa',
      title: 'Sugestões operacionais',
      tone: 'success',
    }),
  ].filter(Boolean)

  const etapas = [
    { label: 'Importações', percent: importacoes.length ? 67 : 0, value: importacoesPendentes ? `${importacoesPendentes} alerta(s)` : `${importacoes.length} registro(s)`, done: importacoes.length > 0 && !importacoesPendentes, href: '/modulos/fix/importacoes' },
    { label: 'Classificação', percent: despesasPendentes ? 84 : 100, value: despesasPendentes ? `${despesasPendentes} pendência(s)` : 'em dia', done: despesasPendentes === 0, href: '/modulos/fix/financeiro/despesas' },
    { label: 'Comissões', percent: comissoesPendentes ? 55 : 100, value: comissoesPendentes ? `${comissoesPendentes} pendência(s)` : 'em dia', done: comissoesPendentes === 0, href: '/modulos/fix/comissoes' },
    { label: 'Pagamentos', percent: pagamentosPendentes ? 65 : 100, value: pagamentosPendentes ? `${pagamentosPendentes} pendência(s)` : 'em dia', done: pagamentosPendentes === 0, href: '/modulos/fix/pagamentos' },
    { label: 'Fechamento', percent: totalPendencias ? 20 : 100, value: totalPendencias ? 'bloqueado' : 'liberado', done: totalPendencias === 0, href: '/modulos/fix/fechamentos' },
  ]

  const hoje = [
    { label: 'Vencem hoje', value: pagamentosPendentes, href: '/modulos/fix/pagamentos', tone: 'danger' },
    { label: 'Entraram hoje', value: extratos.length, href: '/modulos/fix/financeiro/extratos', tone: 'success' },
    { label: 'Atrasadas', value: despesasPendentes, href: '/modulos/fix/financeiro/validacao', tone: 'warning' },
    { label: 'Ações urgentes', value: comissoesPendentes, href: '/modulos/fix/comissoes/conferir', tone: 'primary' },
  ]

  const origem = [
    { label: 'Banco Inter', value: extratosPendentes || despesasPendentes, detail: 'pendências', href: '/modulos/fix/financeiro/extratos' },
    { label: 'Omie', value: importacoesPendentes, detail: 'pendências', href: '/modulos/fix/importacoes' },
    { label: 'Comissões', value: comissoesPendentes, detail: 'pendências', href: '/modulos/fix/comissoes' },
    { label: 'Pagamentos', value: pagamentosPendentes, detail: 'pendências', href: '/modulos/fix/pagamentos' },
  ]

  const resumo = [
    { label: 'Importações com alerta', value: importacoesPendentes, tone: 'success' },
    { label: 'Lançamentos não classificados', value: despesasPendentes, tone: 'danger' },
    { label: 'Comissões pendentes', value: comissoesPendentes, tone: 'warning' },
    { label: 'Pagamentos a confirmar', value: pagamentosPendentes, tone: 'primary' },
  ]

  const atividades = [...extratos, ...importacoes, ...comissoes, ...pagamentos].slice(0, 5)

  return (
    <div className="fix-clean-cockpit">
      <section className="fix-clean-header">
        <div>
          <span>Competência aberta</span>
          <div className="fix-clean-title-row">
            <h2>{fechamentosAbertos ? 'Período em operação' : 'Junho/2026'}</h2>
            <em>{totalPendencias ? 'Em operação' : 'Pronta para fechamento'}</em>
          </div>
        </div>

        <Link href="/modulos/fix/fechamentos">Ir para fechamento →</Link>
      </section>

      <section className="fix-clean-period">
        <div>
          <span>Período</span>
          <strong>01/06/2026 até 30/06/2026</strong>
        </div>
        <div>
          <span>Fechamento previsto</span>
          <strong>30/06/2026</strong>
        </div>
        <div>
          <span>Dias para fechamento</span>
          <strong>18 dias úteis</strong>
        </div>
      </section>

      <section className="fix-clean-panel">
        <div className="fix-clean-section-title">
          <div>
            <h3>Tarefas prioritárias</h3>
            <span>{tarefas.length}</span>
          </div>
          <Link href="/modulos/fix/fechamentos">Ver todas as tarefas →</Link>
        </div>

        {tarefas.length ? (
          <div className="fix-clean-task-grid">{tarefas}</div>
        ) : (
          <div className="suite-empty-block">Nenhuma tarefa operacional crítica agora.</div>
        )}
      </section>

      <section className="fix-clean-two-columns">
        <div className="fix-clean-panel">
          <div className="fix-clean-section-title">
            <div>
              <h3>Andamento do período</h3>
            </div>
          </div>

          <div className="fix-clean-flow">
            {etapas.map((etapa) => (
              <Link href={etapa.href} key={etapa.label}>
                <div className={etapa.done ? 'done' : 'pending'}>{etapa.done ? '✓' : '•'}</div>
                <span>{etapa.label}</span>
                <strong>{etapa.percent}%</strong>
                <small>{etapa.value}</small>
              </Link>
            ))}
          </div>
        </div>

        <div className="fix-clean-panel">
          <div className="fix-clean-section-title">
            <div>
              <h3>Bloqueios para fechamento</h3>
            </div>
            <Link href="/modulos/fix/fechamentos">Resolver →</Link>
          </div>

          <div className="fix-clean-blockers">
            {despesasPendentes ? <Link href="/modulos/fix/financeiro/validacao"><span>Despesas sem classificação</span><strong>{despesasPendentes}</strong></Link> : null}
            {comissoesPendentes ? <Link href="/modulos/fix/comissoes/aprovacao"><span>Comissões aguardando aprovação</span><strong>{comissoesPendentes}</strong></Link> : null}
            {pagamentosPendentes ? <Link href="/modulos/fix/pagamentos"><span>Pagamentos previstos sem confirmação</span><strong>{pagamentosPendentes}</strong></Link> : null}
            {!totalPendencias ? <div className="suite-empty-block">Nenhum bloqueio operacional identificado.</div> : null}
          </div>
        </div>
      </section>

      <section className="fix-clean-three-columns">
        <div className="fix-clean-panel">
          <div className="fix-clean-section-title">
            <div>
              <h3>Pendências por origem</h3>
            </div>
            <Link href="/modulos/fix/financeiro">Ver todas →</Link>
          </div>

          <div className="fix-clean-list">
            {origem.map((item) => (
              <Link href={item.href} key={item.label}>
                <span>{item.label}</span>
                <small>{item.value} {item.detail}</small>
              </Link>
            ))}
          </div>
        </div>

        <div className="fix-clean-panel">
          <div className="fix-clean-section-title">
            <div>
              <h3>Hoje</h3>
            </div>
          </div>

          <div className="fix-clean-list">
            {hoje.map((item) => (
              <Link href={item.href} key={item.label}>
                <span className={`dot ${item.tone}`}>{item.label}</span>
                <small>{item.value}</small>
              </Link>
            ))}
          </div>
        </div>

        <div className="fix-clean-panel">
          <div className="fix-clean-section-title">
            <div>
              <h3>Resumo rápido</h3>
            </div>
          </div>

          <div className="fix-clean-summary">
            {resumo.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong className={item.tone}>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fix-clean-panel">
        <div className="fix-clean-section-title">
          <div>
            <h3>Atividades recentes</h3>
          </div>
          <Link href="/modulos/fix/financeiro/extratos">Ver todas →</Link>
        </div>

        {atividades.length ? (
          <div className="fix-clean-activity">
            {atividades.map((row) => (
              <article key={row.id}>
                <strong>{row.title}</strong>
                <span>{row.subtitle}</span>
                <small>{row.meta || row.status}</small>
              </article>
            ))}
          </div>
        ) : (
          <div className="suite-empty-block">Nenhuma atividade recente encontrada.</div>
        )}
      </section>
    </div>
  )
}

export function FixImportacoesUnificadas({
  canImportExtratos,
  canImportReceitas,
  extratoAction,
  extratos,
  receitas,
}: {
  canImportExtratos: boolean
  canImportReceitas: boolean
  extratoAction: (formData: FormData) => void
  extratos: IntrListRow[]
  receitas: IntrListRow[]
}) {
  const receitasComAlerta = countRowsByStatus(receitas, ['erro', 'alerta', 'pendente'])
  const extratosComAlerta = countRowsByStatus(extratos, ['erro', 'alerta', 'pendente', 'aberto'])
  const ultimaReceita = receitas[0]
  const ultimoExtrato = extratos[0]

  return (
    <section className="fix-clean-imports">
      <header className="fix-clean-imports-head">
        <div>
          <h2>Importações</h2>
          <p>Entrada e validação dos arquivos financeiros usados na competência aberta.</p>
        </div>

        <div className="fix-clean-imports-status">
          <span>{receitasComAlerta} alerta(s) em receitas</span>
          <span>{extratosComAlerta} alerta(s) em extratos</span>
        </div>
      </header>

      <div className="fix-clean-imports-grid">
        <article className="fix-clean-import-card">
          <div className="fix-clean-import-card-head">
            <div>
              <h3>Receitas Omie</h3>
              <p>XLSX de movimentação da conta corrente. Alimenta receitas, categorias e comissões.</p>
            </div>
            <span>XLSX</span>
          </div>

          <div className="fix-clean-import-card-body">
            {canImportReceitas ? <ImportarReceitasForm /> : <p className="suite-empty-block warning">Usuário sem permissão para importar receitas.</p>}
          </div>

          <footer>
            <span>Última importação</span>
            {ultimaReceita ? (
              <small>{ultimaReceita.title} · {ultimaReceita.subtitle || ultimaReceita.meta}</small>
            ) : (
              <small>Nenhuma importação registrada.</small>
            )}
          </footer>
        </article>

        <article className="fix-clean-import-card">
          <div className="fix-clean-import-card-head">
            <div>
              <h3>Extrato Inter</h3>
              <p>CSV mensal para classificação, conciliação, despesas recorrentes e orçamento futuro.</p>
            </div>
            <span>CSV</span>
          </div>

          <div className="fix-clean-import-card-body">
            {canImportExtratos ? <FixImportarExtratoCsvForm action={extratoAction} /> : <p className="suite-empty-block warning">Usuário sem permissão para importar extratos.</p>}
          </div>

          <footer>
            <span>Última importação</span>
            {ultimoExtrato ? (
              <small>{ultimoExtrato.title} · {ultimoExtrato.subtitle || ultimoExtrato.meta}</small>
            ) : (
              <small>Nenhum extrato registrado.</small>
            )}
          </footer>
        </article>
      </div>

      <section className="fix-clean-imports-history">
        <div className="fix-clean-imports-history-head">
          <h3>Histórico recente</h3>
          <p>Últimos arquivos processados no FIX.</p>
        </div>

        <div className="fix-clean-history-columns">
          <FixCleanImportHistory title="Receitas" rows={receitas} empty="Nenhuma receita importada." />
          <FixCleanImportHistory title="Extratos" rows={extratos} empty="Nenhum extrato importado." />
        </div>
      </section>
    </section>
  )
}


function FixCleanImportHistory({
  empty,
  rows,
  title,
}: {
  empty: string
  rows: IntrListRow[]
  title: string
}) {
  return (
    <article className="fix-clean-history-card">
      <div className="fix-clean-history-card-head">
        <h4>{title}</h4>
        <span>{rows.length}</span>
      </div>

      <div className="fix-clean-history-list">
        {rows.length ? rows.slice(0, 5).map((row) => (
          <article key={row.id}>
            <div>
              <strong>{row.title}</strong>
              <small>{row.subtitle || row.meta}</small>
            </div>
            <span className={`suite-pill ${row.tone ?? 'primary'}`}>{row.status}</span>
          </article>
        )) : <p className="suite-empty-block">{empty}</p>}
      </div>
    </article>
  )
}


export function FixValidacaoDespesasList({
  ajustarAction,
  empty,
  ignorarAction,
  registrarAction,
  rows,
  title,
}: {
  ajustarAction: (formData: FormData) => void
  empty: string
  ignorarAction: (formData: FormData) => void
  registrarAction: (formData: FormData) => void
  rows: IntrListRow[]
  title: string
}) {
  return (
    <section className="card suite-panel">
      <div className="suite-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>Compare o orçamento de despesas com o realizado do extrato e registre o tratamento do desvio.</p>
        </div>
      </div>
      {rows.length ? (
        <div className="suite-table-list">
          {rows.map((row) => (
            <article key={row.id}>
              <div>
                <h3>{row.title}</h3>
                <p>{row.subtitle}</p>
                <small>{row.meta}</small>
              </div>
              <span className={`suite-pill ${row.tone ?? 'primary'}`}>{row.status}</span>
              <strong>{row.value}</strong>
              <div className="module-inline-actions">
                <form action={registrarAction} className="module-inline-actions">
                  <input type="hidden" name="validacao_id" value={row.id} />
                  <input name="motivo" placeholder="Motivo do desvio" required />
                  <button className="button secondary" type="submit">Registrar</button>
                </form>
                <form action={ignorarAction} className="module-inline-actions">
                  <input type="hidden" name="validacao_id" value={row.id} />
                  <input name="motivo" placeholder="Motivo para ignorar" required />
                  <button className="button secondary" type="submit">Ignorar</button>
                </form>
                <form action={ajustarAction} className="module-inline-actions">
                  <input type="hidden" name="validacao_id" value={row.id} />
                  <input name="valor_previsto" placeholder="Novo orçamento" required />
                  <input name="motivo" placeholder="Motivo" required />
                  <input name="meses" type="hidden" value="3" />
                  <button className="button" type="submit">Atualizar futuro</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="suite-empty-block">{empty}</p>
      )}
    </section>
  )
}

export function FixComissaoAprovacaoActions({
  aprovarCompetenciaAction,
  gerarPagamentosAction,
}: {
  aprovarCompetenciaAction: (formData: FormData) => Promise<void>
  gerarPagamentosAction: (formData: FormData) => Promise<void>
}) {
  return (
    <section className="suite-module-grid" aria-label="Ações de aprovação de comissões">
      <article className="card suite-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Aprovar competência</h2>
            <p>Aprova todas as comissões calculadas/em aprovação da competência informada.</p>
          </div>
        </div>
        <form action={aprovarCompetenciaAction} className="module-form-grid">
          <div>
            <label className="label" htmlFor="competencia_aprovacao">Competência</label>
            <input className="input" id="competencia_aprovacao" name="competencia" type="month" required />
          </div>
          <div className="form-actions module-form-wide">
            <button className="button" type="submit">Aprovar pendentes</button>
          </div>
        </form>
      </article>

      <article className="card suite-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Gerar pagamentos</h2>
            <p>Cria pagamentos previstos apenas para comissões já aprovadas.</p>
          </div>
        </div>
        <form action={gerarPagamentosAction} className="module-form-grid">
          <div>
            <label className="label" htmlFor="competencia_pagamento">Competência</label>
            <input className="input" id="competencia_pagamento" name="competencia" type="month" required />
          </div>
          <div>
            <label className="label" htmlFor="data_prevista_pagamento">Data prevista</label>
            <input className="input" id="data_prevista_pagamento" name="data_prevista" type="date" />
          </div>
          <div className="form-actions module-form-wide">
            <button className="button secondary" type="submit">Gerar pagamentos</button>
          </div>
        </form>
      </article>
    </section>
  )
}

export function FixComissaoAprovacaoList({
  aprovarAction,
  canWrite,
  devolverAction,
  rejeitarAction,
  rows,
}: {
  aprovarAction: (formData: FormData) => Promise<void>
  canWrite?: boolean
  devolverAction: (formData: FormData) => Promise<void>
  rejeitarAction: (formData: FormData) => Promise<void>
  rows: IntrListRow[]
}) {
  if (!rows.length) {
    return (
      <section className="card suite-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Aprovação de comissões</h2>
            <p>Nenhuma comissão encontrada para aprovação.</p>
          </div>
        </div>
        <div className="suite-empty-block">Importe receitas Omie ou calcule comissões para iniciar a aprovação.</div>
      </section>
    )
  }

  return (
    <section className="card suite-panel">
      <div className="suite-panel-heading">
        <div>
          <h2>Aprovação de comissões</h2>
          <p>Revise as comissões calculadas, aprove o que deve virar pagamento ou rejeite com motivo.</p>
        </div>
      </div>
      <div className="suite-table-list">
        {rows.map((row) => {
          const normalizedStatus = row.status.toLowerCase()
          const isApproved = normalizedStatus.includes('aprovada')
          const isRejected = normalizedStatus.includes('rejeitada')
          return (
            <article key={row.id}>
              <div>
                <h3>{row.title}</h3>
                <p>{row.subtitle}</p>
              </div>
              <span className={`suite-pill ${row.tone ?? 'primary'}`}>{row.status}</span>
              <strong>{row.value}</strong>
              <small>
                {row.meta}
                {canWrite ? <Link className="button secondary" href={`/modulos/fix/comissoes/${row.id}`}>Editar</Link> : null}
              </small>
              {canWrite ? (
                <div className="module-inline-actions">
                  {!isApproved ? (
                    <form action={aprovarAction}>
                      <input type="hidden" name="comissao_id" value={row.id} />
                      <button className="button" type="submit">Aprovar</button>
                    </form>
                  ) : null}
                  {isApproved || isRejected ? (
                    <form action={devolverAction}>
                      <input type="hidden" name="comissao_id" value={row.id} />
                      <button className="button secondary" type="submit">Voltar para aprovação</button>
                    </form>
                  ) : null}
                  {!isRejected ? (
                    <form action={rejeitarAction} className="module-inline-form">
                      <input type="hidden" name="comissao_id" value={row.id} />
                      <input className="input" name="motivo" placeholder="Motivo da rejeição" />
                      <button className="button secondary" type="submit">Rejeitar</button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function fixComponentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    aberto: 'aberta',
    em_conferencia: 'em análise',
    em_analise: 'em análise',
    fechado: 'fechada',
    reaberto: 'reaberta',
    cancelado: 'cancelada',
  }
  return labels[status] ?? status.replaceAll('_', ' ')
}


export function FixCompetenciaAtualCard({ fechamento }: { fechamento: import('@/features/fix/types').FixFechamentoGovernanca | null }) {
  if (!fechamento) {
    return (
      <section className="card suite-panel fix-competencia-card">
        <div className="suite-panel-heading">
          <div>
            <p className="platform-kicker">Competência aberta</p>
            <h2>Nenhuma competência iniciada</h2>
            <p>Crie uma competência em Fechamentos para abrir a esteira operacional do período.</p>
          </div>
          <Link className="button" href="/modulos/fix/fechamentos">Abrir fechamentos</Link>
        </div>
      </section>
    )
  }

  const okCount = fechamento.checklist.filter((item) => item.ok).length
  const pendingItems = fechamento.checklist.filter((item) => !item.ok)

  return (
    <section className="card suite-panel fix-competencia-card">
      <div className="suite-panel-heading">
        <div>
          <p className="platform-kicker">Competência aberta</p>
          <h2>{fechamento.competenciaLabel}</h2>
          <p>{fixComponentStatusLabel(fechamento.status)} · {fechamento.pendenciasTotal} pendência(s) · {okCount}/{fechamento.checklist.length} etapas concluídas</p>
        </div>
        <div className="module-page-actions">
          <Link className="button secondary" href="/modulos/fix/importacoes">Importar dados</Link>
          <Link className="button secondary" href="/modulos/fix/financeiro/validacao">Validar despesas</Link>
          <Link className="button secondary" href={`/modulos/fix/fechamentos/${fechamento.id}`}>Checklist</Link>
        </div>
      </div>
      <div className="fix-checklist-strip">
        {fechamento.checklist.map((item) => (
          <Link className={item.ok ? 'done' : 'pending'} href={item.href ?? `/modulos/fix/fechamentos/${fechamento.id}`} key={item.key}>
            <span>{item.ok ? 'OK' : 'A fazer'}</span>
            <strong>{item.label}</strong>
            <small>{item.pendencias ? `${item.pendencias} pendência(s)` : item.description}</small>
          </Link>
        ))}
      </div>
      {pendingItems.length ? (
        <div className="fix-competencia-note">
          Próximo foco: {pendingItems.slice(0, 2).map((item) => item.label.toLowerCase()).join(' e ')}.
        </div>
      ) : null}
    </section>
  )
}

export function FixFechamentoCreatePanel({ action }: { action: (formData: FormData) => Promise<void> }) {
  return (
    <section className="card suite-panel">
      <div className="suite-panel-heading">
        <div>
          <h2>Iniciar ou recalcular competência</h2>
          <p>Gera o snapshot da competência, vincula comissões/pagamentos e prepara o checklist de fechamento.</p>
        </div>
      </div>
      <form action={action} className="module-form-grid">
        <div>
          <label className="label" htmlFor="competencia_fechamento">Competência</label>
          <input className="input" id="competencia_fechamento" name="competencia" type="month" required />
        </div>
        <div>
          <label className="label" htmlFor="status_fechamento">Status inicial</label>
          <select className="input" id="status_fechamento" name="status" defaultValue="aberto">
            <option value="aberto">Aberta</option>
            <option value="em_analise">Em análise</option>
          </select>
        </div>
        <div className="module-form-wide">
          <label className="label" htmlFor="observacao_fechamento">Observação</label>
          <textarea className="input" id="observacao_fechamento" name="observacao" rows={3} placeholder="Observações internas da competência" />
        </div>
        <div className="form-actions module-form-wide">
          <button className="button" type="submit">Gerar snapshot</button>
        </div>
      </form>
    </section>
  )
}

export function FixFechamentoChecklistPanel({
  analisarAction,
  fecharAction,
  fechamento,
  reabrirAction,
}: {
  analisarAction: (formData: FormData) => Promise<void>
  fecharAction: (formData: FormData) => Promise<void>
  fechamento: import('@/features/fix/types').FixFechamentoGovernanca
  reabrirAction: (formData: FormData) => Promise<void>
}) {
  const isClosed = fechamento.status === 'fechado'
  const canClose = fechamento.pendenciasTotal === 0 && !isClosed

  return (
    <>
      <section className="card suite-panel">
        <div className="suite-panel-heading">
          <div>
            <p className="platform-kicker">Checklist da competência</p>
            <h2>{fechamento.competenciaLabel}</h2>
            <p>Status: {fixComponentStatusLabel(fechamento.status)} · {fechamento.pendenciasTotal} pendência(s)</p>
          </div>
          <span className={`suite-pill ${isClosed ? 'success' : fechamento.pendenciasTotal ? 'warning' : 'primary'}`}>{fixComponentStatusLabel(fechamento.status)}</span>
        </div>
        <div className="suite-table-list">
          {fechamento.checklist.map((item) => (
            <article key={item.key}>
              <div>
                <h3>{item.label}</h3>
                <p>{item.description}</p>
                <small>{item.total} registro(s) · {item.pendencias} pendência(s)</small>
              </div>
              <span className={`suite-pill ${item.ok ? 'success' : 'warning'}`}>{item.ok ? 'ok' : 'pendente'}</span>
              <strong>{item.value ?? String(item.total)}</strong>
              <small>{item.href ? <Link className="button secondary" href={item.href}>Abrir</Link> : null}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="suite-module-grid" aria-label="Ações da competência">
        {!isClosed ? (
          <article className="card suite-panel">
            <div className="suite-panel-heading">
              <div>
                <h2>Colocar em análise</h2>
                <p>Recalcula o snapshot e marca a competência como etapa de revisão final.</p>
              </div>
            </div>
            <form action={analisarAction} className="module-form-grid">
              <input type="hidden" name="id" value={fechamento.id} />
              <div className="form-actions module-form-wide">
                <button className="button secondary" type="submit">Marcar em análise</button>
              </div>
            </form>
          </article>
        ) : null}

        {!isClosed ? (
          <article className="card suite-panel">
            <div className="suite-panel-heading">
              <div>
                <h2>Fechar competência</h2>
                <p>Disponível somente sem pendências. Ao fechar, a competência fica bloqueada para alterações operacionais.</p>
              </div>
            </div>
            <form action={fecharAction} className="module-form-grid">
              <input type="hidden" name="id" value={fechamento.id} />
              {canClose ? null : <div className="suite-empty-block warning module-form-wide">Resolva as pendências antes de fechar.</div>}
              <div className="form-actions module-form-wide">
                <button className="button" disabled={!canClose} type="submit">Fechar competência</button>
              </div>
            </form>
          </article>
        ) : (
          <article className="card suite-panel">
            <div className="suite-panel-heading">
              <div>
                <h2>Reabrir competência</h2>
                <p>Reabertura administrativa para ajustes excepcionais. Informe o motivo para auditoria.</p>
              </div>
            </div>
            <form action={reabrirAction} className="module-form-grid">
              <input type="hidden" name="id" value={fechamento.id} />
              <div className="module-form-wide">
                <label className="label" htmlFor="motivo_reabertura">Motivo</label>
                <textarea className="input" id="motivo_reabertura" name="motivo" rows={3} required />
              </div>
              <div className="form-actions module-form-wide">
                <button className="button secondary" type="submit">Reabrir competência</button>
              </div>
            </form>
          </article>
        )}
      </section>
    </>
  )
}
