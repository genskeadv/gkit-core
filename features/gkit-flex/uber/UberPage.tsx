'use client'

import { useMemo, useState } from 'react'
import { MetricCard, MonthContextHeader, StatusBadge } from '../ui/FlexUI'
import type { UberClosingSummary, UberDashboardData, UberDashboardExpense } from './uberPersistence'

type MissingRow = {
  line: number
  creationDate: string
  voucherLink: string
  guestName: string
  guestEmail: string
  voucherStatus: string
  amountSpent: number
  ordersTrips: number
  reconciliationStatus: string
}

type ImportResult = {
  report: {
    arquivo: string
    linhasLidas: number
    corridasIdentificadas: number
    corridasSemLancamento: number
    valorTotal: number
    valorSemLancamento: number
  }
  missing: MissingRow[]
}

type ClosingResult = {
  periodStart: string
  periodEnd: string
  closings: UberClosingSummary[]
  reportUrl: string
}

const statusActions = [
  { label: 'Em conferência', value: 'em_conferencia' },
  { label: 'Reembolso solicitado', value: 'reembolso_solicitado' },
  { label: 'Reembolsado', value: 'reembolsado' },
  { label: 'Rejeitado', value: 'rejeitado' },
]

function currentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function currentWeekStartValue() {
  const now = new Date()
  const day = now.getDay() || 7
  now.setDate(now.getDate() - day + 1)
  return now.toISOString().slice(0, 10)
}

