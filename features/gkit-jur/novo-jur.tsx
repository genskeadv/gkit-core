'use client'

import { LogOut, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PlatformUsuario } from '@/lib/auth/platform'
import type { GkitJurCockpitArea, GkitJurCockpitRow, GkitJurCockpitUnicoData } from './types'

type ListFilterField = 'cliente' | 'carteira' | 'ordenacao'
type ListOrder = 'recentes' | 'antigas' | 'sem_data'
type AreaListFilter = {
  field: ListFilterField;
  order: ListOrder;
  query: string;
}
type ManualCreateField = {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  multiline?: boolean;
}
type ManualCreateConfig = {
  title: string;
  eyebrow: string;
  description: string;
  href: string;
  fields: ManualCreateField[];
}

const STORAGE_VIEW_KEY = 'gkit-jur-novo-jur-view'
const STORAGE_DASHBOARD_KEY = 'gkit-jur-novo-jur-dashboard-collapsed'
const CLIENT_GROUP_PAGE_SIZE = 20

const areaLabels: Record<GkitJurCockpitArea, string> = {
  processos: 'Processos',
  pre_juridico: 'Pré-jurídico',
  tarefas: 'Tarefas',
  publicacoes: 'Publicações',
  acordos: 'Acordos',
  agenda: 'Agenda',
}

const areaOrder: GkitJurCockpitArea[] = ['processos', 'pre_juridico', 'tarefas', 'publicacoes', 'acordos', 'agenda']

const areaEntryHref: Record<GkitJurCockpitArea, string> = {
  processos: '/modulos/gkit-jur/processos',
  pre_juridico: '/modulos/gkit-jur/pre-juridico',
  tarefas: '/modulos/gkit-jur/inbox?fila=tarefas',
  publicacoes: '/modulos/gkit-jur/publicacoes',
  acordos: '/modulos/gkit-jur/acordos',
  agenda: '/modulos/gkit-jur/novo-jur?area=agenda',
}

const areaEmptyLabel: Record<GkitJurCockpitArea, string> = {
  processos: 'Nenhum processo apareceu neste recorte.',
  pre_juridico: 'Nenhum pré-jurídico apareceu neste recorte.',
  tarefas: 'Nenhuma tarefa apareceu neste recorte.',
  publicacoes: 'Nenhuma publicação apareceu neste recorte.',
  acordos: 'Nenhum acordo apareceu neste recorte.',
  agenda: 'Nenhum vencimento, prazo jurídico ou compromisso apareceu neste recorte.',
}

const areaOrderLabel: Record<GkitJurCockpitArea, string> = {
  processos: 'Movimentação',
  pre_juridico: 'Prazo de análise',
  tarefas: 'Prazo',
  publicacoes: 'Publicação',
  acordos: 'Vencimento',
  agenda: 'Vencimento',
}

const areaOrderOptions: Record<GkitJurCockpitArea, Record<ListOrder, string>> = {
  processos: {
    recentes: 'Última movimentação recente',
    antigas: 'Última movimentação antiga',
    sem_data: 'Sem movimentação primeiro',
  },
  pre_juridico: {
    recentes: 'Prazo mais recente',
    antigas: 'Prazo mais antigo',
    sem_data: 'Sem prazo primeiro',
  },
  tarefas: {
    recentes: 'Prazo mais recente',
    antigas: 'Prazo mais antigo',
    sem_data: 'Sem prazo primeiro',
  },
  publicacoes: {
    recentes: 'Publicação mais recente',
    antigas: 'Publicação mais antiga',
    sem_data: 'Sem data primeiro',
  },
  acordos: {
    recentes: 'Vencimento mais recente',
    antigas: 'Vencimento mais antigo',
    sem_data: 'Sem vencimento primeiro',
  },
  agenda: {
    recentes: 'Vencimento mais recente',
    antigas: 'Vencimento mais antigo',
    sem_data: 'Sem vencimento primeiro',
  },
}

