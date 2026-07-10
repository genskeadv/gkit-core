'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PlatformUsuario } from '@/lib/auth/platform'

type CockpitArea = 'processos' | 'tarefas' | 'publicacoes' | 'acordos' | 'agenda'

type DashboardBar = {
  label: string
  value: number
  tone: 'blue' | 'green' | 'red' | 'yellow'
}

type ListRow = {
  id: string
  title: string
  subtitle: string
  owner: string
  status: string
  due: string
  tone: 'critical' | 'medium' | 'ok'
}

type AreaConfig = {
  action: string
  count: string
  description: string
  filters: string[]
  bars: DashboardBar[]
  trend: number[]
  rows: ListRow[]
}

const STORAGE_VIEW_KEY = 'gkit-jur-cockpit-lab-view'
const STORAGE_DASHBOARD_KEY = 'gkit-jur-cockpit-lab-dashboard-collapsed'

const areaLabels: Record<CockpitArea, string> = {
  processos: 'Processos',
  tarefas: 'Tarefas',
  publicacoes: 'Publicacoes',
  acordos: 'Acordos',
  agenda: 'Agenda',
}

const areas: Record<CockpitArea, AreaConfig> = {
  processos: {
    action: 'Carteira processual',
    count: '702',
    description: 'Processos ativos com leitura de prontidao, dono e movimento.',
    filters: ['Sem dono', 'Sem movimento', 'Alta exposicao', 'Prontos'],
    bars: [
      { label: 'Pronto', value: 67, tone: 'green' },
      { label: 'Parcial', value: 18, tone: 'blue' },
      { label: 'Capa', value: 31, tone: 'yellow' },
      { label: 'Erro', value: 7, tone: 'red' },
    ],
    trend: [42, 48, 44, 57, 61, 67, 64],
    rows: [
      {
        id: '0001234-19.2023.8.26.0100',
        title: 'Revisional de contrato com movimentacao recente',
        subtitle: 'Ultimo movimento: conclusos para despacho',
        owner: 'Carteira Contencioso',
        status: 'Pronto',
        due: 'Hoje',
        tone: 'critical',
      },
      {
        id: '0008821-44.2021.8.26.0002',
        title: 'Execucao com bloqueio pendente de revisao',
        subtitle: 'Resumo operacional incompleto',
        owner: 'Fernanda Lima',
        status: 'Parcial',
        due: 'Amanha',
        tone: 'medium',
      },
      {
        id: '1020304-55.2022.8.26.0053',
        title: 'Acao de cobranca aguardando publicacao',
        subtitle: 'Sem movimentacao ha 52 dias',
        owner: 'Carteira Massificado',
        status: 'Monitorar',
        due: 'Sex',
        tone: 'ok',
      },
    ],
  },
  tarefas: {
    action: 'Fila operacional',
    count: '150',
    description: 'Tarefas abertas da carteira, com prioridade e prazo.',
    filters: ['Criticas', 'Hoje', 'Sem responsavel', 'Automacao'],
    bars: [
      { label: 'Prazo', value: 42, tone: 'red' },
      { label: 'Publicacao', value: 31, tone: 'yellow' },
      { label: 'Saneamento', value: 18, tone: 'blue' },
      { label: 'Rotina', value: 9, tone: 'green' },
    ],
    trend: [72, 64, 58, 49, 44, 38, 32],
    rows: [
      {
        id: 'TRF-882',
        title: 'Executar tarefa aberta com prazo critico',
        subtitle: 'Conferir prazo e registrar providencia',
        owner: 'Marcos Paiva',
        status: 'Critica',
        due: '14:30',
        tone: 'critical',
      },
      {
        id: 'TRF-731',
        title: 'Revisar automacao pendente',
        subtitle: 'Regra sugeriu prazo sem confianca suficiente',
        owner: 'Operador Jur',
        status: 'Media',
        due: 'Hoje',
        tone: 'medium',
      },
      {
        id: 'TRF-615',
        title: 'Vincular responsavel ao processo',
        subtitle: 'Processo pronto sem dono operacional',
        owner: 'Sem dono',
        status: 'Baixa',
        due: 'Amanha',
        tone: 'ok',
      },
    ],
  },
  publicacoes: {
    action: 'Inbox de publicacoes',
    count: '144',
    description: 'Publicacoes dos processos da carteira, agrupadas para tratamento.',
    filters: ['Nao tratadas', 'Viraram prazo', 'Exigem leitura', 'Baixo risco'],
    bars: [
      { label: 'Prazo', value: 37, tone: 'red' },
      { label: 'Ciencia', value: 28, tone: 'yellow' },
      { label: 'Juntada', value: 18, tone: 'blue' },
      { label: 'Informativa', value: 17, tone: 'green' },
    ],
    trend: [36, 41, 33, 52, 47, 58, 44],
    rows: [
      {
        id: 'PUB-4901',
        title: 'Disponibilizacao com indicio de prazo',
        subtitle: 'Intimacao publicada no DJE para processo da carteira',
        owner: 'Carteira Contencioso',
        status: 'Critica',
        due: 'Hoje',
        tone: 'critical',
      },
      {
        id: 'PUB-4898',
        title: 'Publicacao agrupada ao processo existente',
        subtitle: 'Mesmo processo e mesma regra operacional',
        owner: 'Fernanda Lima',
        status: 'Analise',
        due: 'Hoje',
        tone: 'medium',
      },
      {
        id: 'PUB-4880',
        title: 'Movimento informativo sem prazo aparente',
        subtitle: 'Apenas ciencia; manter no historico do processo',
        owner: 'Carteira Massificado',
        status: 'Baixo risco',
        due: 'Amanha',
        tone: 'ok',
      },
    ],
  },
  acordos: {
    action: 'Carteira de acordos',
    count: '47',
    description: 'Acordos judiciais em negociacao, execucao ou risco.',
    filters: ['Em negociacao', 'Vencem em 7 dias', 'Inadimplentes', 'Homologacao'],
    bars: [
      { label: 'Negociacao', value: 38, tone: 'blue' },
      { label: 'Execucao', value: 27, tone: 'green' },
      { label: 'Homologacao', value: 20, tone: 'yellow' },
      { label: 'Risco', value: 15, tone: 'red' },
    ],
    trend: [18, 22, 27, 24, 31, 29, 35],
    rows: [
      {
        id: 'ACD-320',
        title: 'Proposta aguardando contraparte',
        subtitle: 'Valor negociado acima da faixa de referencia',
        owner: 'Nucleo Acordos',
        status: 'Negociacao',
        due: 'Hoje',
        tone: 'medium',
      },
      {
        id: 'ACD-318',
        title: 'Parcela vencida exige contato',
        subtitle: 'Acordo homologado com atraso de 6 dias',
        owner: 'Carteira Contencioso',
        status: 'Risco',
        due: 'Agora',
        tone: 'critical',
      },
      {
        id: 'ACD-301',
        title: 'Minuta enviada para homologacao',
        subtitle: 'Aguardando juntada da peticao',
        owner: 'Fernanda Lima',
        status: 'Andamento',
        due: 'Sex',
        tone: 'ok',
      },
    ],
  },
  agenda: {
    action: 'Eventos da carteira',
    count: '32',
    description: 'Audiencias, prazos internos e compromissos dos processos da carteira.',
    filters: ['Hoje', 'Semana', 'Audiencias', 'Prazos internos'],
    bars: [
      { label: 'Audiencia', value: 31, tone: 'red' },
      { label: 'Prazo interno', value: 28, tone: 'yellow' },
      { label: 'Reuniao', value: 19, tone: 'blue' },
      { label: 'Retorno', value: 22, tone: 'green' },
    ],
    trend: [21, 24, 28, 22, 30, 26, 32],
    rows: [
      {
        id: 'AGE-882',
        title: 'Audiencia de instrucao',
        subtitle: 'Preparar documentos e roteiro de perguntas',
        owner: 'Marcos Paiva',
        status: 'Confirmada',
        due: '10:00',
        tone: 'critical',
      },
      {
        id: 'AGE-770',
        title: 'Prazo interno para minuta',
        subtitle: 'Contestacao em revisao final',
        owner: 'Fernanda Lima',
        status: 'Hoje',
        due: '16:00',
        tone: 'medium',
      },
      {
        id: 'AGE-701',
        title: 'Retorno ao cliente',
        subtitle: 'Atualizacao sobre acordo em homologacao',
        owner: 'Relacionamento',
        status: 'Agendado',
        due: 'Amanha',
        tone: 'ok',
      },
    ],
  },
}

const areaOrder: CockpitArea[] = ['processos', 'tarefas', 'publicacoes', 'acordos', 'agenda']

function isArea(value: string | null): value is CockpitArea {
  return Boolean(value && areaOrder.includes(value as CockpitArea))
}

export function GkitJurCockpitMockup({
  initialArea,
  usuario,
}: {
  initialArea?: string
  usuario: PlatformUsuario
}) {
  const [activeArea, setActiveArea] = useState<CockpitArea>(() => isArea(initialArea ?? null) ? initialArea as CockpitArea : 'publicacoes')
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

  const data = areas[activeArea]
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
          <input id="gkit-jur-cockpit-search" placeholder="Processo, publicacao, tarefa, acordo..." type="search" />
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
          const config = areas[area]
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
              <strong>{config.count}</strong>
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
            <a className={`gkit-jur-cockpit-row ${row.tone}`} href={`/modulos/gkit-jur/processos/${encodeURIComponent(row.id)}`} key={row.id}>
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
