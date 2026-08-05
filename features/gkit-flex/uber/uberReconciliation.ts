export type UberReportRow = {
  line: number
  creationDate: string
  voucherLink: string
  guestName: string
  guestEmail: string
  guestPhone: string
  voucherStatus: string
  amountSpent: number
  ordersTrips: number
  raw: Record<string, string>
}

export type UberExpenseForMatch = {
  id: string
  collaboratorEmail: string
  amount: number
  status?: string | null
}

export type UberReconciliationRow = UberReportRow & {
  hasRide: boolean
  matchedExpenseId: string | null
  reconciliationStatus: 'sem_corrida' | 'sem_lancamento' | 'conciliado'
}

function splitCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
      continue
    }

    if (char === '"') {
      quoted = !quoted
      continue
    }

    if (char === ',' && !quoted) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values
}

function parseNumber(value: string): number {
  const text = String(value || '').trim()
  if (!text) return 0
  const normalized = text.includes(',') && !text.includes('.')
    ? text.replace(/\./g, '').replace(',', '.')
    : text.replace(/,/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0
}

function parseInteger(value: string): number {
  const parsed = Number.parseInt(String(value || '').trim(), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeUberEmail(value: string): string {
  return String(value || '').trim().toLowerCase()
}

export function moneyKey(value: number): string {
  return (Math.round(Number(value || 0) * 100) / 100).toFixed(2)
}

export function parseUberVoucherCsv(content: string): UberReportRow[] {
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)

  if (lines.length <= 1) return []

  const headers = splitCsvLine(lines[0]).map((header) => header.trim())
  const indexByHeader = new Map(headers.map((header, index) => [header, index]))

  function get(values: string[], header: string): string {
    const index = indexByHeader.get(header)
    return index === undefined ? '' : String(values[index] || '').trim()
  }

  return lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line)
    const raw = Object.fromEntries(headers.map((header, headerIndex) => [header, String(values[headerIndex] || '').trim()]))

    return {
      line: index + 2,
      creationDate: get(values, 'Creation Date'),
      voucherLink: get(values, 'Voucher Link'),
      guestName: get(values, 'Guest Name'),
      guestEmail: normalizeUberEmail(get(values, 'Guest Email')),
      guestPhone: get(values, 'Guest Phone'),
      voucherStatus: get(values, 'Voucher Status'),
      amountSpent: parseNumber(get(values, 'Amount Spent')),
      ordersTrips: parseInteger(get(values, 'Orders/Trips')),
      raw,
    }
  })
}

export function reconcileUberRows(rows: UberReportRow[], expenses: UberExpenseForMatch[]): UberReconciliationRow[] {
  const buckets = new Map<string, UberExpenseForMatch[]>()

  for (const expense of expenses) {
    if (String(expense.status || '') === 'rejeitado') continue
    const key = `${normalizeUberEmail(expense.collaboratorEmail)}|${moneyKey(expense.amount)}`
    const list = buckets.get(key) ?? []
    list.push(expense)
    buckets.set(key, list)
  }

  const used = new Set<string>()

  return rows.map((row) => {
    const hasRide = row.amountSpent > 0 || row.ordersTrips > 0
    if (!hasRide) {
      return { ...row, hasRide, matchedExpenseId: null, reconciliationStatus: 'sem_corrida' }
    }

    const key = `${normalizeUberEmail(row.guestEmail)}|${moneyKey(row.amountSpent)}`
    const match = (buckets.get(key) ?? []).find((expense) => !used.has(expense.id))
    if (match) {
      used.add(match.id)
      return { ...row, hasRide, matchedExpenseId: match.id, reconciliationStatus: 'conciliado' }
    }

    return { ...row, hasRide, matchedExpenseId: null, reconciliationStatus: 'sem_lancamento' }
  })
}