const manualCreateConfig: Record<GkitJurCockpitArea, ManualCreateConfig> = {
  processos: {
    eyebrow: 'Processo',
    title: 'Inserção manual de processo',
    description: 'Registre o ponto de partida do processo e avance para completar dados de cliente, carteira e monitoramento.',
    href: '/modulos/gkit-jur/processos',
    fields: [
      { label: 'Número CNJ', name: 'numero_cnj', placeholder: 'Digite o número do processo' },
      { label: 'Cliente', name: 'cliente', placeholder: 'Digite o cliente' },
      { label: 'Carteira', name: 'carteira', placeholder: 'Digite a carteira' },
    ],
  },
  pre_juridico: {
    eyebrow: 'Pré-jurídico',
    title: 'Inserção manual de pré-jurídico',
    description: 'Abra uma triagem manual com cliente, assunto e descrição inicial para qualificação antes do processo.',
    href: '/modulos/gkit-jur/pre-juridico',
    fields: [
      { label: 'Título', name: 'titulo', placeholder: 'Digite o assunto' },
      { label: 'Cliente', name: 'cliente', placeholder: 'Digite o cliente' },
      { label: 'Resumo', name: 'descricao', placeholder: 'Descreva a demanda inicial', multiline: true },
    ],
  },
  tarefas: {
    eyebrow: 'Tarefa',
    title: 'Inserção manual de tarefa',
    description: 'Crie a base da tarefa operacional e direcione para a fila correta do jurídico.',
    href: '/modulos/gkit-jur/inbox?fila=tarefas',
    fields: [
      { label: 'Processo ou cliente', name: 'referencia', placeholder: 'Digite uma referência' },
      { label: 'Tarefa', name: 'titulo', placeholder: 'Digite a tarefa' },
      { label: 'Prazo', name: 'prazo', placeholder: 'Selecione o prazo', type: 'date' },
    ],
  },
  publicacoes: {
    eyebrow: 'Publicação',
    title: 'Inserção manual de publicação',
    description: 'Cadastre uma publicação avulsa para conferência e vinculação posterior.',
    href: '/modulos/gkit-jur/publicacoes',
    fields: [
      { label: 'Processo', name: 'processo', placeholder: 'Digite o processo' },
      { label: 'Fonte', name: 'fonte', placeholder: 'Digite a fonte' },
      { label: 'Texto', name: 'texto', placeholder: 'Cole o teor da publicação', multiline: true },
    ],
  },
  acordos: {
    eyebrow: 'Acordo',
    title: 'Inserção manual de acordo',
    description: 'Inicie um acordo judicial ou extrajudicial com vínculo, valor e vencimento base.',
    href: '/modulos/gkit-jur/acordos',
    fields: [
      { label: 'Processo ou cliente', name: 'referencia', placeholder: 'Digite uma referência' },
      { label: 'Valor', name: 'valor', placeholder: '0,00' },
      { label: 'Primeiro vencimento', name: 'vencimento', placeholder: 'Selecione a data', type: 'date' },
    ],
  },
  agenda: {
    eyebrow: 'Agenda',
    title: 'Inserção manual de agenda',
    description: 'Inclua prazo, audiência ou compromisso para acompanhamento da operação jurídica.',
    href: '/modulos/gkit-jur/novo-jur?area=agenda',
    fields: [
      { label: 'Processo ou cliente', name: 'referencia', placeholder: 'Digite uma referência' },
      { label: 'Evento', name: 'titulo', placeholder: 'Digite o evento' },
      { label: 'Data', name: 'data', placeholder: 'Selecione a data', type: 'date' },
    ],
  },
}

function isArea(value: string | null): value is GkitJurCockpitArea {
  return Boolean(value && areaOrder.includes(value as GkitJurCockpitArea))
}

function createAreaFilters(): Record<GkitJurCockpitArea, AreaListFilter> {
  return areaOrder.reduce((filters, area) => {
    filters[area] = {
      field: 'cliente',
      order: 'recentes',
      query: '',
    }
    return filters
  }, {} as Record<GkitJurCockpitArea, AreaListFilter>)
}

function normalizeFilterText(value?: string | null) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function rowClientGroup(row: GkitJurCockpitRow) {
  return row.meta?.clienteNome?.trim() || 'Sem cliente definido'
}

function uniqueFilterOptions(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]))
    .sort((left, right) => left.localeCompare(right, 'pt-BR'))
}

function rowDateTime(row: GkitJurCockpitRow, area: GkitJurCockpitArea) {
  const source = area === 'processos' ? row.meta?.ultimaMovimentacaoEm : row.due
  const brazilianDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(source ?? '')
  const parsed = brazilianDate
    ? Date.parse(`${brazilianDate[3]}-${brazilianDate[2]}-${brazilianDate[1]}T00:00:00`)
    : Date.parse(source ?? '')
  return Number.isFinite(parsed) ? parsed : null
}

