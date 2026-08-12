'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getGkitFlexProfileByEmail, requireColabContext, requireUberContext } from '@/features/colab/queries'

const RECEIPT_BUCKET = 'colab-uber-recibos'
const MAX_RECEIPT_SIZE = 10 * 1024 * 1024
const ALLOWED_RECEIPT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
const PRIVATE_VEHICLE_COST_PER_KM = 0.8

type UberContext = Awaited<ReturnType<typeof requireColabContext>>

function admin() {
  return createSupabaseAdminClient() as any
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim()
}

function money(formData: FormData, key: string) {
  const raw = text(formData, key).replace(/R\$/gi, '').replace(/\s/g, '')
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0
}

function decimal(formData: FormData, key: string) {
  const raw = text(formData, key).replace(/\s/g, '')
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0
}

function safeDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return new Date().toISOString().slice(0, 10)
}

function competenciaFromDate(date: string) {
  return `${date.slice(0, 7)}-01`
}

function safeFileName(value: string) {
  const base = String(value || 'recibo-uber')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
  return base || 'recibo-uber'
}

function fail(message: string, targetPath: string): never {
  redirect(`${targetPath}?erro=${encodeURIComponent(message)}`)
}

async function logUberEvent(
  supabase: ReturnType<typeof admin>,
  params: {
    action: string
    competencia?: string | null
    entidadeId?: string | null
    detalhe?: Record<string, unknown>
    modulo?: string
  },
) {
  const { error } = await supabase.from('gkit_eventos').insert({
    modulo: params.modulo || 'colab',
    competencia: params.competencia || null,
    action: params.action,
    entidade_tipo: 'colab_uber_despesa',
    entidade_id: params.entidadeId || null,
    detalhe: params.detalhe || {},
  })

  if (error) {
    console.warn('[uber] falha ao registrar auditoria:', error.message)
  }
}

