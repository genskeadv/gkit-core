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

export type UberDashboardReport = {
  id: string
  competencia: string
  arquivo: string
  linhasLidas: number
  corridasIdentificadas: number
  corridasSemLancamento: number
  valorTotal: number
  valorSemLancamento: number
  createdAt: string
}

export type UberDashboardExpense = {
  id: string
  collaboratorName: string
  collaboratorEmail: string
  client: string
  description: string
  date: string
  competence: string
  amount: number
  status: string
  observation: string | null
  receiptName: string
  receiptUrl: string | null
  reportRideId: string | null
  createdAt: string
  updatedAt: string
}

export type UberDashboardMissingRide = {
  id: string
  reportId: string
  line: number
  creationDate: string | null
  voucherLink: string | null
  guestName: string | null
  guestEmail: string | null
  voucherStatus: string | null
  amountSpent: number
  ordersTrips: number
}

export type UberDashboardData = {
  configured: boolean
  competencia: string
  reports: UberDashboardReport[]
  expenses: UberDashboardExpense[]
  missing: UberDashboardMissingRide[]
  summary: {
    totalExpenses: number
    pendingExpenses: number
    reconciledExpenses: number
    reimbursedExpenses: number
    rejectedExpenses: number
    openAmount: number
    reimbursedAmount: number
    missingRides: number
    missingAmount: number
  }
}

const ALLOWED_EXPENSE_STATUS = new Set(['lancado', 'em_conferencia', 'conciliado', 'reembolso_solicitado', 'reembolsado', 'rejeitado'])
const OPEN_EXPENSE_STATUSES = new Set(['lancado', 'em_conferencia', 'reembolso_solicitado'])

function roundMoney(value: number) {
  return Math.round(Number(value || 0) * 100) / 100
}

