import { randomUUID } from 'node:crypto'
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
  clientId: string
  collaboratorName: string
  collaboratorEmail: string
  client: string
  description: string
  date: string
  competence: string
  amount: number
  status: string
  observation: string | null
  privateVehicle: boolean
  kilometers: number | null
  costPerKm: number | null
  receiptName: string
  receiptUrl: string | null
  reportRideId: string | null
  closingId: string | null
  closingCode: string | null
  closingCreatedAt: string | null
  createdAt: string
  updatedAt: string
}

export type UberClosingSummary = {
  id: string
  code: string
  competencia: string
  periodStart: string
  periodEnd: string
  clientId: string
  client: string
  rideCount: number
  totalAmount: number
  status: string
  createdAt: string
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
  closings: UberClosingSummary[]
  missing: UberDashboardMissingRide[]
  summary: {
    totalExpenses: number
    pendingExpenses: number
    reconciledExpenses: number
    reimbursedExpenses: number
    rejectedExpenses: number
    generatedReimbursements: number
    readyForClosing: number
    openAmount: number
    reimbursedAmount: number
    readyForClosingAmount: number
    missingRides: number
    missingAmount: number
  }
}

export type UberClosingReportExpense = {
  id: string
  collaboratorName: string
  collaboratorEmail: string
  date: string
  description: string
  amount: number
  status: string
  privateVehicle: boolean
  kilometers: number | null
  costPerKm: number | null
  receiptName: string
}

export type UberClosingReport = UberClosingSummary & {
  expenses: UberClosingReportExpense[]
}

const ALLOWED_EXPENSE_STATUS = new Set(['lancado', 'em_conferencia', 'conciliado', 'reembolso_solicitado', 'reembolsado', 'rejeitado'])
const OPEN_EXPENSE_STATUSES = new Set(['lancado', 'em_conferencia', 'reembolso_solicitado'])
const READY_FOR_CLOSING_STATUSES = new Set(['conciliado', 'reembolso_solicitado'])

function roundMoney(value: number) {
  return Math.round(Number(value || 0) * 100) / 100
}

function text(value: unknown, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}

function idList(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function isMissingSchemaError(error?: { code?: string; message?: string } | null) {
  if (!error) return false
  const message = `${error.code || ''} ${error.message || ''}`.toLowerCase()
  return (
    message.includes('42p01') ||
    message.includes('42703') ||
    message.includes('pgrst204') ||
    message.includes('could not find') ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  )
}

export function sanitizeCompetencia(value?: string | null) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 10)
  if (value && /^\d{4}-\d{2}$/.test(value)) return `${value}-01`
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

export function sanitizeDate(value?: string | null, fallback?: string) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return fallback || sanitizeCompetencia(value)
}

