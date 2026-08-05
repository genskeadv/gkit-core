'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getGkitFlexProfileByEmail, requireColabContext } from '@/features/colab/queries'

const RECEIPT_BUCKET = 'colab-uber-recibos'
const MAX_RECEIPT_SIZE = 10 * 1024 * 1024
const ALLOWED_RECEIPT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

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

function fail(message: string): never {
  redirect(`/modulos/colab/uber?erro=${encodeURIComponent(message)}`)
}

async function logUberEvent(
  supabase: ReturnType<typeof admin>,
  params: {
    action: string
    competencia?: string | null
    entidadeId?: string | null
    detalhe?: Record<string, unknown>
  },
) {
  const { error } = await supabase.from('gkit_eventos').insert({
    modulo: 'colab',
    competencia: params.competencia || null,
    action: params.action,
    entidade_tipo: 'colab_uber_despesa',
    entidade_id: params.entidadeId || null,
    detalhe: params.detalhe || {},
  })

  if (error) {
    console.warn('[colab_uber] falha ao registrar auditoria:', error.message)
  }
}

export async function createColabUberExpenseAction(formData: FormData) {
  const context = await requireColabContext()
  const profileResult = await getGkitFlexProfileByEmail(context.usuario.email)
  if (profileResult.error || !profileResult.data) fail('Cadastro de colaborador não localizado no GKIT Flex.')

  const clienteId = text(formData, 'cliente_id')
  const descricao = text(formData, 'descricao')
  const dataDespesa = safeDate(text(formData, 'data_despesa'))
  const valor = money(formData, 'valor')
  const receipt = formData.get('recibo')

  if (!clienteId) fail('Selecione o cliente do Ciclo.')
  if (!descricao) fail('Informe a descrição da corrida.')
  if (valor <= 0) fail('Informe um valor maior que zero.')
  if (!(receipt instanceof File) || !receipt.size) fail('Anexe o recibo da Uber.')
  if (receipt.size > MAX_RECEIPT_SIZE) fail('O recibo deve ter até 10 MB.')
  if (receipt.type && !ALLOWED_RECEIPT_TYPES.has(receipt.type)) fail('Use recibo em PDF, JPG, PNG ou WEBP.')

  const supabase = admin()
  const { data: cliente, error: clienteError } = await supabase
    .schema('ciclo')
    .from('clientes')
    .select('id,nome,ativo')
    .eq('id', clienteId)
    .single()

  if (clienteError || !cliente || cliente.ativo === false) fail('Cliente do Ciclo não localizado ou inativo.')

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

  if (duplicateError) fail(`Não foi possível validar duplicidade: ${duplicateError.message}`)
  if (duplicate) {
    await logUberEvent(supabase, {
      action: 'bloquear_despesa_uber_duplicada',
      competencia,
      entidadeId: String(duplicate.id || ''),
      detalhe: {
        cliente_id: cliente.id,
        cliente: cliente.nome,
        data_despesa: dataDespesa,
        valor,
        status_existente: duplicate.status,
      },
    })
    fail('Já existe um lançamento de Uber com o mesmo cliente, data e valor.')
  }

  const profile = profileResult.data as Record<string, unknown>
  const receiptName = safeFileName(receipt.name)
  const receiptPath = `${context.usuario.id}/${randomUUID()}-${receiptName}`
  const receiptBuffer = Buffer.from(await receipt.arrayBuffer())

  const upload = await supabase.storage.from(RECEIPT_BUCKET).upload(receiptPath, receiptBuffer, {
    contentType: receipt.type || 'application/octet-stream',
    upsert: false,
  })

  if (upload.error) {
    await logUberEvent(supabase, {
      action: 'falha_upload_recibo_uber',
      competencia,
      detalhe: {
        cliente_id: cliente.id,
        cliente: cliente.nome,
        data_despesa: dataDespesa,
        valor,
        recibo_nome: receipt.name || receiptName,
        erro: upload.error.message,
      },
    })
    fail(`Não foi possível anexar o recibo: ${upload.error.message}`)
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
    recibo_bucket: RECEIPT_BUCKET,
    recibo_path: receiptPath,
    recibo_nome: receipt.name || receiptName,
    recibo_tipo: receipt.type || null,
    recibo_tamanho: receipt.size,
    created_by: context.authUser.id,
  })

  if (insertError) {
    await supabase.storage.from(RECEIPT_BUCKET).remove([receiptPath])
    await logUberEvent(supabase, {
      action: 'falha_gravar_despesa_uber',
      competencia,
      detalhe: {
        cliente_id: cliente.id,
        cliente: cliente.nome,
        data_despesa: dataDespesa,
        valor,
        recibo_path: receiptPath,
        erro: insertError.message,
      },
    })
    fail(`Não foi possível gravar a despesa: ${insertError.message}`)
  }

  await logUberEvent(supabase, {
    action: 'lancar_despesa_uber',
    competencia,
    detalhe: { cliente_id: cliente.id, cliente: cliente.nome, valor },
  })

  revalidatePath('/modulos/colab')
  revalidatePath('/modulos/colab/uber')
  redirect('/modulos/colab/uber?ok=1')
}
