'use client'

import { useMemo, useState } from 'react'
import { MetricCard, MonthContextHeader } from '../ui/FlexUI'

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

function currentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' }).format(value || 0)
}

function formatDate(value: string) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/)
  if (!match) return '-'
  const [year, month, day] = match[1].split('-')
  return `${day}/${month}/${year}`
}

export function UberPage() {
  const [competencia, setCompetencia] = useState(currentMonthValue())
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const competenciaParam = useMemo(() => `${competencia}-01`, [competencia])

  async function importReport() {
    if (!file) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('competencia', competenciaParam)
      formData.append('uberReport', file)

      const response = await fetch('/api/gkit-flex/uber/importar', { method: 'POST', body: formData })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Não foi possível importar o relatório.')

      setResult(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao importar relatório Uber.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell audit-page">
      <MonthContextHeader
        title="Conciliação Uber"
        description="Importe o relatório de vouchers da Uber e identifique corridas sem lançamento pelo colaborador."
        competencia={competencia}
        onCompetenciaChange={setCompetencia}
        primaryStatus={{ label: 'Relatório', status: result ? 'aberto' : 'nao_aberto' }}
      >
        <a className="secondary-button" href="/modulos/gkit-flex/auditoria">Auditoria</a>
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

      {result ? (
        <>
          <section className="grid-4 dashboard-metrics">
            <MetricCard label="Linhas lidas" value={result.report.linhasLidas} help={result.report.arquivo} />
            <MetricCard label="Corridas" value={result.report.corridasIdentificadas} help={formatMoney(result.report.valorTotal)} />
            <MetricCard label="Sem lançamento" value={result.report.corridasSemLancamento} help={formatMoney(result.report.valorSemLancamento)} tone={result.report.corridasSemLancamento ? 'warning' : 'good'} />
            <MetricCard label="Conciliadas" value={result.report.corridasIdentificadas - result.report.corridasSemLancamento} help="por e-mail e valor" />
          </section>

          <section className="card">
            <p className="eyebrow">Pendências</p>
            <h2>Corridas no relatório sem lançamento Colab</h2>
            {result.missing.length ? (
              <div className="table-wrap">
                <table className="periods-table">
                  <thead>
                    <tr>
                      <th>Linha</th>
                      <th>Data</th>
                      <th>Colaborador</th>
                      <th>E-mail</th>
                      <th>Status</th>
                      <th className="text-right">Corridas</th>
                      <th className="text-right">Valor</th>
                      <th>Voucher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.missing.map((row) => (
                      <tr key={`${row.line}-${row.voucherLink}`}>
                        <td>{row.line}</td>
                        <td>{formatDate(row.creationDate)}</td>
                        <td>{row.guestName || '-'}</td>
                        <td>{row.guestEmail || '-'}</td>
                        <td>{row.voucherStatus || '-'}</td>
                        <td className="text-right">{row.ordersTrips}</td>
                        <td className="text-right">{formatMoney(row.amountSpent)}</td>
                        <td>{row.voucherLink ? <a href={row.voucherLink}>Abrir</a> : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="success">Todas as corridas do relatório têm lançamento correspondente no Colab.</div>
            )}
          </section>
        </>
      ) : null}
    </main>
  )
}
