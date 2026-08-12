import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireGkitFatContext } from '@/features/gkit-fat/queries'
import { getUberClosingReports } from '@/features/gkit-flex/uber/uberPersistence'
import { PrintButton } from './print-button'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' }).format(value || 0)
}

function formatDate(value?: string | null) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return '-'
  return `${match[3]}/${match[2]}/${match[1]}`
}

export default async function GkitFatUberFechamentosPage({
  searchParams,
}: {
  searchParams?: Promise<{ ids?: string }>
}) {
  const context = await requireGkitFatContext('/modulos/gkit-fat/uber')
  if (!canAccess(context.permissions, 'gkit_fat.uber.read')) redirect('/modulos/gkit-fat')

  const params = await (searchParams ?? Promise.resolve({} as { ids?: string }))
  const ids = String(params.ids || '').split(',').map((id) => id.trim()).filter(Boolean)
  const reports = await getUberClosingReports(ids)

  return (
    <main className="uber-closing-print-page">
      <div className="uber-closing-print-actions">
        <a href="/modulos/gkit-fat/uber">Voltar</a>
        <PrintButton />
      </div>

      {!reports.length ? (
        <section className="uber-closing-sheet">
          <h1>Fechamento nao localizado</h1>
          <p>Abra o relatorio a partir da tela de conciliacao Uber.</p>
        </section>
      ) : null}

      {reports.map((report) => (
        <section className="uber-closing-sheet" key={report.id}>
          <header className="uber-closing-header">
            <div>
              <p>GKIT FAT · Reembolso Uber</p>
              <h1>{report.client}</h1>
              <span>{report.code}</span>
            </div>
            <dl>
              <div>
                <dt>Periodo</dt>
                <dd>{formatDate(report.periodStart)} a {formatDate(report.periodEnd)}</dd>
              </div>
              <div>
                <dt>Corridas</dt>
                <dd>{report.rideCount}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{formatMoney(report.totalAmount)}</dd>
              </div>
            </dl>
          </header>

          <table className="uber-closing-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Colaborador</th>
                <th>Descricao</th>
                <th>Recibo</th>
                <th className="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {report.expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{formatDate(expense.date)}</td>
                  <td>
                    <strong>{expense.collaboratorName}</strong>
                    <span>{expense.collaboratorEmail || '-'}</span>
                  </td>
                  <td>{expense.description}</td>
                  <td>{expense.receiptName}</td>
                  <td className="text-right">{formatMoney(expense.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Total do cliente</td>
                <td className="text-right">{formatMoney(report.expenses.reduce((sum, expense) => sum + expense.amount, 0))}</td>
              </tr>
            </tfoot>
          </table>

          <footer className="uber-closing-footer">
            <span>Gerado em {formatDate(report.createdAt)} por {context.usuario.nome}</span>
            <strong>Corridas marcadas como geradas para reembolso</strong>
          </footer>
        </section>
      ))}
    </main>
  )
}
