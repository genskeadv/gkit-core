'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireGkliAtendeContext } from '@/features/gkli-atende/queries'
import type { PlatformUsuario } from '@/lib/auth/platform'

function admin() {
  return createSupabaseAdminClient() as any
}

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function required(value: string, label: string) {
  if (!value) throw new Error(`${label} é obrigatório.`)
  return value
}

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function matchesUser(value: unknown, usuario: PlatformUsuario) {
  const candidate = normalize(value)
  const name = normalize(usuario.nome)
  const emailName = normalize(usuario.email.split('@')[0])
  return Boolean(candidate && (candidate === name || candidate.includes(name) || candidate === emailName))
}

function hasOperationalWrite(permissions: string[]) {
  return (
    canAccess(permissions, 'gkli_atende.write') ||
    canAccess(permissions, 'gkit_ate.tarefas.write') ||
    canAccess(permissions, 'gkit_ate.atendimentos.write')
  )
}

function safeReturnTo(value: string) {
  return value.startsWith('/modulos/gkli-atende') ? value : '/modulos/gkli-atende'
}

function revalidateGkliAtende(atendimentoId?: string, taskId?: string) {
  revalidatePath('/modulos/gkli-atende')
  revalidatePath('/modulos/gkit-ate')
  revalidatePath('/modulos/gkit-ate/dashboard')
  revalidatePath('/modulos/gkit-ate/atendimentos')
  revalidatePath('/modulos/gkit-ate/tarefas')
  if (atendimentoId) revalidatePath(`/modulos/gkit-ate/atendimentos/${atendimentoId}`)
  if (taskId) revalidatePath(`/modulos/gkit-ate/tarefas/${taskId}`)
}

async function loadTaskForAction(id: string, usuario: PlatformUsuario, permissions: string[]) {
  const task = await admin()
    .schema('gkit_ate')
    .from('tarefas')
    .select('id,atendimento_id,responsavel,status')
    .eq('id', id)
    .single()

  if (task.error || !task.data) throw new Error(task.error?.message ?? 'Tarefa não encontrada.')

  const atendimento = await admin()
    .schema('gkit_ate')
    .from('atendimentos')
    .select('id,responsavel,status')
    .eq('id', task.data.atendimento_id)
    .single()

  if (atendimento.error || !atendimento.data) {
    throw new Error(atendimento.error?.message ?? 'Atendimento não encontrado.')
  }

  const canManageAll = permissions.includes('*') || canAccess(permissions, 'gkit_ate.tarefas.write')
  const ownsTask = matchesUser(task.data.responsavel, usuario) || matchesUser(atendimento.data.responsavel, usuario)

  if (!canManageAll && !ownsTask) {
    throw new Error('Esta tarefa não está vinculada ao seu usuário.')
  }

  return {
    task: task.data as Record<string, any>,
    atendimento: atendimento.data as Record<string, any>,
  }
}

export async function startGkliAtendeTaskAction(formData: FormData) {
  const context = await requireGkliAtendeContext('/modulos/gkli-atende')
  if (!hasOperationalWrite(context.permissions)) throw new Error('Você não tem permissão para atualizar tarefas.')

  const id = required(text(formData, 'id'), 'Tarefa')
  const returnTo = safeReturnTo(text(formData, 'return_to'))
  const { task } = await loadTaskForAction(id, context.usuario, context.permissions)

  if (task.status === 'pendente') {
    const { error } = await admin()
      .schema('gkit_ate')
      .from('tarefas')
      .update({
        status: 'em_andamento',
        atualizado_por: context.usuario.id,
      })
      .eq('id', id)

    if (error) throw new Error(error.message)
  }

  revalidateGkliAtende(String(task.atendimento_id), id)
  redirect(returnTo)
}

export async function completeGkliAtendeTaskAction(formData: FormData) {
  const context = await requireGkliAtendeContext('/modulos/gkli-atende')
  if (!hasOperationalWrite(context.permissions)) throw new Error('Você não tem permissão para concluir tarefas.')

  const id = required(text(formData, 'id'), 'Tarefa')
  const returnTo = safeReturnTo(text(formData, 'return_to'))
  const resolucao = text(formData, 'resolucao')
  const { task } = await loadTaskForAction(id, context.usuario, context.permissions)
  const atendimentoId = String(task.atendimento_id)

  const abertas = await admin()
    .schema('gkit_ate')
    .from('tarefas')
    .select('id')
    .eq('atendimento_id', atendimentoId)
    .in('status', ['pendente', 'em_andamento'])

  if (abertas.error) throw new Error(abertas.error.message)
  const outrasAbertas = ((abertas.data ?? []) as Array<Record<string, any>>).filter((row) => String(row.id) !== id).length

  if (outrasAbertas === 0 && resolucao !== 'encerrar_atendimento') {
    throw new Error('Esta é a última tarefa aberta. Encerre o atendimento para concluir.')
  }

  if (outrasAbertas === 0 && resolucao === 'encerrar_atendimento') {
    const atendimento = await admin()
      .schema('gkit_ate')
      .from('atendimentos')
      .update({
        status: 'encerrado',
        data_encerramento: new Date().toISOString(),
        atualizado_por: context.usuario.id,
      })
      .eq('id', atendimentoId)

    if (atendimento.error) throw new Error(atendimento.error.message)
  }

  const { error } = await admin()
    .schema('gkit_ate')
    .from('tarefas')
    .update({
      status: 'concluida',
      data_conclusao: new Date().toISOString(),
      atualizado_por: context.usuario.id,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidateGkliAtende(atendimentoId, id)
  redirect(returnTo)
}
