import { getSupabaseAdmin } from '@/features/gkit-flex/audit'

export type MoneyAccount = {
  id: string
  nome: string
  status: 'ativo' | 'inativo' | string
  conta_principal: boolean
  ordem: number
  created_at?: string
  updated_at?: string
}

const DEFAULT_MAIN_ACCOUNT: MoneyAccount = {
  id: '00000000-0000-0000-0000-000000000001',
  nome: 'Genske Advogados',
  status: 'ativo',
  conta_principal: true,
  ordem: 0,
}

function isMissingAccountsTableError(error: unknown) {
  const record = error as { code?: string; message?: string } | null
  const message = String(record?.message || '').toLowerCase()
  return record?.code === '42P01' || (message.includes('gkit_money_contas') && (message.includes('relation') || message.includes('schema cache')))
}

function normalizeAccount(row: Record<string, unknown>): MoneyAccount {
  return {
    id: String(row.id),
    nome: String(row.nome || ''),
    status: String(row.status || 'ativo'),
    conta_principal: Boolean(row.conta_principal),
    ordem: Number(row.ordem || 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  }
}

export async function listMoneyAccounts() {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase não configurado.')

  const { data, error } = await supabase
    .from('gkit_money_contas')
    .select('id, nome, status, conta_principal, ordem, created_at, updated_at')
    .eq('status', 'ativo')
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })

  if (error && isMissingAccountsTableError(error)) return [DEFAULT_MAIN_ACCOUNT]
  if (error) throw new Error(`Erro ao listar contas do Money: ${error.message}`)
  return (data || []).map((row) => normalizeAccount(row as Record<string, unknown>))
}

export async function createMoneyAccount(input: { nome: string }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase não configurado.')

  const nome = String(input.nome || '').replace(/\s+/g, ' ').trim()
  if (!nome) throw new Error('Nome da conta é obrigatório.')

  const { data: existing, error: existingError } = await supabase
    .from('gkit_money_contas')
    .select('id, nome, status, conta_principal, ordem, created_at, updated_at')
    .ilike('nome', nome)
    .maybeSingle()

  if (existingError && isMissingAccountsTableError(existingError)) {
    throw new Error('A migration do gkit-money ainda precisa ser aplicada para criar novas contas.')
  }
  if (existingError) throw new Error(`Erro ao consultar conta: ${existingError.message}`)

  if (existing) {
    if (existing.status === 'ativo') throw new Error('Já existe uma conta com esse nome.')

    const { data, error } = await supabase
      .from('gkit_money_contas')
      .update({ status: 'ativo', updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('id, nome, status, conta_principal, ordem, created_at, updated_at')
      .single()

    if (error) throw new Error(`Erro ao reativar conta: ${error.message}`)
    return normalizeAccount(data as Record<string, unknown>)
  }

  const { data: lastAccount } = await supabase
    .from('gkit_money_contas')
    .select('ordem')
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const ordem = Number(lastAccount?.ordem || 0) + 10
  const { data, error } = await supabase
    .from('gkit_money_contas')
    .insert({ nome, ordem, conta_principal: false })
    .select('id, nome, status, conta_principal, ordem, created_at, updated_at')
    .single()

  if (error) throw new Error(`Erro ao criar conta: ${error.message}`)
  return normalizeAccount(data as Record<string, unknown>)
}
