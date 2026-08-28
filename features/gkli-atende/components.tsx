'use client'

import Link from 'next/link'
import { CheckCircle2, Clock3, LogOut, PlayCircle, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PlatformUsuario } from '@/lib/auth/platform'
import type { GkliAtendeCard, GkliAtendeClientGroup, GkliAtendeData, GkliAtendeTask } from './queries'

type FilterField = 'cliente' | 'status' | 'prazo' | 'tipo'

type GkliAtendePageProps = {
  data: GkliAtendeData
  usuario: PlatformUsuario
  canWrite: boolean
  startTaskAction: (formData: FormData) => Promise<void>
  completeTaskAction: (formData: FormData) => Promise<void>
}

const CLIENTS_PER_PAGE = 20
const STORAGE_DASHBOARD_KEY = 'gkli-atende-dashboard-collapsed'

const fieldLabels: Record<FilterField, string> = {
  cliente: 'Cliente',
  status: 'Status',
  prazo: 'Prazo',
  tipo: 'Tipo',
}

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function plural(value: number, singular: string, pluralLabel: string) {
  return `${value} ${value === 1 ? singular : pluralLabel}`
}

function cardClass(card: GkliAtendeCard) {
  return `gkli-atende-card ${card.tone}`
}

function percent(value: number, total: number) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

function buildTrend(tasks: GkliAtendeTask[]) {
  const buckets = Array.from({ length: 7 }, () => 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const task of tasks) {
    if (!task.dataPrevista) continue
    const dueDate = new Date(`${task.dataPrevista.slice(0, 10)}T00:00:00`)
    if (Number.isNaN(dueDate.getTime())) continue
    const diff = Math.floor((dueDate.getTime() - today.getTime()) / 86400000)
    if (diff >= 0 && diff < buckets.length) buckets[diff] += 1
  }

  const max = Math.max(...buckets, 1)
  return buckets.map((value) => Math.max(Math.round((value / max) * 100), value ? 12 : 4))
}

function buildDashboard(groups: GkliAtendeClientGroup[]) {
  const tasks = groups.flatMap((group) => group.tarefas)
  const total = tasks.length
  const atrasadas = tasks.filter((task) => task.prazoTone === 'danger').length
  const hoje = tasks.filter((task) => task.prazoTone === 'warning').length
  const emAndamento = tasks.filter((task) => task.status === 'em_andamento').length
  const semPrazo = tasks.filter((task) => !task.dataPrevista).length
  const pendentes = tasks.filter((task) => task.status === 'pendente').length
  const maxClientLoad = Math.max(...groups.map((group) => group.tarefasPendentes), 1)

  return {
    total,
    bars: [
      { label: 'Atrasadas', value: percent(atrasadas, total), count: atrasadas, tone: 'danger' },
      { label: 'Hoje', value: percent(hoje, total), count: hoje, tone: 'warning' },
      { label: 'Em andamento', value: percent(emAndamento, total), count: emAndamento, tone: 'primary' },
      { label: 'Sem prazo', value: percent(semPrazo, total), count: semPrazo, tone: 'neutral' },
    ],
    trend: buildTrend(tasks),
    rings: [
      { label: 'Pendente', value: percent(pendentes, total), tone: 'warning' },
      { label: 'Andamento', value: percent(emAndamento, total), tone: 'primary' },
      { label: 'Atraso', value: percent(atrasadas, total), tone: 'danger' },
    ],
    workload: groups
      .filter((group) => group.tarefasPendentes > 0)
      .slice(0, 5)
      .map((group) => ({
        label: group.cliente,
        count: group.tarefasPendentes,
        value: percent(group.tarefasPendentes, maxClientLoad),
      })),
  }
}

function statusMatch(task: GkliAtendeTask, value: string) {
  if (!value) return true
  return task.status === value
}

function prazoMatch(task: GkliAtendeTask, value: string) {
  if (!value) return true
  if (value === 'atrasadas') return task.prazoTone === 'danger'
  if (value === 'hoje') return task.prazoTone === 'warning'
  return task.dataPrevista === ''
}

