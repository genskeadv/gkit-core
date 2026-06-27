'use client'

import { useMemo, useRef, useState, type ChangeEvent } from 'react'

type AgendaRow = {
  ate: string
  conclusao: Date | null
  criacao: Date | null
  data: Date | null
  eligibleForATE: boolean
  excluded: boolean
  executor: string
  legalPrazo: boolean
  linhaOriginal: number
  prioridade: string
  reason: string
  responsavel: string
  status: string
  tipo: string
  tituloE: string
  tituloF: string
}

type WorkUnit = {
  atrasada: boolean
  codigoATE: string
  concluida: boolean
  dataConclusao: Date | null
  dataInicio: Date | null
  dataPrazo: Date | null
  diasConclusao: number | null
  executor: string
  id: string
  linhasOrigem: number[]
  noPrazo: boolean
  qtdLinhasOrigem: number
  responsavel: string
  status: string
  tipoUnidade: 'ATE' | 'PRAZO_JURIDICO'
  titulo: string
}

type DuplicateATE = {
  apareceE: boolean
  apareceF: boolean
  ate: string
  executores: string
  linhas: string
  qtdLinhas: number
  responsaveis: string
}

type ImportResult = {
  duplicates: DuplicateATE[]
  fileName: string
  importedAt: Date
  rows: AgendaRow[]
  sheetName: string
  units: WorkUnit[]
}

type RankingItem = {
  abertasAtrasadas: number
  concluidas: number
  mediaDias: number
  name: string
  noPrazo: number
  percentualConclusao: number
  percentualNoPrazo: number
  posicao: number
  score: number
  unidades: number
  units: WorkUnit[]
}

type AuditTab = 'units' | 'duplicates' | 'excluded'
type RankingType = 'responsavel' | 'executor'

const TODAY = new Date()

const LEGAL_KEYWORDS = [
  'CONTESTACAO',
  'EMBARGOS',
  'AGRAVO',
  'APELACAO',
  'RECURSO',
  'CONTRARRAZOES',
  'CONTRA RAZOES',
  'ALEGACOES FINAIS',
  'RAZOES FINAIS',
  'IMPUGNACAO',
  'PROVAS',
  'PENHORA',
  'CUSTAS',
  'GUIA',
  'CITACAO',
  'INTIMACAO',
  'MLE',
  'SISBAJUD',
  'RENAJUD',
  'INFOJUD',
  'DECISAO',
  'ACORDAO',
  'ACORDO',
  'HOMOLOGACAO',
  'EMENDA',
  'TUTELA',
  'AUDIENCIA',
  'REPLICA',
  'MANIFESTAR SOBRE',
  'JUNTADA',
  'CUMPRIMENTO DE SENTENCA',
  'EXCECAO',
]

const OPERATIONAL_KEYWORDS = [
  'FOLLOWUP',
  'FOLLOW UP',
  'PRE-PROCESSUAL',
  'PRE PROCESSUAL',
  'DISTRIBUIR',
  'ACOMPANHAR',
  'VERIFICAR',
  'AGUARDAR',
  'COBRAR RETORNO',
  'ANALISAR DOCUMENTOS',
]

const CLIENT_KEYWORDS = [
  'CONDOMINIO',
  'EDIFICIO',
  'RESIDENCIAL',
  'ASSOCIACAO',
  'EMPREENDIMENTO',
  'VILLAGE',
  'PARK',
  'PLAZA',
  'TOWER',
  'HOME',
  'CLUB',
  'JARDIM',
  'VILA',
  'VILLA',
]

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function asText(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim()
}

function parseDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'number') {
    const epoch = new Date(Math.round((value - 25569) * 86400 * 1000))
    return Number.isNaN(epoch.getTime()) ? null : epoch
  }

  const text = String(value).trim()
  const match = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*-\s*(\d{1,2}):(\d{2}))?/)
  if (match) {
    const [, d, m, y, hh = '0', mm = '0'] = match
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm))
  }

  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function fmtDate(date: Date | null) {
  if (!date) return '-'
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

function inputDate(date: Date | null) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function pct(value: number) {
  return `${(value || 0).toFixed(1).replace('.', ',')}%`
}

function round(value: number | null | undefined, digits = 1) {
  return Number(value || 0).toFixed(digits).replace('.', ',')
}

function extractATE(...values: unknown[]) {
  const joined = values.map((value) => String(value || '')).join(' ')
  const match = joined.match(/ATE\s*\d{6,}/i)
  return match ? match[0].replace(/\s+/g, '').toUpperCase() : ''
}

function includesAny(text: string, keywords: string[]) {
  const normalized = normalize(text)
  return keywords.some((keyword) => normalized.includes(normalize(keyword)))
}

function isLegalDeadlineTitle(title: string) {
  const normalized = normalize(title)
  if (!normalized) return false
  if (includesAny(normalized, OPERATIONAL_KEYWORDS)) return false
  return includesAny(normalized, LEGAL_KEYWORDS)
}

function classifyRow(row: Omit<AgendaRow, 'ate' | 'eligibleForATE' | 'excluded' | 'legalPrazo' | 'reason'>) {
  const tipo = normalize(row.tipo)
  const ate = extractATE(row.tituloE, row.tituloF)
  let eligibleForATE = Boolean(ate)
  let legalPrazo = false
  let excluded = false
  let reason = ''

  if (tipo === 'PRAZO' && includesAny(row.tituloE, ['FOLLOWUP', 'FOLLOW UP'])) {
    excluded = true
    eligibleForATE = false
    reason = 'Prazo + follow-up'
  } else if ((tipo === 'PRAZO' || tipo === 'TAREFA') && normalize(row.tituloE).includes('MANIFESTACAO')) {
    excluded = true
    eligibleForATE = false
    reason = 'Manifestacao descartada'
  } else if (tipo === 'PRAZO') {
    if (isLegalDeadlineTitle(row.tituloE)) {
      legalPrazo = true
    } else {
      excluded = true
      if (includesAny(row.tituloE, ['PRE-PROCESSUAL', 'PRE PROCESSUAL'])) {
        reason = 'Pre-processual'
      } else if (includesAny(row.tituloE, OPERATIONAL_KEYWORDS)) {
        reason = 'Providencia operacional/acompanhamento'
      } else if (includesAny(row.tituloE, CLIENT_KEYWORDS)) {
        reason = 'Titulo identifica cliente/condominio'
      } else {
        reason = 'Titulo sem ato juridico identificavel'
      }
    }
  }

  return { ate, eligibleForATE, excluded, legalPrazo, reason }
}

function findColumn(headers: string[], candidates: string[], fallbackIndex: number) {
  const normalizedHeaders = headers.map((header) => normalize(header))

  for (const candidate of candidates) {
    const index = normalizedHeaders.findIndex((header) => header === normalize(candidate))
    if (index >= 0) return headers[index]
  }

  for (const candidate of candidates) {
    const index = normalizedHeaders.findIndex((header) => header.includes(normalize(candidate)))
    if (index >= 0) return headers[index]
  }

  return headers[fallbackIndex]
}

function mapRows(jsonRows: Array<Record<string, unknown>>, headers: string[]) {
  const cols = {
    conclusao: findColumn(headers, ['Data de conclusao'], 14),
    criacao: findColumn(headers, ['Data de criacao'], 13),
    data: findColumn(headers, ['Data'], 0),
    executor: findColumn(headers, ['Envolvidos', 'Executor'], 10),
    prioridade: findColumn(headers, ['Prioridade'], 12),
    responsavel: findColumn(headers, ['Responsavel'], 3),
    status: findColumn(headers, ['Status'], 11),
    tipo: findColumn(headers, ['Tipo'], 2),
    tituloE: findColumn(headers, ['Titulo'], 4),
    tituloF: findColumn(headers, ['Titulo do processo/caso/atendimento'], 5),
  }

  return jsonRows.map((raw, index) => {
    const base = {
      conclusao: parseDate(raw[cols.conclusao]),
      criacao: parseDate(raw[cols.criacao]),
      data: parseDate(raw[cols.data]),
      executor: asText(raw[cols.executor]) || '(sem identificacao)',
      linhaOriginal: index + 2,
      prioridade: asText(raw[cols.prioridade]),
      responsavel: asText(raw[cols.responsavel]) || '(sem responsavel)',
      status: asText(raw[cols.status]),
      tipo: asText(raw[cols.tipo]),
      tituloE: asText(raw[cols.tituloE]),
      tituloF: asText(raw[cols.tituloF]),
    }

    return { ...base, ...classifyRow(base) }
  })
}

function mode(values: string[], fallback = '') {
  const counts = new Map<string, number>()
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))[0]?.[0] || fallback
}

