'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getGkitJurSaneamentoSuggestions } from './queries'
import { refreshGkitJurIntelligentSummaryMonitor, refreshGkitJurProcessSummary } from './summary-service'
import { runGkitJurSync } from './sync-runner'

function admin() {
  return createSupabaseAdminClient() as any
}

async function requireGkitJurWrite(permission = 'gkit_jur.processos.write') {
  const context = await requireModuleAccess('gkit-jur')
  if (!canAccess(context.permissions, permission)) {
    throw new Error('Usuário sem permissão para alterar processos no GKIT Jur.')
  }
  return context
}

async function requireGkitJurPublicationWrite() {
  const context = await requireModuleAccess('gkit-jur')
  if (!canAccess(context.permissions, 'gkit_jur.publicacoes.write') && !canAccess(context.permissions, 'gkit_jur.processos.write')) {
    throw new Error('Usuario sem permissao para tratar publicacoes no GKIT Jur.')
  }
  return context
}

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function valueText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function optionalUuid(formData: FormData, key: string) {
  const value = text(formData, key)
  return value || null
}

function requiredText(formData: FormData, key: string, label: string) {
  const value = text(formData, key)
  if (!value) throw new Error(`${label} e obrigatorio.`)
  return value
}

function allowed<T extends string>(value: string, values: readonly T[], fallback: T): T {
  return values.includes(value as T) ? (value as T) : fallback
}

function positiveInt(value: string, fallback: number, max: number) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

function optionalInt(value: string) {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function moneyCents(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error('Valor invalido.')
  return Math.round(parsed * 100)
}

function dateOnly(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} e obrigatorio.`)
  return value
}

function monthlyDueDate(firstDueDate: string, monthOffset: number, dueDay: number) {
  const [year, month] = firstDueDate.split('-').map((part) => Number.parseInt(part, 10))
  const target = new Date(Date.UTC(year, month - 1 + monthOffset, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  const day = Math.min(dueDay, lastDay)
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function addDays(dateOnlyValue: string, days: number) {
  const [year, month, day] = dateOnlyValue.split('-').map((part) => Number.parseInt(part, 10))
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function optionalEmail(value: string) {
  const current = value.trim().toLowerCase()
  if (!current) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current)) throw new Error('E-mail de lembrete invalido.')
  return current
}

function reminderDays(value: string) {
  const parsed = [...new Set(value
    .split(/[,\n;]/)
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item) && item >= -30 && item <= 60))]
    .sort((a, b) => a - b)
  return parsed.length ? parsed.slice(0, 12) : [-5, -1, 0, 3, 7]
}

function reminderType(days: number) {
  if (days < 0) return 'antes_vencimento'
  if (days === 0) return 'no_vencimento'
  return 'apos_vencimento'
}

function reminderSubject(parcelaNumero: number) {
  return `Lembrete de pagamento - acordo judicial - parcela ${parcelaNumero}`
}

function reminderBody(input: {
  numeroCnj?: string
  parcelaNumero: number
  valor: string | number
  vencimento: string
}) {
  const valor = typeof input.valor === 'number' ? input.valor.toFixed(2) : String(input.valor)
  return [
    'Prezado(a),',
    '',
    `Lembramos o pagamento da parcela ${input.parcelaNumero} do acordo judicial${input.numeroCnj ? ` do processo ${formatCnjForAction(input.numeroCnj)}` : ''}.`,
    `Valor: R$ ${valor.replace('.', ',')}`,
    `Vencimento: ${input.vencimento.split('-').reverse().join('/')}`,
    '',
    'Caso o pagamento ja tenha sido realizado, por favor desconsidere este lembrete.',
  ].join('\n')
}

async function syncGkitJurAcordoEmailReminders(input: {
  acordoId: string
  active: boolean
  days: number[]
  email: string | null
  numeroCnj?: string
  parcelas?: Array<Record<string, unknown>>
  usuarioId: string
}) {
  const parcelasResult = input.parcelas ? null : await admin()
    .schema('gkit_jur')
    .from('acordo_parcelas')
    .select('id,numero,valor,vencimento,status')
    .eq('acordo_id', input.acordoId)
    .order('numero', { ascending: true })

  if (parcelasResult?.error) throw new Error(parcelasResult.error.message)
  const parcelas = input.parcelas ?? ((parcelasResult?.data ?? []) as Array<Record<string, unknown>>)

  const pendingParcelas = parcelas.filter((parcela) => valueText(parcela.status, 'pendente') === 'pendente')

  const deleteResult = await admin()
    .schema('gkit_jur')
    .from('acordo_lembretes_email')
    .delete()
    .eq('acordo_id', input.acordoId)
    .eq('status', 'pendente')

  if (deleteResult.error && !['42P01', 'PGRST205'].includes(String(deleteResult.error.code))) {
    throw new Error(deleteResult.error.message)
  }

  if (!input.active || !pendingParcelas.length) return

  const existingResult = await admin()
    .schema('gkit_jur')
    .from('acordo_lembretes_email')
    .select('parcela_id,dias_referencia')
    .eq('acordo_id', input.acordoId)

  if (existingResult.error && !['42P01', 'PGRST205'].includes(String(existingResult.error.code))) {
    throw new Error(existingResult.error.message)
  }

  const existing = new Set(((existingResult.data ?? []) as Array<Record<string, unknown>>)
    .map((row) => `${valueText(row.parcela_id)}:${Number.parseInt(String(row.dias_referencia), 10)}`))

  const rows = pendingParcelas.flatMap((parcela) => {
    const parcelaId = valueText(parcela.id)
    const numero = Number.parseInt(String(parcela.numero ?? '0'), 10)
    const vencimento = valueText(parcela.vencimento)
    if (!parcelaId || !numero || !vencimento) return []
    return input.days
      .filter((days) => !existing.has(`${parcelaId}:${days}`))
      .map((days) => ({
        acordo_id: input.acordoId,
        parcela_id: parcelaId,
        dias_referencia: days,
        tipo: reminderType(days),
        agendado_para: addDays(vencimento, days),
        destinatario_email: input.email,
        assunto: reminderSubject(numero),
        corpo: reminderBody({
          numeroCnj: input.numeroCnj,
          parcelaNumero: numero,
          valor: parcela.valor as string | number,
          vencimento,
        }),
        status: 'pendente',
        criado_por: input.usuarioId,
        updated_at: new Date().toISOString(),
      }))
  })

  if (!rows.length) return
  const insertResult = await admin().schema('gkit_jur').from('acordo_lembretes_email').insert(rows)
  if (insertResult.error) throw new Error(insertResult.error.message)
}

function formatCnjForAction(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 20) return value
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`
}

function termsList(value: string) {
  return [...new Set(value
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter(Boolean))]
}

function colorHex(value: string) {
  const current = value.trim()
  return /^#[0-9A-Fa-f]{6}$/.test(current) ? current.toLowerCase() : '#64748b'
}

function selectedIds(formData: FormData, key: string) {
  return [...new Set(formData.getAll(key)
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean))]
}

function safeReturnTo(formData: FormData, fallback: string) {
  const value = text(formData, 'return_to')
  if (value.startsWith('/modulos/gkit-jur')) return value
  return fallback
}

function withParams(path: string, params: URLSearchParams, hash = '') {
  const [pathWithoutHash] = path.split('#')
  const [pathname] = pathWithoutHash.split('?')
  return `${pathname}?${params.toString()}${hash}`
}

