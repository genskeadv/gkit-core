'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import * as intrActions from '@/features/intr/actions'


// Wrappers legados do INTR — exigência do Next 16 para arquivos `use server`.

export async function aceitarFixSugestaoAction(...args: Parameters<typeof intrActions.aceitarFixSugestaoAction>) {
  return intrActions.aceitarFixSugestaoAction(...args)
}


export async function confirmarConciliacaoExtratoOfx(...args: Parameters<typeof intrActions.confirmarConciliacaoExtratoOfx>) {
  return intrActions.confirmarConciliacaoExtratoOfx(...args)
}


export async function confirmarPagamentosPorTipoAction(...args: Parameters<typeof intrActions.confirmarPagamentosPorTipoAction>) {
  return intrActions.confirmarPagamentosPorTipoAction(...args)
}


export async function createIntrColaboradorAction(...args: Parameters<typeof intrActions.createIntrColaboradorAction>) {
  return intrActions.createIntrColaboradorAction(...args)
}


export async function createIntrComissaoAction(...args: Parameters<typeof intrActions.createIntrComissaoAction>) {
  return intrActions.createIntrComissaoAction(...args)
}


export async function createIntrComissaoTipoAction(...args: Parameters<typeof intrActions.createIntrComissaoTipoAction>) {
  return intrActions.createIntrComissaoTipoAction(...args)
}


export async function createIntrPagamentoAction(...args: Parameters<typeof intrActions.createIntrPagamentoAction>) {
  return intrActions.createIntrPagamentoAction(...args)
}


export async function createIntrPagamentoAgendaAction(...args: Parameters<typeof intrActions.createIntrPagamentoAgendaAction>) {
  return intrActions.createIntrPagamentoAgendaAction(...args)
}


export async function createIntrReceitaAction(...args: Parameters<typeof intrActions.createIntrReceitaAction>) {
  return intrActions.createIntrReceitaAction(...args)
}


export async function createIntrTimeAction(...args: Parameters<typeof intrActions.createIntrTimeAction>) {
  return intrActions.createIntrTimeAction(...args)
}


export async function fecharIntrFechamentoAction(...args: Parameters<typeof intrActions.fecharIntrFechamentoAction>) {
  return intrActions.fecharIntrFechamentoAction(...args)
}


export async function gerarFixPrevisaoMensalAction(...args: Parameters<typeof intrActions.gerarFixPrevisaoMensalAction>) {
  return intrActions.gerarFixPrevisaoMensalAction(...args)
}


export async function gerarFixSugestoesInteligentesAction(...args: Parameters<typeof intrActions.gerarFixSugestoesInteligentesAction>) {
  return intrActions.gerarFixSugestoesInteligentesAction(...args)
}


export async function gerarPagamentosComissoesAprovadasAction(...args: Parameters<typeof intrActions.gerarPagamentosComissoesAprovadasAction>) {
  return intrActions.gerarPagamentosComissoesAprovadasAction(...args)
}


export async function gerarPagamentosPrevistosAction(...args: Parameters<typeof intrActions.gerarPagamentosPrevistosAction>) {
  return intrActions.gerarPagamentosPrevistosAction(...args)
}


export async function importarFixExtratoCsvAction(...args: Parameters<typeof intrActions.importarFixExtratoCsvAction>) {
  return intrActions.importarFixExtratoCsvAction(...args)
}


export async function importarIntrReceitasXlsx(...args: Parameters<typeof intrActions.importarIntrReceitasXlsx>) {
  return intrActions.importarIntrReceitasXlsx(...args)
}


export async function importarIntrRecibosPagamentoPdf(...args: Parameters<typeof intrActions.importarIntrRecibosPagamentoPdf>) {
  return intrActions.importarIntrRecibosPagamentoPdf(...args)
}


export async function previewConciliacaoExtratoOfx(...args: Parameters<typeof intrActions.previewConciliacaoExtratoOfx>) {
  return intrActions.previewConciliacaoExtratoOfx(...args)
}