async function createUberExpense(
  formData: FormData,
  options: {
    context: UberContext
    eventModule: 'colab' | 'uber'
    permission: string
    targetPath: string
  },
) {
  const { context, eventModule, permission, targetPath } = options

  if (!canAccess(context.permissions, permission)) {
    fail('Usuario sem permissao para lancar despesas Uber.', targetPath)
  }

  const profileResult = await getGkitFlexProfileByEmail(context.usuario.email)
  if (profileResult.error || !profileResult.data) {
    fail('Cadastro de colaborador nao localizado no GKIT Flex.', targetPath)
  }

  const clienteId = text(formData, 'cliente_id')
  const descricao = text(formData, 'descricao')
  const dataDespesa = safeDate(text(formData, 'data_despesa'))
  const veiculoProprio = text(formData, 'veiculo_proprio') === 'on'
  const quilometragem = veiculoProprio ? decimal(formData, 'quilometragem') : null
  const valor = veiculoProprio
    ? Math.round(Number(quilometragem || 0) * PRIVATE_VEHICLE_COST_PER_KM * 100) / 100
    : money(formData, 'valor')
  const receipt = formData.get('recibo')

  if (!clienteId) fail('Selecione o cliente do Ciclo.', targetPath)
  if (!descricao) fail('Informe a descricao da corrida.', targetPath)
  if (veiculoProprio && (!quilometragem || quilometragem <= 0)) fail('Informe a quilometragem do veiculo proprio.', targetPath)
  if (valor <= 0) fail('Informe um valor maior que zero.', targetPath)
  if (!veiculoProprio) {
    if (!(receipt instanceof File) || !receipt.size) fail('Anexe o recibo da Uber.', targetPath)
    if (receipt.size > MAX_RECEIPT_SIZE) fail('O recibo deve ter ate 10 MB.', targetPath)
    if (receipt.type && !ALLOWED_RECEIPT_TYPES.has(receipt.type)) fail('Use recibo em PDF, JPG, PNG ou WEBP.', targetPath)
  }

  const supabase = admin()
  const { data: cliente, error: clienteError } = await supabase
    .schema('ciclo')
    .from('clientes')
    .select('id,nome,ativo')
    .eq('id', clienteId)
    .single()

  if (clienteError || !cliente || cliente.ativo === false) fail('Cliente do Ciclo nao localizado ou inativo.', targetPath)

  const competencia = competenciaFromDate(dataDespesa)
  const { data: duplicate, error: duplicateError } = await supabase
    .from('colab_uber_despesas')
    .select('id, status')
    .eq('colaborador_usuario_id', context.usuario.id)
    .eq('cliente_id', cliente.id)
    .eq('data_despesa', dataDespesa)
    .eq('valor', valor)
    .neq('status', 'rejeitado')
    .limit(1)
    .maybeSingle()

  if (duplicateError) fail(`Nao foi possivel validar duplicidade: ${duplicateError.message}`, targetPath)
  if (duplicate) {
    await logUberEvent(supabase, {
      action: 'bloquear_despesa_uber_duplicada',
      competencia,
      entidadeId: String(duplicate.id || ''),
      modulo: eventModule,
      detalhe: {
        cliente_id: cliente.id,
        cliente: cliente.nome,
        data_despesa: dataDespesa,
        valor,
        status_existente: duplicate.status,
      },
    })
    fail('Ja existe um lancamento de Uber com o mesmo cliente, data e valor.', targetPath)
  }

  const profile = profileResult.data as Record<string, unknown>
  let receiptName: string | null = null
  let receiptPath: string | null = null
  let receiptType: string | null = null
  let receiptSize: number | null = null

  if (!veiculoProprio && receipt instanceof File) {
    const safeReceiptName = safeFileName(receipt.name)
    receiptName = receipt.name || safeReceiptName
    receiptPath = `${context.usuario.id}/${randomUUID()}-${safeReceiptName}`
    receiptType = receipt.type || null
    receiptSize = receipt.size
    const receiptBuffer = Buffer.from(await receipt.arrayBuffer())

    const upload = await supabase.storage.from(RECEIPT_BUCKET).upload(receiptPath, receiptBuffer, {
      contentType: receipt.type || 'application/octet-stream',
      upsert: false,
    })

    if (upload.error) {
      await logUberEvent(supabase, {
        action: 'falha_upload_recibo_uber',
        competencia,
        modulo: eventModule,
        detalhe: {
          cliente_id: cliente.id,
          cliente: cliente.nome,
          data_despesa: dataDespesa,
          valor,
          recibo_nome: receipt.name || receiptName,
          erro: upload.error.message,
        },
      })
      fail(`Nao foi possivel anexar o recibo: ${upload.error.message}`, targetPath)
    }
  }

  const { error: insertError } = await supabase.from('colab_uber_despesas').insert({
    colaborador_usuario_id: context.usuario.id,
    colaborador_flex_id: profile.id || null,
    cliente_id: cliente.id,
    cliente_nome_snapshot: cliente.nome,
    data_despesa: dataDespesa,
    competencia,
    descricao,
    valor,
    veiculo_proprio: veiculoProprio,
    quilometragem,
    custo_por_km: veiculoProprio ? PRIVATE_VEHICLE_COST_PER_KM : null,
    recibo_bucket: RECEIPT_BUCKET,
    recibo_path: receiptPath,
    recibo_nome: receiptName,
    recibo_tipo: receiptType,
    recibo_tamanho: receiptSize,
    status: veiculoProprio ? 'reembolso_solicitado' : 'lancado',
    created_by: context.authUser.id,
  })

  if (insertError) {
    if (receiptPath) await supabase.storage.from(RECEIPT_BUCKET).remove([receiptPath])
    await logUberEvent(supabase, {
      action: 'falha_gravar_despesa_uber',
      competencia,
      modulo: eventModule,
      detalhe: {
        cliente_id: cliente.id,
        cliente: cliente.nome,
        data_despesa: dataDespesa,
        valor,
        recibo_path: receiptPath,
        veiculo_proprio: veiculoProprio,
        quilometragem,
        erro: insertError.message,
      },
    })
    fail(`Nao foi possivel gravar a despesa: ${insertError.message}`, targetPath)
  }

  await logUberEvent(supabase, {
    action: 'lancar_despesa_uber',
    competencia,
    modulo: eventModule,
    detalhe: {
      cliente_id: cliente.id,
      cliente: cliente.nome,
      valor,
      veiculo_proprio: veiculoProprio,
      quilometragem,
      custo_por_km: veiculoProprio ? PRIVATE_VEHICLE_COST_PER_KM : null,
    },
  })

  revalidatePath('/modulos/colab')
  revalidatePath('/modulos/colab/uber')
  revalidatePath('/modulos/uber')
  redirect(`${targetPath}?ok=1`)
}

export async function createColabUberExpenseAction(formData: FormData) {
  return createUberExpense(formData, {
    context: await requireColabContext(),
    eventModule: 'colab',
    permission: 'colab.uber.write',
    targetPath: '/modulos/colab/uber',
  })
}

export async function createStandaloneUberExpenseAction(formData: FormData) {
  return createUberExpense(formData, {
    context: await requireUberContext(),
    eventModule: 'uber',
    permission: 'uber.write',
    targetPath: '/modulos/uber',
  })
}