function filterGroup(group: GkliAtendeClientGroup, field: FilterField, query: string) {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return group

  if (field === 'cliente') {
    return group.searchable.includes(normalizedQuery) ? group : null
  }

  const tarefas = group.tarefas.filter((task) => {
    if (field === 'status') return statusMatch(task, query)
    if (field === 'prazo') return prazoMatch(task, query)
    return normalize(task.tipoNome).includes(normalizedQuery)
  })

  if (!tarefas.length) return null

  return {
    ...group,
    tarefas,
    total: tarefas.length + group.atendimentos.length,
    tarefasPendentes: tarefas.length,
    tarefasAtrasadas: tarefas.filter((task) => task.prazoTone === 'danger').length,
    tarefasHoje: tarefas.filter((task) => task.prazoTone === 'warning').length,
    tarefasEmAndamento: tarefas.filter((task) => task.status === 'em_andamento').length,
  }
}

function DynamicFilterField({
  field,
  query,
  setQuery,
}: {
  field: FilterField
  query: string
  setQuery: (value: string) => void
}) {
  if (field === 'status') {
    return (
      <select className="gkli-atende-filter-input" value={query} onChange={(event) => setQuery(event.target.value)}>
        <option value="">Todos os status</option>
        <option value="pendente">Pendentes</option>
        <option value="em_andamento">Em andamento</option>
      </select>
    )
  }

  if (field === 'prazo') {
    return (
      <select className="gkli-atende-filter-input" value={query} onChange={(event) => setQuery(event.target.value)}>
        <option value="">Todos os prazos</option>
        <option value="atrasadas">Atrasadas</option>
        <option value="hoje">Vencem hoje</option>
        <option value="sem_prazo">Sem prazo</option>
      </select>
    )
  }

  return (
    <input
      className="gkli-atende-filter-input"
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      placeholder={field === 'tipo' ? 'Digite o tipo' : 'Digite o cliente'}
    />
  )
}

function GkliAtendeDashboard({ groups }: { groups: GkliAtendeClientGroup[] }) {
  const [dashboardCollapsed, setDashboardCollapsed] = useState(false)
  const dashboard = useMemo(() => buildDashboard(groups), [groups])

  useEffect(() => {
    setDashboardCollapsed(window.localStorage.getItem(STORAGE_DASHBOARD_KEY) === 'true')
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_DASHBOARD_KEY, String(dashboardCollapsed))
  }, [dashboardCollapsed])

  return (
    <details
      className="gkli-atende-dashboard"
      onToggle={(event) => setDashboardCollapsed(!event.currentTarget.open)}
      open={!dashboardCollapsed}
    >
      <summary className="gkli-atende-dashboard-head">
        <div>
          <span>Dashboard</span>
          <h2>Atendimentos</h2>
        </div>
        <span className="gkli-atende-dashboard-toggle">{dashboardCollapsed ? 'Expandir' : 'Recolher'}</span>
      </summary>

      {!dashboardCollapsed ? (
        <div className="gkli-atende-dashboard-body">
          <section className="gkli-atende-dashboard-bars" aria-label="Pressão da fila">
            <span className="gkli-atende-dashboard-title">Pressão da fila</span>
            {dashboard.bars.map((bar) => (
              <div key={bar.label}>
                <span>{bar.label}</span>
                <i className={bar.tone} style={{ '--bar-size': `${bar.value}%` } as CSSProperties} />
                <small>{bar.count}</small>
              </div>
            ))}
          </section>

          <section className="gkli-atende-dashboard-trend" aria-label="Próximos vencimentos">
            <span className="gkli-atende-dashboard-title">Próximos vencimentos</span>
            <div>
              {dashboard.trend.map((value, index) => (
                <i key={index} style={{ '--trend-size': `${value}%` } as CSSProperties} />
              ))}
            </div>
          </section>

          <section className="gkli-atende-dashboard-rhythm" aria-label="Ritmo operacional">
            <span className="gkli-atende-dashboard-title">Ritmo operacional</span>
            <div>
              {dashboard.rings.map((ring) => (
                <span className={ring.tone} key={ring.label} style={{ '--ring-size': `${ring.value * 3.2}deg` } as CSSProperties}>
                  {ring.label}
                </span>
              ))}
            </div>
          </section>

          <section className="gkli-atende-dashboard-workload" aria-label="Concentração por cliente">
            <span className="gkli-atende-dashboard-title">Concentração por cliente</span>
            {dashboard.workload.length ? dashboard.workload.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <i style={{ '--bar-size': `${item.value}%` } as CSSProperties} />
                <small>{item.count}</small>
              </div>
            )) : (
              <p>Nenhuma concentração relevante neste recorte.</p>
            )}
          </section>
        </div>
      ) : null}
    </details>
  )
}