function minDate(values: Array<Date | null>) {
  const dates = values.filter((value): value is Date => Boolean(value))
  if (!dates.length) return null
  return new Date(Math.min(...dates.map((date) => date.getTime())))
}

function maxDate(values: Array<Date | null>) {
  const dates = values.filter((value): value is Date => Boolean(value))
  if (!dates.length) return null
  return new Date(Math.max(...dates.map((date) => date.getTime())))
}

function daysBetween(a: Date | null, b: Date | null) {
  if (!a || !b) return null
  const ms = new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)
  return Math.max(0, Math.round(ms / 86400000))
}

function makeUnitFromRows(id: string, tipoUnidade: WorkUnit['tipoUnidade'], rows: AgendaRow[]): WorkUnit {
  const dataInicio = minDate(rows.map((row) => row.criacao || row.data))
  const dataPrazo = minDate(rows.map((row) => row.data))
  const dataConclusao = maxDate(rows.map((row) => row.conclusao))
  const allConcluded = rows.every((row) => normalize(row.status).includes('CONCLUID'))
  const anyConcluded = rows.some((row) => normalize(row.status).includes('CONCLUID'))
  const concluida = allConcluded || (tipoUnidade === 'PRAZO_JURIDICO' && anyConcluded)
  const refEnd = concluida ? dataConclusao : TODAY
  const atrasada = Boolean(dataPrazo && refEnd && new Date(refEnd) > new Date(dataPrazo))
  const noPrazo = Boolean(concluida && dataPrazo && dataConclusao && new Date(dataConclusao) <= new Date(dataPrazo))

  return {
    atrasada,
    codigoATE: tipoUnidade === 'ATE' ? id : '',
    concluida,
    dataConclusao,
    dataInicio,
    dataPrazo,
    diasConclusao: concluida ? daysBetween(dataInicio, dataConclusao) : null,
    executor: mode(rows.map((row) => row.executor), '(sem identificacao)'),
    id,
    linhasOrigem: rows.map((row) => row.linhaOriginal),
    noPrazo,
    qtdLinhasOrigem: rows.length,
    responsavel: mode(rows.map((row) => row.responsavel), '(sem responsavel)'),
    status: concluida ? 'Concluido' : 'Aberto',
    tipoUnidade,
    titulo: mode(rows.map((row) => row.tituloE || row.tituloF), id),
  }
}

function buildUnits(rows: AgendaRow[]) {
  const ateGroups = new Map<string, AgendaRow[]>()
  const legalDeadlineUnits: WorkUnit[] = []

  for (const row of rows) {
    if (row.eligibleForATE && row.ate) {
      const group = ateGroups.get(row.ate) ?? []
      group.push(row)
      ateGroups.set(row.ate, group)
    }

    if (row.legalPrazo && !row.ate) {
      legalDeadlineUnits.push(makeUnitFromRows(`PRAZO-${row.linhaOriginal}`, 'PRAZO_JURIDICO', [row]))
    }
  }

  return [...ateGroups.entries()].map(([ate, group]) => makeUnitFromRows(ate, 'ATE', group)).concat(legalDeadlineUnits)
}