export function GkitJurNovoJurPage({
  data: cockpitData,
  initialArea,
  usuario,
}: {
  data: GkitJurCockpitUnicoData
  initialArea?: string
  usuario: PlatformUsuario
}) {
  const [activeArea, setActiveArea] = useState<GkitJurCockpitArea>(() => isArea(initialArea ?? null) ? initialArea as GkitJurCockpitArea : 'tarefas')
  const [dashboardCollapsed, setDashboardCollapsed] = useState(false)
  const [manualPanelOpen, setManualPanelOpen] = useState(false)
  const [areaFilters, setAreaFilters] = useState(createAreaFilters)

  useEffect(() => {
    const storedArea = window.localStorage.getItem(STORAGE_VIEW_KEY)
    const storedDashboard = window.localStorage.getItem(STORAGE_DASHBOARD_KEY)
    if (isArea(initialArea ?? null)) setActiveArea(initialArea as GkitJurCockpitArea)
    else if (isArea(storedArea)) setActiveArea(storedArea)
    setDashboardCollapsed(storedDashboard === 'true')
  }, [initialArea])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_VIEW_KEY, activeArea)
  }, [activeArea])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_DASHBOARD_KEY, String(dashboardCollapsed))
  }, [dashboardCollapsed])

  const data = cockpitData[activeArea]
  const manualConfig = manualCreateConfig[activeArea]
  const listCaption = useMemo(() => `${areaLabels[activeArea]} da carteira`, [activeArea])
  const activeFilter = areaFilters[activeArea]
  const [visibleGroupLimit, setVisibleGroupLimit] = useState(CLIENT_GROUP_PAGE_SIZE)
  const searchOptions = useMemo(() => {
    if (activeFilter.field === 'ordenacao') return []
    const options = activeFilter.field === 'carteira'
      ? data.filterOptions?.carteiras ?? uniqueFilterOptions(data.rows.map((row) => row.meta?.carteiraNome))
      : data.filterOptions?.clientes ?? uniqueFilterOptions(data.rows.map((row) => row.meta?.clienteNome))
    return options
  }, [activeFilter.field, data.filterOptions?.carteiras, data.filterOptions?.clientes, data.rows])
  const visibleRows = useMemo(() => {
    const search = normalizeFilterText(activeFilter.query)
    const rows = data.rows.filter((row) => {
      if (!search || activeFilter.field === 'ordenacao') return true
      const value = activeFilter.field === 'carteira'
        ? row.meta?.carteiraNome
        : row.meta?.clienteNome
      return normalizeFilterText(value).includes(search)
    })

    return [...rows].sort((left, right) => {
      const leftTime = rowDateTime(left, activeArea)
      const rightTime = rowDateTime(right, activeArea)

      if (activeFilter.order === 'sem_data') {
        if (leftTime === null && rightTime !== null) return -1
        if (leftTime !== null && rightTime === null) return 1
      }

      if (activeFilter.order === 'antigas') {
        return (leftTime ?? Number.MAX_SAFE_INTEGER) - (rightTime ?? Number.MAX_SAFE_INTEGER)
      }

      return (rightTime ?? 0) - (leftTime ?? 0)
    })
  }, [activeArea, activeFilter, data.rows])
  const groupedRows = useMemo(() => {
    const groups = new Map<string, GkitJurCockpitRow[]>()

    visibleRows.forEach((row) => {
      const groupName = rowClientGroup(row)
      const group = groups.get(groupName) ?? []
      group.push(row)
      groups.set(groupName, group)
    })

    return Array.from(groups, ([client, rows]) => ({ client, rows }))
  }, [visibleRows])
  const visibleGroups = useMemo(() => groupedRows.slice(0, visibleGroupLimit), [groupedRows, visibleGroupLimit])

  useEffect(() => {
    setVisibleGroupLimit(CLIENT_GROUP_PAGE_SIZE)
  }, [activeArea, activeFilter.field, activeFilter.order, activeFilter.query])

  return (
    <main className="gkit-jur-novo-jur">
      <header className="gkit-jur-novo-jur-header">
        <button
          aria-expanded={manualPanelOpen}
          aria-label={`Inserir ${manualConfig.eyebrow.toLowerCase()}`}
          className="gkit-jur-novo-jur-create"
          onClick={() => setManualPanelOpen((current) => !current)}
          title={`Inserir ${manualConfig.eyebrow.toLowerCase()}`}
          type="button"
        >
          <Plus aria-hidden="true" size={21} strokeWidth={2.3} />
        </button>

        <form action="/modulos/gkit-jur/busca" className="gkit-jur-novo-jur-search" method="get">
          <div>
            <input id="gkit-jur-cockpit-search" name="q" placeholder="Processo, pré-jurídico, publicação, tarefa..." type="search" />
            <button type="submit">Buscar</button>
          </div>
        </form>

        <div className="gkit-jur-novo-jur-right">
          <div className="gkit-jur-novo-jur-operator">
            <span>{usuario.nome}</span>
            <a aria-label="Sair" className="gkit-jur-novo-jur-logout" href="/logout" title="Sair">
              <LogOut aria-hidden="true" size={13} strokeWidth={2} />
              <span>Sair</span>
            </a>
          </div>
          <a className="gkit-jur-novo-jur-settings" href="/modulos/gkit-jur/configuracoes">Configurações</a>
        </div>
      </header>

      {manualPanelOpen ? (
        <section className="gkit-jur-novo-jur-manual-panel" aria-label={manualConfig.title}>
          <div className="gkit-jur-novo-jur-manual-copy">
            <span>{manualConfig.eyebrow}</span>
            <strong>{manualConfig.title}</strong>
            <p>{manualConfig.description}</p>
          </div>
          <form action={manualConfig.href} className="gkit-jur-novo-jur-manual-form" method="get">
            {manualConfig.fields.map((field) => (
              <label key={field.name}>
                <span>{field.label}</span>
                {field.multiline ? (
                  <textarea name={field.name} placeholder={field.placeholder} rows={3} />
                ) : (
                  <input name={field.name} placeholder={field.placeholder} type={field.type ?? 'text'} />
                )}
              </label>
            ))}
            <div className="gkit-jur-novo-jur-manual-actions">
              <button type="submit">Continuar</button>
              <button type="button" onClick={() => setManualPanelOpen(false)}>Fechar</button>
            </div>
          </form>
        </section>
      ) : null}

      <details
        className="gkit-jur-cockpit-dashboard"
        onToggle={(event) => setDashboardCollapsed(!event.currentTarget.open)}
        open={!dashboardCollapsed}
      >
        <summary className="gkit-jur-cockpit-dashboard-head">
          <div>
            <span>Dashboard</span>
            <h1>{areaLabels[activeArea]}</h1>
          </div>
          <span className="gkit-jur-cockpit-dashboard-toggle">{dashboardCollapsed ? 'Expandir' : 'Recolher'}</span>
        </summary>

        {!dashboardCollapsed ? (
          <div className="gkit-jur-cockpit-dashboard-body">
            <div className="gkit-jur-cockpit-dashboard-chart" aria-label={`Indicadores de ${areaLabels[activeArea]}`}>
              <span className="gkit-jur-cockpit-chart-title">Distribuição por tipo</span>
              {data.bars.map((bar) => (
                <div key={bar.label}>
                  <span>{bar.label}</span>
                  <i className={bar.tone} style={{ '--bar-size': `${bar.value}%` } as CSSProperties} />
                  <small>{bar.value}%</small>
                </div>
              ))}
            </div>

            <div className="gkit-jur-cockpit-dashboard-trend" aria-label={`Tendência de ${areaLabels[activeArea]}`}>
              <span className="gkit-jur-cockpit-chart-title">Tendência da carteira</span>
              <div>
                {data.trend.map((value, index) => (
                  <i
                    key={`${activeArea}-${index}`}
                    style={{ '--trend-size': `${value}%` } as CSSProperties}
                  />
                ))}
              </div>
            </div>

            <div className="gkit-jur-cockpit-dashboard-rhythm" aria-label={`Ritmo operacional de ${areaLabels[activeArea]}`}>
              <span className="gkit-jur-cockpit-chart-title">Ritmo operacional</span>
              <div>
                {data.bars.slice(0, 3).map((bar) => (
                  <span className={bar.tone} key={`${bar.label}-rhythm`} style={{ '--ring-size': `${bar.value * 3.2}deg` } as CSSProperties}>
                    {bar.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </details>

      <section className="gkit-jur-cockpit-actions" aria-label="Cards de acionamento">
        {areaOrder.map((area) => {
          const config = cockpitData[area]
          const active = area === activeArea
          return (
            <a
              className={active ? 'active' : ''}
              data-area={area}
              href={`?area=${area}`}
              key={area}
              onClick={() => setActiveArea(area)}
            >
              <span>{areaLabels[area]}</span>
              <strong>{config.count.toLocaleString('pt-BR')}</strong>
              <small>{config.action}</small>
            </a>
          )
        })}
      </section>

      <section className="gkit-jur-cockpit-workspace">
        <div className="gkit-jur-cockpit-filterbar">
          <div>
            <span>{listCaption}</span>
            <strong>{data.description}</strong>
          </div>
          <div className="gkit-jur-cockpit-list-filters" aria-label={`Filtros de ${areaLabels[activeArea]}`}>
            <label>
              <span>Pesquisar por</span>
              <select
                value={activeFilter.field}
                onChange={(event) => setAreaFilters((current) => ({
                  ...current,
                  [activeArea]: {
                    ...current[activeArea],
                    field: event.target.value as ListFilterField,
                    query: '',
                  },
                }))}
              >
                <option value="cliente">Cliente</option>
                <option value="carteira">Carteira</option>
                <option value="ordenacao">{areaOrderLabel[activeArea]}</option>
              </select>
            </label>
            <label>
              <span>{activeFilter.field === 'ordenacao' ? 'Ordenar por' : 'Busca'}</span>
              {activeFilter.field === 'ordenacao' ? (
                <select
                  value={activeFilter.order}
                  onChange={(event) => setAreaFilters((current) => ({
                    ...current,
                    [activeArea]: {
                      ...current[activeArea],
                      order: event.target.value as ListOrder,
                    },
                  }))}
                >
                  <option value="recentes">{areaOrderOptions[activeArea].recentes}</option>
                  <option value="antigas">{areaOrderOptions[activeArea].antigas}</option>
                  <option value="sem_data">{areaOrderOptions[activeArea].sem_data}</option>
                </select>
              ) : (
                <>
                  <input
                    list={`gkit-jur-${activeArea}-${activeFilter.field}-options`}
                    placeholder={activeFilter.field === 'carteira' ? 'Digite a carteira' : 'Digite o cliente'}
                    type="search"
                    value={activeFilter.query}
                    onChange={(event) => setAreaFilters((current) => ({
                      ...current,
                      [activeArea]: {
                        ...current[activeArea],
                        query: event.target.value,
                      },
                    }))}
                  />
                  <datalist id={`gkit-jur-${activeArea}-${activeFilter.field}-options`}>
                    {searchOptions.map((option) => (
                      <option value={option} key={option} />
                    ))}
                  </datalist>
                </>
              )}
            </label>
          </div>
        </div>

        <div className="gkit-jur-cockpit-list">
          {groupedRows.length ? (
            visibleGroups.map((group) => (
              <details className="gkit-jur-cockpit-client-group" key={group.client}>
                <summary>
                  <strong>{group.client}</strong>
                  <small>{group.rows.length} {group.rows.length === 1 ? 'item' : 'itens'}</small>
                </summary>
                <div>
                  {group.rows.map((row) => (
                    <a className={`gkit-jur-cockpit-row ${row.tone}`} href={row.href} key={`${row.href}-${row.id}`}>
                      <div>
                        <span>{row.id}</span>
                        <strong>{row.title}</strong>
                        <small>{row.subtitle}</small>
                      </div>
                      <div>
                        <span>{row.owner}</span>
                        <strong>{row.status}</strong>
                        <small>{row.due}</small>
                      </div>
                    </a>
                  ))}
                </div>
              </details>
            ))
          ) : (
            <div className="gkit-jur-cockpit-empty">
              <strong>{areaEmptyLabel[activeArea]}</strong>
              <a href={areaEntryHref[activeArea]}>Abrir área completa</a>
            </div>
          )}
          {visibleGroups.length < groupedRows.length ? (
            <div className="gkit-jur-cockpit-list-more">
              <span>{visibleGroups.length} de {groupedRows.length} clientes</span>
              <button type="button" onClick={() => setVisibleGroupLimit((current) => current + CLIENT_GROUP_PAGE_SIZE)}>
                Carregar mais 20 clientes
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