function text(value: unknown, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
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

export async function getUberDashboard(competenciaInput?: string | null): Promise<UberDashboardData> {
  const supabase = getSupabaseAdmin()
  const competencia = sanitizeCompetencia(competenciaInput)

  const empty: UberDashboardData = {
    configured: false,
    competencia,
    reports: [],
    expenses: [],
    missing: [],
    summary: {
      totalExpenses: 0,
      pendingExpenses: 0,
      reconciledExpenses: 0,
      reimbursedExpenses: 0,
      rejectedExpenses: 0,
      openAmount: 0,
      reimbursedAmount: 0,
      missingRides: 0,
      missingAmount: 0,
    },
  }

  if (!supabase) return empty

  const [reportsResult, expensesResult, missingResult] = await Promise.all([
    supabase
      .from('colab_uber_relatorios')
      .select('id, competencia, arquivo_nome, linhas_lidas, corridas_identificadas, corridas_sem_lancamento, valor_total, valor_sem_lancamento, created_at')
      .eq('competencia', competencia)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('colab_uber_despesas')
      .select('id, colaborador_usuario_id, cliente_nome_snapshot, data_despesa, competencia, descricao, valor, recibo_bucket, recibo_path, recibo_nome, status, observacao, uber_relatorio_corrida_id, created_at, updated_at')
      .eq('competencia', competencia)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('colab_uber_relatorio_corridas')
      .select('id, relatorio_id, linha, creation_date, voucher_link, guest_name, guest_email, voucher_status, amount_spent, orders_trips')
      .eq('competencia', competencia)
      .eq('status_conciliacao', 'sem_lancamento')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  if (reportsResult.error) throw new Error(`Erro ao consultar relatórios Uber: ${reportsResult.error.message}`)
  if (expensesResult.error) throw new Error(`Erro ao consultar lançamentos Uber: ${expensesResult.error.message}`)
  if (missingResult.error) throw new Error(`Erro ao consultar pendências Uber: ${missingResult.error.message}`)

  const expenseRows = (expensesResult.data ?? []) as Array<Record<string, unknown>>
  const userIds = [...new Set(expenseRows.map((row) => text(row.colaborador_usuario_id)).filter(Boolean))]
  const usersResult = userIds.length
    ? await supabase.schema('security').from('usuarios').select('id,nome,email').in('id', userIds)
    : { data: [], error: null }

  if (usersResult.error) throw new Error(`Erro ao consultar colaboradores: ${usersResult.error.message}`)

  const users = new Map(((usersResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [
    text(row.id),
    { email: text(row.email), name: text(row.nome, 'Colaborador') },
  ]))

  const expenses: UberDashboardExpense[] = await Promise.all(expenseRows.map(async (row) => {
    const bucket = text(row.recibo_bucket, 'colab-uber-recibos')
    const path = text(row.recibo_path)
    const signed = path
      ? await supabase.storage.from(bucket).createSignedUrl(path, 60 * 30)
      : { data: null, error: null }
    const user = users.get(text(row.colaborador_usuario_id))

    return {
      id: text(row.id),
      collaboratorName: user?.name || 'Colaborador',
      collaboratorEmail: user?.email || '',
      client: text(row.cliente_nome_snapshot, 'Cliente'),
      description: text(row.descricao, 'Despesa Uber'),
      date: text(row.data_despesa),
      competence: text(row.competencia),
      amount: roundMoney(Number(row.valor || 0)),
      status: text(row.status, 'lancado'),
      observation: text(row.observacao) || null,
      receiptName: text(row.recibo_nome, 'Recibo'),
      receiptUrl: signed.data?.signedUrl || null,
      reportRideId: text(row.uber_relatorio_corrida_id) || null,
      createdAt: text(row.created_at),
      updatedAt: text(row.updated_at),
    }
  }))

  const reports: UberDashboardReport[] = ((reportsResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: text(row.id),
    competencia: text(row.competencia),
    arquivo: text(row.arquivo_nome, 'relatorio-uber.csv'),
    linhasLidas: Number(row.linhas_lidas || 0),
    corridasIdentificadas: Number(row.corridas_identificadas || 0),
    corridasSemLancamento: Number(row.corridas_sem_lancamento || 0),
    valorTotal: roundMoney(Number(row.valor_total || 0)),
    valorSemLancamento: roundMoney(Number(row.valor_sem_lancamento || 0)),
    createdAt: text(row.created_at),
  }))

  const missing: UberDashboardMissingRide[] = ((missingResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: text(row.id),
    reportId: text(row.relatorio_id),
    line: Number(row.linha || 0),
    creationDate: text(row.creation_date) || null,
    voucherLink: text(row.voucher_link) || null,
    guestName: text(row.guest_name) || null,
    guestEmail: text(row.guest_email) || null,
    voucherStatus: text(row.voucher_status) || null,
    amountSpent: roundMoney(Number(row.amount_spent || 0)),
    ordersTrips: Number(row.orders_trips || 0),
  }))

  const openExpenses = expenses.filter((expense) => OPEN_EXPENSE_STATUSES.has(expense.status))
  const reconciledExpenses = expenses.filter((expense) => expense.status === 'conciliado')
  const reimbursedExpenses = expenses.filter((expense) => expense.status === 'reembolsado')
  const rejectedExpenses = expenses.filter((expense) => expense.status === 'rejeitado')

  return {
    configured: true,
    competencia,
    reports,
    expenses,
    missing,
    summary: {
      totalExpenses: expenses.length,
      pendingExpenses: openExpenses.length,
      reconciledExpenses: reconciledExpenses.length,
      reimbursedExpenses: reimbursedExpenses.length,
      rejectedExpenses: rejectedExpenses.length,
      openAmount: roundMoney(openExpenses.reduce((sum, expense) => sum + expense.amount, 0)),
      reimbursedAmount: roundMoney(reimbursedExpenses.reduce((sum, expense) => sum + expense.amount, 0)),
      missingRides: missing.length,
      missingAmount: roundMoney(missing.reduce((sum, ride) => sum + ride.amountSpent, 0)),
    },
  }
}

export async function updateUberExpenseStatus(input: {
  id: string
  status: string
  observation?: string | null
  updatedBy?: string | null
}) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase não configurado.')
  if (!ALLOWED_EXPENSE_STATUS.has(input.status)) throw new Error('Status de Uber inválido.')

  const { data: existing, error: existingError } = await supabase
    .from('colab_uber_despesas')
    .select('id, competencia, status, valor, cliente_nome_snapshot')
    .eq('id', input.id)
    .single()

  if (existingError || !existing) throw new Error(`Lançamento Uber não localizado: ${existingError?.message || 'sem retorno'}`)

  const { data, error } = await supabase
    .from('colab_uber_despesas')
    .update({
      status: input.status,
      observacao: input.observation || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select('id, competencia, status')
    .single()

  if (error || !data) throw new Error(`Erro ao atualizar lançamento Uber: ${error?.message || 'sem retorno'}`)

  await logEvent({
    supabase,
    modulo: 'dashboard',
    competencia: text(existing.competencia),
    action: 'atualizar_status_uber',
    entidadeTipo: 'colab_uber_despesa',
    entidadeId: input.id,
    detalhe: {
      statusAnterior: text(existing.status),
      statusNovo: input.status,
      observacao: input.observation || null,
      valor: roundMoney(Number(existing.valor || 0)),
      cliente: text(existing.cliente_nome_snapshot),
      updatedBy: input.updatedBy || null,
    },
  })

  return { id: text(data.id), competencia: text(data.competencia), status: text(data.status) }
}