function revalidateGkitJur() {
  revalidatePath('/modulos/gkit-jur')
  revalidatePath('/modulos/gkit-jur/acordos')
  revalidatePath('/modulos/gkit-jur/inbox')
  revalidatePath('/modulos/gkit-jur/publicacoes')
  revalidatePath('/modulos/gkit-jur/agente')
  revalidatePath('/modulos/gkit-jur/processos')
  revalidatePath('/modulos/gkit-jur/pendencias')
}

async function defaultCarteiraId() {
  const result = await admin()
    .schema('core')
    .from('carteiras')
    .select('id')
    .eq('nome_normalizado', 'genske advogados')
    .eq('status', 'ativo')
    .maybeSingle()

  if (result.error) throw new Error(result.error.message)
  return result.data?.id ?? null
}

async function getActiveJurProcess(processoId: string) {
  const processoResult = await admin()
    .schema('gkit_jur')
    .from('processos')
    .select('id,numero_cnj,carteira_id,responsavel_id,status')
    .eq('id', processoId)
    .single()

  if (processoResult.error || !processoResult.data) throw new Error('Processo não encontrado.')
  const processo = processoResult.data as Record<string, unknown>
  if (processo.status !== 'ativo') throw new Error('Ações operacionais só podem ser criadas para processos ativos.')
  return processo
}

export async function updateGkitJurProcessoAction(formData: FormData) {
  const context = await requireGkitJurWrite()
  const id = requiredText(formData, 'id', 'Processo')

  const payload = {
    cliente_id: optionalUuid(formData, 'cliente_id'),
    carteira_id: optionalUuid(formData, 'carteira_id'),
    responsavel_id: optionalUuid(formData, 'responsavel_id'),
    status: allowed(text(formData, 'status'), ['ativo', 'arquivado', 'suspenso', 'encerrado', 'erro'], 'ativo'),
    status_monitoramento: allowed(text(formData, 'status_monitoramento'), ['monitorando', 'pausado', 'erro', 'nao_monitorar'], 'monitorando'),
    observacoes: text(formData, 'observacoes') || null,
    atualizado_por: context.usuario.id,
    updated_at: new Date().toISOString(),
  }

  const { error } = await admin()
    .schema('gkit_jur')
    .from('processos')
    .update(payload)
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidateGkitJur()
  revalidatePath(`/modulos/gkit-jur/processos/${id}`)
  redirect(`/modulos/gkit-jur/processos/${id}`)
}

export async function saveGkitJurEtiquetaAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.admin.write')
  const id = text(formData, 'id')
  const payload = {
    nome: requiredText(formData, 'nome', 'Nome da etiqueta'),
    cor: colorHex(text(formData, 'cor') || '#64748b'),
    ativo: text(formData, 'ativo') === 'on',
    atualizado_por: context.usuario.id,
    updated_at: new Date().toISOString(),
  }

  const result = id
    ? await admin().schema('gkit_jur').from('etiquetas').update(payload).eq('id', id)
    : await admin().schema('gkit_jur').from('etiquetas').insert({ ...payload, criado_por: context.usuario.id })

  if (result.error) throw new Error(result.error.message)

  revalidateGkitJur()
  revalidatePath('/modulos/gkit-jur/configuracoes')
  revalidatePath('/modulos/gkit-jur/configuracoes/etiquetas')
  redirect('/modulos/gkit-jur/configuracoes/etiquetas?saved=ok')
}

export async function updateGkitJurProcessoEtiquetaAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.processos.write')
  const processoId = requiredText(formData, 'processo_id', 'Processo')
  const etiquetaId = requiredText(formData, 'etiqueta_id', 'Etiqueta')
  const mode = allowed(text(formData, 'mode'), ['add', 'remove'] as const, 'add')
  const target = safeReturnTo(formData, `/modulos/gkit-jur/processos/${processoId}`)

  const result = mode === 'remove'
    ? await admin()
      .schema('gkit_jur')
      .from('processo_etiquetas')
      .delete()
      .eq('processo_id', processoId)
      .eq('etiqueta_id', etiquetaId)
    : await admin()
      .schema('gkit_jur')
      .from('processo_etiquetas')
      .upsert({ processo_id: processoId, etiqueta_id: etiquetaId, criado_por: context.usuario.id }, { onConflict: 'processo_id,etiqueta_id' })

  if (result.error) throw new Error(result.error.message)

  revalidateGkitJur()
  revalidatePath(`/modulos/gkit-jur/processos/${processoId}`)
  redirect(target)
}

export async function bulkUpdateGkitJurProcessoEtiquetasAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.processos.write')
  const processoIds = selectedIds(formData, 'processo_id')
  const etiquetaId = requiredText(formData, 'etiqueta_id', 'Etiqueta')
  const mode = allowed(text(formData, 'mode'), ['add', 'remove'] as const, 'add')
  const target = safeReturnTo(formData, '/modulos/gkit-jur/processos')

  if (!processoIds.length) redirect(target)

  const result = mode === 'remove'
    ? await admin()
      .schema('gkit_jur')
      .from('processo_etiquetas')
      .delete()
      .eq('etiqueta_id', etiquetaId)
      .in('processo_id', processoIds)
    : await admin()
      .schema('gkit_jur')
      .from('processo_etiquetas')
      .upsert(
        processoIds.map((processoId) => ({ processo_id: processoId, etiqueta_id: etiquetaId, criado_por: context.usuario.id })),
        { onConflict: 'processo_id,etiqueta_id' },
      )

  if (result.error) throw new Error(result.error.message)

  revalidateGkitJur()
  redirect(target)
}

export async function createGkitJurAcordoJudicialAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.processos.write')
  const processoId = requiredText(formData, 'processo_id', 'Processo')
  const processo = await getActiveJurProcess(processoId)
  const totalCents = moneyCents(requiredText(formData, 'valor_total', 'Valor total'))
  const quantidadeParcelas = positiveInt(text(formData, 'quantidade_parcelas'), 1, 240)
  const diaVencimento = positiveInt(text(formData, 'dia_vencimento'), 1, 31)
  const primeiroVencimento = dateOnly(text(formData, 'primeiro_vencimento'), 'Primeiro vencimento')
  const emailLembrete = optionalEmail(text(formData, 'email_lembrete'))
  const lembreteDias = reminderDays(text(formData, 'lembrete_dias'))
  const lembretesPagamentoAtivos = text(formData, 'lembretes_pagamento_ativos') !== 'off'
  const observacoes = text(formData, 'observacoes') || null

  const acordoResult = await admin()
    .schema('gkit_jur')
    .from('acordos_judiciais')
    .insert({
      processo_id: processoId,
      valor_total: (totalCents / 100).toFixed(2),
      quantidade_parcelas: quantidadeParcelas,
      dia_vencimento: diaVencimento,
      primeiro_vencimento: primeiroVencimento,
      status: 'ativo',
      email_lembrete: emailLembrete,
      lembrete_dias: lembreteDias,
      lembretes_pagamento_ativos: lembretesPagamentoAtivos,
      observacoes,
      criado_por: context.usuario.id,
      atualizado_por: context.usuario.id,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (acordoResult.error || !acordoResult.data) throw new Error(acordoResult.error?.message ?? 'Nao foi possivel criar o acordo.')

  const baseCents = Math.floor(totalCents / quantidadeParcelas)
  const remainder = totalCents - (baseCents * quantidadeParcelas)
  const parcelas = Array.from({ length: quantidadeParcelas }, (_, index) => {
    const parcelaCents = baseCents + (index === quantidadeParcelas - 1 ? remainder : 0)
    return {
      acordo_id: acordoResult.data.id,
      numero: index + 1,
      valor: (parcelaCents / 100).toFixed(2),
      vencimento: monthlyDueDate(primeiroVencimento, index, diaVencimento),
      status: 'pendente',
      atualizado_por: context.usuario.id,
      updated_at: new Date().toISOString(),
    }
  })

  const parcelasResult = await admin()
    .schema('gkit_jur')
    .from('acordo_parcelas')
    .insert(parcelas)
    .select('id,numero,valor,vencimento,status')
  if (parcelasResult.error) throw new Error(parcelasResult.error.message)

  await syncGkitJurAcordoEmailReminders({
    acordoId: acordoResult.data.id,
    active: lembretesPagamentoAtivos,
    days: lembreteDias,
    email: emailLembrete,
    numeroCnj: valueText(processo.numero_cnj),
    parcelas: (parcelasResult.data ?? []) as Array<Record<string, unknown>>,
    usuarioId: context.usuario.id,
  })

  await admin().schema('gkit_jur').from('eventos_operacionais').insert({
    user_id: context.usuario.id,
    entidade_tipo: 'acordo_judicial',
    entidade_id: acordoResult.data.id,
    acao: 'acordo_judicial_criado',
    descricao: 'Acordo judicial cadastrado no processo.',
    payload: {
      processo_id: processoId,
      processo_numero_cnj: processo.numero_cnj,
      quantidade_parcelas: quantidadeParcelas,
      valor_total: (totalCents / 100).toFixed(2),
    },
  })

  revalidateGkitJur()
  revalidatePath('/modulos/gkit-jur/acordos')
  revalidatePath(`/modulos/gkit-jur/processos/${processoId}`)
  redirect(safeReturnTo(formData, `/modulos/gkit-jur/processos/${processoId}#acordos`))
}

export async function updateGkitJurAcordoParcelaAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.processos.write')
  const parcelaId = requiredText(formData, 'parcela_id', 'Parcela')
  const nextStatus = allowed(text(formData, 'status'), ['pendente', 'paga', 'cancelada'] as const, 'paga')

  const parcelaResult = await admin()
    .schema('gkit_jur')
    .from('acordo_parcelas')
    .select('id,acordo_id,valor')
    .eq('id', parcelaId)
    .single()

  if (parcelaResult.error || !parcelaResult.data) throw new Error(parcelaResult.error?.message ?? 'Parcela nao encontrada.')
  const parcela = parcelaResult.data as Record<string, unknown>
  const acordoId = valueText(parcela.acordo_id)

  const acordoResult = await admin()
    .schema('gkit_jur')
    .from('acordos_judiciais')
    .select('id,processo_id')
    .eq('id', acordoId)
    .single()

  if (acordoResult.error || !acordoResult.data) throw new Error(acordoResult.error?.message ?? 'Acordo nao encontrado.')
  const processoId = valueText((acordoResult.data as Record<string, unknown>).processo_id)

  const payload: Record<string, unknown> = {
    status: nextStatus,
    atualizado_por: context.usuario.id,
    updated_at: new Date().toISOString(),
  }
  if (nextStatus === 'paga') {
    payload.pago_em = new Date().toISOString()
    payload.valor_pago = moneyCents(text(formData, 'valor_pago') || String(parcela.valor)) / 100
  } else {
    payload.pago_em = null
    payload.valor_pago = null
  }

  const updateResult = await admin().schema('gkit_jur').from('acordo_parcelas').update(payload).eq('id', parcelaId)
  if (updateResult.error) throw new Error(updateResult.error.message)

  const parcelasResult = await admin()
    .schema('gkit_jur')
    .from('acordo_parcelas')
    .select('status')
    .eq('acordo_id', acordoId)

  if (parcelasResult.error) throw new Error(parcelasResult.error.message)
  const statuses = ((parcelasResult.data ?? []) as Array<Record<string, unknown>>).map((row) => valueText(row.status))
  const allPaid = statuses.length > 0 && statuses.every((status) => status === 'paga')
  await admin()
    .schema('gkit_jur')
    .from('acordos_judiciais')
    .update({
      status: allPaid ? 'cumprido' : 'ativo',
      quitado_em: allPaid ? new Date().toISOString() : null,
      atualizado_por: context.usuario.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', acordoId)

  revalidateGkitJur()
  revalidatePath('/modulos/gkit-jur/acordos')
  if (processoId) revalidatePath(`/modulos/gkit-jur/processos/${processoId}`)
  redirect(safeReturnTo(formData, processoId ? `/modulos/gkit-jur/processos/${processoId}#acordos` : '/modulos/gkit-jur/acordos'))
}

export async function updateGkitJurAcordoStatusAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.processos.write')
  const acordoId = requiredText(formData, 'acordo_id', 'Acordo')
  const nextStatus = allowed(text(formData, 'status'), ['ativo', 'cumprido', 'quebrado', 'cancelado'] as const, 'ativo')

  const acordoResult = await admin()
    .schema('gkit_jur')
    .from('acordos_judiciais')
    .select('id,processo_id')
    .eq('id', acordoId)
    .single()

  if (acordoResult.error || !acordoResult.data) throw new Error(acordoResult.error?.message ?? 'Acordo nao encontrado.')
  const processoId = valueText((acordoResult.data as Record<string, unknown>).processo_id)
  const now = new Date().toISOString()
  const payload: Record<string, unknown> = {
    status: nextStatus,
    atualizado_por: context.usuario.id,
    updated_at: now,
  }
  if (nextStatus === 'quebrado') payload.quebrado_em = now
  if (nextStatus === 'cumprido') payload.quitado_em = now
  if (nextStatus === 'ativo') {
    payload.quebrado_em = null
    payload.quitado_em = null
  }

  const updateResult = await admin().schema('gkit_jur').from('acordos_judiciais').update(payload).eq('id', acordoId)
  if (updateResult.error) throw new Error(updateResult.error.message)

  await admin().schema('gkit_jur').from('eventos_operacionais').insert({
    user_id: context.usuario.id,
    entidade_tipo: 'acordo_judicial',
    entidade_id: acordoId,
    acao: 'acordo_judicial_status_atualizado',
    descricao: `Acordo judicial marcado como ${nextStatus}.`,
    payload: { processo_id: processoId, status: nextStatus },
  })

  revalidateGkitJur()
  revalidatePath('/modulos/gkit-jur/acordos')
  if (processoId) revalidatePath(`/modulos/gkit-jur/processos/${processoId}`)
  redirect(safeReturnTo(formData, processoId ? `/modulos/gkit-jur/processos/${processoId}#acordos` : '/modulos/gkit-jur/acordos'))
}

export async function updateGkitJurAcordoReguaEmailAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.processos.write')
  const acordoId = requiredText(formData, 'acordo_id', 'Acordo')
  const emailLembrete = optionalEmail(text(formData, 'email_lembrete'))
  const lembreteDias = reminderDays(text(formData, 'lembrete_dias'))
  const lembretesPagamentoAtivos = text(formData, 'lembretes_pagamento_ativos') === 'on'

  const acordoResult = await admin()
    .schema('gkit_jur')
    .from('acordos_judiciais')
    .select('id,processo_id')
    .eq('id', acordoId)
    .single()

  if (acordoResult.error || !acordoResult.data) throw new Error(acordoResult.error?.message ?? 'Acordo nao encontrado.')
  const acordo = acordoResult.data as Record<string, unknown>
  const processoId = valueText(acordo.processo_id)
  const processo = processoId ? await getActiveJurProcess(processoId) : null

  const updateResult = await admin()
    .schema('gkit_jur')
    .from('acordos_judiciais')
    .update({
      email_lembrete: emailLembrete,
      lembrete_dias: lembreteDias,
      lembretes_pagamento_ativos: lembretesPagamentoAtivos,
      atualizado_por: context.usuario.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', acordoId)

  if (updateResult.error) throw new Error(updateResult.error.message)

  await syncGkitJurAcordoEmailReminders({
    acordoId,
    active: lembretesPagamentoAtivos,
    days: lembreteDias,
    email: emailLembrete,
    numeroCnj: processo ? valueText(processo.numero_cnj) : undefined,
    usuarioId: context.usuario.id,
  })

  await admin().schema('gkit_jur').from('eventos_operacionais').insert({
    user_id: context.usuario.id,
    entidade_tipo: 'acordo_judicial',
    entidade_id: acordoId,
    acao: 'acordo_judicial_regua_email_atualizada',
    descricao: 'Regua de e-mails de lembrete do acordo judicial atualizada.',
    payload: {
      processo_id: processoId,
      email_lembrete: emailLembrete,
      lembrete_dias: lembreteDias,
      lembretes_pagamento_ativos: lembretesPagamentoAtivos,
    },
  })

  revalidateGkitJur()
  revalidatePath('/modulos/gkit-jur/acordos')
  if (processoId) revalidatePath(`/modulos/gkit-jur/processos/${processoId}`)
  redirect(safeReturnTo(formData, processoId ? `/modulos/gkit-jur/processos/${processoId}#acordos` : '/modulos/gkit-jur/acordos'))
}

export async function updateGkitJurAcordoLembreteEmailAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.processos.write')
  const lembreteId = requiredText(formData, 'lembrete_id', 'Lembrete')
  const nextStatus = allowed(text(formData, 'status'), ['pendente', 'enviado', 'cancelado', 'erro'] as const, 'enviado')

  const lembreteResult = await admin()
    .schema('gkit_jur')
    .from('acordo_lembretes_email')
    .select('id,acordo_id')
    .eq('id', lembreteId)
    .single()

  if (lembreteResult.error || !lembreteResult.data) throw new Error(lembreteResult.error?.message ?? 'Lembrete nao encontrado.')
  const acordoId = valueText((lembreteResult.data as Record<string, unknown>).acordo_id)

  const acordoResult = await admin()
    .schema('gkit_jur')
    .from('acordos_judiciais')
    .select('id,processo_id')
    .eq('id', acordoId)
    .single()

  if (acordoResult.error || !acordoResult.data) throw new Error(acordoResult.error?.message ?? 'Acordo nao encontrado.')
  const processoId = valueText((acordoResult.data as Record<string, unknown>).processo_id)
  const now = new Date().toISOString()
  const payload: Record<string, unknown> = {
    status: nextStatus,
    erro_mensagem: nextStatus === 'erro' ? (text(formData, 'erro_mensagem') || 'Falha registrada manualmente.') : null,
    updated_at: now,
  }

  if (nextStatus === 'enviado') {
    payload.enviado_em = now
    payload.enviado_por = context.usuario.id
  }
  if (nextStatus === 'pendente') {
    payload.enviado_em = null
    payload.enviado_por = null
  }

  const updateResult = await admin()
    .schema('gkit_jur')
    .from('acordo_lembretes_email')
    .update(payload)
    .eq('id', lembreteId)

  if (updateResult.error) throw new Error(updateResult.error.message)

  revalidateGkitJur()
  revalidatePath('/modulos/gkit-jur/acordos')
  if (processoId) revalidatePath(`/modulos/gkit-jur/processos/${processoId}`)
  redirect(safeReturnTo(formData, processoId ? `/modulos/gkit-jur/processos/${processoId}#acordos` : '/modulos/gkit-jur/acordos'))
}

export async function applyGkitJurSaneamentoSuggestionsAction(formData: FormData) {
  const context = await requireGkitJurWrite()
  const selected = new Set(selectedIds(formData, 'processo_id'))
  if (!selected.size) {
    redirect('/modulos/gkit-jur/pendencias')
  }

  const { suggestions } = await getGkitJurSaneamentoSuggestions(1500)
  const selectedSuggestions = suggestions.filter((suggestion) => selected.has(suggestion.processo.id))

  for (const suggestion of selectedSuggestions) {
    const payload: Record<string, unknown> = {
      atualizado_por: context.usuario.id,
      updated_at: new Date().toISOString(),
    }

    if (suggestion.clienteId) payload.cliente_id = suggestion.clienteId
    if (suggestion.carteiraId) payload.carteira_id = suggestion.carteiraId
    if (suggestion.responsavelId) payload.responsavel_id = suggestion.responsavelId

    if (Object.keys(payload).length <= 2) continue

    const { error } = await admin()
      .schema('gkit_jur')
      .from('processos')
      .update(payload)
      .eq('id', suggestion.processo.id)

    if (error) throw new Error(error.message)

    await refreshGkitJurProcessSummary(suggestion.processo.id)
  }

  revalidateGkitJur()
  redirect('/modulos/gkit-jur/pendencias')
}

export async function syncGkitJurDataJudAction(formData: FormData) {
  await requireGkitJurWrite('gkit_jur.processos.sync')
  const provider = allowed(text(formData, 'provider'), ['datajud', 'aasp', 'redundante'] as const, 'datajud')
  const tribunal = text(formData, 'tribunal')
  const limit = positiveInt(text(formData, 'limit'), 5, 25)
  const aaspDate = text(formData, 'aasp_data')
  const aaspDiferencial = text(formData, 'aasp_diferencial') === 'on'
  const result = await runGkitJurSync({
    aaspData: aaspDate || undefined,
    aaspDiferencial,
    dataJudBatchLimit: limit,
    maxDataJudBatches: 1,
    provider,
    tribunal: tribunal && tribunal !== 'todos' ? tribunal : undefined,
    timeBudgetMs: 240_000,
  })

  revalidateGkitJur()
  revalidatePath('/modulos/gkit-jur/configuracoes/integracao')
  revalidatePath('/modulos/gkit-jur/auditoria')
  revalidatePath('/modulos/gkit-jur/movimentacoes')

  const params = new URLSearchParams({
    erros: String(result.erro),
    novas: String(result.movimentosNovos),
    processos: String(result.processos),
    sem_resultado: String(result.semResultado),
    sync: 'ok',
    tarefas: String(result.tarefasGeradas),
  })

  redirect(`/modulos/gkit-jur/configuracoes/integracao?${params.toString()}`)
}

export async function syncGkitJurProcessNowAction(formData: FormData) {
  await requireGkitJurWrite('gkit_jur.processos.sync')
  const processoId = requiredText(formData, 'processo_id', 'Processo')
  await getActiveJurProcess(processoId)

  const target = safeReturnTo(formData, `/modulos/gkit-jur/processos/${processoId}`)
  let result
  let errorMessage = ''

  try {
    result = await runGkitJurSync({
      dataJudBatchLimit: 1,
      dataJudMaxTransientErrors: 1,
      maxDataJudBatches: 1,
      processoId,
      provider: 'datajud',
      timeBudgetMs: 120_000,
    })
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Erro inesperado ao atualizar o processo.'
  }

  revalidateGkitJur()
  revalidatePath(`/modulos/gkit-jur/processos/${processoId}`)
  revalidatePath('/modulos/gkit-jur/auditoria')
  revalidatePath('/modulos/gkit-jur/movimentacoes')

  const params = new URLSearchParams({
    erros: String(result?.erro ?? 1),
    novas: String(result?.movimentosNovos ?? 0),
    processos: String(result?.processos ?? 0),
    sem_resultado: String(result?.semResultado ?? 0),
    sync_processo: errorMessage ? 'erro' : 'ok',
    tarefas: String(result?.tarefasGeradas ?? 0),
  })
  if (errorMessage) params.set('mensagem', errorMessage.slice(0, 180))

  redirect(withParams(target, params))
}

export async function saveGkitJurMovimentacaoTarefaRegraAction(formData: FormData) {
  await requireGkitJurWrite('gkit_jur.admin.write')
  const id = text(formData, 'id')
  const payload = {
    nome: requiredText(formData, 'nome', 'Nome da regra'),
    descricao: text(formData, 'descricao') || null,
    codigo_movimento: optionalInt(text(formData, 'codigo_movimento')),
    termos: termsList(text(formData, 'termos')),
    tipo_tarefa: allowed(text(formData, 'tipo_tarefa'), ['prazo', 'publicacao', 'movimentacao_relevante', 'documento_pendente', 'providencia_interna', 'audiencia', 'cumprimento', 'revisao'], 'providencia_interna'),
    prioridade: allowed(text(formData, 'prioridade'), ['critica', 'alta', 'media', 'baixa'], 'media'),
    titulo_template: requiredText(formData, 'titulo_template', 'Titulo da tarefa'),
    descricao_template: text(formData, 'descricao_template') || null,
    prazo_dias: optionalInt(text(formData, 'prazo_dias')),
    gerar_automaticamente: text(formData, 'gerar_automaticamente') === 'on',
    ativo: text(formData, 'ativo') === 'on',
    updated_at: new Date().toISOString(),
  }

  const result = id
    ? await admin().schema('gkit_jur').from('movimentacao_tarefa_regras').update(payload).eq('id', id)
    : await admin().schema('gkit_jur').from('movimentacao_tarefa_regras').insert(payload)

  if (result.error) throw new Error(result.error.message)

  revalidatePath('/modulos/gkit-jur/configuracoes')
  revalidatePath('/modulos/gkit-jur/configuracoes/movimentacao-tarefa')
  redirect('/modulos/gkit-jur/configuracoes/movimentacao-tarefa?saved=ok')
}

export async function toggleGkitJurMovimentacaoTarefaRegraAction(formData: FormData) {
  await requireGkitJurWrite('gkit_jur.admin.write')
  const id = requiredText(formData, 'id', 'Regra')
  const ativo = text(formData, 'ativo') === 'true'
  const { error } = await admin()
    .schema('gkit_jur')
    .from('movimentacao_tarefa_regras')
    .update({ ativo, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/gkit-jur/configuracoes/movimentacao-tarefa')
  redirect('/modulos/gkit-jur/configuracoes/movimentacao-tarefa?saved=ok')
}

export async function updateGkitJurPublicacaoTratamentoAction(formData: FormData) {
  const context = await requireGkitJurPublicationWrite()
  const publicacaoId = requiredText(formData, 'publicacao_id', 'Publicacao')
  const nextStatus = allowed(text(formData, 'status'), ['pendente', 'triada_ia', 'em_tratamento', 'tratada', 'dispensada', 'duplicada', 'erro'], 'em_tratamento')
  const decisao = allowed(text(formData, 'decisao_tratamento'), ['gerar_prazo', 'gerar_tarefa', 'registrar_ciencia', 'vincular_documento', 'atualizar_resumo', 'dispensar_sem_acao', 'marcar_duplicada', 'revisar_cadastro_processo', ''], '')
  const motivo = text(formData, 'motivo_tratamento')
  const createTask = text(formData, 'criar_tarefa') === 'on' || ['gerar_prazo', 'gerar_tarefa'].includes(decisao)
  const prazo = text(formData, 'prazo_at')

  const currentResult = await admin()
    .schema('gkit_jur')
    .from('publicacoes_monitoradas')
    .select('id,processo_id,numero_cnj_limpo,fonte,texto_preview,tarefa_id')
    .eq('id', publicacaoId)
    .single()

  if (currentResult.error || !currentResult.data) throw new Error(currentResult.error?.message ?? 'Publicacao nao encontrada.')
  const current = currentResult.data as Record<string, unknown>
  const processoId = valueText(current.processo_id)
  let tarefaId = valueText(current.tarefa_id) || null

  if (createTask && !tarefaId) {
    if (!processoId) throw new Error('Vincule a publicacao a um processo antes de gerar tarefa.')
    const processo = await getActiveJurProcess(processoId)
    const tarefaPayload = {
      processo_id: processoId,
      carteira_id: (processo.carteira_id as string | null) || await defaultCarteiraId(),
      responsavel_id: (processo.responsavel_id as string | null) || null,
      tipo: decisao === 'gerar_prazo' ? 'prazo' : 'publicacao',
      titulo: decisao === 'gerar_prazo' ? 'Analisar prazo de publicacao' : 'Tratar publicacao/intimacao',
      descricao: [
        `Publicacao capturada por ${valueText(current.fonte, 'fonte externa')}.`,
        `Processo ${formatCnjForAction(valueText(current.numero_cnj_limpo))}.`,
        valueText(current.texto_preview),
        motivo ? `Observacao: ${motivo}` : '',
      ].filter(Boolean).join('\n\n'),
      prioridade: decisao === 'gerar_prazo' ? 'alta' : 'media',
      prazo_at: prazo ? new Date(prazo).toISOString() : null,
      origem: 'publicacao_monitorada',
      origem_id: publicacaoId,
      origem_hash: `publicacao_monitorada:${publicacaoId}`,
      payload: { publicacao_id: publicacaoId, decisao_tratamento: decisao || null },
      criado_por: context.usuario.id,
      atualizado_por: context.usuario.id,
      updated_at: new Date().toISOString(),
    }

    const tarefaResult = await admin()
      .schema('gkit_jur')
      .from('tarefas')
      .insert(tarefaPayload)
      .select('id')
      .single()

    if (tarefaResult.error || !tarefaResult.data) throw new Error(tarefaResult.error?.message ?? 'Nao foi possivel criar tarefa para a publicacao.')
    tarefaId = String(tarefaResult.data.id)
  }

  const treated = ['tratada', 'dispensada', 'duplicada'].includes(nextStatus)
  const updatePayload: Record<string, unknown> = {
    atualizado_por: context.usuario.id,
    decisao_tratamento: decisao || null,
    motivo_tratamento: motivo || null,
    status: nextStatus,
    tarefa_id: tarefaId,
    updated_at: new Date().toISOString(),
  }
  if (treated) {
    updatePayload.tratado_por = context.usuario.id
    updatePayload.tratado_em = new Date().toISOString()
  }

  const updateResult = await admin()
    .schema('gkit_jur')
    .from('publicacoes_monitoradas')
    .update(updatePayload)
    .eq('id', publicacaoId)

  if (updateResult.error) throw new Error(updateResult.error.message)

  await admin().schema('gkit_jur').from('eventos_operacionais').insert({
    user_id: context.usuario.id,
    entidade_tipo: 'publicacao_monitorada',
    entidade_id: publicacaoId,
    acao: 'publicacao_tratamento_atualizado',
    descricao: `Publicacao marcada como ${nextStatus}.`,
    payload: { decisao_tratamento: decisao || null, processo_id: processoId || null, tarefa_id: tarefaId },
  })

  revalidateGkitJur()
  if (processoId) revalidatePath(`/modulos/gkit-jur/processos/${processoId}`)
  redirect(safeReturnTo(formData, '/modulos/gkit-jur/publicacoes?saved=ok'))
}

export async function createGkitJurTarefaAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.processos.write')
  const processoId = requiredText(formData, 'processo_id', 'Processo')
  const processo = await getActiveJurProcess(processoId)

  const carteiraId = optionalUuid(formData, 'carteira_id') || (processo.carteira_id as string | null) || await defaultCarteiraId()
  const responsavelId = optionalUuid(formData, 'responsavel_id') || (processo.responsavel_id as string | null) || null
  const prazo = text(formData, 'prazo_at')

  const payload = {
    processo_id: processoId,
    carteira_id: carteiraId,
    responsavel_id: responsavelId,
    tipo: allowed(text(formData, 'tipo'), ['prazo', 'publicacao', 'movimentacao_relevante', 'documento_pendente', 'providencia_interna', 'audiencia', 'cumprimento', 'revisao'], 'providencia_interna'),
    titulo: requiredText(formData, 'titulo', 'Título da tarefa'),
    descricao: text(formData, 'descricao') || null,
    prioridade: allowed(text(formData, 'prioridade'), ['critica', 'alta', 'media', 'baixa'], 'media'),
    prazo_at: prazo ? new Date(prazo).toISOString() : null,
    origem: 'manual',
    payload: { origem: 'manual', processo_numero_cnj: processo.numero_cnj },
    criado_por: context.usuario.id,
    atualizado_por: context.usuario.id,
    updated_at: new Date().toISOString(),
  }

  const insertResult = await admin()
    .schema('gkit_jur')
    .from('tarefas')
    .insert(payload)
    .select('id')
    .single()

  if (insertResult.error || !insertResult.data) throw new Error(insertResult.error?.message ?? 'Não foi possível criar tarefa.')

  await admin().schema('gkit_jur').from('eventos_operacionais').insert({
    user_id: context.usuario.id,
    entidade_tipo: 'tarefa',
    entidade_id: insertResult.data.id,
    acao: 'tarefa_criada',
    descricao: 'Tarefa jurídica manual criada.',
    payload: { processo_id: processoId, titulo: payload.titulo },
  })

  revalidateGkitJur()
  revalidatePath(`/modulos/gkit-jur/processos/${processoId}`)
  redirect(safeReturnTo(formData, `/modulos/gkit-jur/processos/${processoId}#tarefas`))
}

export async function createGkitJurTarefaFromReferenceAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.processos.write')
  const processoId = requiredText(formData, 'processo_id', 'Processo')
  const sourceTipo = allowed(text(formData, 'source_tipo'), ['documento', 'evento'], 'evento')
  const sourceId = requiredText(formData, 'source_id', 'Origem')
  const processo = await getActiveJurProcess(processoId)
  const prazo = text(formData, 'prazo_at')
  const sourceTitle = requiredText(formData, 'source_title', 'Título de origem')

  const payload = {
    processo_id: processoId,
    carteira_id: optionalUuid(formData, 'carteira_id') || (processo.carteira_id as string | null) || await defaultCarteiraId(),
    responsavel_id: optionalUuid(formData, 'responsavel_id') || (processo.responsavel_id as string | null) || null,
    tipo: allowed(text(formData, 'tipo'), ['prazo', 'publicacao', 'movimentacao_relevante', 'documento_pendente', 'providencia_interna', 'audiencia', 'cumprimento', 'revisao'], sourceTipo === 'documento' ? 'documento_pendente' : 'providencia_interna'),
    titulo: text(formData, 'titulo') || `Providenciar: ${sourceTitle}`,
    descricao: text(formData, 'descricao') || `Gerada a partir de ${sourceTipo}: ${sourceTitle}`,
    prioridade: allowed(text(formData, 'prioridade'), ['critica', 'alta', 'media', 'baixa'], 'media'),
    prazo_at: prazo ? new Date(prazo).toISOString() : null,
    origem: sourceTipo,
    origem_id: sourceId,
    payload: {
      origem: sourceTipo,
      origem_id: sourceId,
      origem_titulo: sourceTitle,
      processo_numero_cnj: processo.numero_cnj,
    },
    criado_por: context.usuario.id,
    atualizado_por: context.usuario.id,
    updated_at: new Date().toISOString(),
  }

  const insertResult = await admin()
    .schema('gkit_jur')
    .from('tarefas')
    .insert(payload)
    .select('id')
    .single()

  if (insertResult.error || !insertResult.data) throw new Error(insertResult.error?.message ?? 'Não foi possível gerar tarefa.')

  await admin().schema('gkit_jur').from('eventos_operacionais').insert({
    user_id: context.usuario.id,
    entidade_tipo: 'tarefa',
    entidade_id: insertResult.data.id,
    acao: 'tarefa_gerada_por_referencia',
    descricao: `Tarefa jurídica gerada a partir de ${sourceTipo}.`,
    payload: { processo_id: processoId, origem_tipo: sourceTipo, origem_id: sourceId, titulo: payload.titulo },
  })

  revalidateGkitJur()
  revalidatePath(`/modulos/gkit-jur/processos/${processoId}`)
  redirect(safeReturnTo(formData, `/modulos/gkit-jur/processos/${processoId}#tarefas`))
}

export async function updateGkitJurTarefaStatusAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.processos.write')
  const tarefaId = requiredText(formData, 'tarefa_id', 'Tarefa')
  const processoId = requiredText(formData, 'processo_id', 'Processo')
  const nextStatus = allowed(text(formData, 'status'), ['aberta', 'em_andamento', 'aguardando_terceiro', 'concluida', 'cancelada'], 'em_andamento')
  const done = ['concluida', 'cancelada'].includes(nextStatus)

  const payload: Record<string, unknown> = {
    status: nextStatus,
    atualizado_por: context.usuario.id,
    updated_at: new Date().toISOString(),
  }
  if (done) {
    payload.concluido_por = context.usuario.id
    payload.concluded_at = new Date().toISOString()
  } else {
    payload.concluido_por = null
    payload.concluded_at = null
  }

  const updateResult = await admin()
    .schema('gkit_jur')
    .from('tarefas')
    .update(payload)
    .eq('id', tarefaId)
    .eq('processo_id', processoId)

  if (updateResult.error) throw new Error(updateResult.error.message)

  await admin().schema('gkit_jur').from('eventos_operacionais').insert({
    user_id: context.usuario.id,
    entidade_tipo: 'tarefa',
    entidade_id: tarefaId,
    acao: 'tarefa_status_atualizado',
    descricao: `Status da tarefa atualizado para ${nextStatus}.`,
    payload: { processo_id: processoId, status: nextStatus },
  })

  revalidateGkitJur()
  revalidatePath(`/modulos/gkit-jur/processos/${processoId}`)
  redirect(safeReturnTo(formData, `/modulos/gkit-jur/processos/${processoId}#tarefas`))
}

