'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PlatformUsuario } from '@/lib/auth/platform'
import type { GkitJurCockpitArea, GkitJurCockpitUnicoData } from './types'

const STORAGE_VIEW_KEY = 'gkit-jur-novo-jur-view'
const STORAGE_DASHBOARD_KEY = 'gkit-jur-novo-jur-dashboard-collapsed'

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

const areaFilterHrefs: Record<GkitJurCockpitArea, Record<string, string>> = {
  processos: {},
  pre_juridico: {
    'Em análise': '/modulos/gkit-jur/pre-juridico?status=em_analise',
    Documentos: '/modulos/gkit-jur/pre-juridico?status=aguardando_documentos',
    'Alta prioridade': '/modulos/gkit-jur/pre-juridico?prioridade=alta',
    Aprovados: '/modulos/gkit-jur/pre-juridico?status=aprovado',
  },
  tarefas: {
    Críticas: '/modulos/gkit-jur/inbox?fila=criticos',
    Hoje: '/modulos/gkit-jur/inbox?fila=tarefas&ordenacao=prioridade',
    'Sem responsável': '/modulos/gkit-jur/inbox?fila=tarefas&ordenacao=responsavel',
    Automação: '/modulos/gkit-jur/agente',
  },
  publicacoes: {
    'Não tratadas': '/modulos/gkit-jur/publicacoes/lista?status=pendente',
    'Viraram prazo': '/modulos/gkit-jur/publicacoes/lista?status=triada_ia',
    'Exigem leitura': '/modulos/gkit-jur/publicacoes',
    'Baixo risco': '/modulos/gkit-jur/publicacoes/lista?status=dispensada',
  },
  acordos: {
    Ativos: '/modulos/gkit-jur/acordos/lista?status=ativo',
    Atrasados: '/modulos/gkit-jur/acordos',
    Quebrados: '/modulos/gkit-jur/acordos/lista?status=quebrado',
    Cumpridos: '/modulos/gkit-jur/acordos/lista?status=cumprido',
  },
  agenda: {
    Vencidas: '/modulos/gkit-jur/inbox?fila=tarefas&ordenacao=prioridade',
    Hoje: '/modulos/gkit-jur/inbox?fila=tarefas&ordenacao=prioridade',
    Semana: '/modulos/gkit-jur/inbox?fila=tarefas&ordenacao=prioridade',
    Eventos: '/modulos/gkit-jur/movimentacoes',
  },
}

function isArea(value: string | null): value is GkitJurCockpitArea {
  return Boolean(value && areaOrder.includes(value as GkitJurCockpitArea))
}

function filterHref(area: GkitJurCockpitArea, filter: string) {
  return areaFilterHrefs[area][filter] ?? areaEntryHref[area]
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
  const [processFilters, setProcessFilters] = useState({
    carteira: '',
    cliente: '',
    movimento: 'recentes',
  })

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
  const listCaption = useMemo(() => `${areaLabels[activeArea]} da carteira`, [activeArea])
  const visibleRows = useMemo(() => {
    if (activeArea !== 'processos') return data.rows

    const rows = data.rows
      .filter((row) => !processFilters.carteira || row.meta?.carteiraNome === processFilters.carteira)
      .filter((row) => !processFilters.cliente || row.meta?.clienteNome === processFilters.cliente)

    const movementTime = (value?: string | null) => {
      const parsed = Date.parse(value ?? '')
      return Number.isFinite(parsed) ? parsed : null
    }

    return [...rows].sort((left, right) => {
      const leftTime = movementTime(left.meta?.ultimaMovimentacaoEm)
      const rightTime = movementTime(right.meta?.ultimaMovimentacaoEm)

      if (processFilters.movimento === 'sem_movimento') {
        if (leftTime === null && rightTime !== null) return -1
        if (leftTime !== null && rightTime === null) return 1
      }

      if (processFilters.movimento === 'antigas') {
        return (leftTime ?? Number.MAX_SAFE_INTEGER) - (rightTime ?? Number.MAX_SAFE_INTEGER)
      }

      return (rightTime ?? 0) - (leftTime ?? 0)
    })
  }, [activeArea, data.rows, processFilters])

  return (
    <main className="gkit-jur-novo-jur">
      <header className="gkit-jur-novo-jur-header">
        <div className="gkit-jur-novo-jur-brand">
          <span>GKIT Jur</span>
          <strong>Novo Jur</strong>
        </div>

        <form action="/modulos/gkit-jur/busca" className="gkit-jur-novo-jur-search" method="get">
          <label htmlFor="gkit-jur-cockpit-search">Busca geral</label>
          <div>
          <input id="gkit-jur-cockpit-search" name="q" placeholder="Processo, pré-jurídico, publicação, tarefa..." type="search" />
            <button type="submit">Buscar</button>
          </div>
        </form>

        <div className="gkit-jur-novo-jur-operator">
          <span>{usuario.nome}</span>
          <small>ID {usuario.id.slice(0, 8)} - {usuario.tipo.replace('_', ' ')}</small>
        </div>

        <a className="gkit-jur-novo-jur-settings" href="/modulos/gkit-jur/configuracoes">Configurações</a>
      </header>

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
          {activeArea === 'processos' ? (
            <div className="gkit-jur-cockpit-process-filters" aria-label="Filtros de processos">
              <label>
                <span>Carteira</span>
                <select value={processFilters.carteira} onChange={(event) => setProcessFilters((current) => ({ ...current, carteira: event.target.value }))}>
                  <option value="">Todas</option>
                  {(data.filterOptions?.carteiras ?? []).map((carteira) => (
                    <option value={carteira} key={carteira}>{carteira}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Cliente</span>
                <select value={processFilters.cliente} onChange={(event) => setProcessFilters((current) => ({ ...current, cliente: event.target.value }))}>
                  <option value="">Todos</option>
                  {(data.filterOptions?.clientes ?? []).map((cliente) => (
                    <option value={cliente} key={cliente}>{cliente}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Movimentação</span>
                <select value={processFilters.movimento} onChange={(event) => setProcessFilters((current) => ({ ...current, movimento: event.target.value }))}>
                  <option value="recentes">Mais recentes</option>
                  <option value="antigas">Mais antigas</option>
                  <option value="sem_movimento">Sem movimento primeiro</option>
                </select>
              </label>
              <a href={areaEntryHref[activeArea]}>Abrir área</a>
            </div>
          ) : (
            <div className="gkit-jur-cockpit-filterchips">
              {data.filters.map((filter, index) => (
                <a className={index === 0 ? 'active' : ''} href={filterHref(activeArea, filter)} key={filter}>{filter}</a>
              ))}
              <a href={areaEntryHref[activeArea]}>Abrir área</a>
            </div>
          )}
        </div>

        <div className="gkit-jur-cockpit-list">
          {visibleRows.length ? (
            visibleRows.map((row) => (
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
            ))
          ) : (
            <div className="gkit-jur-cockpit-empty">
              <strong>{areaEmptyLabel[activeArea]}</strong>
              <a href={areaEntryHref[activeArea]}>Abrir área completa</a>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