function buildDuplicates(rows: AgendaRow[]) {
  const groups = new Map<string, AgendaRow[]>()

  for (const row of rows) {
    const values = new Set([extractATE(row.tituloE), extractATE(row.tituloF)].filter(Boolean))
    for (const ate of values) {
      const group = groups.get(ate) ?? []
      group.push(row)
      groups.set(ate, group)
    }
  }

  return [...groups.entries()]
    .map(([ate, group]) => ({
      apareceE: group.some((row) => extractATE(row.tituloE) === ate),
      apareceF: group.some((row) => extractATE(row.tituloF) === ate),
      ate,
      executores: [...new Set(group.map((row) => row.executor).filter(Boolean))].join(', '),
      linhas: group.map((row) => row.linhaOriginal).join(', '),
      qtdLinhas: group.length,
      responsaveis: [...new Set(group.map((row) => row.responsavel).filter(Boolean))].join(', '),
    }))
    .filter((item) => item.qtdLinhas > 1 || (item.apareceE && item.apareceF))
    .sort((a, b) => b.qtdLinhas - a.qtdLinhas || a.ate.localeCompare(b.ate))
}

function buildRanking(units: WorkUnit[], type: RankingType): RankingItem[] {
  const field = type === 'executor' ? 'executor' : 'responsavel'
  const groups = new Map<string, WorkUnit[]>()

  for (const unit of units) {
    const key = unit[field] || (type === 'executor' ? '(sem identificacao)' : '(sem responsavel)')
    const group = groups.get(key) ?? []
    group.push(unit)
    groups.set(key, group)
  }

  const items = [...groups.entries()].map(([name, group]) => {
    const concluidas = group.filter((unit) => unit.concluida).length
    const noPrazo = group.filter((unit) => unit.noPrazo).length
    const abertasAtrasadas = group.filter((unit) => !unit.concluida && unit.atrasada).length
    const concludedWithDays = group.filter((unit) => unit.concluida && Number.isFinite(unit.diasConclusao))
    const mediaDias = concludedWithDays.length
      ? concludedWithDays.reduce((sum, unit) => sum + (unit.diasConclusao || 0), 0) / concludedWithDays.length
      : 0

    return {
      abertasAtrasadas,
      concluidas,
      mediaDias,
      name,
      noPrazo,
      percentualConclusao: group.length ? (concluidas / group.length) * 100 : 0,
      percentualNoPrazo: concluidas ? (noPrazo / concluidas) * 100 : 0,
      posicao: 0,
      score: 0,
      unidades: group.length,
      units: group,
    }
  })

  const maxUnits = Math.max(1, ...items.map((item) => item.unidades))
  const maxAvg = Math.max(1, ...items.map((item) => item.mediaDias || 0))

  return items
    .map((item) => {
      const volumeScore = (item.unidades / maxUnits) * 100
      const conclusaoScore = item.percentualConclusao
      const prazoScore = item.percentualNoPrazo
      const velocidadeScore = item.mediaDias ? Math.max(0, 100 - (item.mediaDias / maxAvg) * 100) : 0
      const atrasoPenalty = item.unidades ? (item.abertasAtrasadas / item.unidades) * 100 : 0
      const score = volumeScore * 0.2 + conclusaoScore * 0.25 + prazoScore * 0.25 + velocidadeScore * 0.2 - atrasoPenalty * 0.1
      return { ...item, score: Math.max(0, score) }
    })
    .sort((a, b) => b.score - a.score || b.unidades - a.unidades)
    .map((item, index) => ({ ...item, posicao: index + 1 }))
}

function filteredUnits(units: WorkUnit[], start: string, end: string, responsavel: string) {
  const startDate = start ? new Date(`${start}T00:00:00`) : null
  const endDate = end ? new Date(`${end}T23:59:59`) : null

  return units.filter((unit) => {
    const ref = unit.dataPrazo || unit.dataInicio
    if (startDate && ref && ref < startDate) return false
    if (endDate && ref && ref > endDate) return false
    if (responsavel && unit.responsavel !== responsavel) return false
    return true
  })
}