export async function updateGkitJurTarefaPlanejamentoAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.processos.write')
  const tarefaId = requiredText(formData, 'tarefa_id', 'Tarefa')
  const processoId = requiredText(formData, 'processo_id', 'Processo')
  const processo = await getActiveJurProcess(processoId)
  const prazo = text(formData, 'prazo_at')
  const prioridade = text(formData, 'prioridade')

  const payload: Record<string, unknown> = {
    responsavel_id: optionalUuid(formData, 'responsavel_id') || (processo.responsavel_id as string | null) || null,
    prazo_at: prazo ? new Date(prazo).toISOString() : null,
    atualizado_por: context.usuario.id,
    updated_at: new Date().toISOString(),
  }

  if (prioridade) {
    payload.prioridade = allowed(prioridade, ['critica', 'alta', 'media', 'baixa'], 'media')
  }

  const updateResult = await admin()
    .schema('gkit_jur')
    .from('tarefas')
    .update(payload)
    .eq('id', tarefaId)
    .eq('processo_id', processoId)

  if (updateResult.error) throw new Error(updateResult.error.message)

  await admin().schema('gkit_jur').from('eventos_operacionais').insert({
    user_id: context.usuario.id,
    entidade_tipo: 'tarefa',
    entidade_id: tarefaId,
    acao: 'tarefa_planejamento_atualizado',
    descricao: 'Planejamento da tarefa jurídica atualizado.',
    payload: {
      processo_id: processoId,
      prazo_at: payload.prazo_at,
      prioridade: payload.prioridade,
      responsavel_id: payload.responsavel_id,
    },
  })

  revalidateGkitJur()
  revalidatePath(`/modulos/gkit-jur/processos/${processoId}`)
  redirect(safeReturnTo(formData, `/modulos/gkit-jur/processos/${processoId}#tarefas`))
}

