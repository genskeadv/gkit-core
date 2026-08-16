'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, ChevronDown, ChevronLeft, Clock3, Loader2, PencilLine, Plus, WalletCards, X } from 'lucide-react'
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

type MoneyAccount = {
  id: string
  nome: string
  status: string
  conta_principal: boolean
  ordem: number
}

type AccountsResponse = {
  contas: MoneyAccount[]
}

type AccountBalance = MoneyAccount & {
  saldoAbertura: number
  totalPago: number
  saldoAtual: number
  totalEntrada: number
}

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

function sumPayables(rows: PayableItem[]) {
  const total = rows.reduce((acc, item) => acc + Number(item.valor_previsto || 0), 0)
  const totalPago = rows.filter((item) => item.pago).reduce((acc, item) => acc + Number(item.valor_previsto || 0), 0)
  return {
    total,
    totalPago,
    totalAberto: total - totalPago,
    quantidade: rows.length,
    quantidadePaga: rows.filter((item) => item.pago).length,
  }
}

export function GkitMoneyPage() {
  const [competencia] = useState(currentCompetencia)
  const [range, setRange] = useState<RangeKey>('mes')
  const [visibility, setVisibility] = useState<VisibilityMode>('abertos')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)
  const [accounts, setAccounts] = useState<MoneyAccount[]>([])
  const [newAccountName, setNewAccountName] = useState('')
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [rows, setRows] = useState<PayableItem[]>([])
  const [openingBalance, setOpeningBalance] = useState(0)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<PayableItem | null>(null)
  const [creatingPayment, setCreatingPayment] = useState(false)
  const [form, setForm] = useState({ descricao: '', vencimento: '', valor: '', moneyContaId: '', moneyDestinoId: '' })

  const mainAccount = accounts.find((account) => account.conta_principal) || accounts[0] || null
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) || mainAccount
  const mainAccountId = mainAccount?.id || ''

  function rowAccountId(item: PayableItem) {
    return item.money_conta_id || mainAccountId
  }

  async function loadMoneyData() {
    setLoading(true)
    setError('')
    try {
      const [payablesResponse, forecastResponse, accountsResponse] = await Promise.all([
        fetch(`/api/gkit-flex/contas-pagar/itens?competencia=${competencia}`, { cache: 'no-store' }),
        fetch(`/api/gkit-flex/previsoes?competencia=${competencia}`, { cache: 'no-store' }),
        fetch('/api/gkit-money/contas', { cache: 'no-store' }),
      ])

      const payablesData = (await payablesResponse.json()) as PayablesResponse & { error?: string }
      const forecastData = (await forecastResponse.json()) as ForecastResponse & { error?: string }
      const accountsData = (await accountsResponse.json()) as AccountsResponse & { error?: string }

      if (!payablesResponse.ok) throw new Error(payablesData.error || 'Erro ao carregar pagamentos.')
      if (!forecastResponse.ok) throw new Error(forecastData.error || 'Erro ao carregar previsão de receitas.')
      if (!accountsResponse.ok) throw new Error(accountsData.error || 'Erro ao carregar contas.')

      setRows(payablesData.rows || [])
      setStatus(payablesData.status || '')
      setOpeningBalance(Number(forecastData.summary?.totalReceitas || 0))
      setAccounts(accountsData.contas || [])
      setSelectedAccountId((current) => {
        if (current && accountsData.contas?.some((account) => account.id === current)) return current
        return accountsData.contas?.find((account) => account.conta_principal)?.id || accountsData.contas?.[0]?.id || ''
      })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar pagamentos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMoneyData()
  }, [competencia])

  const accountBalances = useMemo<AccountBalance[]>(() => {
    return accounts.map((account) => {
      const accountRows = rows.filter((item) => rowAccountId(item) === account.id)
      const accountSummary = sumPayables(accountRows)
      const totalEntrada = account.conta_principal
        ? openingBalance
        : rows
            .filter((item) => item.pago && item.money_conta_destino_id === account.id)
            .reduce((acc, item) => acc + Number(item.valor_previsto || 0), 0)

      return {
        ...account,
        saldoAbertura: totalEntrada,
        totalEntrada,
        totalPago: accountSummary.totalPago,
        saldoAtual: totalEntrada - accountSummary.totalPago,
      }
    })
  }, [accounts, rows, openingBalance, mainAccountId])

  const selectedRows = useMemo(() => {
    if (!selectedAccount) return rows
    return rows.filter((item) => rowAccountId(item) === selectedAccount.id)
  }, [rows, selectedAccount?.id, mainAccountId])

  const selectedSummary = useMemo(() => sumPayables(selectedRows), [selectedRows])
  const selectedAccountBalance = accountBalances.find((account) => account.id === selectedAccount?.id)
  const currentBalance = selectedAccountBalance?.saldoAtual ?? 0
  const selectedOpeningBalance = selectedAccountBalance?.saldoAbertura ?? 0
  const maxChartValue = Math.max(selectedOpeningBalance, selectedSummary.totalPago, 1)

  const visibleRows = useMemo(() => {
    const { start, end } = rangeLimit(range)

    return selectedRows
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
  }, [competencia, range, selectedRows, visibility])

  function openEditor(item: PayableItem) {
    setCreatingPayment(false)
    setEditing(item)
    setForm({
      descricao: item.descricao,
      vencimento: dateInputFromDay(competencia, item.vencimento_dia),
      valor: String(item.valor_previsto || 0),
      moneyContaId: item.money_conta_id || selectedAccount?.id || mainAccountId,
      moneyDestinoId: item.money_conta_destino_id || '',
    })
  }

  function openNewPayment() {
    setEditing(null)
    setCreatingPayment(true)
    setForm({
      descricao: '',
      vencimento: '',
      valor: '',
      moneyContaId: selectedAccount?.id || mainAccountId,
      moneyDestinoId: '',
    })
  }

  function closeEditor() {
    setEditing(null)
    setCreatingPayment(false)
  }

  async function patchPayable(
    id: string,
    patch: Partial<Pick<PayableItem, 'descricao' | 'vencimento_dia' | 'valor_previsto' | 'pago' | 'money_conta_id' | 'money_conta_destino_id'>>,
  ) {
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
    const sourceId = form.moneyContaId || mainAccountId || null
    const destinoId = form.moneyDestinoId && form.moneyDestinoId !== sourceId ? form.moneyDestinoId : null

    if (creatingPayment) {
      const descricao = form.descricao.trim()
      if (!descricao) {
        setError('Informe a descrição do pagamento.')
        return
      }

      setSavingId('new-payment')
      setError('')
      try {
        const response = await fetch('/api/gkit-flex/contas-pagar/itens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            competencia,
            descricao,
            vencimento_dia: dayFromDateInput(form.vencimento),
            valor_previsto: Number(String(form.valor).replace(',', '.')) || 0,
            categoria: 'Sem categoria',
            centro: 'Sem centro',
            pago: false,
            money_conta_id: sourceId,
            money_conta_destino_id: destinoId,
          }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Erro ao criar pagamento.')
        closeEditor()
        await loadMoneyData()
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Erro ao criar pagamento.')
      } finally {
        setSavingId(null)
      }
      return
    }

    if (!editing) return
    await patchPayable(editing.id, {
      descricao: form.descricao,
      vencimento_dia: dayFromDateInput(form.vencimento),
      valor_previsto: Number(String(form.valor).replace(',', '.')) || 0,
      money_conta_id: sourceId,
      money_conta_destino_id: destinoId,
    })
    closeEditor()
  }

  async function createAccount() {
    const nome = newAccountName.trim()
    if (!nome) return

    setCreatingAccount(true)
    setError('')
    try {
      const response = await fetch('/api/gkit-money/contas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
      const data = (await response.json()) as { conta?: MoneyAccount; error?: string }
      if (!response.ok) throw new Error(data.error || 'Erro ao criar conta.')
      setNewAccountName('')
      await loadMoneyData()
      if (data.conta?.id) setSelectedAccountId(data.conta.id)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Erro ao criar conta.')
    } finally {
      setCreatingAccount(false)
    }
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
              {selectedAccount?.nome || 'Conta'}
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
                <i style={{ width: `${(selectedOpeningBalance / maxChartValue) * 100}%` }} />
              </div>
              <strong>{currency.format(selectedOpeningBalance)}</strong>
            </div>
            <div className="gkit-money-bar-row">
              <span>Pago</span>
              <div className="gkit-money-track">
                <i className="is-paid" style={{ width: `${(selectedSummary.totalPago / maxChartValue) * 100}%` }} />
              </div>
              <strong>{currency.format(selectedSummary.totalPago)}</strong>
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
            <div className="gkit-money-list-summary">
              <span>{visibleRows.length} pagamentos</span>
              <strong>{currency.format(visibleRows.reduce((acc, item) => acc + Number(item.valor_previsto || 0), 0))}</strong>
            </div>
            <button type="button" className="gkit-money-add-payment" aria-label="Adicionar pagamento" disabled={loading || status !== 'aberto'} onClick={openNewPayment}>
              <Plus size={18} />
            </button>
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
              {accountBalances.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  className={account.id === selectedAccountId ? 'is-active' : ''}
                  onClick={() => {
                    setSelectedAccountId(account.id)
                    setAccountSheetOpen(false)
                  }}
                >
                  <span>{account.nome}</span>
                  <strong>{currency.format(account.saldoAtual)}</strong>
                  {account.id === selectedAccountId ? <Check size={18} /> : null}
                </button>
              ))}
            </div>

            <div className="gkit-money-account-create">
              <input
                value={newAccountName}
                placeholder="Nova conta"
                onChange={(event) => setNewAccountName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') createAccount()
                }}
              />
              <button type="button" aria-label="Criar conta" disabled={creatingAccount || !newAccountName.trim()} onClick={createAccount}>
                {creatingAccount ? <Loader2 className="gkit-money-spin" size={18} /> : <Plus size={18} />}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {editing || creatingPayment ? (
        <div className="gkit-money-sheet-backdrop" role="presentation" onClick={closeEditor}>
          <section className="gkit-money-sheet" role="dialog" aria-modal="true" aria-label={creatingPayment ? 'Novo pagamento' : 'Editar pagamento'} onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <p>Pagamento</p>
                <h2>{creatingPayment ? 'Novo pagamento' : 'Editar detalhe'}</h2>
              </div>
              <button type="button" aria-label="Fechar" onClick={closeEditor}>
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
            <label>
              Conta
              <select
                value={form.moneyContaId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    moneyContaId: event.target.value,
                    moneyDestinoId: current.moneyDestinoId === event.target.value ? '' : current.moneyDestinoId,
                  }))
                }
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Creditar saldo em
              <select value={form.moneyDestinoId} onChange={(event) => setForm((current) => ({ ...current, moneyDestinoId: event.target.value }))}>
                <option value="">Nenhuma conta</option>
                {accounts
                  .filter((account) => account.id !== form.moneyContaId)
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.nome}
                    </option>
                  ))}
              </select>
            </label>

            <button type="button" className="gkit-money-save" disabled={savingId === (editing?.id || 'new-payment') || (creatingPayment && !form.descricao.trim())} onClick={saveEditor}>
              {creatingPayment ? <Plus size={18} /> : <PencilLine size={18} />}
              {creatingPayment ? 'Adicionar' : 'Salvar'}
            </button>
          </section>
        </div>
      ) : null}
    </main>
  )
}