export async function previewIntrReceitasXlsx(...args: Parameters<typeof intrActions.previewIntrReceitasXlsx>) {
  return intrActions.previewIntrReceitasXlsx(...args)
}


export async function previewIntrRecibosPagamentoPdf(...args: Parameters<typeof intrActions.previewIntrRecibosPagamentoPdf>) {
  return intrActions.previewIntrRecibosPagamentoPdf(...args)
}


export async function recalcularIntrFechamentoAction(...args: Parameters<typeof intrActions.recalcularIntrFechamentoAction>) {
  return intrActions.recalcularIntrFechamentoAction(...args)
}


export async function rejeitarFixSugestaoAction(...args: Parameters<typeof intrActions.rejeitarFixSugestaoAction>) {
  return intrActions.rejeitarFixSugestaoAction(...args)
}


export async function updateIntrColaboradorAction(...args: Parameters<typeof intrActions.updateIntrColaboradorAction>) {
  return intrActions.updateIntrColaboradorAction(...args)
}


export async function updateIntrComissaoAction(...args: Parameters<typeof intrActions.updateIntrComissaoAction>) {
  return intrActions.updateIntrComissaoAction(...args)
}


export async function updateIntrComissaoStatusAction(...args: Parameters<typeof intrActions.updateIntrComissaoStatusAction>) {
  return intrActions.updateIntrComissaoStatusAction(...args)
}


export async function updateIntrComissaoTipoAction(...args: Parameters<typeof intrActions.updateIntrComissaoTipoAction>) {
  return intrActions.updateIntrComissaoTipoAction(...args)
}


export async function updateIntrPagamentoAction(...args: Parameters<typeof intrActions.updateIntrPagamentoAction>) {
  return intrActions.updateIntrPagamentoAction(...args)
}


export async function updateIntrPagamentoAgendaAction(...args: Parameters<typeof intrActions.updateIntrPagamentoAgendaAction>) {
  return intrActions.updateIntrPagamentoAgendaAction(...args)
}


export async function updateIntrReceitaAction(...args: Parameters<typeof intrActions.updateIntrReceitaAction>) {
  return intrActions.updateIntrReceitaAction(...args)
}


export async function updateIntrTimeAction(...args: Parameters<typeof intrActions.updateIntrTimeAction>) {
  return intrActions.updateIntrTimeAction(...args)
}

function fixAdmin() {
  return createSupabaseAdminClient() as any
}

function fixText(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function fixCompetenciaMonth(formData: FormData, key: string, label: string) {
  const value = fixText(formData, key)
  if (!value) throw new Error(`${label} é obrigatória.`)
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value.slice(0, 7)}-01`
  throw new Error(`${label} deve ser informada em mês/ano.`)
}

function fixInteger(formData: FormData, key: string, fallback: number, min: number, max: number) {
  const value = Number(fixText(formData, key) || fallback)
  if (!Number.isInteger(value) || value < min || value > max) return fallback
  return value
}


function fixUuid(formData: FormData, key: string, label: string) {
  const value = fixText(formData, key)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${label} inválido.`)
  }
  return value
}

