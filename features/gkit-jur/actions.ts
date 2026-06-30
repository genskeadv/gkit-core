'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getGkitJurSaneamentoSuggestions } from './queries'

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

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
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

function allowed(value: string, values: string[], fallback: string) {
  return values.includes(value) ? value : fallback
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

function revalidateGkitJur() {
  revalidatePath('/modulos/gkit-jur')
  revalidatePath('/modulos/gkit-jur/inbox')
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
  }

  revalidateGkitJur()
  redirect('/modulos/gkit-jur/pendencias')
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
    titulo: requiredText(formData, 'titulo', 'Titulo da tarefa'),
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
    descricao: 'Tarefa juridica manual criada.',
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
  const sourceTitle = requiredText(formData, 'source_title', 'Titulo de origem')

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
    descricao: `Tarefa juridica gerada a partir de ${sourceTipo}.`,
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
    descricao: 'Planejamento da tarefa juridica atualizado.',
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
    titulo: requiredText(formData, 'titulo', 'Titulo do documento'),
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
    titulo: requiredText(formData, 'titulo', 'Titulo do evento'),
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
    mensagem: 'Execucao manual criada e aguardando worker.',
    payload: { solicitado_por: context.usuario.id },
  })

  await admin().schema('gkit_jur').from('eventos_operacionais').insert({
    user_id: context.usuario.id,
    entidade_tipo: 'agente_execucao',
    entidade_id: insertResult.data.id,
    acao: 'agente_execucao_criada',
    descricao: 'Execucao manual do agente criada.',
    payload: { receita_id: receitaId },
  })

  revalidateGkitJur()
  redirect('/modulos/gkit-jur/agente')
}

export async function validateGkitJurAgenteExecucaoAction(formData: FormData) {
  const context = await requireGkitJurWrite('gkit_jur.processos.write')
  const execucaoId = requiredText(formData, 'execucao_id', 'Execucao')
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
