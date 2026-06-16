'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

function admin() {
  return createSupabaseAdminClient() as any
}

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key)
  return value.length ? value : null
}

function required(value: string, label: string) {
  if (!value) throw new Error(`${label} e obrigatorio.`)
  return value
}

function nullableDateTime(formData: FormData, key: string) {
  const value = text(formData, key)
  return value ? new Date(value).toISOString() : null
}

function money(formData: FormData, key: string) {
  const value = text(formData, key).replace(/\./g, '').replace(',', '.')
  const parsed = Number(value || 0)
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Valor invalido.')
  return parsed
}

function percent(formData: FormData, key: string) {
  const parsed = Number(text(formData, key) || 0)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) throw new Error('Probabilidade deve ficar entre 0 e 100.')
  return parsed
}

function uuidOrNull(value: string) {
  return value || null
}

function onlyDigits(value: string | null | undefined) {
  return String(value ?? '').replace(/\D/g, '')
}

function selectedIds(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
}

async function ensureUniqueClienteCnpj(cnpj: string, currentId?: string) {
  const { data, error } = await admin()
    .schema('crm')
    .from('empresas')
    .select('id,documento')
    .limit(1000)

  if (error) throw new Error(error.message)

  const duplicate = ((data ?? []) as Array<Record<string, any>>).find((row) => {
    return onlyDigits(String(row.documento ?? '')) === cnpj && String(row.id) !== currentId
  })

  if (duplicate) throw new Error('Ja existe cliente cadastrado com este CNPJ.')
}

async function replaceContatoClientes(contatoId: string, empresaIds: string[]) {
  const supabase = admin()
  const { error: deleteError } = await supabase
    .schema('crm')
    .from('empresas_contatos')
    .delete()
    .eq('contato_id', contatoId)

  if (deleteError) throw new Error(deleteError.message)
  if (!empresaIds.length) return

  const rows = [...new Set(empresaIds)].map((empresaId) => ({
    contato_id: contatoId,
    empresa_id: empresaId,
  }))

  const { error } = await supabase.schema('crm').from('empresas_contatos').insert(rows)
  if (error) throw new Error(error.message)
}

async function syncClienteStatusForOpportunity(oportunidadeId: string | null) {
  if (!oportunidadeId) return

  const supabase = admin()
  const oportunidadeResult = await supabase
    .schema('crm')
    .from('oportunidades')
    .select('empresa_id')
    .eq('id', oportunidadeId)
    .maybeSingle()

  if (oportunidadeResult.error) throw new Error(oportunidadeResult.error.message)

  const empresaId = String(oportunidadeResult.data?.empresa_id ?? '')
  if (!empresaId) return

  const oportunidadesResult = await supabase
    .schema('crm')
    .from('oportunidades')
    .select('id')
    .eq('empresa_id', empresaId)

  if (oportunidadesResult.error) throw new Error(oportunidadesResult.error.message)

  const oportunidadeIds = ((oportunidadesResult.data ?? []) as Array<Record<string, any>>)
    .map((row) => String(row.id ?? ''))
    .filter(Boolean)

  const propostasResult = oportunidadeIds.length
    ? await supabase
      .schema('crm')
      .from('propostas')
      .select('id')
      .eq('status', 'aprovada')
      .in('oportunidade_id', oportunidadeIds)
      .limit(1)
    : { data: [], error: null }

  if (propostasResult.error) throw new Error(propostasResult.error.message)

  const status = propostasResult.data?.length ? 'ativo' : 'prospecto'
  const { error } = await supabase.schema('crm').from('empresas').update({ status }).eq('id', empresaId)
  if (error) throw new Error(error.message)
}

async function requireCrmWrite(carteiraId: string | null) {
  const context = await requireModuleAccess('crm')
  if (!canAccess(context.permissions, 'crm.oportunidades.write')) {
    throw new Error('Usuario sem permissao para gerenciar oportunidades.')
  }

  if (context.usuario.tipo === 'admin_global' || !carteiraId) return context

  const { data, error } = await admin()
    .schema('security')
    .from('usuario_carteiras')
    .select('carteira_id')
    .eq('usuario_id', context.usuario.id)
    .eq('carteira_id', carteiraId)
    .eq('ativo', true)
    .maybeSingle()

  if (error || !data) {
    throw new Error('Usuario sem acesso a carteira selecionada.')
  }

  return context
}