function fixMoney(formData: FormData, key: string, label: string) {
  const raw = fixText(formData, key)
  const normalized = raw.replace(/\./g, '').replace(',', '.')
  const value = Number(normalized)
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} inválido.`)
  return value
}

async function requireFixWrite() {
  const context = await requireModuleAccess('intr')
  if (!canAccess(context.permissions, 'intr.pagamentos.write')) {
    throw new Error('Usuário sem permissão para gerar orçamento do FIX.')
  }
}

export async function gerarFixOrcamentoDespesasAction(formData: FormData) {
  await requireFixWrite()
  const competenciaBase = fixCompetenciaMonth(formData, 'competencia_base', 'Competência base')
  const meses = fixInteger(formData, 'meses_previsao', 3, 1, 12)

  const { error: recorrenciaError } = await fixAdmin()
    .schema('gkli_intr')
    .rpc('fix_gerar_despesas_recorrentes_por_historico', {
      p_competencia_base: competenciaBase,
      p_meses_previsao: meses,
    })

  if (recorrenciaError) throw new Error(recorrenciaError.message)

  const base = new Date(`${competenciaBase}T00:00:00`)
  for (let offset = 1; offset <= meses; offset += 1) {
    const competencia = new Date(base.getFullYear(), base.getMonth() + offset, 1).toISOString().slice(0, 10)
    const { error } = await fixAdmin()
      .schema('gkli_intr')
      .rpc('fix_gerar_previsao_mensal', { p_competencia: competencia })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/financeiro')
  revalidatePath('/modulos/fix/financeiro/despesas')
  revalidatePath('/modulos/fix/financeiro/orcamento')
  redirect('/modulos/fix/financeiro/orcamento')
}


export async function gerarFixValidacaoDespesasAction(formData: FormData) {
  await requireFixWrite()
  const competencia = fixCompetenciaMonth(formData, 'competencia', 'Competência')
  const tolerancia = fixMoney(formData, 'tolerancia_percentual', 'Tolerância')

  const { error } = await fixAdmin()
    .schema('gkli_intr')
    .rpc('fix_gerar_validacao_despesas', {
      p_competencia: competencia,
      p_tolerancia_percentual: tolerancia,
    })

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/financeiro')
  revalidatePath('/modulos/fix/financeiro/validacao')
  redirect('/modulos/fix/financeiro/validacao')
}

export async function ignorarFixValidacaoDespesaAction(formData: FormData) {
  await requireFixWrite()
  const validacaoId = fixUuid(formData, 'validacao_id', 'Validação')
  const motivo = fixText(formData, 'motivo')

  const { error } = await fixAdmin()
    .schema('gkli_intr')
    .rpc('fix_ignorar_validacao_despesa', {
      p_validacao_id: validacaoId,
      p_motivo: motivo,
    })

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/fix/financeiro/validacao')
}

export async function registrarFixDesvioDespesaAction(formData: FormData) {
  await requireFixWrite()
  const validacaoId = fixUuid(formData, 'validacao_id', 'Validação')
  const motivo = fixText(formData, 'motivo')

  const { error } = await fixAdmin()
    .schema('gkli_intr')
    .rpc('fix_registrar_desvio_despesa', {
      p_validacao_id: validacaoId,
      p_motivo: motivo,
    })

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/fix/financeiro/validacao')
}

export async function atualizarFixOrcamentoFuturoPorValidacaoAction(formData: FormData) {
  await requireFixWrite()
  const validacaoId = fixUuid(formData, 'validacao_id', 'Validação')
  const valorPrevisto = fixMoney(formData, 'valor_previsto', 'Valor previsto')
  const motivo = fixText(formData, 'motivo')
  const meses = fixInteger(formData, 'meses', 3, 1, 12)

  const { error } = await fixAdmin()
    .schema('gkli_intr')
    .rpc('fix_atualizar_orcamento_futuro_por_validacao', {
      p_validacao_id: validacaoId,
      p_valor_previsto: valorPrevisto,
      p_motivo: motivo,
      p_meses: meses,
    })

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/fix/financeiro/orcamento')
  revalidatePath('/modulos/fix/financeiro/validacao')
}

async function requireFixCommissionWrite() {
  const context = await requireModuleAccess('intr')
  if (!canAccess(context.permissions, 'intr.comissoes.write')) {
    throw new Error('Usuário sem permissão para aprovar comissões do FIX.')
  }
}

async function updateFixComissaoStatus(id: string, status: string, observacao?: string) {
  const payload: Record<string, unknown> = {
    status,
    atualizado_em: new Date().toISOString(),
  }
  if (status === 'aprovada') payload.aprovado_em = new Date().toISOString()
  if (status === 'rejeitada') payload.aprovado_em = null
  if (observacao) payload.observacao = observacao

  const { error } = await fixAdmin()
    .schema('gkli_intr')
    .from('comissoes')
    .update(payload)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function aprovarFixComissaoAction(formData: FormData) {
  await requireFixCommissionWrite()
  const id = fixUuid(formData, 'comissao_id', 'Comissão')
  await updateFixComissaoStatus(id, 'aprovada')
  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/comissoes')
  revalidatePath('/modulos/fix/comissoes/aprovacao')
}

export async function rejeitarFixComissaoAction(formData: FormData) {
  await requireFixCommissionWrite()
  const id = fixUuid(formData, 'comissao_id', 'Comissão')
  const motivo = fixText(formData, 'motivo')
  await updateFixComissaoStatus(id, 'rejeitada', motivo || 'Comissão rejeitada na aprovação operacional.')
  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/comissoes')
  revalidatePath('/modulos/fix/comissoes/aprovacao')
}

export async function devolverFixComissaoParaAprovacaoAction(formData: FormData) {
  await requireFixCommissionWrite()
  const id = fixUuid(formData, 'comissao_id', 'Comissão')
  await updateFixComissaoStatus(id, 'em_conferencia')
  revalidatePath('/modulos/fix/comissoes')
  revalidatePath('/modulos/fix/comissoes/aprovacao')
}

export async function aprovarFixComissoesCompetenciaAction(formData: FormData) {
  await requireFixCommissionWrite()
  const competencia = fixCompetenciaMonth(formData, 'competencia', 'Competência')
  const { error } = await fixAdmin()
    .schema('gkli_intr')
    .from('comissoes')
    .update({ status: 'aprovada', aprovado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
    .eq('competencia', competencia)
    .in('status', ['calculada', 'em_conferencia'])
  if (error) throw new Error(error.message)

  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/comissoes')
  revalidatePath('/modulos/fix/comissoes/aprovacao')
  redirect('/modulos/fix/comissoes/aprovacao')
}

async function requireFixFechamentoWrite() {
  const context = await requireModuleAccess('intr')
  if (!canAccess(context.permissions, 'intr.fechamentos.write')) {
    throw new Error('Usuário sem permissão para alterar fechamentos do FIX.')
  }
}

function fixMonthLabel(competencia: string) {
  const date = new Date(`${competencia.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return competencia
  return new Intl.DateTimeFormat('pt-BR', { month: '2-digit', year: 'numeric' }).format(date)
}

