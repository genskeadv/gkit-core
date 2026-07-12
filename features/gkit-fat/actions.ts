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

function required(value: string, label: string) {
  if (!value) throw new Error(`${label} e obrigatorio.`)
  return value
}

function optionalDate(formData: FormData, key: string) {
  const value = text(formData, key)
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Data invalida.')
  return value
}

function money(formData: FormData, key: string) {
  const value = text(formData, key)
  if (!value) return 0
  const parsed = Number(value.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Valor invalido.')
  return parsed
}

function intValue(formData: FormData, key: string) {
  const value = text(formData, key)
  if (!value) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) throw new Error('Numero invalido.')
  return parsed
}

function boolValue(formData: FormData, key: string) {
  return formData.get(key) === 'on' || formData.get(key) === 'true'
}

function contractNumber() {
  return `FATC-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`
}

function ordemNumber() {
  return `FATOS-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`
}

async function requireWrite(permission: string, target: string) {
  const context = await requireModuleAccess('gkit-fat', target)
  if (!canAccess(context.permissions, permission)) redirect('/modulos/gkit-fat')
  return context
}

async function clienteSnapshot(clienteId: string) {
  const { data } = await admin()
    .schema('ciclo')
    .from('clientes')
    .select('id,nome,nome_fantasia,razao_social,documento,email,telefone,cidade,estado,carteira_id,tipo_cliente,tipo_pessoa')
    .eq('id', clienteId)
    .maybeSingle()

  return (data ?? {}) as Record<string, any>
}

export async function createGkitFatContratoAction(formData: FormData) {
  const context = await requireWrite('gkit_fat.contratos.write', '/modulos/gkit-fat/contratos/novo')
  const clienteId = required(text(formData, 'cliente_id'), 'Cliente')
  const cliente = await clienteSnapshot(clienteId)
  const carteiraId = text(formData, 'carteira_id') || String(cliente.carteira_id ?? '') || null
  const tipo = text(formData, 'tipo_faturamento') || String(cliente.tipo_cliente ?? 'mensal')

  const payload = {
    numero: text(formData, 'numero') || contractNumber(),
    cliente_id: clienteId,
    tomador_id: text(formData, 'tomador_id') || null,
    carteira_id: carteiraId,
    servico_codigo: '03220',
    tipo_faturamento: tipo,
    periodicidade_meses: intValue(formData, 'periodicidade_meses') ?? 1,
    dia_faturamento: intValue(formData, 'dia_faturamento'),
    dia_vencimento: intValue(formData, 'dia_vencimento'),
    inicio_vigencia: optionalDate(formData, 'inicio_vigencia'),
    fim_vigencia: optionalDate(formData, 'fim_vigencia'),
    valor_padrao: money(formData, 'valor_padrao'),
    descricao_servico: text(formData, 'descricao_servico') || 'Servicos advocaticios',
    iss_retido: boolValue(formData, 'iss_retido'),
    gerar_financeiro: !boolValue(formData, 'nao_gerar_financeiro'),
    status: text(formData, 'status') || 'em_elaboracao',
    observacoes: text(formData, 'observacoes') || null,
    criado_por: context.usuario.id,
    atualizado_por: context.usuario.id,
  }

  const { error } = await admin().schema('gkit_fat').from('contratos_servico').insert(payload)
  if (error) throw new Error(error.message)

  revalidatePath('/modulos/gkit-fat')
  revalidatePath('/modulos/gkit-fat/contratos')
  redirect('/modulos/gkit-fat/contratos')
}

export async function updateGkitFatContratoAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Contrato')
  const context = await requireWrite('gkit_fat.contratos.write', `/modulos/gkit-fat/contratos/${id}`)

  const payload = {
    tipo_faturamento: text(formData, 'tipo_faturamento') || 'mensal',
    periodicidade_meses: intValue(formData, 'periodicidade_meses') ?? 1,
    dia_faturamento: intValue(formData, 'dia_faturamento'),
    dia_vencimento: intValue(formData, 'dia_vencimento'),
    inicio_vigencia: optionalDate(formData, 'inicio_vigencia'),
    fim_vigencia: optionalDate(formData, 'fim_vigencia'),
    valor_padrao: money(formData, 'valor_padrao'),
    descricao_servico: text(formData, 'descricao_servico') || 'Servicos advocaticios',
    iss_retido: boolValue(formData, 'iss_retido'),
    gerar_financeiro: !boolValue(formData, 'nao_gerar_financeiro'),
    status: text(formData, 'status') || 'em_elaboracao',
    motivo_status: text(formData, 'motivo_status') || null,
    observacoes: text(formData, 'observacoes') || null,
    atualizado_por: context.usuario.id,
  }

  const { error } = await admin().schema('gkit_fat').from('contratos_servico').update(payload).eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/modulos/gkit-fat')
  revalidatePath('/modulos/gkit-fat/contratos')
  revalidatePath(`/modulos/gkit-fat/contratos/${id}`)
  redirect('/modulos/gkit-fat/contratos')
}

export async function createGkitFatOrdemServicoAction(formData: FormData) {
  const context = await requireWrite('gkit_fat.faturas.write', '/modulos/gkit-fat/faturas')
  const contratoId = text(formData, 'contrato_id')
  let contrato: Record<string, any> | null = null

  if (contratoId) {
    const { data, error } = await admin()
      .schema('gkit_fat')
      .from('contratos_servico')
      .select('*')
      .eq('id', contratoId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    contrato = (data ?? null) as Record<string, any> | null
  }

  const clienteId = contrato ? String(contrato.cliente_id) : required(text(formData, 'cliente_id'), 'Cliente')
  const cliente = await clienteSnapshot(clienteId)
  const descricao = text(formData, 'descricao_servico') || String(contrato?.descricao_servico ?? 'Servicos advocaticios')
  const valor = money(formData, 'valor_unitario') || Number(contrato?.valor_padrao ?? 0)

  const payload = {
    numero: text(formData, 'numero') || ordemNumber(),
    contrato_id: contratoId || null,
    cliente_id: clienteId,
    tomador_id: String(contrato?.tomador_id ?? '') || null,
    carteira_id: String(contrato?.carteira_id ?? cliente.carteira_id ?? '') || null,
    origem: contratoId ? 'contrato_recorrente' : 'manual',
    competencia: optionalDate(formData, 'competencia'),
    periodo_inicio: optionalDate(formData, 'periodo_inicio'),
    periodo_fim: optionalDate(formData, 'periodo_fim'),
    data_prevista_faturamento: optionalDate(formData, 'data_prevista_faturamento'),
    data_vencimento: optionalDate(formData, 'data_vencimento'),
    servico_codigo: '03220',
    descricao_servico: descricao,
    quantidade: 1,
    valor_unitario: valor,
    situacao_operacional: text(formData, 'situacao_operacional') || 'rascunho',
    situacao_fiscal: 'nao_enviada',
    situacao_financeira: contrato?.gerar_financeiro === false ? 'nao_gerar_financeiro' : 'prevista',
    tomador_snapshot: cliente,
    servico_snapshot: {
      codigo: '03220',
      descricao: 'Advocacia',
      descricao_servico: descricao,
      valor_unitario: valor,
    },
    criado_por: context.usuario.id,
    atualizado_por: context.usuario.id,
  }

  const { error } = await admin().schema('gkit_fat').from('ordens_servico').insert(payload)
  if (error) throw new Error(error.message)

  revalidatePath('/modulos/gkit-fat')
  revalidatePath('/modulos/gkit-fat/faturas')
  redirect('/modulos/gkit-fat/faturas')
}