async function requireCrmProposalWrite(carteiraId: string | null) {
  const context = await requireModuleAccess('crm')
  if (!canAccess(context.permissions, 'crm.propostas.write')) {
    throw new Error('Usuario sem permissao para gerenciar propostas.')
  }

  if (context.usuario.tipo === 'admin_global' || !carteiraId) return context

  const { data, error } = await admin()
    .schema('security')
    .from('usuario_carteiras')
    .select('carteira_id')
    .eq('usuario_id', context.usuario.id)
    .eq('carteira_id', carteiraId)
    .eq('ativo', true)
    .maybeSingle()

  if (error || !data) {
    throw new Error('Usuario sem acesso a carteira selecionada.')
  }

  return context
}

async function requireCicloClientWrite(carteiraId: string | null) {
  const context = await requireModuleAccess('ciclo')
  if (!canAccess(context.permissions, 'ciclo.clientes.write')) {
    throw new Error('Usuario sem permissao para enviar clientes ao Ciclo.')
  }

  if (context.usuario.tipo === 'admin_global' || !carteiraId) return context

  const { data, error } = await admin()
    .schema('security')
    .from('usuario_carteiras')
    .select('carteira_id')
    .eq('usuario_id', context.usuario.id)
    .eq('carteira_id', carteiraId)
    .eq('ativo', true)
    .maybeSingle()

  if (error || !data) {
    throw new Error('Usuario sem acesso a carteira selecionada no Ciclo.')
  }

  return context
}

const cicloDocumentosBase = [
  { tipo_documento: 'contrato', titulo: 'Contrato' },
  { tipo_documento: 'cartao_cnpj', titulo: 'Cartao CNPJ' },
  { tipo_documento: 'ata_eleicao', titulo: 'Ata eleicao' },
  { tipo_documento: 'ata_previsao_orcamentaria', titulo: 'Ata previsao orcamentaria' },
  { tipo_documento: 'cpf_sindico', titulo: 'CPF sindico' },
  { tipo_documento: 'cnpj_empresa_sindico', titulo: 'CNPJ empresa sindico' },
  { tipo_documento: 'convencao', titulo: 'Convencao' },
  { tipo_documento: 'regulamento', titulo: 'Regulamento' },
  { tipo_documento: 'cadastro_unidade', titulo: 'Cadastro de unidade' },
]

async function ensureCicloChecklist(clienteId: string, carteiraId: string | null) {
  const rows = cicloDocumentosBase.map((documento) => ({
    cliente_id: clienteId,
    carteira_id: carteiraId,
    tipo_documento: documento.tipo_documento,
    titulo: documento.titulo,
    status: 'pendente',
    obrigatorio: true,
    aplicavel: true,
    validado: false,
  }))

  const { error } = await admin()
    .schema('ciclo')
    .from('cliente_documentos')
    .upsert(rows, { onConflict: 'cliente_id,tipo_documento', ignoreDuplicates: true })

  if (error) throw new Error(`Checklist Ciclo: ${error.message}`)
}

function opportunityPayload(formData: FormData) {
  const carteiraId = uuidOrNull(text(formData, 'carteira_id'))

  return {
    carteiraId,
    payload: {
      carteira_id: carteiraId,
      empresa_id: required(text(formData, 'empresa_id'), 'Cliente'),
      contato_id: uuidOrNull(text(formData, 'contato_id')),
      titulo: required(text(formData, 'titulo'), 'Titulo'),
      descricao: nullableText(formData, 'descricao'),
      etapa: text(formData, 'etapa') || 'lead',
      status: text(formData, 'status') || 'aberta',
      valor: money(formData, 'valor'),
      probabilidade: percent(formData, 'probabilidade'),
      origem: nullableText(formData, 'origem'),
      responsavel_id: uuidOrNull(text(formData, 'responsavel_id')),
      proxima_acao: nullableText(formData, 'proxima_acao'),
      data_ultima_interacao: nullableDateTime(formData, 'data_ultima_interacao'),
      data_proxima_acao: nullableDateTime(formData, 'data_proxima_acao'),
      motivo_perda: nullableText(formData, 'motivo_perda'),
    },
  }
}

export async function createCrmOpportunityAction(formData: FormData) {
  const { carteiraId, payload } = opportunityPayload(formData)
  const context = await requireCrmWrite(carteiraId)

  const { error } = await admin()
    .schema('crm')
    .from('oportunidades')
    .insert({
      ...payload,
      responsavel_id: payload.responsavel_id ?? context.usuario.id,
    })

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/crm')
  revalidatePath('/modulos/crm/oportunidades')
  redirect('/modulos/crm/oportunidades')
}