function fixNumberValue(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function fixSum(rows: Array<Record<string, unknown>>, key: string) {
  return rows.reduce((acc, row) => acc + fixNumberValue(row[key]), 0)
}

function fixAbsSum(rows: Array<Record<string, unknown>>, key: string) {
  return rows.reduce((acc, row) => acc + Math.abs(fixNumberValue(row[key])), 0)
}

async function fixSelectAll(table: string, select: string, competencia: string) {
  const { data, error } = await fixAdmin()
    .schema('gkli_intr')
    .from(table)
    .select(select)
    .eq('competencia', competencia)
    .limit(10000)
  if (error) throw new Error(error.message)
  return (data ?? []) as Array<Record<string, unknown>>
}

async function computeFixFechamentoSnapshot(competencia: string) {
  const [receitasRaw, comissoesRaw, pagamentosRaw, validacoesRaw, previsoesRaw, lancamentosResult] = await Promise.all([
    fixSelectAll('receitas', 'id,valor_recebido,status', competencia),
    fixSelectAll('comissoes', 'id,valor_comissao,status', competencia),
    fixSelectAll('pagamentos', 'id,valor_liquido,valor_bruto,status', competencia),
    fixSelectAll('financeiro_validacao_despesas', 'id,status,valor_previsto,valor_realizado,diferenca', competencia).catch(() => []),
    fixSelectAll('financeiro_previsoes', 'id,valor_previsto,macrogrupo,status', competencia).catch(() => []),
    fixAdmin()
      .schema('gkli_intr')
      .from('extrato_lancamentos')
      .select('id,valor,tipo_movimento,categoria_id,macrogrupo,status_classificacao,data_lancamento')
      .gte('data_lancamento', competencia)
      .lt('data_lancamento', new Date(new Date(`${competencia}T00:00:00`).getFullYear(), new Date(`${competencia}T00:00:00`).getMonth() + 1, 1).toISOString().slice(0, 10))
      .limit(10000),
  ])

  if (lancamentosResult.error) throw new Error(lancamentosResult.error.message)

  const receitas = receitasRaw.filter((row) => row.status !== 'cancelada')
  const comissoes = comissoesRaw.filter((row) => row.status !== 'cancelada')
  const comissoesAprovadas = comissoes.filter((row) => row.status === 'aprovada')
  const comissoesPendentes = comissoes.filter((row) => ['calculada', 'em_conferencia'].includes(String(row.status)))
  const pagamentos = pagamentosRaw.filter((row) => row.status !== 'cancelado')
  const pagamentosPendentes = pagamentos.filter((row) => ['previsto', 'em_processamento'].includes(String(row.status)))
  const despesas = ((lancamentosResult.data ?? []) as Array<Record<string, unknown>>).filter((row) => row.tipo_movimento === 'saida')
  const despesasPendentes = despesas.filter((row) => !row.categoria_id || !row.macrogrupo || row.macrogrupo === 'nao_classificado' || row.status_classificacao === 'pendente_classificacao')
  const previsoes = previsoesRaw.filter((row) => row.macrogrupo !== 'receita' && row.status !== 'cancelado')
  const validacoes = validacoesRaw
  const validacoesPendentes = validacoes.filter((row) => ['pendente', 'divergente', 'nao_localizada', 'nova_despesa'].includes(String(row.status)))

  const receitaTotal = fixSum(receitas, 'valor_recebido')
  const pagamentosPrevistosTotal = fixSum(pagamentos, 'valor_liquido') || fixSum(pagamentos, 'valor_bruto')
  const pagamentosPagosTotal = fixSum(pagamentos.filter((row) => row.status === 'pago'), 'valor_liquido') || fixSum(pagamentos.filter((row) => row.status === 'pago'), 'valor_bruto')
  const despesasTotal = fixAbsSum(despesas, 'valor')
  const orcamentoTotal = fixSum(previsoes, 'valor_previsto')
  const pendenciasTotal = despesasPendentes.length + validacoesPendentes.length + comissoesPendentes.length + pagamentosPendentes.length + (receitas.length ? 0 : 1) + (previsoes.length ? 0 : 1)

  return {
    receita_total: Number(receitaTotal.toFixed(2)),
    comissao_total: Number(fixSum(comissoesAprovadas, 'valor_comissao').toFixed(2)),
    pagamentos_previstos_total: Number(pagamentosPrevistosTotal.toFixed(2)),
    pagamentos_pagos_total: Number(pagamentosPagosTotal.toFixed(2)),
    saldo_operacional: Number((receitaTotal - despesasTotal - fixSum(comissoesAprovadas, 'valor_comissao')).toFixed(2)),
    pendencias_total: pendenciasTotal,
    fechamento_metadados: {
      receitas_total: receitas.length,
      despesas_total: despesas.length,
      despesas_pendentes: despesasPendentes.length,
      despesas_valor: Number(despesasTotal.toFixed(2)),
      orcamento_itens: previsoes.length,
      orcamento_valor: Number(orcamentoTotal.toFixed(2)),
      validacoes_total: validacoes.length,
      validacoes_pendentes: validacoesPendentes.length,
      comissoes_total: comissoes.length,
      comissoes_pendentes: comissoesPendentes.length,
      pagamentos_total: pagamentos.length,
      pagamentos_pendentes: pagamentosPendentes.length,
      calculado_em: new Date().toISOString(),
    },
  }
}

export async function recalcularFixFechamentoCompetenciaAction(formData: FormData) {
  await requireFixFechamentoWrite()
  const competencia = fixCompetenciaMonth(formData, 'competencia', 'Competência')
  const status = fixText(formData, 'status') || 'aberto'
  const observacao = fixText(formData, 'observacao') || null
  const metrics = await computeFixFechamentoSnapshot(competencia)

  const payload = {
    competencia,
    competencia_label: fixMonthLabel(competencia),
    status,
    ...metrics,
    observacao,
    fechado_em: status === 'fechado' ? new Date().toISOString() : null,
    em_analise_em: status === 'em_analise' ? new Date().toISOString() : null,
  }

  const { data, error } = await fixAdmin()
    .schema('gkli_intr')
    .from('fechamentos')
    .upsert(payload, { onConflict: 'competencia' })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  await Promise.all([
    fixAdmin().schema('gkli_intr').from('comissoes').update({ fechamento_id: data.id }).eq('competencia', competencia),
    fixAdmin().schema('gkli_intr').from('pagamentos').update({ fechamento_id: data.id }).eq('competencia', competencia),
  ])

  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/fechamentos')
  redirect(`/modulos/fix/fechamentos/${data.id}`)
}

export async function analisarFixFechamentoAction(formData: FormData) {
  await requireFixFechamentoWrite()
  const id = fixUuid(formData, 'id', 'Fechamento')
  const { data, error: getError } = await fixAdmin().schema('gkli_intr').from('fechamentos').select('competencia').eq('id', id).single()
  if (getError || !data) throw new Error(getError?.message ?? 'Fechamento não encontrado.')
  const competencia = String(data.competencia)
  const metrics = await computeFixFechamentoSnapshot(competencia)
  const { error } = await fixAdmin()
    .schema('gkli_intr')
    .from('fechamentos')
    .update({ ...metrics, status: 'em_analise', em_analise_em: new Date().toISOString(), fechado_em: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/fechamentos')
  revalidatePath(`/modulos/fix/fechamentos/${id}`)
  redirect(`/modulos/fix/fechamentos/${id}`)
}

export async function fecharFixCompetenciaAction(formData: FormData) {
  await requireFixFechamentoWrite()
  const id = fixUuid(formData, 'id', 'Fechamento')
  const { data, error: getError } = await fixAdmin().schema('gkli_intr').from('fechamentos').select('competencia').eq('id', id).single()
  if (getError || !data) throw new Error(getError?.message ?? 'Fechamento não encontrado.')
  const competencia = String(data.competencia)
  const metrics = await computeFixFechamentoSnapshot(competencia)
  if (metrics.pendencias_total > 0) {
    throw new Error(`Não é possível fechar a competência com ${metrics.pendencias_total} pendência(s).`)
  }
  const { error } = await fixAdmin()
    .schema('gkli_intr')
    .from('fechamentos')
    .update({ ...metrics, status: 'fechado', fechado_em: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/fechamentos')
  redirect('/modulos/fix/fechamentos')
}

export async function reabrirFixCompetenciaAction(formData: FormData) {
  await requireFixFechamentoWrite()
  const id = fixUuid(formData, 'id', 'Fechamento')
  const motivo = fixText(formData, 'motivo')
  if (!motivo) throw new Error('Motivo da reabertura é obrigatório.')
  const { error } = await fixAdmin()
    .schema('gkli_intr')
    .from('fechamentos')
    .update({
      status: 'reaberto',
      reaberto_em: new Date().toISOString(),
      reabertura_motivo: motivo,
      fechado_em: null,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/fechamentos')
  revalidatePath(`/modulos/fix/fechamentos/${id}`)
  redirect(`/modulos/fix/fechamentos/${id}`)
}