export function weekEndDate(periodStart: string) {
  const date = new Date(`${periodStart}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + 6)
  return date.toISOString().slice(0, 10)
}

function parseUberCreationDate(value: string) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+([+-]\d{2})(\d{2})/)
  if (!match) return null
  return `${match[1]}T${match[2]}${match[3]}:${match[4]}`
}

async function listExpensesForCompetencia(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>, competencia: string): Promise<UberExpenseForMatch[]> {
  let { data: expenses, error } = await supabase
    .from('colab_uber_despesas')
    .select('id, colaborador_usuario_id, valor, status, veiculo_proprio')
    .eq('competencia', competencia)
  let expenseRowsData = expenses as Array<Record<string, unknown>> | null

  if (error && isMissingSchemaError(error)) {
    const fallback = await supabase
      .from('colab_uber_despesas')
      .select('id, colaborador_usuario_id, valor, status')
      .eq('competencia', competencia)
    expenseRowsData = fallback.data as Array<Record<string, unknown>> | null
    error = fallback.error
  }

  if (error) throw new Error(`Erro ao consultar lançamentos Uber: ${error.message}`)

  const rows = (expenseRowsData ?? []).filter((row) => !Boolean(row.veiculo_proprio))
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
    closings: [],
    missing: [],
    summary: {
      totalExpenses: 0,
      pendingExpenses: 0,
      reconciledExpenses: 0,
      reimbursedExpenses: 0,
      rejectedExpenses: 0,
      generatedReimbursements: 0,
      readyForClosing: 0,
      openAmount: 0,
      reimbursedAmount: 0,
      readyForClosingAmount: 0,
      missingRides: 0,
      missingAmount: 0,
    },
  }

  if (!supabase) return empty

  const [reportsResult, expensesResult, closingsResult, missingResult] = await Promise.all([
    supabase
      .from('colab_uber_relatorios')
      .select('id, competencia, arquivo_nome, linhas_lidas, corridas_identificadas, corridas_sem_lancamento, valor_total, valor_sem_lancamento, created_at')
      .eq('competencia', competencia)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('colab_uber_despesas')
      .select('id, colaborador_usuario_id, cliente_id, cliente_nome_snapshot, data_despesa, competencia, descricao, valor, veiculo_proprio, quilometragem, custo_por_km, recibo_bucket, recibo_path, recibo_nome, status, observacao, uber_relatorio_corrida_id, uber_fechamento_id, created_at, updated_at')
      .eq('competencia', competencia)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('colab_uber_fechamentos')
      .select('id, codigo, competencia, periodo_inicio, periodo_fim, cliente_id, cliente_nome_snapshot, quantidade_corridas, valor_total, status, created_at')
      .eq('competencia', competencia)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('colab_uber_relatorio_corridas')
      .select('id, relatorio_id, linha, creation_date, voucher_link, guest_name, guest_email, voucher_status, amount_spent, orders_trips')
      .eq('competencia', competencia)
      .eq('status_conciliacao', 'sem_lancamento')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  let expenseRowsData = expensesResult.data as Array<Record<string, unknown>> | null
  let expenseRowsError = expensesResult.error
  if (expenseRowsError && isMissingSchemaError(expenseRowsError)) {
    const fallbackExpensesResult = await supabase
      .from('colab_uber_despesas')
      .select('id, colaborador_usuario_id, cliente_nome_snapshot, data_despesa, competencia, descricao, valor, recibo_bucket, recibo_path, recibo_nome, status, observacao, uber_relatorio_corrida_id, created_at, updated_at')
      .eq('competencia', competencia)
      .order('created_at', { ascending: false })
      .limit(200)

    expenseRowsData = fallbackExpensesResult.data
    expenseRowsError = fallbackExpensesResult.error
  }

  if (reportsResult.error) throw new Error(`Erro ao consultar relatórios Uber: ${reportsResult.error.message}`)
  if (expenseRowsError) throw new Error(`Erro ao consultar lançamentos Uber: ${expenseRowsError.message}`)
  if (missingResult.error) throw new Error(`Erro ao consultar pendências Uber: ${missingResult.error.message}`)
  if (closingsResult.error && !isMissingSchemaError(closingsResult.error)) {
    throw new Error(`Erro ao consultar fechamentos Uber: ${closingsResult.error.message}`)
  }

  const expenseRows = (expenseRowsData ?? []) as Array<Record<string, unknown>>
  const userIds = [...new Set(expenseRows.map((row) => text(row.colaborador_usuario_id)).filter(Boolean))]
  const usersResult = userIds.length
    ? await supabase.schema('security').from('usuarios').select('id,nome,email').in('id', userIds)
    : { data: [], error: null }

  if (usersResult.error) throw new Error(`Erro ao consultar colaboradores: ${usersResult.error.message}`)

  const users = new Map(((usersResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [
    text(row.id),
    { email: text(row.email), name: text(row.nome, 'Colaborador') },
  ]))

  const closings: UberClosingSummary[] = ((closingsResult.error ? [] : closingsResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: text(row.id),
    code: text(row.codigo, 'FECHAMENTO'),
    competencia: text(row.competencia),
    periodStart: text(row.periodo_inicio),
    periodEnd: text(row.periodo_fim),
    clientId: text(row.cliente_id),
    client: text(row.cliente_nome_snapshot, 'Cliente'),
    rideCount: Number(row.quantidade_corridas || 0),
    totalAmount: roundMoney(Number(row.valor_total || 0)),
    status: text(row.status, 'gerado'),
    createdAt: text(row.created_at),
  }))
  const closingsById = new Map(closings.map((closing) => [closing.id, closing]))

  const expenses: UberDashboardExpense[] = await Promise.all(expenseRows.map(async (row) => {
    const bucket = text(row.recibo_bucket, 'colab-uber-recibos')
    const path = text(row.recibo_path)
    const signed = path
      ? await supabase.storage.from(bucket).createSignedUrl(path, 60 * 30)
      : { data: null, error: null }
    const user = users.get(text(row.colaborador_usuario_id))

    return {
      id: text(row.id),
      clientId: text(row.cliente_id),
      collaboratorName: user?.name || 'Colaborador',
      collaboratorEmail: user?.email || '',
      client: text(row.cliente_nome_snapshot, 'Cliente'),
      description: text(row.descricao, 'Despesa Uber'),
      date: text(row.data_despesa),
      competence: text(row.competencia),
      amount: roundMoney(Number(row.valor || 0)),
      status: text(row.status, 'lancado'),
      observation: text(row.observacao) || null,
      privateVehicle: Boolean(row.veiculo_proprio),
      kilometers: row.quilometragem === null || row.quilometragem === undefined ? null : roundMoney(Number(row.quilometragem || 0)),
      costPerKm: row.custo_por_km === null || row.custo_por_km === undefined ? null : roundMoney(Number(row.custo_por_km || 0)),
      receiptName: text(row.recibo_nome, Boolean(row.veiculo_proprio) ? 'Veiculo proprio' : 'Recibo'),
      receiptUrl: signed.data?.signedUrl || null,
      reportRideId: text(row.uber_relatorio_corrida_id) || null,
      closingId: text(row.uber_fechamento_id) || null,
      closingCode: closingsById.get(text(row.uber_fechamento_id))?.code || null,
      closingCreatedAt: closingsById.get(text(row.uber_fechamento_id))?.createdAt || null,
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
  const generatedExpenses = expenses.filter((expense) => Boolean(expense.closingId))
  const readyForClosingExpenses = expenses.filter((expense) => READY_FOR_CLOSING_STATUSES.has(expense.status) && !expense.closingId)

  return {
    configured: true,
    competencia,
    reports,
    expenses,
    closings,
    missing,
    summary: {
      totalExpenses: expenses.length,
      pendingExpenses: openExpenses.length,
      reconciledExpenses: reconciledExpenses.length,
      reimbursedExpenses: reimbursedExpenses.length,
      rejectedExpenses: rejectedExpenses.length,
      generatedReimbursements: generatedExpenses.length,
      readyForClosing: readyForClosingExpenses.length,
      openAmount: roundMoney(openExpenses.reduce((sum, expense) => sum + expense.amount, 0)),
      reimbursedAmount: roundMoney(reimbursedExpenses.reduce((sum, expense) => sum + expense.amount, 0)),
      readyForClosingAmount: roundMoney(readyForClosingExpenses.reduce((sum, expense) => sum + expense.amount, 0)),
      missingRides: missing.length,
      missingAmount: roundMoney(missing.reduce((sum, ride) => sum + ride.amountSpent, 0)),
    },
  }
}

export async function generateUberWeeklyClosings(input: {
  periodStart?: string | null
  periodEnd?: string | null
  createdBy?: string | null
}) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nao configurado.')

  const periodStart = sanitizeDate(input.periodStart)
  const periodEnd = sanitizeDate(input.periodEnd, weekEndDate(periodStart))
  if (periodEnd < periodStart) throw new Error('A data final precisa ser maior ou igual a data inicial.')

  const competencia = sanitizeCompetencia(periodStart)
  const { data: rows, error } = await supabase
    .from('colab_uber_despesas')
    .select('id, colaborador_usuario_id, cliente_id, cliente_nome_snapshot, data_despesa, descricao, valor, status, uber_fechamento_id')
    .gte('data_despesa', periodStart)
    .lte('data_despesa', periodEnd)
    .in('status', Array.from(READY_FOR_CLOSING_STATUSES))
    .is('uber_fechamento_id', null)
    .order('cliente_nome_snapshot', { ascending: true })
    .order('data_despesa', { ascending: true })

  if (error) throw new Error(`Erro ao consultar corridas para fechamento: ${error.message}`)

  const expenses = ((rows ?? []) as Array<Record<string, unknown>>)
    .filter((row) => text(row.cliente_id) && Number(row.valor || 0) > 0)

  if (!expenses.length) {
    throw new Error('Nenhuma corrida conciliada e ainda nao gerada para reembolso nesse periodo.')
  }

  const groups = new Map<string, Array<Record<string, unknown>>>()
  for (const expense of expenses) {
    const clientId = text(expense.cliente_id)
    groups.set(clientId, [...(groups.get(clientId) ?? []), expense])
  }

  const closingPayload = Array.from(groups.entries()).map(([clientId, group], index) => ({
    codigo: `UBER-${periodStart.replaceAll('-', '')}-${String(index + 1).padStart(2, '0')}-${randomUUID().slice(0, 8).toUpperCase()}`,
    competencia,
    periodo_inicio: periodStart,
    periodo_fim: periodEnd,
    cliente_id: clientId,
    cliente_nome_snapshot: text(group[0].cliente_nome_snapshot, 'Cliente'),
    quantidade_corridas: group.length,
    valor_total: roundMoney(group.reduce((sum, expense) => sum + Number(expense.valor || 0), 0)),
    status: 'gerado',
    created_by: input.createdBy || null,
  }))

  const { data: insertedClosings, error: insertError } = await supabase
    .from('colab_uber_fechamentos')
    .insert(closingPayload)
    .select('id, codigo, competencia, periodo_inicio, periodo_fim, cliente_id, cliente_nome_snapshot, quantidade_corridas, valor_total, status, created_at')

  if (insertError) throw new Error(`Erro ao gravar fechamento semanal: ${insertError.message}`)

  const closings: UberClosingSummary[] = ((insertedClosings ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: text(row.id),
    code: text(row.codigo),
    competencia: text(row.competencia),
    periodStart: text(row.periodo_inicio),
    periodEnd: text(row.periodo_fim),
    clientId: text(row.cliente_id),
    client: text(row.cliente_nome_snapshot, 'Cliente'),
    rideCount: Number(row.quantidade_corridas || 0),
    totalAmount: roundMoney(Number(row.valor_total || 0)),
    status: text(row.status, 'gerado'),
    createdAt: text(row.created_at),
  }))
  const closingByClient = new Map(closings.map((closing) => [closing.clientId, closing]))

  for (const [clientId, group] of groups.entries()) {
    const closing = closingByClient.get(clientId)
    if (!closing) continue

    const ids = idList(group.map((expense) => text(expense.id)))
    if (!ids.length) continue

    const { error: updateError } = await supabase
      .from('colab_uber_despesas')
      .update({
        status: 'reembolso_solicitado',
        uber_fechamento_id: closing.id,
        updated_at: new Date().toISOString(),
      })
      .in('id', ids)

    if (updateError) throw new Error(`Erro ao marcar corridas do cliente ${closing.client}: ${updateError.message}`)
  }

  await logEvent({
    supabase,
    modulo: 'dashboard',
    competencia,
    action: 'gerar_fechamento_semanal_uber',
    entidadeTipo: 'colab_uber_fechamento',
    entidadeId: closings.map((closing) => closing.id).join(','),
    detalhe: {
      periodoInicio: periodStart,
      periodoFim: periodEnd,
      clientes: closings.length,
      corridas: expenses.length,
      valorTotal: roundMoney(closings.reduce((sum, closing) => sum + closing.totalAmount, 0)),
      createdBy: input.createdBy || null,
    },
  })

  return {
    configured: true,
    periodStart,
    periodEnd,
    closings,
    reportUrl: `/modulos/gkit-fat/uber/fechamentos?ids=${encodeURIComponent(closings.map((closing) => closing.id).join(','))}`,
  }
}

export async function getUberClosingReports(idsInput: string[]): Promise<UberClosingReport[]> {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nao configurado.')

  const ids = idList(idsInput)
  if (!ids.length) return []

  const { data: closingRows, error: closingError } = await supabase
    .from('colab_uber_fechamentos')
    .select('id, codigo, competencia, periodo_inicio, periodo_fim, cliente_id, cliente_nome_snapshot, quantidade_corridas, valor_total, status, created_at')
    .in('id', ids)

  if (closingError) throw new Error(`Erro ao consultar fechamentos Uber: ${closingError.message}`)

  const closings: UberClosingSummary[] = ((closingRows ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: text(row.id),
    code: text(row.codigo, 'FECHAMENTO'),
    competencia: text(row.competencia),
    periodStart: text(row.periodo_inicio),
    periodEnd: text(row.periodo_fim),
    clientId: text(row.cliente_id),
    client: text(row.cliente_nome_snapshot, 'Cliente'),
    rideCount: Number(row.quantidade_corridas || 0),
    totalAmount: roundMoney(Number(row.valor_total || 0)),
    status: text(row.status, 'gerado'),
    createdAt: text(row.created_at),
  }))

  if (!closings.length) return []

  const { data: expenseRows, error: expenseError } = await supabase
    .from('colab_uber_despesas')
    .select('id, colaborador_usuario_id, data_despesa, descricao, valor, veiculo_proprio, quilometragem, custo_por_km, recibo_nome, status, uber_fechamento_id')
    .in('uber_fechamento_id', closings.map((closing) => closing.id))
    .order('data_despesa', { ascending: true })
    .order('created_at', { ascending: true })

  if (expenseError) throw new Error(`Erro ao consultar corridas do fechamento: ${expenseError.message}`)

  const expensesRaw = (expenseRows ?? []) as Array<Record<string, unknown>>
  const userIds = idList(expensesRaw.map((row) => text(row.colaborador_usuario_id)))
  const usersResult = userIds.length
    ? await supabase.schema('security').from('usuarios').select('id,nome,email').in('id', userIds)
    : { data: [], error: null }

  if (usersResult.error) throw new Error(`Erro ao consultar colaboradores do fechamento: ${usersResult.error.message}`)

  const users = new Map(((usersResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [
    text(row.id),
    { email: text(row.email), name: text(row.nome, 'Colaborador') },
  ]))

  const expensesByClosing = new Map<string, UberClosingReportExpense[]>()
  for (const row of expensesRaw) {
    const closingId = text(row.uber_fechamento_id)
    const user = users.get(text(row.colaborador_usuario_id))
    expensesByClosing.set(closingId, [
      ...(expensesByClosing.get(closingId) ?? []),
      {
        id: text(row.id),
        collaboratorName: user?.name || 'Colaborador',
        collaboratorEmail: user?.email || '',
        date: text(row.data_despesa),
        description: text(row.descricao, 'Corrida Uber'),
        amount: roundMoney(Number(row.valor || 0)),
        status: text(row.status, 'reembolso_solicitado'),
        privateVehicle: Boolean(row.veiculo_proprio),
        kilometers: row.quilometragem === null || row.quilometragem === undefined ? null : roundMoney(Number(row.quilometragem || 0)),
        costPerKm: row.custo_por_km === null || row.custo_por_km === undefined ? null : roundMoney(Number(row.custo_por_km || 0)),
        receiptName: text(row.recibo_nome, Boolean(row.veiculo_proprio) ? 'Veiculo proprio' : 'Recibo'),
      },
    ])
  }

  const order = new Map(ids.map((id, index) => [id, index]))
  return closings
    .map((closing) => ({ ...closing, expenses: expensesByClosing.get(closing.id) ?? [] }))
    .sort((left, right) => (order.get(left.id) ?? 999) - (order.get(right.id) ?? 999) || left.client.localeCompare(right.client))
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