export async function updateCrmOpportunityAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Oportunidade')
  const { carteiraId, payload } = opportunityPayload(formData)
  await requireCrmWrite(carteiraId)

  const { error } = await admin()
    .schema('crm')
    .from('oportunidades')
    .update(payload)
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/crm')
  revalidatePath('/modulos/crm/oportunidades')
  revalidatePath(`/modulos/crm/oportunidades/${id}`)
  redirect('/modulos/crm/oportunidades')
}

export async function sendCrmOpportunityToCicloAction(formData: FormData) {
  const oportunidadeId = required(text(formData, 'id'), 'Oportunidade')

  const oportunidadeResult = await admin()
    .schema('crm')
    .from('oportunidades')
    .select('id,empresa_id,contato_id,carteira_id,titulo,descricao,etapa,status,valor,origem')
    .eq('id', oportunidadeId)
    .single()

  if (oportunidadeResult.error || !oportunidadeResult.data) {
    throw new Error(oportunidadeResult.error?.message ?? 'Oportunidade nao encontrada.')
  }

  const oportunidade = oportunidadeResult.data as Record<string, any>
  const carteiraId = uuidOrNull(String(oportunidade.carteira_id ?? ''))
  const crmContext = await requireCrmWrite(carteiraId)
  const cicloContext = await requireCicloClientWrite(carteiraId)

  const [empresaResult, contatoResult] = await Promise.all([
    admin()
      .schema('crm')
      .from('empresas')
      .select('id,carteira_id,nome,documento,tipo,segmento,origem,status,observacoes')
      .eq('id', oportunidade.empresa_id)
      .single(),
    oportunidade.contato_id
      ? admin().schema('crm').from('contatos').select('id,nome,email,telefone,cargo').eq('id', oportunidade.contato_id).maybeSingle()
      : { data: null, error: null },
  ])

  if (empresaResult.error || !empresaResult.data) {
    throw new Error(empresaResult.error?.message ?? 'Cliente nao encontrado.')
  }

  const empresa = empresaResult.data as Record<string, any>
  const contato = (contatoResult.data ?? null) as Record<string, any> | null
  const documento = String(empresa.documento ?? '')
  const cnpj = onlyDigits(documento)
  const nome = String(empresa.nome ?? oportunidade.titulo ?? 'Cliente CRM')

  const existing = cnpj.length === 14
    ? await admin().schema('ciclo').from('clientes').select('id').eq('cnpj_normalizado', cnpj).maybeSingle()
    : { data: null, error: null }

  if (existing.error) throw new Error(existing.error.message)

  const payload = {
    carteira_id: carteiraId,
    nome,
    nome_fantasia: nome,
    razao_social: nome,
    documento: documento || null,
    email: contato?.email ?? null,
    telefone: contato?.telefone ?? null,
    status_operacional: 'novo',
    score_atual: 75,
    risco_atual: 'medio',
    temperatura: 'neutro',
    observacoes: [empresa.observacoes, oportunidade.descricao, `Origem CRM: ${oportunidade.titulo}`].filter(Boolean).join('\n\n') || null,
    ativo: true,
    ultimo_movimento_em: new Date().toISOString(),
    metadata: {
      crm_empresa_id: empresa.id,
      crm_oportunidade_id: oportunidade.id,
      crm_valor_oportunidade: oportunidade.valor ?? null,
      crm_origem: oportunidade.origem ?? empresa.origem ?? null,
    },
  }

  const saved = existing.data?.id
    ? await admin().schema('ciclo').from('clientes').update(payload).eq('id', existing.data.id).select('id').single()
    : await admin().schema('ciclo').from('clientes').insert(payload).select('id').single()

  if (saved.error) throw new Error(saved.error.message)

  const clienteId = String(saved.data.id)

  if (contato?.nome) {
    await admin().schema('ciclo').from('cliente_contatos').insert({
      cliente_id: clienteId,
      nome: contato.nome,
      tipo: 'comercial',
      cargo: contato.cargo ?? null,
      email: contato.email ?? null,
      telefone: contato.telefone ?? null,
      principal: true,
      ativo: true,
      metadata: { crm_contato_id: contato.id },
    })
  }

  await ensureCicloChecklist(clienteId, carteiraId)

  await admin().schema('ciclo').from('timeline_cliente').insert({
    cliente_id: clienteId,
    carteira_id: carteiraId,
    usuario_id: cicloContext.usuario.id,
    tipo: 'crm',
    titulo: 'Cliente conquistado no CRM',
    descricao: `Oportunidade "${oportunidade.titulo}" enviada para o Ciclo por ${crmContext.usuario.nome ?? 'CRM'}.`,
    metadata: {
      crm_oportunidade_id: oportunidade.id,
      crm_empresa_id: empresa.id,
    },
  })

  await admin().schema('crm').from('oportunidades').update({
    etapa: 'fechado',
    status: 'ganha',
    data_ultima_interacao: new Date().toISOString(),
    proxima_acao: 'Acompanhar onboarding no Ciclo',
  }).eq('id', oportunidadeId)

  revalidatePath('/modulos/crm')
  revalidatePath('/modulos/crm/oportunidades')
  revalidatePath(`/modulos/crm/oportunidades/${oportunidadeId}`)
  revalidatePath('/modulos/ciclo')
  revalidatePath('/modulos/ciclo/clientes')
  revalidatePath('/modulos/ciclo/onboarding')
  revalidatePath(`/modulos/ciclo/clientes/${clienteId}/cockpit`)
  redirect(`/modulos/ciclo/clientes/${clienteId}/cockpit`)
}

