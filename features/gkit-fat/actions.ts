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

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key)
  return value || null
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

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

async function getActiveEmpresaEmissora(id?: string | null) {
  const query = admin().schema('gkit_fat').from('empresas_emissoras').select('*')
  const result = id
    ? await query.eq('id', id).maybeSingle()
    : await query.eq('ativo', true).order('nome', { ascending: true }).limit(1).maybeSingle()

  if (result.error) throw new Error(result.error.message)
  return (result.data ?? null) as Record<string, any> | null
}

function buildNfsePayload(ordem: Record<string, any>, empresa: Record<string, any> | null) {
  const tomador = recordValue(ordem.tomador_snapshot)
  const servico = recordValue(ordem.servico_snapshot)
  return {
    ambiente: empresa?.ambiente ?? 'homologacao',
    emissor: {
      nome: empresa?.nome ?? null,
      razao_social: empresa?.razao_social ?? null,
      cnpj: empresa?.cnpj ?? null,
      inscricao_municipal: empresa?.inscricao_municipal ?? null,
      municipio: empresa?.municipio ?? null,
      codigo_municipio_ibge: empresa?.codigo_municipio_ibge ?? null,
      regime_tributario: empresa?.regime_tributario ?? null,
    },
    tomador,
    servico: {
      codigo: ordem.servico_codigo ?? '03220',
      descricao: ordem.descricao_servico ?? servico.descricao_servico ?? 'Servicos advocaticios',
      item_lc116: servico.item_lc116 ?? '17.14',
      aliquota_iss: empresa?.aliquota_iss ?? null,
      iss_retido: ordem.iss_retido ?? empresa?.iss_retido_padrao ?? false,
      valor_servico: Number(ordem.valor_total ?? 0),
    },
    os: {
      id: ordem.id,
      numero: ordem.numero,
      competencia: ordem.competencia,
      data_vencimento: ordem.data_vencimento,
    },
  }
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

export async function saveGkitFatEmpresaEmissoraAction(formData: FormData) {
  const context = await requireWrite('gkit_fat.configuracoes.write', '/modulos/gkit-fat/configuracoes')
  const id = text(formData, 'id')
  const payload = {
    nome: required(text(formData, 'nome'), 'Nome'),
    razao_social: nullableText(formData, 'razao_social'),
    cnpj: nullableText(formData, 'cnpj'),
    inscricao_municipal: nullableText(formData, 'inscricao_municipal'),
    municipio: nullableText(formData, 'municipio'),
    codigo_municipio_ibge: nullableText(formData, 'codigo_municipio_ibge'),
    regime_tributario: nullableText(formData, 'regime_tributario'),
    regime_especial_tributacao: nullableText(formData, 'regime_especial_tributacao'),
    ambiente: text(formData, 'ambiente') === 'producao' ? 'producao' : 'homologacao',
    serie_rps: nullableText(formData, 'serie_rps'),
    proximo_numero_rps: intValue(formData, 'proximo_numero_rps'),
    aliquota_iss: text(formData, 'aliquota_iss') ? money(formData, 'aliquota_iss') : null,
    iss_retido_padrao: boolValue(formData, 'iss_retido_padrao'),
    certificado_alias: nullableText(formData, 'certificado_alias'),
    certificado_validade: optionalDate(formData, 'certificado_validade'),
    observacoes: nullableText(formData, 'observacoes'),
    ativo: boolValue(formData, 'ativo'),
    atualizado_por: context.usuario.id,
  }

  const result = id
    ? await admin().schema('gkit_fat').from('empresas_emissoras').update(payload).eq('id', id)
    : await admin().schema('gkit_fat').from('empresas_emissoras').insert({ ...payload, criado_por: context.usuario.id })

  if (result.error) throw new Error(result.error.message)
  revalidatePath('/modulos/gkit-fat/configuracoes')
  revalidatePath('/modulos/gkit-fat/faturas')
  redirect('/modulos/gkit-fat/configuracoes')
}

export async function prepareGkitFatNfseAction(formData: FormData) {
  const context = await requireWrite('gkit_fat.nfse.write', '/modulos/gkit-fat/faturas')
  const id = required(text(formData, 'id'), 'OS')
  const empresaId = text(formData, 'empresa_emissora_id') || null
  const { data: ordem, error } = await admin().schema('gkit_fat').from('ordens_servico').select('*').eq('id', id).single()
  if (error || !ordem) throw new Error(error?.message ?? 'OS nao encontrada.')
  const empresa = await getActiveEmpresaEmissora(empresaId)
  const payload = buildNfsePayload(ordem as Record<string, any>, empresa)
  const validacao = {
    ok: true,
    erros: [] as string[],
    alertas: [] as string[],
  }
  const tomador = recordValue((ordem as Record<string, any>).tomador_snapshot)
  if (!empresa) validacao.erros.push('Empresa emissora nao configurada.')
  if (!empresa?.cnpj) validacao.erros.push('CNPJ da empresa emissora ausente.')
  if (!empresa?.municipio) validacao.erros.push('Municipio da empresa emissora ausente.')
  if (!String(tomador.documento ?? '').trim()) validacao.erros.push('CPF/CNPJ do tomador ausente.')
  if (Number((ordem as Record<string, any>).valor_total ?? 0) <= 0) validacao.erros.push('Valor da OS precisa ser maior que zero.')
  if (!String(tomador.email ?? '').trim()) validacao.alertas.push('E-mail fiscal do tomador ausente.')
  validacao.ok = validacao.erros.length === 0

  const statusNovo = validacao.ok ? 'manual_pendente' : 'nao_configurada'
  const update = await admin()
    .schema('gkit_fat')
    .from('ordens_servico')
    .update({
      empresa_emissora_id: empresa?.id ?? null,
      serie_rps: empresa?.serie_rps ?? null,
      numero_rps: empresa?.proximo_numero_rps ? String(empresa.proximo_numero_rps) : null,
      nfse_payload: payload,
      validacao_fiscal: validacao,
      situacao_fiscal: statusNovo,
      situacao_operacional: validacao.ok ? 'pronta_para_faturar' : 'em_conferencia',
      atualizado_por: context.usuario.id,
    })
    .eq('id', id)

  if (update.error) throw new Error(update.error.message)
  await admin().schema('gkit_fat').from('nfse_eventos').insert({
    ordem_servico_id: id,
    tipo_evento: validacao.ok ? 'manual_pendente' : 'pre_nota',
    status_fiscal_anterior: (ordem as Record<string, any>).situacao_fiscal,
    status_fiscal_novo: statusNovo,
    payload: { nfse_payload: payload, validacao },
    observacoes: validacao.ok ? 'Pre-nota conferida e pronta para emissao manual.' : 'Pre-nota possui pendencias de configuracao fiscal.',
    criado_por: context.usuario.id,
  })

  revalidatePath('/modulos/gkit-fat')
  revalidatePath('/modulos/gkit-fat/faturas')
  revalidatePath(`/modulos/gkit-fat/faturas/${id}`)
  redirect(`/modulos/gkit-fat/faturas/${id}`)
}

export async function registerGkitFatNfseManualAction(formData: FormData) {
  const context = await requireWrite('gkit_fat.nfse.write', '/modulos/gkit-fat/faturas')
  const id = required(text(formData, 'id'), 'OS')
  const resultado = text(formData, 'resultado') === 'rejeitada' ? 'rejeitada' : 'autorizada'
  const { data: ordem, error } = await admin().schema('gkit_fat').from('ordens_servico').select('*').eq('id', id).single()
  if (error || !ordem) throw new Error(error?.message ?? 'OS nao encontrada.')

  const payload = resultado === 'autorizada'
    ? {
        situacao_fiscal: 'autorizada',
        situacao_operacional: 'faturada',
        data_emissao: new Date().toISOString(),
        data_autorizacao: new Date().toISOString(),
        numero_nfse: required(text(formData, 'numero_nfse'), 'Numero da NFS-e'),
        codigo_verificacao: nullableText(formData, 'codigo_verificacao'),
        nfse_url: nullableText(formData, 'nfse_url'),
        xml_url: nullableText(formData, 'xml_url'),
        pdf_url: nullableText(formData, 'pdf_url'),
        retorno_emissao: {
          modo: 'manual',
          numero_nfse: text(formData, 'numero_nfse'),
          codigo_verificacao: text(formData, 'codigo_verificacao'),
          registrado_em: new Date().toISOString(),
        },
        atualizado_por: context.usuario.id,
      }
    : {
        situacao_fiscal: 'rejeitada',
        situacao_operacional: 'em_conferencia',
        motivo_rejeicao: required(text(formData, 'motivo_rejeicao'), 'Motivo da rejeicao'),
        retorno_emissao: {
          modo: 'manual',
          rejeitada: true,
          motivo: text(formData, 'motivo_rejeicao'),
          registrado_em: new Date().toISOString(),
        },
        atualizado_por: context.usuario.id,
      }

  const update = await admin().schema('gkit_fat').from('ordens_servico').update(payload).eq('id', id)
  if (update.error) throw new Error(update.error.message)
  await admin().schema('gkit_fat').from('nfse_eventos').insert({
    ordem_servico_id: id,
    tipo_evento: resultado,
    status_fiscal_anterior: (ordem as Record<string, any>).situacao_fiscal,
    status_fiscal_novo: resultado,
    payload,
    observacoes: nullableText(formData, 'observacoes') ?? (resultado === 'autorizada' ? 'NFS-e autorizada em emissor externo.' : text(formData, 'motivo_rejeicao')),
    criado_por: context.usuario.id,
  })

  revalidatePath('/modulos/gkit-fat')
  revalidatePath('/modulos/gkit-fat/faturas')
  revalidatePath(`/modulos/gkit-fat/faturas/${id}`)
  redirect(`/modulos/gkit-fat/faturas/${id}`)
}