function GkliAtendeTaskRow({
  task,
  canWrite,
  startTaskAction,
  completeTaskAction,
}: {
  task: GkliAtendeTask
  canWrite: boolean
  startTaskAction: (formData: FormData) => Promise<void>
  completeTaskAction: (formData: FormData) => Promise<void>
}) {
  const isLastOpenTask = task.outrasTarefasAbertas === 0

  return (
    <article className="gkli-atende-task-row">
      <div className="gkli-atende-task-main">
        <span className={`gkli-atende-pill ${task.prazoTone}`}>{task.dataPrevistaLabel}</span>
        <h4>{task.descricao}</h4>
        <p>{task.atendimentoCodigo ? `${task.atendimentoCodigo} - ` : ''}{task.atendimentoTitulo}</p>
      </div>
      <div className="gkli-atende-task-meta">
        <span>{task.tipoNome}</span>
        <strong>{task.statusLabel}</strong>
      </div>
      {canWrite ? (
        <div className="gkli-atende-task-actions">
          {task.status === 'pendente' ? (
            <form action={startTaskAction}>
              <input type="hidden" name="id" value={task.id} />
              <input type="hidden" name="return_to" value="/modulos/gkli-atende" />
              <button className="gkli-atende-icon-button secondary" type="submit" title="Marcar em andamento">
                <PlayCircle size={16} />
              </button>
            </form>
          ) : null}
          <form action={completeTaskAction} className="gkli-atende-complete-form">
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="return_to" value="/modulos/gkli-atende" />
            {isLastOpenTask ? (
              <select name="resolucao" aria-label="Resolução do atendimento">
                <option value="encerrar_atendimento">Encerrar atendimento</option>
              </select>
            ) : null}
            <button className="gkli-atende-icon-button" type="submit" title="Concluir tarefa">
              <CheckCircle2 size={16} />
            </button>
          </form>
        </div>
      ) : null}
    </article>
  )
}