function empresaPayload(formData: FormData) {
  const carteiraId = uuidOrNull(text(formData, 'carteira_id'))
  const cnpj = onlyDigits(required(text(formData, 'documento'), 'CNPJ'))

  if (cnpj.length !== 14) {
    throw new Error('CNPJ deve conter 14 digitos.')
  }

  return {
    carteiraId,
    payload: {
      carteira_id: carteiraId,
      nome: required(text(formData, 'nome'), 'Cliente'),
      documento: cnpj,
      tipo: 'PJ',
      segmento: nullableText(formData, 'segmento'),
      origem: nullableText(formData, 'origem'),
      status: 'prospecto',
      observacoes: nullableText(formData, 'observacoes'),
    },
  }
}

function contatoPayload(formData: FormData) {
  return {
    nome: required(text(formData, 'nome'), 'Nome'),
    email: nullableText(formData, 'email'),
    telefone: nullableText(formData, 'telefone'),
    cargo: nullableText(formData, 'cargo'),
    origem: nullableText(formData, 'origem'),
    status: text(formData, 'status') || 'ativo',
  }
}

export async function createCrmEmpresaAction(formData: FormData) {
  const { carteiraId, payload } = empresaPayload(formData)
  const context = await requireCrmWrite(carteiraId)
  await ensureUniqueClienteCnpj(payload.documento)

  const { error } = await admin()
    .schema('crm')
    .from('empresas')
    .insert({
      ...payload,
      responsavel_id: context.usuario.id,
    })

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/crm')
  revalidatePath('/modulos/crm/empresas')
  revalidatePath('/modulos/crm/clientes')
  redirect('/modulos/crm/clientes')
}

export async function updateCrmEmpresaAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Cliente')
  const { carteiraId, payload } = empresaPayload(formData)
  await requireCrmWrite(carteiraId)
  await ensureUniqueClienteCnpj(payload.documento, id)

  const { error } = await admin()
    .schema('crm')
    .from('empresas')
    .update(payload)
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/crm')
  revalidatePath('/modulos/crm/empresas')
  revalidatePath('/modulos/crm/clientes')
  revalidatePath(`/modulos/crm/empresas/${id}`)
  redirect('/modulos/crm/clientes')
}

export async function createCrmContatoAction(formData: FormData) {
  await requireCrmWrite(null)
  const empresaIds = selectedIds(formData, 'empresa_ids')

  const { data, error } = await admin()
    .schema('crm')
    .from('contatos')
    .insert(contatoPayload(formData))
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  await replaceContatoClientes(String(data.id), empresaIds)

  revalidatePath('/modulos/crm')
  revalidatePath('/modulos/crm/clientes')
  revalidatePath('/modulos/crm/contatos')
  redirect('/modulos/crm/contatos')
}

export async function updateCrmContatoAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Contato')
  await requireCrmWrite(null)
  const empresaIds = selectedIds(formData, 'empresa_ids')

  const { error } = await admin()
    .schema('crm')
    .from('contatos')
    .update(contatoPayload(formData))
    .eq('id', id)

  if (error) throw new Error(error.message)
  await replaceContatoClientes(id, empresaIds)

  revalidatePath('/modulos/crm')
  revalidatePath('/modulos/crm/clientes')
  revalidatePath('/modulos/crm/contatos')
  revalidatePath(`/modulos/crm/contatos/${id}`)
  redirect('/modulos/crm/contatos')
}