export async function createGkitJurDocumentoAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.processos.write')
  const processoId = requiredText(formData, 'processo_id', 'Processo')
  const processo = await getActiveJurProcess(processoId)
  const dataDocumento = text(formData, 'data_documento')

  const payload = {
    processo_id: processoId,
    carteira_id: optionalUuid(formData, 'carteira_id') || (processo.carteira_id as string | null) || await defaultCarteiraId(),
    responsavel_id: optionalUuid(formData, 'responsavel_id') || (processo.responsavel_id as string | null) || null,
    tipo: allowed(text(formData, 'tipo'), ['peticao', 'publicacao', 'decisao', 'ata', 'comprovante', 'documento_interno', 'contrato', 'procuracao', 'outro'], 'documento_interno'),
    titulo: requiredText(formData, 'titulo', 'Título do documento'),
    descricao: text(formData, 'descricao') || null,
    data_documento: dataDocumento ? new Date(dataDocumento).toISOString() : null,
    url_externa: text(formData, 'url_externa') || null,
    origem: 'manual',
    payload: { origem: 'manual', processo_numero_cnj: processo.numero_cnj },
    criado_por: context.usuario.id,
    atualizado_por: context.usuario.id,
    updated_at: new Date().toISOString(),
  }

  const insertResult = await admin()
    .schema('gkit_jur')
    .from('documentos')
    .insert(payload)
    .select('id')
    .single()

  if (insertResult.error || !insertResult.data) throw new Error(insertResult.error?.message ?? 'Não foi possível registrar documento.')

  await admin().schema('gkit_jur').from('eventos_operacionais').insert({
    user_id: context.usuario.id,
    entidade_tipo: 'documento',
    entidade_id: insertResult.data.id,
    acao: 'documento_registrado',
    descricao: 'Documento jurídico registrado no processo.',
    payload: { processo_id: processoId, titulo: payload.titulo },
  })

  revalidateGkitJur()
  revalidatePath(`/modulos/gkit-jur/processos/${processoId}`)
  redirect(`/modulos/gkit-jur/processos/${processoId}#documentos`)
}

export async function createGkitJurEventoProcessoAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.processos.write')
  const processoId = requiredText(formData, 'processo_id', 'Processo')
  const processo = await getActiveJurProcess(processoId)
  const dataEvento = text(formData, 'data_evento')

  const payload = {
    processo_id: processoId,
    carteira_id: optionalUuid(formData, 'carteira_id') || (processo.carteira_id as string | null) || await defaultCarteiraId(),
    responsavel_id: optionalUuid(formData, 'responsavel_id') || (processo.responsavel_id as string | null) || null,
    tipo: allowed(text(formData, 'tipo'), ['publicacao', 'intimacao', 'despacho', 'decisao', 'audiencia', 'prazo', 'protocolo', 'contato', 'providencia_interna', 'documento', 'nota'], 'providencia_interna'),
    titulo: requiredText(formData, 'titulo', 'Título do evento'),
    descricao: text(formData, 'descricao') || null,
    data_evento: dataEvento ? new Date(dataEvento).toISOString() : new Date().toISOString(),
    origem: 'manual',
    payload: { origem: 'manual', processo_numero_cnj: processo.numero_cnj },
    criado_por: context.usuario.id,
    atualizado_por: context.usuario.id,
    updated_at: new Date().toISOString(),
  }

  const insertResult = await admin()
    .schema('gkit_jur')
    .from('eventos_processo')
    .insert(payload)
    .select('id')
    .single()

  if (insertResult.error || !insertResult.data) throw new Error(insertResult.error?.message ?? 'Não foi possível registrar evento.')

  await admin().schema('gkit_jur').from('eventos_operacionais').insert({
    user_id: context.usuario.id,
    entidade_tipo: 'evento_processo',
    entidade_id: insertResult.data.id,
    acao: 'evento_processo_registrado',
    descricao: 'Evento registrado na timeline do processo.',
    payload: { processo_id: processoId, titulo: payload.titulo },
  })

  revalidateGkitJur()
  revalidatePath(`/modulos/gkit-jur/processos/${processoId}`)
  redirect(`/modulos/gkit-jur/processos/${processoId}#timeline`)
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === 'on'
}

export async function createGkitJurAgenteFonteAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.admin.write')

  const payload = {
    carteira_id: optionalUuid(formData, 'carteira_id'),
    nome: requiredText(formData, 'nome', 'Nome da fonte'),
    tipo: allowed(text(formData, 'tipo'), ['portal_web', 'diario', 'email', 'api', 'interno'], 'portal_web'),
    url_base: text(formData, 'url_base') || null,
    exige_captcha: checkbox(formData, 'exige_captcha'),
    exige_2fa: checkbox(formData, 'exige_2fa'),
    observacoes: text(formData, 'observacoes') || null,
    criado_por: context.usuario.id,
    updated_at: new Date().toISOString(),
  }

  const { error } = await admin().schema('gkit_jur').from('agente_fontes').insert(payload)
  if (error) throw new Error(error.message)

  revalidateGkitJur()
  redirect('/modulos/gkit-jur/agente')
}

export async function createGkitJurAgenteReceitaAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.admin.write')
  const fonteId = optionalUuid(formData, 'fonte_id')

  const payload = {
    fonte_id: fonteId,
    carteira_id: optionalUuid(formData, 'carteira_id'),
    nome: requiredText(formData, 'nome', 'Nome da receita'),
    descricao: text(formData, 'descricao') || null,
    tipo_coleta: allowed(text(formData, 'tipo_coleta'), ['publicacao', 'movimentacao', 'documento', 'prazo', 'andamento', 'email'], 'movimentacao'),
    periodicidade: allowed(text(formData, 'periodicidade'), ['manual', 'diaria', 'horaria', 'semanal', 'mensal'], 'manual'),
    script_key: text(formData, 'script_key') || null,
    tipo_arquivo_esperado: allowed(text(formData, 'tipo_arquivo_esperado'), ['html', 'pdf', 'xlsx', 'csv', 'json', 'zip'], 'json'),
    criado_por: context.usuario.id,
    updated_at: new Date().toISOString(),
  }

  const { error } = await admin().schema('gkit_jur').from('agente_receitas').insert(payload)
  if (error) throw new Error(error.message)

  revalidateGkitJur()
  redirect('/modulos/gkit-jur/agente')
}

export async function runGkitJurAgenteReceitaAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.processos.sync')
  const receitaId = requiredText(formData, 'receita_id', 'Receita')

  const receitaResult = await admin()
    .schema('gkit_jur')
    .from('agente_receitas')
    .select('id,fonte_id,carteira_id,nome')
    .eq('id', receitaId)
    .single()

  if (receitaResult.error || !receitaResult.data) throw new Error('Receita do agente não encontrada.')
  const receita = receitaResult.data as Record<string, unknown>

  const insertResult = await admin()
    .schema('gkit_jur')
    .from('agente_execucoes')
    .insert({
      receita_id: receitaId,
      fonte_id: receita.fonte_id ?? null,
      carteira_id: receita.carteira_id ?? null,
      status: 'pendente',
      solicitado_por: context.usuario.id,
      payload: { origem: 'manual', nome_receita: receita.nome },
    })
    .select('id')
    .single()

  if (insertResult.error || !insertResult.data) throw new Error(insertResult.error?.message ?? 'Não foi possível criar execução.')

  await admin().schema('gkit_jur').from('agente_logs').insert({
    execucao_id: insertResult.data.id,
    nivel: 'info',
    step: 'fila',
    mensagem: 'Execução manual criada e aguardando worker.',
    payload: { solicitado_por: context.usuario.id },
  })

  await admin().schema('gkit_jur').from('eventos_operacionais').insert({
    user_id: context.usuario.id,
    entidade_tipo: 'agente_execucao',
    entidade_id: insertResult.data.id,
    acao: 'agente_execucao_criada',
    descricao: 'Execução manual do agente criada.',
    payload: { receita_id: receitaId },
  })

  revalidateGkitJur()
  redirect('/modulos/gkit-jur/agente')
}

export async function validateGkitJurAgenteExecucaoAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.processos.write')
  const execucaoId = requiredText(formData, 'execucao_id', 'Execução')
  const status = allowed(text(formData, 'status'), ['validado', 'rejeitado', 'reenviar_coleta', 'importado_manual'], 'validado')
  const observacao = text(formData, 'observacao') || null
  const nextStatus = status === 'validado' || status === 'importado_manual' ? 'sucesso' : status === 'reenviar_coleta' ? 'pendente' : 'precisa_intervencao'

  const validationResult = await admin().schema('gkit_jur').from('agente_validacoes').insert({
    execucao_id: execucaoId,
    validado_por: context.usuario.id,
    status,
    observacao,
  })

  if (validationResult.error) throw new Error(validationResult.error.message)

  const updateResult = await admin()
    .schema('gkit_jur')
    .from('agente_execucoes')
    .update({
      status: nextStatus,
      erro_mensagem: status === 'rejeitado' ? observacao : null,
      finalizado_em: nextStatus === 'sucesso' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', execucaoId)

  if (updateResult.error) throw new Error(updateResult.error.message)

  await admin().schema('gkit_jur').from('agente_logs').insert({
    execucao_id: execucaoId,
    nivel: status === 'rejeitado' ? 'warn' : 'info',
    step: 'validacao_humana',
    mensagem: `Validacao registrada como ${status}.`,
    payload: { observacao, validado_por: context.usuario.id },
  })

  revalidateGkitJur()
  redirect('/modulos/gkit-jur/agente')
}

export async function runGkitJurAgenteMonitoramentoAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.processos.sync')
  const limit = Math.max(1, Math.min(Number.parseInt(text(formData, 'limit') || '25', 10) || 25, 100))
  const now = new Date().toISOString()

  const insertResult = await admin()
    .schema('gkit_jur')
    .from('agente_execucoes')
    .insert({
      status: 'em_execucao',
      iniciado_em: now,
      solicitado_por: context.usuario.id,
      payload: {
        limit,
        origem: 'monitoramento_resumo_inteligente',
        rotina: 'resumos_inteligentes',
      },
    })
    .select('id')
    .single()

  if (insertResult.error || !insertResult.data) {
    throw new Error(insertResult.error?.message ?? 'Nao foi possivel iniciar o monitoramento do agente.')
  }

  const execucaoId = insertResult.data.id

  try {
    const result = await refreshGkitJurIntelligentSummaryMonitor({ limit })
    const status = result.erros.length ? 'precisa_intervencao' : 'sucesso'

    const updateResult = await admin()
      .schema('gkit_jur')
      .from('agente_execucoes')
      .update({
        erro_mensagem: result.erros.length ? `${result.erros.length} processo(s) falharam no reprocessamento.` : null,
        finalizado_em: new Date().toISOString(),
        payload: {
          limit,
          origem: 'monitoramento_resumo_inteligente',
          resultado: result,
          rotina: 'resumos_inteligentes',
        },
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', execucaoId)

    if (updateResult.error) throw new Error(updateResult.error.message)

    await admin().schema('gkit_jur').from('agente_logs').insert({
      execucao_id: execucaoId,
      nivel: result.erros.length ? 'warn' : 'info',
      step: 'monitoramento_resumo_inteligente',
      mensagem: `Monitoramento processou ${result.processados} resumo(s) inteligente(s).`,
      payload: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado no monitoramento do agente.'
    await admin()
      .schema('gkit_jur')
      .from('agente_execucoes')
      .update({
        erro_mensagem: message,
        finalizado_em: new Date().toISOString(),
        status: 'falha',
        updated_at: new Date().toISOString(),
      })
      .eq('id', execucaoId)
    throw error
  }

  await admin().schema('gkit_jur').from('eventos_operacionais').insert({
    user_id: context.usuario.id,
    entidade_tipo: 'agente_execucao',
    entidade_id: execucaoId,
    acao: 'agente_monitoramento_resumo_inteligente',
    descricao: 'Monitoramento do resumo inteligente executado pelo agente auxiliar.',
    payload: { limit },
  })

  revalidateGkitJur()
  redirect('/modulos/gkit-jur/agente?monitoramento=ok')
}