function weekEndValue(periodStart: string) {
  const date = new Date(`${periodStart}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + 6)
  return date.toISOString().slice(0, 10)
}

function monthFromCompetencia(value?: string | null) {
  return value ? String(value).slice(0, 7) : currentMonthValue()
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' }).format(value || 0)
}

function formatDate(value?: string | null) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/)
  if (!match) return '-'
  const [year, month, day] = match[1].split('-')
  return `${day}/${month}/${year}`
}

function readableStatus(status: string) {
  return status.replaceAll('_', ' ')
}

function readableExpenseStatus(expense: UberDashboardExpense) {
  return expense.closingId ? 'gerado para reembolso' : readableStatus(expense.status)
}

function statusTone(status: string) {
  if (['conciliado', 'reembolsado', 'gerado_reembolso'].includes(status)) return 'ok'
  if (status === 'rejeitado') return 'bloqueio'
  if (['lancado', 'em_conferencia', 'reembolso_solicitado'].includes(status)) return 'aviso'
  return 'nao_aberto'
}

function expenseNeedsAction(expense: UberDashboardExpense) {
  return !['reembolsado', 'rejeitado'].includes(expense.status)
}

export function UberPage({
  apiBasePath = '/api/gkit-fat/uber',
  auditHref = '/modulos/gkit-fat',
  headerDescription = 'Importe o relatório de vouchers, acompanhe lançamentos do Colab e marque reembolsos.',
  headerTitle = 'Conciliação Uber',
  initialData,
}: {
  apiBasePath?: string
  auditHref?: string
  headerDescription?: string
  headerTitle?: string
  initialData: UberDashboardData
}) {
  const [competencia, setCompetencia] = useState(monthFromCompetencia(initialData.competencia))
  const initialWeekStart = currentWeekStartValue()
  const [periodStart, setPeriodStart] = useState(initialWeekStart)
  const [periodEnd, setPeriodEnd] = useState(weekEndValue(initialWeekStart))
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [closingResult, setClosingResult] = useState<ClosingResult | null>(null)
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [closingLoading, setClosingLoading] = useState(false)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const competenciaParam = useMemo(() => `${competencia}-01`, [competencia])

  async function loadDashboard(nextCompetencia = competenciaParam) {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${apiBasePath}/importar?competencia=${encodeURIComponent(nextCompetencia)}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar a conciliação Uber.')
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao carregar Uber.')
    } finally {
      setLoading(false)
    }
  }

  async function changeCompetencia(value: string) {
    setCompetencia(value)
    setResult(null)
    await loadDashboard(`${value}-01`)
  }

  async function importReport() {
    if (!file) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('competencia', competenciaParam)
      formData.append('uberReport', file)

      const response = await fetch(`${apiBasePath}/importar`, { method: 'POST', body: formData })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Não foi possível importar o relatório.')

      setResult(payload)
      await loadDashboard(competenciaParam)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao importar relatório Uber.')
    } finally {
      setLoading(false)
    }
  }

  async function generateWeeklyClosing() {
    setClosingLoading(true)
    setError('')
    setClosingResult(null)

    try {
      const response = await fetch(`${apiBasePath}/fechamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodStart, periodEnd }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Nao foi possivel gerar o fechamento semanal.')

      setClosingResult(payload)
      await loadDashboard(competenciaParam)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao gerar fechamento semanal.')
    } finally {
      setClosingLoading(false)
    }
  }

  async function updateExpenseStatus(expense: UberDashboardExpense, status: string) {
    setSavingId(`${expense.id}:${status}`)
    setError('')

    try {
      const response = await fetch(`${apiBasePath}/despesas/${expense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Não foi possível atualizar o status.')
      await loadDashboard(competenciaParam)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao atualizar status.')
    } finally {
      setSavingId('')
    }
  }

  return (
    <main className="page-shell audit-page flex-uber-page">
      <MonthContextHeader
        title={headerTitle}
        description={headerDescription}
        competencia={competencia}
        onCompetenciaChange={changeCompetencia}
        primaryStatus={{ label: 'Relatório', status: data.reports.length ? 'ok' : 'nao_aberto' }}
        secondaryStatus={{ label: 'Pendências', status: data.summary.missingRides || data.summary.pendingExpenses ? 'aviso' : 'ok' }}
      >
        <button className="secondary-button" disabled={loading} onClick={() => loadDashboard()} type="button">
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
        {auditHref ? <a className="secondary-button" href={auditHref}>Auditoria</a> : null}
      </MonthContextHeader>

      {error ? <div className="error">{error}</div> : null}

      <section className="card">
        <div className="header-row">
          <div>
            <p className="eyebrow">Relatório Uber</p>
            <h2>Importar CSV de vouchers</h2>
            <p className="muted small-text">Modelo esperado: Creation Date, Voucher Link, Guest Email, Voucher Status, Amount Spent e Orders/Trips.</p>
          </div>
        </div>
        <div className="flex-cockpit-import-row">
          <input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          <button className="primary-button" disabled={!file || loading} onClick={importReport}>
            {loading ? 'Importando...' : 'Conciliar relatório'}
          </button>
        </div>
      </section>

      <section className="grid-4 dashboard-metrics">
        <MetricCard label="Lançamentos Colab" value={data.summary.totalExpenses} help={`${data.summary.pendingExpenses} pendente(s)`} />
        <MetricCard label="Aberto para tratar" value={formatMoney(data.summary.openAmount)} help="lançado, conferência ou reembolso solicitado" tone={data.summary.openAmount ? 'warning' : 'good'} />
        <MetricCard label="Reembolsado" value={formatMoney(data.summary.reimbursedAmount)} help={`${data.summary.reimbursedExpenses} lançamento(s)`} />
        <MetricCard label="Sem lançamento" value={data.summary.missingRides} help={formatMoney(data.summary.missingAmount)} tone={data.summary.missingRides ? 'warning' : 'good'} />
      </section>

      <section className="card flex-uber-closing-panel">
        <div className="header-row">
          <div>
            <p className="eyebrow">Fechamento semanal</p>
            <h2>Gerar pedido de reembolso por cliente</h2>
            <p className="muted small-text">Inclui corridas conciliadas ainda sem fechamento. Cada cliente sai em uma pagina do relatorio.</p>
          </div>
        </div>
        <div className="flex-uber-closing-controls">
          <label>
            <span>Inicio</span>
            <input
              type="date"
              value={periodStart}
              onChange={(event) => {
                setPeriodStart(event.target.value)
                setPeriodEnd(weekEndValue(event.target.value))
              }}
            />
          </label>
          <label>
            <span>Fim</span>
            <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
          </label>
          <button className="primary-button" disabled={closingLoading || !data.summary.readyForClosing} onClick={generateWeeklyClosing} type="button">
            {closingLoading ? 'Gerando...' : 'Gerar fechamento'}
          </button>
        </div>
        {closingResult ? (
          <div className="success flex-uber-closing-result">
            <span>
              {closingResult.closings.length} cliente(s) e {closingResult.closings.reduce((sum, closing) => sum + closing.rideCount, 0)} corrida(s) marcados para reembolso.
            </span>
            <a className="secondary-button compact-button" href={closingResult.reportUrl} target="_blank" rel="noreferrer">Abrir relatorio</a>
          </div>
        ) : null}
        {data.closings.length ? (
          <div className="flex-uber-stack">
            {data.closings.slice(0, 4).map((closing) => (
              <article className="flex-uber-report-card" key={closing.id}>
                <div>
                  <strong>{closing.client}</strong>
                  <span>{formatDate(closing.periodStart)} a {formatDate(closing.periodEnd)} - {closing.code}</span>
                </div>
                <div>
                  <small>Corridas</small>
                  <strong>{closing.rideCount}</strong>
                </div>
                <div>
                  <small>Total</small>
                  <strong>{formatMoney(closing.totalAmount)}</strong>
                </div>
                <div>
                  <a className="secondary-button compact-button" href={`/modulos/gkit-fat/uber/fechamentos?ids=${closing.id}`} target="_blank" rel="noreferrer">Relatorio</a>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="card flex-uber-split">
        <div>
          <p className="eyebrow">Histórico</p>
          <h2>Relatórios importados</h2>
          {data.reports.length ? (
            <div className="flex-uber-stack">
              {data.reports.map((report) => (
                <article className="flex-uber-report-card" key={report.id}>
                  <div>
                    <strong>{report.arquivo}</strong>
                    <span>{formatDate(report.createdAt)} · {report.linhasLidas} linha(s)</span>
                  </div>
                  <div>
                    <small>Corridas</small>
                    <strong>{report.corridasIdentificadas}</strong>
                  </div>
                  <div>
                    <small>Sem lançamento</small>
                    <strong>{report.corridasSemLancamento}</strong>
                  </div>
                  <div>
                    <small>Valor</small>
                    <strong>{formatMoney(report.valorTotal)}</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">Nenhum relatório importado para esta competência.</div>
          )}
        </div>

        <div>
          <p className="eyebrow">Pendências</p>
          <h2>Corridas sem lançamento</h2>
          {data.missing.length ? (
            <div className="flex-uber-stack">
              {data.missing.slice(0, 8).map((row) => (
                <article className="flex-uber-missing-card" key={row.id}>
                  <div>
                    <strong>{row.guestName || row.guestEmail || `Linha ${row.line}`}</strong>
                    <span>{formatDate(row.creationDate)} · {row.voucherStatus || 'Sem status'}</span>
                  </div>
                  <strong>{formatMoney(row.amountSpent)}</strong>
                  {row.voucherLink ? <a href={row.voucherLink} rel="noreferrer" target="_blank">Voucher</a> : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="success">Nenhuma corrida sem lançamento para esta competência.</div>
          )}
        </div>
      </section>

      {result ? (
        <section className="grid-4 dashboard-metrics">
          <MetricCard label="Linhas lidas" value={result.report.linhasLidas} help={result.report.arquivo} />
          <MetricCard label="Corridas" value={result.report.corridasIdentificadas} help={formatMoney(result.report.valorTotal)} />
          <MetricCard label="Sem lançamento" value={result.report.corridasSemLancamento} help={formatMoney(result.report.valorSemLancamento)} tone={result.report.corridasSemLancamento ? 'warning' : 'good'} />
          <MetricCard label="Conciliadas" value={result.report.corridasIdentificadas - result.report.corridasSemLancamento} help="por e-mail e valor" />
        </section>
      ) : null}

      <section className="card">
        <div className="header-row">
          <div>
            <p className="eyebrow">Reembolsos</p>
            <h2>Lançamentos dos colaboradores</h2>
          </div>
          <StatusBadge status={data.summary.pendingExpenses ? 'aviso' : 'ok'} label={data.summary.pendingExpenses ? 'Acompanhar' : 'Em dia'} compact />
        </div>

        {data.expenses.length ? (
          <div className="table-wrap">
            <table className="periods-table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Recibo</th>
                  <th className="text-right">Valor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <strong>{expense.collaboratorName}</strong>
                      <br />
                      <span className="muted small-text">{expense.collaboratorEmail || '-'}</span>
                    </td>
                    <td>
                      <strong>{expense.client}</strong>
                      <br />
                      <span className="muted small-text">{expense.description}</span>
                    </td>
                    <td>{formatDate(expense.date)}</td>
                    <td>
                      <StatusBadge status={statusTone(expense.closingId ? 'gerado_reembolso' : expense.status)} label={readableExpenseStatus(expense)} compact />
                      {expense.closingId ? (
                        <>
                          <br />
                          <a className="muted small-text" href={`/modulos/gkit-fat/uber/fechamentos?ids=${expense.closingId}`} target="_blank" rel="noreferrer">
                            {expense.closingCode || 'Fechamento'}
                          </a>
                        </>
                      ) : null}
                    </td>
                    <td>{expense.receiptUrl ? <a href={expense.receiptUrl} rel="noreferrer" target="_blank">{expense.receiptName}</a> : '-'}</td>
                    <td className="text-right"><strong>{formatMoney(expense.amount)}</strong></td>
                    <td>
                      {expenseNeedsAction(expense) ? (
                        <div className="flex-uber-row-actions">
                          {statusActions
                            .filter((action) => action.value !== expense.status)
                            .map((action) => (
                              <button
                                className="secondary-button compact-button"
                                disabled={Boolean(savingId)}
                                key={action.value}
                                onClick={() => updateExpenseStatus(expense, action.value)}
                                type="button"
                              >
                                {savingId === `${expense.id}:${action.value}` ? 'Salvando...' : action.label}
                              </button>
                            ))}
                        </div>
                      ) : (
                        <span className="muted small-text">Sem ação pendente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state compact">Nenhum lançamento Colab para esta competência.</div>
        )}
      </section>
    </main>
  )
}
