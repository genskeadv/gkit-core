'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { GKIT_PERFORMA_STORAGE_KEY } from './storage'

type AuditTab = 'units' | 'duplicates' | 'attention' | 'excluded'

type StoredImport = {
  duplicates?: Array<Record<string, any>>
  fileName?: string
  importedAt?: string
  rows?: Array<Record<string, any>>
  sheetName?: string
  units?: Array<Record<string, any>>
}

type StoredRanking = {
  arquivo_nome?: string
  criado_em?: string
  filtros?: Record<string, any>
  id: string
  itens?: Array<Record<string, any>>
  ranking_tipo?: string
  resumo?: Record<string, any>
  sheet_name?: string | null
  total_ranqueados?: number
  total_registros?: number
  total_unidades?: number
}

function fmtDate(value: unknown) {
  if (!value) return '-'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

function text(value: unknown, fallback = '-') {
  const raw = String(value ?? '').trim()
  return raw || fallback
}

export function GkitPerformaAuditPage() {
  const [active, setActive] = useState<StoredImport | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loadingRankings, setLoadingRankings] = useState(true)
  const [rankings, setRankings] = useState<StoredRanking[]>([])
  const [tab, setTab] = useState<AuditTab>('units')

  useEffect(() => {
    try {
      const payload = localStorage.getItem(GKIT_PERFORMA_STORAGE_KEY)
      setActive(payload ? JSON.parse(payload) as StoredImport : null)
    } catch {
      setActive(null)
    }

    let cancelled = false

    async function loadRankings() {
      setLoadingRankings(true)
      setLoadError('')

      try {
        const response = await fetch('/api/gkit-performa/rankings?limit=12')
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload?.error || 'Não foi possível carregar rankings salvos.')
        }

        if (!cancelled) setRankings(Array.isArray(payload?.rankings) ? payload.rankings : [])
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar rankings salvos.')
      } finally {
        if (!cancelled) setLoadingRankings(false)
      }
    }

    loadRankings()

    return () => {
      cancelled = true
    }
  }, [])

  const rows = active?.rows ?? []
  const units = active?.units ?? []
  const duplicates = active?.duplicates ?? []
  const excluded = useMemo(() => rows.filter((row) => row.excluded), [rows])
  const attention = useMemo(() => {
    const unitRows = units
      .filter((unit) => Array.isArray(unit.attentionReasons) && unit.attentionReasons.length)
      .map((unit) => ({
        origem: 'Unidade',
        referencia: text(unit.id),
        tipo: text(unit.tipoUnidade),
        titulo: text(unit.titulo),
        responsavel: text(unit.responsavel),
        motivo: (unit.attentionReasons as unknown[]).map((reason) => text(reason)).filter(Boolean).join('; '),
      }))

    const sourceRows = rows
      .filter((row) => row.attention && !row.excluded)
      .map((row) => ({
        origem: 'Linha',
        referencia: text(row.linhaOriginal),
        tipo: text(row.tipo),
        titulo: text(row.tituloE || row.tituloF),
        responsavel: text(row.responsavel),
        motivo: text(row.attentionReason || row.reason),
      }))

    return [...unitRows, ...sourceRows]
  }, [rows, units])

  if (!active && !loadingRankings && !rankings.length) {
    return (
      <section className="suite-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Auditoria</h2>
            <p>Nenhuma agenda processada neste navegador.</p>
          </div>
          <Link className="button" href="/modulos/gkit-performa">Importar agenda</Link>
        </div>
        {loadError ? <div className="suite-empty-block danger">{loadError}</div> : null}
        <div className="suite-empty-block">
          <strong>Sem dados de auditoria</strong>
          <span>Carregue uma agenda na página de Performance para consultar unidades, duplicidades, descartes e rankings gravados.</span>
        </div>
      </section>
    )
  }

  return (
    <div className="gkit-performa-page">
      {active ? (
        <>
          <section className="suite-panel">
            <div className="suite-panel-heading">
              <div>
                <h2>Auditoria da agenda</h2>
                <p>{active.fileName ?? 'Agenda'} - {active.sheetName ?? 'Planilha'} - {rows.length} linha(s)</p>
              </div>
              <Link className="button secondary" href="/modulos/gkit-performa">Voltar ao ranking</Link>
            </div>

            <div className="suite-kpi-grid compact gkit-performa-kpis">
              <article className="metric-card">
                <span className="metric-label">Unidades</span>
                <strong className="metric-value">{units.length}</strong>
                <span className="metric-hint">consolidadas</span>
              </article>
              <article className="metric-card">
                <span className="metric-label">ATEs E/F</span>
                <strong className="metric-value">{duplicates.length}</strong>
                <span className="metric-hint">duplicidades</span>
              </article>
              <article className="metric-card">
                <span className="metric-label">Alertas</span>
                <strong className="metric-value">{attention.length}</strong>
                <span className="metric-hint">conferir regra</span>
              </article>
              <article className="metric-card">
                <span className="metric-label">Descartes</span>
                <strong className="metric-value">{excluded.length}</strong>
                <span className="metric-hint">fora do ranking</span>
              </article>
              <article className="metric-card">
                <span className="metric-label">Importação</span>
                <strong className="metric-value">{fmtDate(active.importedAt)}</strong>
                <span className="metric-hint">neste navegador</span>
              </article>
            </div>
          </section>

          <section className="suite-panel">
            <div className="suite-panel-heading">
              <div>
                <h2>Lista de auditoria</h2>
                <p>Selecione o recorte para conferir a regra aplicada.</p>
              </div>
              <div className="gkit-performa-tabs">
                <button className={tab === 'units' ? 'active' : ''} onClick={() => setTab('units')} type="button">Unidades</button>
                <button className={tab === 'duplicates' ? 'active' : ''} onClick={() => setTab('duplicates')} type="button">ATEs E/F</button>
                <button className={tab === 'attention' ? 'active' : ''} onClick={() => setTab('attention')} type="button">Alertas</button>
                <button className={tab === 'excluded' ? 'active' : ''} onClick={() => setTab('excluded')} type="button">Descartes</button>
              </div>
            </div>
            <AuditTable attention={attention} duplicates={duplicates} rows={excluded} tab={tab} units={units} />
          </section>
        </>
      ) : null}

      <section className="suite-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Rankings gravados</h2>
            <p>{loadingRankings ? 'Carregando histórico...' : `${rankings.length} snapshot(s) recentes`}</p>
          </div>
          <Link className="button secondary" href="/modulos/gkit-performa">Novo ranking</Link>
        </div>
        {loadError ? <div className="suite-empty-block danger">{loadError}</div> : null}
        <SavedRankings rankings={rankings} />
      </section>
    </div>
  )
}

