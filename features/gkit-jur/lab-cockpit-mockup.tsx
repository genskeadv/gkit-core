'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PlatformUsuario } from '@/lib/auth/platform'
import type { GkitJurCockpitArea, GkitJurCockpitUnicoData } from './types'

const STORAGE_VIEW_KEY = 'gkit-jur-cockpit-lab-view'
const STORAGE_DASHBOARD_KEY = 'gkit-jur-cockpit-lab-dashboard-collapsed'

const areaLabels: Record<GkitJurCockpitArea, string> = {
  processos: 'Processos',
  pre_juridico: 'Pre-juridico',
  tarefas: 'Tarefas',
  publicacoes: 'Publicacoes',
  acordos: 'Acordos',
  agenda: 'Agenda',
}

const areaOrder: GkitJurCockpitArea[] = ['processos', 'pre_juridico', 'tarefas', 'publicacoes', 'acordos', 'agenda']

function isArea(value: string | null): value is GkitJurCockpitArea {
  return Boolean(value && areaOrder.includes(value as GkitJurCockpitArea))
}

export function GkitJurCockpitMockup({
  data: cockpitData,
  initialArea,
  usuario,
}: {
  data: GkitJurCockpitUnicoData
  initialArea?: string
  usuario: PlatformUsuario
}) {
  const [activeArea, setActiveArea] = useState<GkitJurCockpitArea>(() => isArea(initialArea ?? null) ? initialArea as GkitJurCockpitArea : 'publicacoes')
  const [dashboardCollapsed, setDashboardCollapsed] = useState(false)

  useEffect(() => {
    const storedArea = window.localStorage.getItem(STORAGE_VIEW_KEY)
    const storedDashboard = window.localStorage.getItem(STORAGE_DASHBOARD_KEY)
    if (isArea(storedArea)) setActiveArea(storedArea)
    setDashboardCollapsed(storedDashboard === 'true')
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_VIEW_KEY, activeArea)
  }, [activeArea])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_DASHBOARD_KEY, String(dashboardCollapsed))
  }, [dashboardCollapsed])

  const data = cockpitData[activeArea]
  const listCaption = useMemo(() => `${areaLabels[activeArea]} da carteira`, [activeArea])

  return (
    <main className="gkit-jur-cockpit-mockup">
      <header className="gkit-jur-cockpit-mockup-header">
        <div className="gkit-jur-cockpit-mockup-brand">
          <span>GKIT Jur</span>
          <strong>Cockpit unico</strong>
        </div>

        <form className="gkit-jur-cockpit-mockup-search">
          <label htmlFor="gkit-jur-cockpit-search">Busca geral</label>
          <input id="gkit-jur-cockpit-search" placeholder="Processo, pre-juridico, publicacao, tarefa..." type="search" />
        </form>

        <div className="gkit-jur-cockpit-mockup-operator">
          <span>{usuario.nome}</span>
          <small>ID {usuario.id.slice(0, 8)} - {usuario.tipo.replace('_', ' ')}</small>
        </div>

        <a className="gkit-jur-cockpit-mockup-settings" href="/modulos/gkit-jur/configuracoes">Configuracoes</a>
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
              <span className="gkit-jur-cockpit-chart-title">Distribuicao por tipo</span>
              {data.bars.map((bar) => (
                <div key={bar.label}>
                  <span>{bar.label}</span>
                  <i className={bar.tone} style={{ '--bar-size': `${bar.value}%` } as CSSProperties} />
                  <small>{bar.value}%</small>
                </div>
              ))}
            </div>

            <div className="gkit-jur-cockpit-dashboard-trend" aria-label={`Tendencia de ${areaLabels[activeArea]}`}>
              <span className="gkit-jur-cockpit-chart-title">Tendencia da carteira</span>
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
          <div className="gkit-jur-cockpit-filterchips">
            {data.filters.map((filter, index) => (
              <button className={index === 0 ? 'active' : ''} key={filter} type="button">{filter}</button>
            ))}
          </div>
        </div>

        <div className="gkit-jur-cockpit-list">
          {data.rows.map((row) => (
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
      </section>
    </main>
  )
}