function toCsv(rows: RankingItem[]) {
  const headers = ['rank', 'nome', 'unidades', 'concluidas', 'percentual_conclusao', 'no_prazo', 'percentual_no_prazo', 'abertas_atrasadas', 'media_dias', 'score']
  const body = rows.map((row) => [
    row.posicao,
    row.name,
    row.unidades,
    row.concluidas,
    row.percentualConclusao.toFixed(2),
    row.noPrazo,
    row.percentualNoPrazo.toFixed(2),
    row.abertasAtrasadas,
    row.mediaDias.toFixed(2),
    row.score.toFixed(2),
  ])
  return [headers, ...body].map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n')
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function GkitPerformaAnalyzer() {
  const [active, setActive] = useState<ImportResult | null>(null)
  const [auditTab, setAuditTab] = useState<AuditTab>('units')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rankingType, setRankingType] = useState<RankingType>('responsavel')
  const [responsavel, setResponsavel] = useState('')
  const [selectedName, setSelectedName] = useState('')
  const [startDate, setStartDate] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const responsaveis = useMemo(() => {
    return [...new Set((active?.units ?? []).map((unit) => unit.responsavel).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [active])

  const units = useMemo(() => filteredUnits(active?.units ?? [], startDate, endDate, responsavel), [active, endDate, responsavel, startDate])
  const ranking = useMemo(() => buildRanking(units, rankingType), [rankingType, units])
  const selected = ranking.find((item) => item.name === selectedName) ?? null
  const excludedRows = active?.rows.filter((row) => row.excluded) ?? []
  const concluded = units.filter((unit) => unit.concluida).length
  const overdue = units.filter((unit) => unit.atrasada).length
  const hasImport = Boolean(active)

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    setLoading(true)

    try {
      const XLSX = await import('xlsx')
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { cellDates: true, type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: false })
      const [headers = []] = XLSX.utils.sheet_to_json<string[]>(sheet, { blankrows: false, header: 1, range: 0 })
      const mappedRows = mapRows(rows, headers.map(String))
      const result = {
        duplicates: buildDuplicates(mappedRows),
        fileName: file.name,
        importedAt: new Date(),
        rows: mappedRows,
        sheetName,
        units: buildUnits(mappedRows),
      }

      const dates = mappedRows.map((row) => row.data).filter((date): date is Date => Boolean(date))
      setActive(result)
      setStartDate(inputDate(minDate(dates)))
      setEndDate(inputDate(maxDate(dates)))
      setResponsavel('')
      setSelectedName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel processar a planilha.')
    } finally {
      setLoading(false)
      event.target.value = ''
    }
  }

  return (
    <div className="gkit-performa-page">
      <section className="suite-panel gkit-performa-import">
        <div className="suite-panel-heading">
          <div>
            <h2>Importar agenda</h2>
            <p>Use a exportacao da Agenda em XLSX. O processamento acontece neste navegador.</p>
          </div>
          <input
            accept=".xlsx,.xls"
            className="gkit-performa-file-input"
            onChange={onFileChange}
            ref={fileInputRef}
            type="file"
          />
          <button className="button gkit-performa-upload" onClick={() => fileInputRef.current?.click()} type="button">
            {loading ? 'Processando...' : 'Carregar XLSX'}
          </button>
        </div>
        {active ? (
          <div className="gkit-performa-import-status">
            <strong>{active.fileName}</strong>
            <span>{active.sheetName} - {active.rows.length} linha(s) - {fmtDate(active.importedAt)}</span>
          </div>
        ) : (
          <div className="gkit-performa-empty-state">
            <div>
              <strong>Nenhuma agenda carregada</strong>
              <span>Carregue a planilha para liberar filtros, ranking, detalhe e auditoria.</span>
            </div>
            <button className="button secondary" onClick={() => fileInputRef.current?.click()} type="button">
              Selecionar arquivo
            </button>
          </div>
        )}
        {error ? <div className="suite-empty-block danger">{error}</div> : null}
      </section>

      {hasImport ? <section className="suite-panel gkit-performa-filters">
          <div className="gkit-performa-filter-grid">
            <label>
              <span>Periodo inicial</span>
              <input onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
            </label>
            <label>
              <span>Periodo final</span>
              <input onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
            </label>
            <label>
              <span>Responsavel</span>
              <select onChange={(event) => setResponsavel(event.target.value)} value={responsavel}>
                <option value="">Todos</option>
                {responsaveis.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label>
              <span>Ranking</span>
              <select onChange={(event) => setRankingType(event.target.value as RankingType)} value={rankingType}>
                <option value="responsavel">Responsavel</option>
                <option value="executor">Executor / envolvido</option>
              </select>
            </label>
          </div>
        </section> : null}

      {hasImport ? <section className="suite-kpi-grid compact gkit-performa-kpis">
          <article className="metric-card">
            <span className="metric-label">Registros</span>
            <strong className="metric-value">{active?.rows.length ?? 0}</strong>
            <span className="metric-hint">linhas importadas</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">Unidades</span>
            <strong className="metric-value">{units.length}</strong>
            <span className="metric-hint">{units.filter((unit) => unit.tipoUnidade === 'ATE').length} ATEs</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">Concluidas</span>
            <strong className="metric-value">{concluded}</strong>
            <span className="metric-hint">{pct(units.length ? (concluded / units.length) * 100 : 0)}</span>
          </article>
          <article className="metric-card">
            <span className="metric-label">Atrasadas</span>
            <strong className="metric-value">{overdue}</strong>
            <span className="metric-hint">{excludedRows.length} descartes auditados</span>
          </article>
        </section> : null}

      {hasImport ? <section className="gkit-performa-grid">
        <div className="suite-panel">
          <div className="suite-panel-heading">
            <div>
              <h2>Ranking</h2>
              <p>Score ponderado por volume, conclusao, prazo, velocidade e abertas atrasadas.</p>
            </div>
            <button
              className="button secondary"
              disabled={!ranking.length}
              onClick={() => download('ranking-gkit-performa.csv', toCsv(ranking), 'text/csv;charset=utf-8')}
              type="button"
            >
              Exportar CSV
            </button>
          </div>

          <div className="gkit-performa-table-wrap">
            <table className="gkit-performa-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nome</th>
                  <th>Unid.</th>
                  <th>Concl.</th>
                  <th>% concl.</th>
                  <th>% prazo</th>
                  <th>Atras.</th>
                  <th>Media</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {ranking.length ? ranking.map((item) => (
                  <tr className={selectedName === item.name ? 'selected' : ''} key={item.name}>
                    <td>{item.posicao}</td>
                    <td>
                      <button className="gkit-performa-row-button" onClick={() => setSelectedName(item.name)} type="button">
                        {item.name}
                      </button>
                    </td>
                    <td>{item.unidades}</td>
                    <td>{item.concluidas}</td>
                    <td>{pct(item.percentualConclusao)}</td>
                    <td>{pct(item.percentualNoPrazo)}</td>
                    <td>{item.abertasAtrasadas}</td>
                    <td>{round(item.mediaDias)}</td>
                    <td><strong>{round(item.score)}</strong></td>
                  </tr>
                )) : (
                  <tr>
                    <td className="empty" colSpan={9}>Importe uma agenda para gerar o ranking.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="suite-panel gkit-performa-detail">
          <div className="suite-panel-heading">
            <div>
              <h2>Detalhe</h2>
              <p>{selected ? selected.name : 'Selecione uma linha do ranking.'}</p>
            </div>
          </div>
          {selected ? (
            <>
              <div className="gkit-performa-detail-grid">
                <span><strong>{selected.unidades}</strong> unidades</span>
                <span><strong>{pct(selected.percentualConclusao)}</strong> conclusao</span>
                <span><strong>{pct(selected.percentualNoPrazo)}</strong> no prazo</span>
                <span><strong>{round(selected.score)}</strong> score</span>
              </div>
              <div className="suite-table-list compact">
                {selected.units.slice(0, 12).map((unit) => (
                  <article key={unit.id}>
                    <div>
                      <h3>{unit.titulo}</h3>
                      <p>{unit.id} - {fmtDate(unit.dataPrazo)}</p>
                    </div>
                    <span className={`suite-pill ${unit.concluida ? 'success' : 'warning'}`}>{unit.status}</span>
                    <strong>{unit.qtdLinhasOrigem}</strong>
                    <small>linha(s)</small>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="suite-empty-block">Sem responsavel selecionado.</div>
          )}
        </aside>
      </section> : null}

      {hasImport ? <section className="suite-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Auditoria</h2>
            <p>Veja as unidades consolidadas, ATEs repetidos e linhas descartadas.</p>
          </div>
          <div className="gkit-performa-tabs">
            <button className={auditTab === 'units' ? 'active' : ''} onClick={() => setAuditTab('units')} type="button">Unidades</button>
            <button className={auditTab === 'duplicates' ? 'active' : ''} onClick={() => setAuditTab('duplicates')} type="button">ATEs E/F</button>
            <button className={auditTab === 'excluded' ? 'active' : ''} onClick={() => setAuditTab('excluded')} type="button">Excluidas</button>
          </div>
        </div>
        <AuditTable duplicates={active?.duplicates ?? []} rows={excludedRows} tab={auditTab} units={units} />
      </section> : null}
    </div>
  )
}

function AuditTable({
  duplicates,
  rows,
  tab,
  units,
}: {
  duplicates: DuplicateATE[]
  rows: AgendaRow[]
  tab: AuditTab
  units: WorkUnit[]
}) {
  if (tab === 'duplicates') {
    return (
      <div className="gkit-performa-table-wrap">
        <table className="gkit-performa-table">
          <thead>
            <tr><th>ATE</th><th>Linhas</th><th>Coluna E</th><th>Coluna F</th><th>Responsaveis</th><th>Executores</th></tr>
          </thead>
          <tbody>
            {duplicates.slice(0, 200).map((item) => (
              <tr key={item.ate}>
                <td>{item.ate}</td>
                <td>{item.linhas}</td>
                <td>{item.apareceE ? 'Sim' : 'Nao'}</td>
                <td>{item.apareceF ? 'Sim' : 'Nao'}</td>
                <td>{item.responsaveis}</td>
                <td>{item.executores}</td>
              </tr>
            ))}
            {!duplicates.length ? <tr><td className="empty" colSpan={6}>Sem duplicidades E/F.</td></tr> : null}
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
            <tr><th>Linha</th><th>Tipo</th><th>Titulo</th><th>Atendimento</th><th>Responsavel</th><th>Motivo</th></tr>
          </thead>
          <tbody>
            {rows.slice(0, 300).map((row) => (
              <tr key={row.linhaOriginal}>
                <td>{row.linhaOriginal}</td>
                <td>{row.tipo}</td>
                <td>{row.tituloE}</td>
                <td>{row.tituloF}</td>
                <td>{row.responsavel}</td>
                <td>{row.reason}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td className="empty" colSpan={6}>Sem exclusoes.</td></tr> : null}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="gkit-performa-table-wrap">
      <table className="gkit-performa-table">
        <thead>
          <tr><th>ID</th><th>Tipo</th><th>Responsavel</th><th>Executor</th><th>Prazo</th><th>Status</th><th>Linhas</th></tr>
        </thead>
        <tbody>
          {units.slice(0, 300).map((unit) => (
            <tr key={unit.id}>
              <td>{unit.id}</td>
              <td>{unit.tipoUnidade}</td>
              <td>{unit.responsavel}</td>
              <td>{unit.executor}</td>
              <td>{fmtDate(unit.dataPrazo)}</td>
              <td>{unit.status}</td>
              <td>{unit.linhasOrigem.join(', ')}</td>
            </tr>
          ))}
          {!units.length ? <tr><td className="empty" colSpan={7}>Sem unidades.</td></tr> : null}
        </tbody>
      </table>
    </div>
  )
}