function SavedRankings({ rankings }: { rankings: StoredRanking[] }) {
  if (!rankings.length) {
    return <div className="suite-empty-block">Nenhum ranking salvo encontrado.</div>
  }

  return (
    <div className="gkit-performa-snapshot-list">
      {rankings.map((ranking) => (
        <details className="ciclo-client-group" key={ranking.id}>
          <summary>
            <span aria-hidden="true">+</span>
            <strong>{ranking.arquivo_nome ?? 'Agenda'}</strong>
            <small>{fmtDate(ranking.criado_em)} - {ranking.total_ranqueados ?? 0} item(ns)</small>
          </summary>
          <div className="suite-kpi-grid compact gkit-performa-kpis">
            <article className="metric-card">
              <span className="metric-label">Tipo</span>
              <strong className="metric-value">{ranking.ranking_tipo === 'executor' ? 'Executor' : 'Responsável'}</strong>
              <span className="metric-hint">{ranking.sheet_name ?? 'Planilha'}</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">Registros</span>
              <strong className="metric-value">{ranking.total_registros ?? 0}</strong>
              <span className="metric-hint">linhas importadas</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">Unidades</span>
              <strong className="metric-value">{ranking.total_unidades ?? 0}</strong>
              <span className="metric-hint">consolidadas</span>
            </article>
          </div>
          <div className="gkit-performa-table-wrap">
            <table className="gkit-performa-table">
              <thead>
                <tr><th>#</th><th>Nome</th><th>Unid.</th><th>Concl.</th><th>% concl.</th><th>% prazo</th><th>Atrás.</th><th>Score</th></tr>
              </thead>
              <tbody>
                {(ranking.itens ?? []).slice(0, 25).map((item) => (
                  <tr key={text(item.id ?? item.nome)}>
                    <td>{text(item.posicao)}</td>
                    <td>{text(item.nome)}</td>
                    <td>{text(item.unidades)}</td>
                    <td>{text(item.concluidas)}</td>
                    <td>{text(item.percentual_conclusao)}%</td>
                    <td>{text(item.percentual_no_prazo)}%</td>
                    <td>{text(item.abertas_atrasadas)}</td>
                    <td><strong>{text(item.score)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </div>
  )
}

function AuditTable({
  attention,
  duplicates,
  rows,
  tab,
  units,
}: {
  attention: Array<Record<string, any>>
  duplicates: Array<Record<string, any>>
  rows: Array<Record<string, any>>
  tab: AuditTab
  units: Array<Record<string, any>>
}) {
  if (tab === 'duplicates') {
    return (
      <div className="gkit-performa-table-wrap">
        <table className="gkit-performa-table">
          <thead>
            <tr><th>ATE</th><th>Linhas</th><th>Coluna E</th><th>Coluna F</th><th>Responsáveis</th><th>Executores</th></tr>
          </thead>
          <tbody>
            {duplicates.slice(0, 500).map((item) => (
              <tr key={text(item.ate)}>
                <td>{text(item.ate)}</td>
                <td>{text(item.linhas)}</td>
                <td>{item.apareceE ? 'Sim' : 'Não'}</td>
                <td>{item.apareceF ? 'Sim' : 'Não'}</td>
                <td>{text(item.responsaveis)}</td>
                <td>{text(item.executores)}</td>
              </tr>
            ))}
            {!duplicates.length ? <tr><td className="empty" colSpan={6}>Sem duplicidades E/F.</td></tr> : null}
          </tbody>
        </table>
      </div>
    )
  }

  if (tab === 'attention') {
    return (
      <div className="gkit-performa-table-wrap">
        <table className="gkit-performa-table">
          <thead>
            <tr><th>Origem</th><th>Referência</th><th>Tipo</th><th>Título</th><th>Responsável</th><th>Motivo</th></tr>
          </thead>
          <tbody>
            {attention.slice(0, 500).map((item, index) => (
              <tr key={`${text(item.origem)}-${text(item.referencia)}-${index}`}>
                <td>{text(item.origem)}</td>
                <td>{text(item.referencia)}</td>
                <td>{text(item.tipo)}</td>
                <td>{text(item.titulo)}</td>
                <td>{text(item.responsavel)}</td>
                <td>{text(item.motivo)}</td>
              </tr>
            ))}
            {!attention.length ? <tr><td className="empty" colSpan={6}>Sem alertas de auditoria.</td></tr> : null}
          </tbody>
        </table>
      </div>
    )
  }

  if (tab === 'excluded') {
    return (
      <div className="gkit-performa-table-wrap">
        <table className="gkit-performa-table">
          <thead>
            <tr><th>Linha</th><th>Tipo</th><th>Título</th><th>Atendimento</th><th>Responsável</th><th>Motivo</th></tr>
          </thead>
          <tbody>
            {rows.slice(0, 500).map((row) => (
              <tr key={text(row.linhaOriginal)}>
                <td>{text(row.linhaOriginal)}</td>
                <td>{text(row.tipo)}</td>
                <td>{text(row.tituloE)}</td>
                <td>{text(row.tituloF)}</td>
                <td>{text(row.responsavel)}</td>
                <td>{text(row.reason)}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td className="empty" colSpan={6}>Sem descartes.</td></tr> : null}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="gkit-performa-table-wrap">
      <table className="gkit-performa-table">
        <thead>
          <tr><th>ID</th><th>Tipo</th><th>Responsável</th><th>Executor</th><th>Prazo</th><th>Status</th><th>Linhas</th></tr>
        </thead>
        <tbody>
          {units.slice(0, 500).map((unit) => (
            <tr key={text(unit.id)}>
              <td>{text(unit.id)}</td>
              <td>{text(unit.tipoUnidade)}</td>
              <td>{text(unit.responsavel)}</td>
              <td>{text(unit.executor)}</td>
              <td>{fmtDate(unit.dataPrazo)}</td>
              <td>{text(unit.status)}</td>
              <td>{Array.isArray(unit.linhasOrigem) ? unit.linhasOrigem.join(', ') : '-'}</td>
            </tr>
          ))}
          {!units.length ? <tr><td className="empty" colSpan={7}>Sem unidades.</td></tr> : null}
        </tbody>
      </table>
    </div>
  )
}
