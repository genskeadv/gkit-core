'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, ChevronDown, ChevronLeft, Clock3, Loader2, PencilLine, WalletCards, X } from 'lucide-react'
import type { PayableItem, PayableSummary } from '@/features/gkit-flex/contas-pagar/types'

type RangeKey = 'hoje' | 'semana' | 'quinzena' | 'mes'
type VisibilityMode = 'todos' | 'abertos'

type PayablesResponse = {
  configured: boolean
  competencia: string
  status: string
  rows: PayableItem[]
  summary: PayableSummary
}

type ForecastResponse = {
  configured: boolean
  summary?: {
    totalReceitas: number
    totalPagamentos: number
    saldoPrevisto: number
  }
}

const ACCOUNTS = [
  { id: 'genske', name: 'Genske Advogados' },
]

const RANGE_LABELS: Record<RangeKey, string> = {
  hoje: 'Hoje',
  semana: 'Semana',
  quinzena: 'Quinzena',
  mes: 'Mês',
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function currentCompetencia() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function competenciaDate(competencia: string) {
  const [year, month] = competencia.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

function dateInputFromDay(competencia: string, day: number | null | undefined) {
  if (!day) return ''
  const [year, month] = competencia.split('-')
  return `${year}-${month}-${String(day).padStart(2, '0')}`
}

function dayFromDateInput(value: string) {
  if (!value) return null
  const day = Number(value.slice(-2))
  return Number.isFinite(day) ? day : null
}

function rangeLimit(range: RangeKey) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const end = new Date(today)
  if (range === 'semana') end.setDate(today.getDate() + 7)
  if (range === 'quinzena') end.setDate(today.getDate() + 15)
  if (range === 'mes') end.setMonth(today.getMonth() + 1, 0)

  return { start: today, end }
}

function dueDateFor(item: PayableItem, competencia: string) {
  if (!item.vencimento_dia) return null
  const [year, month] = competencia.split('-').map(Number)
  return new Date(year, month - 1, Number(item.vencimento_dia))
}

function dueLabel(item: PayableItem) {
  if (item.vencimento_dia) return `Vence dia ${String(item.vencimento_dia).padStart(2, '0')}`
  return item.vencimento_texto ? `Vence ${item.vencimento_texto}` : 'Sem vencimento'
}

export function GkitMoneyPage() {
  const [competencia] = useState(currentCompetencia)
  const [range, setRange] = useState<RangeKey>('mes')
  const [visibility, setVisibility] = useState<VisibilityMode>('abertos')
  const [selectedAccountId, setSelectedAccountId] = useState('genske')
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)
  const [rows, setRows] = useState<PayableItem[]>([])
  const [summary, setSummary] = useState<PayableSummary>({ total: 0, totalPago: 0, totalAberto: 0, quantidade: 0, quantidadePaga: 0 })
  const [openingBalance, setOpeningBalance] = useState(0)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<PayableItem | null>(null)
  const [form, setForm] = useState({ descricao: '', vencimento: '', valor: '' })

  const selectedAccount = ACCOUNTS.find((account) => account.id === selectedAccountId) || ACCOUNTS[0]

  async function loadMoneyData() {
    setLoading(true)
    setError('')
    try {
      const [payablesResponse, forecastResponse] = await Promise.all([
        fetch(`/api/gkit-flex/contas-pagar/itens?competencia=${competencia}`, { cache: 'no-store' }),
        fetch(`/api/gkit-flex/previsoes?competencia=${competencia}`, { cache: 'no-store' }),
      ])

      const payablesData = (await payablesResponse.json()) as PayablesResponse & { error?: string }
      const forecastData = (await forecastResponse.json()) as ForecastResponse & { error?: string }

      if (!payablesResponse.ok) throw new Error(payablesData.error || 'Erro ao carregar pagamentos.')
      if (!forecastResponse.ok) throw new Error(forecastData.error || 'Erro ao carregar previsão de receitas.')

      setRows(payablesData.rows || [])
      setSummary(payablesData.summary || { total: 0, totalPago: 0, totalAberto: 0, quantidade: 0, quantidadePaga: 0 })
      setStatus(payablesData.status || '')
      setOpeningBalance(Number(forecastData.summary?.totalReceitas || 0))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar pagamentos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMoneyData()
  }, [competencia])

  const currentBalance = openingBalance - summary.totalPago
  const maxChartValue = Math.max(openingBalance, summary.totalPago, 1)

  const visibleRows = useMemo(() => {
    const { start, end } = rangeLimit(range)

    return rows
      .filter((item) => {
        if (visibility === 'abertos' && item.pago) return false
        if (!item.pago) return true

        const dueDate = dueDateFor(item, competencia)
        if (!dueDate) return range === 'mes'
        dueDate.setHours(0, 0, 0, 0)

        return dueDate >= start && dueDate <= end
      })
      .sort((a, b) => {
        const dayA = a.vencimento_dia ?? 99
        const dayB = b.vencimento_dia ?? 99
        return dayA - dayB || Number(a.pago) - Number(b.pago) || a.descricao.localeCompare(b.descricao, 'pt-BR')
      })
  }, [competencia, range, rows, visibility])

  function openEditor(item: PayableItem) {
    setEditing(item)
    setForm({
      descricao: item.descricao,
      vencimento: dateInputFromDay(competencia, item.vencimento_dia),
      valor: String(item.valor_previsto || 0),
    })
  }

  async function patchPayable(id: string, patch: Partial<Pick<PayableItem, 'descricao' | 'vencimento_dia' | 'valor_previsto' | 'pago'>>) {
    setSavingId(id)
    setError('')
    try {
      const response = await fetch(`/api/gkit-flex/contas-pagar/itens/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erro ao salvar pagamento.')
      await loadMoneyData()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Erro ao salvar pagamento.')
    } finally {
      setSavingId(null)
    }
  }

  async function saveEditor() {
    if (!editing) return
    await patchPayable(editing.id, {
      descricao: form.descricao,
      vencimento_dia: dayFromDateInput(form.vencimento),
      valor_previsto: Number(String(form.valor).replace(',', '.')) || 0,
    })
    setEditing(null)
  }

  return (
    <main className="gkit-money-shell">
      <section className="gkit-money-phone">
        <header className="gkit-money-topbar">
          <a className="gkit-money-icon-link" href="/modulos/gkit-flex" aria-label="Voltar para o Flex">
            <ChevronLeft size={22} />
          </a>
          <button type="button" className="gkit-money-account" onClick={() => setAccountSheetOpen(true)}>
            <p>Conta</p>
            <h1>
              {selectedAccount.name}
              <ChevronDown size={16} />
            </h1>
          </button>
          <div className="gkit-money-balance">
            <span>Saldo</span>
            <strong>{currency.format(currentBalance)}</strong>
          </div>
        </header>

        <section className="gkit-money-month">
          <div className="gkit-money-month-title">
            <div>
              <p>{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(competenciaDate(competencia))}</p>
              <strong>{status === 'fechado' ? 'Fechado' : 'Aberto'}</strong>
            </div>
            <WalletCards size={22} />
          </div>

          <div className="gkit-money-bars">
            <div className="gkit-money-bar-row">
              <span>Abertura</span>
              <div className="gkit-money-track">
                <i style={{ width: `${(openingBalance / maxChartValue) * 100}%` }} />
              </div>
              <strong>{currency.format(openingBalance)}</strong>
            </div>
            <div className="gkit-money-bar-row">
              <span>Pago</span>
              <div className="gkit-money-track">
                <i className="is-paid" style={{ width: `${(summary.totalPago / maxChartValue) * 100}%` }} />
              </div>
              <strong>{currency.format(summary.totalPago)}</strong>
            </div>
          </div>
        </section>

        <section className="gkit-money-controls" aria-label="Filtros">
          <div className="gkit-money-range">
            {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
              <button key={key} type="button" className={range === key ? 'is-active' : ''} onClick={() => setRange(key)}>
                {RANGE_LABELS[key]}
              </button>
            ))}
          </div>
          <div className="gkit-money-toggle">
            <button type="button" className={visibility === 'todos' ? 'is-active' : ''} onClick={() => setVisibility('todos')}>
              Todos
            </button>
            <button type="button" className={visibility === 'abertos' ? 'is-active' : ''} onClick={() => setVisibility('abertos')}>
              Em aberto
            </button>
          </div>
        </section>

        {error ? <p className="gkit-money-error">{error}</p> : null}

        <section className="gkit-money-list" aria-label="Pagamentos">
          <div className="gkit-money-list-head">
            <span>{visibleRows.length} pagamentos</span>
            <strong>{currency.format(visibleRows.reduce((acc, item) => acc + Number(item.valor_previsto || 0), 0))}</strong>
          </div>

          {loading ? (
            <div className="gkit-money-state">
              <Loader2 className="gkit-money-spin" size={22} />
              <span>Carregando pagamentos</span>
            </div>
          ) : visibleRows.length ? (
            visibleRows.map((item) => (
              <article key={item.id} className={`gkit-money-payment ${item.pago ? 'is-paid' : ''}`}>
                <button
                  type="button"
                  className="gkit-money-check"
                  aria-label={item.pago ? 'Marcar como em aberto' : 'Confirmar pagamento'}
                  disabled={savingId === item.id}
                  onClick={() => patchPayable(item.id, { pago: !item.pago })}
                >
                  {item.pago ? <Check size={18} /> : null}
                </button>

                <button type="button" className="gkit-money-description" onClick={() => openEditor(item)}>
                  <span>{item.descricao}</span>
                  <small>
                    <CalendarDays size={14} />
                    {dueLabel(item)}
                  </small>
                </button>

                <div className="gkit-money-payment-side">
                  <strong>{currency.format(Number(item.valor_previsto || 0))}</strong>
                  <span>{item.pago ? 'Pago' : 'Aberto'}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="gkit-money-state">
              <Clock3 size={22} />
              <span>Nenhum pagamento neste filtro</span>
            </div>
          )}
        </section>
      </section>

      {accountSheetOpen ? (
        <div className="gkit-money-sheet-backdrop" role="presentation" onClick={() => setAccountSheetOpen(false)}>
          <section className="gkit-money-sheet" role="dialog" aria-modal="true" aria-label="Selecionar conta" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <p>Conta</p>
                <h2>Selecionar conta</h2>
              </div>
              <button type="button" aria-label="Fechar" onClick={() => setAccountSheetOpen(false)}>
                <X size={20} />
              </button>
            </header>

            <div className="gkit-money-account-list">
              {ACCOUNTS.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  className={account.id === selectedAccountId ? 'is-active' : ''}
                  onClick={() => {
                    setSelectedAccountId(account.id)
                    setAccountSheetOpen(false)
                  }}
                >
                  <span>{account.name}</span>
                  <strong>{currency.format(currentBalance)}</strong>
                  {account.id === selectedAccountId ? <Check size={18} /> : null}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {editing ? (
        <div className="gkit-money-sheet-backdrop" role="presentation" onClick={() => setEditing(null)}>
          <section className="gkit-money-sheet" role="dialog" aria-modal="true" aria-label="Editar pagamento" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <p>Pagamento</p>
                <h2>Editar detalhe</h2>
              </div>
              <button type="button" aria-label="Fechar" onClick={() => setEditing(null)}>
                <X size={20} />
              </button>
            </header>

            <label>
              Descrição
              <input value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))} />
            </label>
            <label>
              Vencimento
              <input type="date" value={form.vencimento} onChange={(event) => setForm((current) => ({ ...current, vencimento: event.target.value }))} />
            </label>
            <label>
              Valor
              <input inputMode="decimal" value={form.valor} onChange={(event) => setForm((current) => ({ ...current, valor: event.target.value }))} />
            </label>

            <button type="button" className="gkit-money-save" disabled={savingId === editing.id} onClick={saveEditor}>
              <PencilLine size={18} />
              Salvar
            </button>
          </section>
        </div>
      ) : null}
    </main>
  )
}