function proposalPayload(formData: FormData) {
  const carteiraId = uuidOrNull(text(formData, 'carteira_id'))

  return {
    carteiraId,
    payload: {
      oportunidade_id: required(text(formData, 'oportunidade_id'), 'Oportunidade'),
      carteira_id: carteiraId,
      numero: nullableText(formData, 'numero'),
      titulo: required(text(formData, 'titulo'), 'Titulo'),
      status: text(formData, 'status') || 'rascunho',
      valor_total: money(formData, 'valor_total'),
      enviada_em: nullableDateTime(formData, 'enviada_em'),
      validade_em: nullableText(formData, 'validade_em'),
      observacoes: nullableText(formData, 'observacoes'),
    },
  }
}

function activityPayload(formData: FormData) {
  const carteiraId = uuidOrNull(text(formData, 'carteira_id'))

  return {
    carteiraId,
    payload: {
      oportunidade_id: uuidOrNull(text(formData, 'oportunidade_id')),
      empresa_id: uuidOrNull(text(formData, 'empresa_id')),
      contato_id: uuidOrNull(text(formData, 'contato_id')),
      carteira_id: carteiraId,
      tipo: text(formData, 'tipo') || 'tarefa',
      titulo: required(text(formData, 'titulo'), 'Titulo'),
      descricao: nullableText(formData, 'descricao'),
      realizada_em: nullableDateTime(formData, 'realizada_em'),
      prazo_em: nullableDateTime(formData, 'prazo_em'),
      concluida: formData.get('concluida') === 'on',
    },
  }
}

export async function createCrmPropostaAction(formData: FormData) {
  const { carteiraId, payload } = proposalPayload(formData)
  await requireCrmProposalWrite(carteiraId)

  const { error } = await admin().schema('crm').from('propostas').insert(payload)
  if (error) throw new Error(error.message)
  await syncClienteStatusForOpportunity(payload.oportunidade_id)

  revalidatePath('/modulos/crm')
  revalidatePath('/modulos/crm/propostas')
  revalidatePath('/modulos/crm/clientes')
  redirect('/modulos/crm/propostas')
}

export async function updateCrmPropostaAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Proposta')
  const { carteiraId, payload } = proposalPayload(formData)
  await requireCrmProposalWrite(carteiraId)
  const beforeResult = await admin()
    .schema('crm')
    .from('propostas')
    .select('oportunidade_id')
    .eq('id', id)
    .maybeSingle()

  if (beforeResult.error) throw new Error(beforeResult.error.message)

  const { error } = await admin().schema('crm').from('propostas').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
  await syncClienteStatusForOpportunity(String(beforeResult.data?.oportunidade_id ?? '') || null)
  await syncClienteStatusForOpportunity(payload.oportunidade_id)

  revalidatePath('/modulos/crm')
  revalidatePath('/modulos/crm/propostas')
  revalidatePath('/modulos/crm/clientes')
  revalidatePath(`/modulos/crm/propostas/${id}`)
  redirect('/modulos/crm/propostas')
}

export async function createCrmAtividadeAction(formData: FormData) {
  const { carteiraId, payload } = activityPayload(formData)
  const context = await requireCrmWrite(carteiraId)

  const { error } = await admin().schema('crm').from('atividades').insert({
    ...payload,
    usuario_id: context.usuario.id,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/modulos/crm')
  revalidatePath('/modulos/crm/atividades')
  redirect('/modulos/crm/atividades')
}

export async function updateCrmAtividadeAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Atividade')
  const { carteiraId, payload } = activityPayload(formData)
  await requireCrmWrite(carteiraId)

  const { error } = await admin().schema('crm').from('atividades').update(payload).eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/modulos/crm')
  revalidatePath('/modulos/crm/atividades')
  revalidatePath(`/modulos/crm/atividades/${id}`)
  redirect('/modulos/crm/atividades')
}

export async function createCrmInteracaoAction(formData: FormData) {
  const { carteiraId, payload } = activityPayload(formData)
  const context = await requireCrmWrite(carteiraId)

  const { error } = await admin().schema('crm').from('atividades').insert({
    ...payload,
    tipo: payload.tipo === 'tarefa' ? 'nota' : payload.tipo,
    concluida: true,
    usuario_id: context.usuario.id,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/modulos/crm')
  revalidatePath('/modulos/crm/interacoes')
  redirect('/modulos/crm/interacoes')
}

export async function updateCrmInteracaoAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Interacao')
  const { carteiraId, payload } = activityPayload(formData)
  await requireCrmWrite(carteiraId)

  const { error } = await admin().schema('crm').from('atividades').update({
    ...payload,
    tipo: payload.tipo === 'tarefa' ? 'nota' : payload.tipo,
    concluida: true,
  }).eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/modulos/crm')
  revalidatePath('/modulos/crm/interacoes')
  revalidatePath(`/modulos/crm/interacoes/${id}`)
  redirect('/modulos/crm/interacoes')
}