export function GkliAtendePage({
  data,
  usuario,
  canWrite,
  startTaskAction,
  completeTaskAction,
}: GkliAtendePageProps) {
  const [field, setField] = useState<FilterField>('cliente')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filteredGroups = useMemo(() => {
    return data.groups
      .map((group) => filterGroup(group, field, query))
      .filter((group): group is GkliAtendeClientGroup => Boolean(group))
  }, [data.groups, field, query])

  const totalPages = Math.max(Math.ceil(filteredGroups.length / CLIENTS_PER_PAGE), 1)
  const safePage = Math.min(page, totalPages)
  const paginatedGroups = filteredGroups.slice((safePage - 1) * CLIENTS_PER_PAGE, safePage * CLIENTS_PER_PAGE)

  function updateField(value: FilterField) {
    setField(value)
    setQuery('')
    setPage(1)
  }

  function updateQuery(value: string) {
    setQuery(value)
    setPage(1)
  }

  return (
    <main className="gkli-atende">
      <header className="gkli-atende-header">
        <div className="gkli-atende-brand">
          <img src="/GKIT_ico.png" alt="" />
          <div>
            <strong>GKLI Atende</strong>
            <span>Minha fila operacional</span>
          </div>
        </div>
        <form className="gkli-atende-global-search" onSubmit={(event) => event.preventDefault()}>
          <Search size={18} />
          <input
            value={field === 'cliente' ? query : ''}
            onChange={(event) => {
              updateField('cliente')
              updateQuery(event.target.value)
            }}
            placeholder="Cliente, atendimento, tarefa..."
          />
        </form>
        <div className="gkli-atende-user">
          <strong>{usuario.nome}</strong>
          <Link href="/logout">
            <LogOut size={14} />
            Sair
          </Link>
        </div>
      </header>

      <GkliAtendeDashboard groups={filteredGroups} />

      <section className="gkli-atende-workspace">
        <div className="gkli-atende-cards" aria-label="Resumo operacional">
          {data.cards.map((card) => (
            <article className={cardClass(card)} key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.hint}</small>
            </article>
          ))}
        </div>

        <div className="gkli-atende-filter-row">
          <select
            aria-label="Pesquisar por"
            className="gkli-atende-filter-select"
            value={field}
            onChange={(event) => updateField(event.target.value as FilterField)}
          >
            {Object.entries(fieldLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <DynamicFilterField field={field} query={query} setQuery={updateQuery} />
          <button
            className="gkli-atende-filter-clear"
            type="button"
            onClick={() => {
              setQuery('')
              setPage(1)
            }}
          >
            Limpar
          </button>
          <span className="gkli-atende-filter-count">
            {plural(filteredGroups.length, 'cliente', 'clientes')} · {plural(data.totalTarefas, 'tarefa aberta', 'tarefas abertas')}
          </span>
        </div>

        <div className="gkli-atende-list-head">
          <span>Página {safePage} de {totalPages}</span>
          <div>
            <button type="button" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}>
              Anterior
            </button>
            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(current + 1, totalPages))}>
              Próxima
            </button>
          </div>
        </div>

        <div className="gkli-atende-client-list">
          {paginatedGroups.length ? paginatedGroups.map((group) => (
            <details className="gkli-atende-client-block" key={group.cliente}>
              <summary>
                <span className="gkli-atende-expand">+</span>
                <strong>{group.cliente}</strong>
                <span className="gkli-atende-client-stats">
                  {plural(group.tarefasPendentes, 'tarefa', 'tarefas')}
                  {group.tarefasAtrasadas ? ` · ${group.tarefasAtrasadas} atrasada(s)` : ''}
                  {group.tarefasHoje ? ` · ${group.tarefasHoje} hoje` : ''}
                </span>
              </summary>
              <div className="gkli-atende-client-body">
                {group.tarefas.length ? (
                  <section>
                    <h3>Tarefas</h3>
                    <div className="gkli-atende-task-list">
                      {group.tarefas.map((task) => (
                        <GkliAtendeTaskRow
                          key={task.id}
                          task={task}
                          canWrite={canWrite}
                          startTaskAction={startTaskAction}
                          completeTaskAction={completeTaskAction}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
                {group.atendimentos.length ? (
                  <section>
                    <h3>Atendimentos</h3>
                    <div className="gkli-atende-atendimento-list">
                      {group.atendimentos.map((atendimento) => (
                        <article className="gkli-atende-atendimento-row" key={atendimento.id}>
                          <div>
                            <h4>{atendimento.titulo}</h4>
                            <p>{[atendimento.codigo, atendimento.tipo, atendimento.dataCriacaoLabel].filter(Boolean).join(' - ')}</p>
                          </div>
                          <span>{atendimento.tarefasPendentes}/{atendimento.tarefasTotal} tarefa(s)</span>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            </details>
          )) : (
            <div className="gkli-atende-empty">
              <Clock3 size={18} />
              Nenhum atendimento ou tarefa apareceu neste recorte.
            </div>
          )}
        </div>

        <div className="gkli-atende-list-head bottom">
          <span>Página {safePage} de {totalPages}</span>
          <div>
            <button type="button" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}>
              Anterior
            </button>
            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(current + 1, totalPages))}>
              Próxima
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
