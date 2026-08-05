import { getSupabaseAdmin, logEvent } from '../audit'
import {
  parseUberVoucherCsv,
  reconcileUberRows,
  type UberExpenseForMatch,
  type UberReconciliationRow,
} from './uberReconciliation'

export type UberImportResult = {
  configured: boolean
  report: {
    id: string
    competencia: string
    arquivo: string
    linhasLidas: number
    corridasIdentificadas: number
    corridasSemLancamento: number
    valorTotal: number
    valorSemLancamento: number
  }
  rows: UberReconciliationRow[]
  missing: UberReconciliationRow[]
}

function roundMoney(value: number) {
  return Math.round(Number(value || 0) * 100) / 100
}

export function sanitizeCompetencia(value?: string | null) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 10)
  if (value && /^\d{4}-\d{2}$/.test(value)) return `${value}-01`
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function parseUberCreationDate(value: string) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+([+-]\d{2})(\d{2})/)
  if (!match) return null
  return `${match[1]}T${match[2]}${match[3]}:${match[4]}`
}

async function listExpensesForCompetencia(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>, competencia: string): Promise<UberExpenseForMatch[]> {
  const { data: expenses, error } = await supabase
    .from('colab_uber_despesas')
    .select('id, colaborador_usuario_id, valor, status')
    .eq('competencia', competencia)

  if (error) throw new Error(`Erro ao consultar lançamentos Uber: ${error.message}`)

  const rows = (expenses ?? []) as Array<Record<string, unknown>>
  const userIds = [...new Set(rows.map((row) => String(row.colaborador_usuario_id || '')).filter(Boolean))]
  const usersResult = userIds.length
    ? await supabase.schema('security').from('usuarios').select('id,email').in('id', userIds)
    : { data: [], error: null }

  if (usersResult.error) throw new Error(`Erro ao consultar e-mails dos colaboradores: ${usersResult.error.message}`)

  const emails = new Map(((usersResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.id), String(row.email || '')]))

  return rows.map((row) => ({
    id: String(row.id),
    collaboratorEmail: emails.get(String(row.colaborador_usuario_id)) || '',
    amount: roundMoney(Number(row.valor || 0)),
    status: row.status ? String(row.status) : null,
  }))
}

export async function importUberVoucherReport(input: {
  competencia?: string | null
  file: File
  createdBy?: string | null
}): Promise<UberImportResult> {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase não configurado.')

  const competencia = sanitizeCompetencia(input.competencia)
  const content = await input.file.text()
  const parsedRows = parseUberVoucherCsv(content)
  const expenses = await listExpensesForCompetencia(supabase, competencia)
  const reconciled = reconcileUberRows(parsedRows, expenses)

  const rideRows = reconciled.filter((row) => row.hasRide)
  const missing = reconciled.filter((row) => row.reconciliationStatus === 'sem_lancamento')
  const valorTotal = roundMoney(rideRows.reduce((sum, row) => sum + row.amountSpent, 0))
  const valorSemLancamento = roundMoney(missing.reduce((sum, row) => sum + row.amountSpent, 0))

  const { data: report, error: reportError } = await supabase
    .from('colab_uber_relatorios')
    .insert({
      competencia,
      arquivo_nome: input.file.name || 'relatorio-uber.csv',
      linhas_lidas: parsedRows.length,
      corridas_identificadas: rideRows.length,
      corridas_sem_lancamento: missing.length,
      valor_total: valorTotal,
      valor_sem_lancamento: valorSemLancamento,
      created_by: input.createdBy || null,
    })
    .select('id')
    .single()

  if (reportError || !report) throw new Error(`Erro ao gravar relatório Uber: ${reportError?.message || 'sem retorno'}`)

  const payload = reconciled.map((row) => ({
    relatorio_id: report.id,
    competencia,
    linha: row.line,
    creation_date: parseUberCreationDate(row.creationDate),
    voucher_link: row.voucherLink || null,
    guest_name: row.guestName || null,
    guest_email: row.guestEmail || null,
    guest_phone: row.guestPhone || null,
    voucher_status: row.voucherStatus || null,
    amount_spent: row.amountSpent,
    orders_trips: row.ordersTrips,
    matched_despesa_id: row.matchedExpenseId,
    status_conciliacao: row.reconciliationStatus,
    raw: row.raw,
  }))

  const { data: insertedRows, error: rowsError } = await supabase
    .from('colab_uber_relatorio_corridas')
    .insert(payload)
    .select('id, linha, matched_despesa_id')

  if (rowsError) throw new Error(`Erro ao gravar corridas Uber: ${rowsError.message}`)

  const matchedByLine = new Map((insertedRows ?? [])
    .filter((row: Record<string, unknown>) => row.matched_despesa_id)
    .map((row: Record<string, unknown>) => [Number(row.linha), { rowId: String(row.id), expenseId: String(row.matched_despesa_id) }]))

  for (const row of reconciled) {
    const match = matchedByLine.get(row.line)
    if (!match) continue
    await supabase
      .from('colab_uber_despesas')
      .update({ status: 'conciliado', uber_relatorio_corrida_id: match.rowId, updated_at: new Date().toISOString() })
      .eq('id', match.expenseId)
  }

  await logEvent({
    supabase,
    modulo: 'dashboard',
    competencia,
    action: 'importar_relatorio_uber',
    entidadeTipo: 'colab_uber_relatorio',
    entidadeId: report.id,
    detalhe: {
      arquivo: input.file.name,
      linhas: parsedRows.length,
      corridas: rideRows.length,
      semLancamento: missing.length,
      valorSemLancamento,
    },
  })

  return {
    configured: true,
    report: {
      id: report.id,
      competencia,
      arquivo: input.file.name || 'relatorio-uber.csv',
      linhasLidas: parsedRows.length,
      corridasIdentificadas: rideRows.length,
      corridasSemLancamento: missing.length,
      valorTotal,
      valorSemLancamento,
    },
    rows: reconciled,
    missing,
  }
}
