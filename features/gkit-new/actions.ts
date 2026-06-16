'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

function admin() {
  return createSupabaseAdminClient() as any
}

async function requireGkitNewWrite(permission: string) {
  const context = await requireModuleAccess('gkit-new')
  if (!canAccess(context.permissions, permission)) {
    throw new Error('Usuário sem permissão para executar esta ação no GKIT New.')
  }
  return context
}

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function requiredText(formData: FormData, key: string, label: string) {
  const value = text(formData, key)
  if (!value) throw new Error(`${label} é obrigatório.`)
  return value
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key)
  return value || null
}

function optionalUuid(formData: FormData, key: string) {
  const value = text(formData, key)
  return value || null
}

async function registerEvent({
  descricao,
  entidade,
  entidadeId,
  metadata = {},
  tipo,
  usuarioId,
}: {
  descricao: string
  entidade: string
  entidadeId: string
  metadata?: Record<string, unknown>
  tipo: string
  usuarioId: string
}) {
  const { error } = await admin().schema('gkit_new').from('eventos').insert({
    entidade,
    entidade_id: entidadeId,
    usuario_id: usuarioId,
    tipo,
    descricao,
    metadata,
  })

  if (error) throw new Error(error.message)
}

function requiredDate(formData: FormData, key: string, label: string) {
  const value = requiredText(formData, key, label)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} deve ser uma data válida.`)
  return value
}

function money(formData: FormData, key: string) {
  const raw = text(formData, key).replace(/\./g, '').replace(',', '.')
  const parsed = Number(raw || 0)
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Valor inválido.')
  return parsed
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function selectedIds(formData: FormData, key: string) {
  return [...new Set(formData.getAll(key)
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean))]
}

function documentPayload(formData: FormData) {
  const documento = onlyDigits(requiredText(formData, 'documento', 'CPF ou CNPJ'))
  const documentoTipo = documento.length === 11 ? 'cpf' : documento.length === 14 ? 'cnpj' : null

  if (!documentoTipo) {
    throw new Error('Documento deve ser CPF com 11 dígitos ou CNPJ com 14 dígitos.')
  }

  return {
    documento,
    documento_tipo: documentoTipo,
    documento_normalizado: documento,
  }
}

async function ensureUniqueDocumento(documento: string, currentId?: string) {
  const { data, error } = await admin()
    .schema('gkit_new')
    .from('clientes')
    .select('id,documento_normalizado')
    .eq('documento_normalizado', documento)
    .limit(1)

  if (error) throw new Error(error.message)

  const duplicate = ((data ?? []) as Array<Record<string, any>>).find((row) => String(row.id) !== currentId)
  if (duplicate) throw new Error('Já existe cliente cadastrado com este CPF/CNPJ.')
}

function clientePayload(formData: FormData) {
  const documento = documentPayload(formData)

  return {
    documento,
    payload: {
      nome: requiredText(formData, 'nome', 'Nome'),
      documento: documento.documento,
      documento_tipo: documento.documento_tipo,
      documento_normalizado: documento.documento_normalizado,
      observacoes: optionalText(formData, 'observacoes'),
    },
  }
}

function contatoPayload(formData: FormData) {
  return {
    nome: requiredText(formData, 'nome', 'Nome'),
    descricao: optionalText(formData, 'descricao'),
    email: optionalText(formData, 'email'),
    celular: optionalText(formData, 'celular'),
  }
}

function workflowPayload(formData: FormData) {
  const dias = Number(text(formData, 'dias') || 0)
  const ordem = Number(text(formData, 'ordem') || 100)

  if (!Number.isInteger(dias) || dias < 0) throw new Error('Dias deve ser um número inteiro maior ou igual a zero.')
  if (!Number.isInteger(ordem) || ordem < 0) throw new Error('Ordem deve ser um número inteiro maior ou igual a zero.')

  return {
    descricao: requiredText(formData, 'descricao', 'Descrição'),
    dias,
    responsavel_id: optionalUuid(formData, 'responsavel_id'),
    ativo: formData.get('ativo') === 'on',
    ordem,
  }
}

function oportunidadePayload(formData: FormData) {
  const status = text(formData, 'status') || 'nova'
  const tipo = text(formData, 'tipo') || 'mensal'

  if (!['nova', 'proposta_enviada', 'em_negociacao', 'aprovada', 'encerrada'].includes(status)) {
    throw new Error('Status da oportunidade inválido.')
  }

  if (!['mensal', 'pontual'].includes(tipo)) {
    throw new Error('Tipo da oportunidade inválido.')
  }

  return {
    cliente_id: requiredText(formData, 'cliente_id', 'Cliente'),
    contato_id: requiredText(formData, 'contato_id', 'Contato'),
    data: requiredDate(formData, 'data', 'Data'),
    descricao: requiredText(formData, 'descricao', 'Descrição'),
    tipo,
    valor: money(formData, 'valor'),
    escopo: optionalText(formData, 'escopo'),
    status,
    motivo_encerramento_antecipado: optionalText(formData, 'motivo_encerramento_antecipado'),
    responsavel_id: optionalUuid(formData, 'responsavel_id'),
  }
}

async function replaceContatoClientes(contatoId: string, clienteIds: string[]) {
  const supabase = admin()
  const { error: deleteError } = await supabase.schema('gkit_new').from('cliente_contatos').delete().eq('contato_id', contatoId)
  if (deleteError) throw new Error(deleteError.message)

  if (!clienteIds.length) return

  const rows = clienteIds.map((clienteId) => ({
    contato_id: contatoId,
    cliente_id: clienteId,
  }))

  const { error } = await supabase.schema('gkit_new').from('cliente_contatos').insert(rows)
  if (error) throw new Error(error.message)
}

async function ensureContatoVinculado(clienteId: string, contatoId: string) {
  const { data, error } = await admin()
    .schema('gkit_new')
    .from('cliente_contatos')
    .select('id')
    .eq('cliente_id', clienteId)
    .eq('contato_id', contatoId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Contato precisa estar vinculado ao cliente selecionado.')
}

async function countActiveWorkflowModels() {
  const { count, error } = await admin()
    .schema('gkit_new')
    .from('tarefa_modelos')
    .select('id', { count: 'exact', head: true })
    .eq('ativo', true)

  if (error) throw new Error(error.message)
  return count ?? 0
}

async function countPendingTasks(oportunidadeId: string) {
  const { count, error } = await admin()
    .schema('gkit_new')
    .from('tarefas')
    .select('id', { count: 'exact', head: true })
    .eq('oportunidade_id', oportunidadeId)
    .eq('status', 'pendente')

  if (error) throw new Error(error.message)
  return count ?? 0
}

async function cancelPendingTasks(oportunidadeId: string, usuarioId: string, motivo: string) {
  const pending = await countPendingTasks(oportunidadeId)
  if (!pending) return

  const { error } = await admin()
    .schema('gkit_new')
    .from('tarefas')
    .update({ status: 'cancelada' })
    .eq('oportunidade_id', oportunidadeId)
    .eq('status', 'pendente')

  if (error) throw new Error(error.message)

  await registerEvent({
    entidade: 'oportunidade',
    entidadeId: oportunidadeId,
    usuarioId,
    tipo: 'workflow_cancelado',
    descricao: motivo,
    metadata: { tarefas_canceladas: pending },
  })
}

function isFinalOpportunityStatus(status: string) {
  return status === 'aprovada' || status === 'encerrada'
}

function revalidateGkitNewBase(id?: string, kind?: 'cliente' | 'contato' | 'workflow' | 'oportunidade' | 'tarefa') {
  revalidatePath('/modulos/gkit-new')
  revalidatePath('/modulos/gkit-new/clientes')
  revalidatePath('/modulos/gkit-new/contatos')
  revalidatePath('/modulos/gkit-new/oportunidades')
  revalidatePath('/modulos/gkit-new/tarefas')
  revalidatePath('/modulos/gkit-new/gestao')
  revalidatePath('/modulos/gkit-new/base/workflow')
  if (id && kind === 'cliente') revalidatePath(`/modulos/gkit-new/clientes/${id}`)
  if (id && kind === 'contato') revalidatePath(`/modulos/gkit-new/contatos/${id}`)
  if (id && kind === 'workflow') revalidatePath(`/modulos/gkit-new/base/workflow/${id}`)
  if (id && kind === 'oportunidade') revalidatePath(`/modulos/gkit-new/oportunidades/${id}`)
  if (id && kind === 'tarefa') revalidatePath(`/modulos/gkit-new/tarefas/${id}`)
}

export async function createGkitNewClienteAction(formData: FormData) {
  const context = await requireGkitNewWrite('gkit_new.clientes.write')
  const { documento, payload } = clientePayload(formData)
  await ensureUniqueDocumento(documento.documento)

  const { data, error } = await admin()
    .schema('gkit_new')
    .from('clientes')
    .insert({
      ...payload,
      criado_por: context.usuario.id,
      atualizado_por: context.usuario.id,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  await registerEvent({
    entidade: 'cliente',
    entidadeId: String(data.id),
    usuarioId: context.usuario.id,
    tipo: 'cliente_criado',
    descricao: `Cliente ${payload.nome} criado.`,
    metadata: { documento_tipo: payload.documento_tipo },
  })
  revalidateGkitNewBase(String(data.id), 'cliente')
  redirect(`/modulos/gkit-new/clientes/${data.id}`)
}

export async function updateGkitNewClienteAction(formData: FormData) {
  const id = requiredText(formData, 'id', 'Cliente')
  const context = await requireGkitNewWrite('gkit_new.clientes.write')
  const { documento, payload } = clientePayload(formData)
  await ensureUniqueDocumento(documento.documento, id)

  const { error } = await admin()
    .schema('gkit_new')
    .from('clientes')
    .update({
      ...payload,
      atualizado_por: context.usuario.id,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  await registerEvent({
    entidade: 'cliente',
    entidadeId: id,
    usuarioId: context.usuario.id,
    tipo: 'cliente_editado',
    descricao: `Cliente ${payload.nome} editado.`,
    metadata: { documento_tipo: payload.documento_tipo },
  })
  revalidateGkitNewBase(id, 'cliente')
  redirect('/modulos/gkit-new/clientes')
}

export async function createGkitNewContatoAction(formData: FormData) {
  const context = await requireGkitNewWrite('gkit_new.contatos.write')
  const clienteIds = selectedIds(formData, 'cliente_ids')

  const { data, error } = await admin()
    .schema('gkit_new')
    .from('contatos')
    .insert({
      ...contatoPayload(formData),
      criado_por: context.usuario.id,
      atualizado_por: context.usuario.id,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  await replaceContatoClientes(String(data.id), clienteIds)
  await registerEvent({
    entidade: 'contato',
    entidadeId: String(data.id),
    usuarioId: context.usuario.id,
    tipo: 'contato_criado',
    descricao: `Contato ${text(formData, 'nome')} criado.`,
    metadata: { clientes: clienteIds.length },
  })
  revalidateGkitNewBase(String(data.id), 'contato')
  redirect(`/modulos/gkit-new/contatos/${data.id}`)
}

export async function updateGkitNewContatoAction(formData: FormData) {
  const id = requiredText(formData, 'id', 'Contato')
  const context = await requireGkitNewWrite('gkit_new.contatos.write')
  const clienteIds = selectedIds(formData, 'cliente_ids')

  const { error } = await admin()
    .schema('gkit_new')
    .from('contatos')
    .update({
      ...contatoPayload(formData),
      atualizado_por: context.usuario.id,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  await replaceContatoClientes(id, clienteIds)
  await registerEvent({
    entidade: 'contato',
    entidadeId: id,
    usuarioId: context.usuario.id,
    tipo: 'contato_editado',
    descricao: `Contato ${text(formData, 'nome')} editado.`,
    metadata: { clientes: clienteIds.length },
  })
  revalidateGkitNewBase(id, 'contato')
  redirect('/modulos/gkit-new/contatos')
}

export async function createGkitNewWorkflowAction(formData: FormData) {
  const context = await requireGkitNewWrite('gkit_new.workflow.write')

  const { data, error } = await admin()
    .schema('gkit_new')
    .from('tarefa_modelos')
    .insert({
      ...workflowPayload(formData),
      criado_por: context.usuario.id,
      atualizado_por: context.usuario.id,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  await registerEvent({
    entidade: 'workflow',
    entidadeId: String(data.id),
    usuarioId: context.usuario.id,
    tipo: 'workflow_criado',
    descricao: `Modelo ${text(formData, 'descricao')} criado.`,
    metadata: { dias: text(formData, 'dias') },
  })
  revalidateGkitNewBase(String(data.id), 'workflow')
  redirect(`/modulos/gkit-new/base/workflow/${data.id}`)
}

export async function updateGkitNewWorkflowAction(formData: FormData) {
  const id = requiredText(formData, 'id', 'Modelo de workflow')
  const context = await requireGkitNewWrite('gkit_new.workflow.write')

  const { error } = await admin()
    .schema('gkit_new')
    .from('tarefa_modelos')
    .update({
      ...workflowPayload(formData),
      atualizado_por: context.usuario.id,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  await registerEvent({
    entidade: 'workflow',
    entidadeId: id,
    usuarioId: context.usuario.id,
    tipo: 'workflow_editado',
    descricao: `Modelo ${text(formData, 'descricao')} editado.`,
    metadata: { dias: text(formData, 'dias') },
  })
  revalidateGkitNewBase(id, 'workflow')
  redirect('/modulos/gkit-new/base/workflow')
}

export async function createGkitNewOportunidadeAction(formData: FormData) {
  const context = await requireGkitNewWrite('gkit_new.oportunidades.write')
  const payload = oportunidadePayload(formData)

  await ensureContatoVinculado(payload.cliente_id, payload.contato_id)

  if (isFinalOpportunityStatus(payload.status) && !payload.motivo_encerramento_antecipado && await countActiveWorkflowModels() > 0) {
    throw new Error('Motivo é obrigatório para aprovar ou encerrar antes do fim do workflow.')
  }

  const { data, error } = await admin()
    .schema('gkit_new')
    .from('oportunidades')
    .insert({
      ...payload,
      criado_por: context.usuario.id,
      atualizado_por: context.usuario.id,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  const oportunidadeId = String(data.id)
  await registerEvent({
    entidade: 'oportunidade',
    entidadeId: oportunidadeId,
    usuarioId: context.usuario.id,
    tipo: 'oportunidade_criada',
    descricao: `Oportunidade ${payload.descricao} criada.`,
    metadata: { status: payload.status, valor: payload.valor },
  })
  if (payload.status === 'aprovada' || payload.status === 'encerrada') {
    await registerEvent({
      entidade: 'oportunidade',
      entidadeId: oportunidadeId,
      usuarioId: context.usuario.id,
      tipo: payload.status === 'aprovada' ? 'oportunidade_aprovada' : 'oportunidade_encerrada',
      descricao: payload.motivo_encerramento_antecipado ?? `Oportunidade ${payload.status}.`,
      metadata: { status: payload.status, valor: payload.valor },
    })
  }
  if (isFinalOpportunityStatus(payload.status) && payload.motivo_encerramento_antecipado) {
    await cancelPendingTasks(oportunidadeId, context.usuario.id, payload.motivo_encerramento_antecipado)
  }

  revalidateGkitNewBase(oportunidadeId, 'oportunidade')
  redirect(`/modulos/gkit-new/oportunidades/${oportunidadeId}`)
}

export async function updateGkitNewOportunidadeAction(formData: FormData) {
  const id = requiredText(formData, 'id', 'Oportunidade')
  const context = await requireGkitNewWrite('gkit_new.oportunidades.write')
  const payload = oportunidadePayload(formData)

  await ensureContatoVinculado(payload.cliente_id, payload.contato_id)

  const pendingTasks = await countPendingTasks(id)
  if (isFinalOpportunityStatus(payload.status) && pendingTasks > 0 && !payload.motivo_encerramento_antecipado) {
    throw new Error('Motivo é obrigatório para aprovar ou encerrar antes do fim do workflow.')
  }

  const { error } = await admin()
    .schema('gkit_new')
    .from('oportunidades')
    .update({
      ...payload,
      atualizado_por: context.usuario.id,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  await registerEvent({
    entidade: 'oportunidade',
    entidadeId: id,
    usuarioId: context.usuario.id,
    tipo: 'oportunidade_editada',
    descricao: `Oportunidade ${payload.descricao} editada.`,
    metadata: { status: payload.status, valor: payload.valor },
  })
  if (payload.status === 'aprovada' || payload.status === 'encerrada') {
    await registerEvent({
      entidade: 'oportunidade',
      entidadeId: id,
      usuarioId: context.usuario.id,
      tipo: payload.status === 'aprovada' ? 'oportunidade_aprovada' : 'oportunidade_encerrada',
      descricao: payload.motivo_encerramento_antecipado ?? `Oportunidade ${payload.status}.`,
      metadata: { status: payload.status, valor: payload.valor },
    })
  }

  if (isFinalOpportunityStatus(payload.status) && pendingTasks > 0 && payload.motivo_encerramento_antecipado) {
    await cancelPendingTasks(id, context.usuario.id, payload.motivo_encerramento_antecipado)
  }

  revalidateGkitNewBase(id, 'oportunidade')
  redirect('/modulos/gkit-new/oportunidades')
}

export async function completeGkitNewTarefaAction(formData: FormData) {
  const id = requiredText(formData, 'id', 'Tarefa')
  const context = await requireGkitNewWrite('gkit_new.tarefas.write')

  const { error } = await admin()
    .schema('gkit_new')
    .from('tarefas')
    .update({
      status: 'concluida',
      concluida_em: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pendente')

  if (error) throw new Error(error.message)
  await registerEvent({
    entidade: 'tarefa',
    entidadeId: id,
    usuarioId: context.usuario.id,
    tipo: 'tarefa_concluida',
    descricao: 'Tarefa concluída pelo operador.',
  })

  revalidateGkitNewBase(id, 'tarefa')
  redirect('/modulos/gkit-new/tarefas')
}
