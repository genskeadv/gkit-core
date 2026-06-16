'use server'

import { createHash } from 'node:crypto'
import ExcelJS from 'exceljs'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

function admin() {
  return createSupabaseAdminClient() as any
}

async function requireFlexWrite(permission: string) {
  const context = await requireModuleAccess('flex')
  if (!canAccess(context.permissions, permission)) {
    throw new Error('Usuario sem permissao para executar esta acao no Flex.')
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

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key)
  return value || null
}

function requiredText(formData: FormData, key: string, label: string) {
  const value = text(formData, key)
  if (!value) throw new Error(`${label} e obrigatorio.`)
  return value
}

function optionalUuid(formData: FormData, key: string) {
  const value = text(formData, key)
  return value || null
}

function money(formData: FormData, key: string) {
  const raw = text(formData, key).replace(/\./g, '').replace(',', '.')
  if (!raw) return 0
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${key} invalido.`)
  return parsed
}

function decimalNumber(formData: FormData, key: string) {
  const raw = text(formData, key).replace(',', '.')
  if (!raw) return 0
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${key} invalido.`)
  return parsed
}

function percent(formData: FormData, key: string) {
  const raw = text(formData, key).replace(',', '.')
  if (!raw) return 0
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${key} invalido.`)
  return parsed
}

function integer(formData: FormData, key: string, fallback = 0) {
  const raw = text(formData, key)
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${key} invalido.`)
  return parsed
}

function dateOrNull(formData: FormData, key: string) {
  const value = text(formData, key)
  return value || null
}

function aliases(formData: FormData, key = 'aliases') {
  return text(formData, key)
    .split(/[\n,;]+/g)
    .map((item) => item.trim())
    .filter(Boolean)
}

function requiredDate(formData: FormData, key: string, label: string) {
  const value = text(formData, key)
  if (!value) throw new Error(`${label} e obrigatoria.`)
  return value
}

function competenciaMonth(formData: FormData, key = 'competencia') {
  const value = requiredText(formData, key, 'Competencia')
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value.slice(0, 7)}-01`
  throw new Error('Competencia deve estar em mes/ano.')
}

function competenciaFromDate(value: string) {
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value.slice(0, 7)}-01`
  throw new Error('Data da competencia invalida.')
}

function previousMonthDate() {
  const today = new Date()
  today.setMonth(today.getMonth() - 1)
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
}

function status(formData: FormData) {
  return text(formData, 'status') || 'ativo'
}

function checked(formData: FormData, key: string) {
  const value = formData.get(key)
  return value === 'on' || value === 'true' || value === '1'
}

function timePayload(formData: FormData) {
  return {
    nome: requiredText(formData, 'nome', 'Nome'),
    descricao: optionalText(formData, 'descricao'),
    status: status(formData),
  }
}

function categoriaPayload(formData: FormData) {
  return {
    nome: requiredText(formData, 'nome', 'Nome'),
    macrogrupo: requiredText(formData, 'macrogrupo', 'Macrogrupo'),
    tipo: requiredText(formData, 'tipo', 'Tipo'),
    status: status(formData),
  }
}

function tipoPagamentoPayload(formData: FormData) {
  return {
    codigo: requiredText(formData, 'codigo', 'Codigo').toLowerCase(),
    nome: requiredText(formData, 'nome', 'Nome'),
    status: status(formData),
  }
}

function tipoComissaoPayload(formData: FormData) {
  return {
    nome: requiredText(formData, 'nome', 'Nome'),
    categoria_id: optionalUuid(formData, 'categoria_id'),
    percentual: percent(formData, 'percentual'),
    base_calculo: text(formData, 'base_calculo') || 'valor_recebido',
    escopo: text(formData, 'escopo') || 'individual',
    inicio_vigencia: dateOrNull(formData, 'inicio_vigencia'),
    fim_vigencia: dateOrNull(formData, 'fim_vigencia'),
    status: status(formData),
    observacao: optionalText(formData, 'observacao'),
  }
}

function colaboradorPayload(formData: FormData) {
  return {
    usuario_id: requiredText(formData, 'usuario_id', 'Usuario Core'),
    carteira_id: optionalUuid(formData, 'carteira_id'),
    time_id: optionalUuid(formData, 'time_id'),
    gestor_usuario_id: optionalUuid(formData, 'gestor_usuario_id'),
    cargo_operacional: optionalText(formData, 'cargo_operacional'),
    data_inicio: dateOrNull(formData, 'data_inicio'),
    status: status(formData),
    salario: money(formData, 'salario'),
    participacao_honorarios: money(formData, 'participacao_honorarios'),
    pro_labore: money(formData, 'pro_labore'),
    ajuda_custo: money(formData, 'ajuda_custo'),
    outros_vencimentos: money(formData, 'outros_vencimentos'),
    beneficio_descricao: optionalText(formData, 'beneficio_descricao'),
    beneficio_valor: money(formData, 'beneficio_valor'),
    recebe_comissoes: checked(formData, 'recebe_comissoes'),
    observacoes: optionalText(formData, 'observacoes'),
  }
}

type FlexColaboradorPayload = ReturnType<typeof colaboradorPayload>

const FLEX_COLABORADOR_PAGAMENTO_DIA = 5
const FLEX_COMISSAO_PAGAMENTO_DIA = 20

function competenciaInicioColaborador(payload: FlexColaboradorPayload) {
  return payload.data_inicio ? `${String(payload.data_inicio).slice(0, 7)}-01` : `${new Date().toISOString().slice(0, 7)}-01`
}

async function ensureFlexTipoPagamento(supabase: any, codigo: string, nome: string) {
  const { data, error } = await supabase
    .schema('flex')
    .from('tipos_pagamento')
    .upsert({ codigo, nome, status: 'ativo' }, { onConflict: 'codigo' })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id as string
}

async function syncFlexColaboradorPagamentoAgendas(supabase: any, colaboradorId: string, payload: FlexColaboradorPayload) {
  const items = [
    { codigo: 'salario', nome: 'Salario', descricao: 'Salario - cadastro colaborador', valor: payload.salario },
    { codigo: 'participacao_honorarios', nome: 'Participacao em honorarios', descricao: 'Participacao em honorarios - cadastro colaborador', valor: payload.participacao_honorarios },
    { codigo: 'pro_labore', nome: 'Pro-labore', descricao: 'Pro-labore - cadastro colaborador', valor: payload.pro_labore },
    { codigo: 'ajuda_custo', nome: 'Ajuda de custo', descricao: 'Ajuda de custo - cadastro colaborador', valor: payload.ajuda_custo },
    { codigo: 'beneficio', nome: 'Beneficio', descricao: 'Beneficio - cadastro colaborador', valor: payload.beneficio_valor },
    { codigo: 'outros_vencimentos', nome: 'Outros vencimentos', descricao: 'Outros vencimentos - cadastro colaborador', valor: payload.outros_vencimentos },
  ]
  const descricoes = items.map((item) => item.descricao)
  const { data: existentes, error: existentesError } = await supabase
    .schema('flex')
    .from('pagamento_agendas')
    .select('id,descricao')
    .eq('colaborador_id', colaboradorId)
    .in('descricao', descricoes)

  if (existentesError) throw new Error(existentesError.message)

  const existentesPorDescricao = new Map(((existentes ?? []) as any[]).map((row) => [String(row.descricao), String(row.id)]))
  const inicioCompetencia = competenciaInicioColaborador(payload)

  for (const item of items) {
    const existenteId = existentesPorDescricao.get(item.descricao)
    const valor = Number(item.valor) || 0

    if (valor <= 0) {
      if (existenteId) {
        const { error } = await supabase
          .schema('flex')
          .from('pagamento_agendas')
          .update({ status: 'inativo', valor_bruto: 0, valor_descontos: 0 })
          .eq('id', existenteId)
        if (error) throw new Error(error.message)
      }
      continue
    }

    const tipoPagamentoId = await ensureFlexTipoPagamento(supabase, item.codigo, item.nome)
    const agenda = {
      tipo_pagamento_id: tipoPagamentoId,
      colaborador_id: colaboradorId,
      time_id: payload.time_id,
      descricao: item.descricao,
      dia_previsto: FLEX_COLABORADOR_PAGAMENTO_DIA,
      valor_bruto: valor,
      valor_descontos: 0,
      percentual: 0,
      inicio_competencia: inicioCompetencia,
      fim_competencia: null,
      status: payload.status === 'ativo' ? 'ativo' : 'inativo',
    }

    const { error } = existenteId
      ? await supabase.schema('flex').from('pagamento_agendas').update(agenda).eq('id', existenteId)
      : await supabase.schema('flex').from('pagamento_agendas').insert(agenda)

    if (error) throw new Error(error.message)
  }
}

function comissaoPayload(formData: FormData) {
  const valorBase = money(formData, 'valor_base')
  const percentualValue = percent(formData, 'percentual')
  const valorComissao = money(formData, 'valor_comissao') || (valorBase * percentualValue / 100)

  return {
    receita_id: optionalUuid(formData, 'receita_id'),
    colaborador_id: requiredText(formData, 'colaborador_id', 'Colaborador'),
    tipo_comissao_id: optionalUuid(formData, 'tipo_comissao_id'),
    competencia: competenciaMonth(formData),
    valor_base: valorBase,
    percentual: percentualValue,
    valor_comissao: valorComissao,
    status: text(formData, 'status') || 'calculada',
    origem: text(formData, 'origem') || 'manual',
    observacao: optionalText(formData, 'observacao'),
  }
}

function receitaMapeamentoPayload(formData: FormData) {
  const destinoTipo = requiredText(formData, 'destino_tipo', 'Destino')
  if (!['colaborador', 'time'].includes(destinoTipo)) throw new Error('Destino invalido.')

  const colaboradorId = destinoTipo === 'colaborador' ? requiredText(formData, 'colaborador_id', 'Colaborador') : null
  const timeId = destinoTipo === 'time' ? requiredText(formData, 'time_id', 'Time') : null

  return {
    origem: text(formData, 'origem') || 'omie',
    vendedor_nome: requiredText(formData, 'vendedor_nome', 'Vendedor Omie'),
    categoria_id: optionalUuid(formData, 'categoria_id'),
    destino_tipo: destinoTipo,
    colaborador_id: colaboradorId,
    time_id: timeId,
    prioridade: integer(formData, 'prioridade', 100),
    status: status(formData),
    observacao: optionalText(formData, 'observacao'),
  }
}

function agendaPayload(formData: FormData) {
  const diaPrevisto = Math.min(Math.max(Number(text(formData, 'dia_previsto') || 5), 1), 31)

  return {
    tipo_pagamento_id: optionalUuid(formData, 'tipo_pagamento_id'),
    colaborador_id: optionalUuid(formData, 'colaborador_id'),
    time_id: optionalUuid(formData, 'time_id'),
    descricao: optionalText(formData, 'descricao'),
    dia_previsto: diaPrevisto,
    valor_bruto: money(formData, 'valor_bruto'),
    valor_descontos: money(formData, 'valor_descontos'),
    percentual: percent(formData, 'percentual'),
    inicio_competencia: competenciaMonth(formData, 'inicio_competencia'),
    fim_competencia: dateOrNull(formData, 'fim_competencia'),
    status: status(formData),
  }
}

function pagamentoPayload(formData: FormData) {
  return {
    colaborador_id: requiredText(formData, 'colaborador_id', 'Colaborador'),
    tipo_pagamento_id: optionalUuid(formData, 'tipo_pagamento_id'),
    agenda_id: optionalUuid(formData, 'agenda_id'),
    comissao_id: optionalUuid(formData, 'comissao_id'),
    competencia: competenciaMonth(formData),
    descricao: optionalText(formData, 'descricao'),
    data_prevista: dateOrNull(formData, 'data_prevista'),
    data_pagamento: dateOrNull(formData, 'data_pagamento'),
    valor_bruto: money(formData, 'valor_bruto'),
    valor_descontos: money(formData, 'valor_descontos'),
    status: text(formData, 'status') || 'previsto',
    origem: text(formData, 'origem') || 'manual',
    observacao: optionalText(formData, 'observacao'),
  }
}

async function syncFlexPagamentoComissao(supabase: any, comissao: {
  id: string
  colaborador_id: string
  competencia: string
  valor_comissao: number
}) {
  const valor = Number(comissao.valor_comissao) || 0
  if (!comissao.colaborador_id || valor <= 0) return

  const tipoPagamentoId = await ensureFlexTipoPagamento(supabase, 'comissao', 'Comissao')
  const dataPrevista = paymentDateForCompetencia(comissao.competencia, FLEX_COMISSAO_PAGAMENTO_DIA)
  const { data: existente, error: existenteError } = await supabase
    .schema('flex')
    .from('pagamentos')
    .select('id,status')
    .eq('comissao_id', comissao.id)
    .limit(1)
    .maybeSingle()

  if (existenteError) throw new Error(existenteError.message)

  const payload = {
    colaborador_id: comissao.colaborador_id,
    tipo_pagamento_id: tipoPagamentoId,
    comissao_id: comissao.id,
    competencia: comissao.competencia,
    descricao: 'Comissao aprovada',
    data_prevista: dataPrevista,
    valor_bruto: valor,
    valor_descontos: 0,
    origem: 'comissao',
  }

  if (existente?.id) {
    const updatePayload = ['previsto', 'em_processamento'].includes(String(existente.status))
      ? payload
      : { tipo_pagamento_id: tipoPagamentoId, data_prevista: dataPrevista, origem: 'comissao' }
    const { error } = await supabase.schema('flex').from('pagamentos').update(updatePayload).eq('id', existente.id)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase.schema('flex').from('pagamentos').insert({ ...payload, status: 'previsto' })
  if (error) throw new Error(error.message)
}

function receitaPayload(formData: FormData) {
  const valorRecebido = money(formData, 'valor_recebido')
  const valorBase = money(formData, 'valor_base') || valorRecebido

  return {
    colaborador_id: optionalUuid(formData, 'colaborador_id'),
    time_id: optionalUuid(formData, 'time_id'),
    categoria_id: optionalUuid(formData, 'categoria_id'),
    cliente: requiredText(formData, 'cliente', 'Cliente'),
    descricao: optionalText(formData, 'descricao'),
    competencia: competenciaMonth(formData),
    data_recebimento: dateOrNull(formData, 'data_recebimento'),
    valor_base: valorBase,
    valor_recebido: valorRecebido,
    status: text(formData, 'status') || 'realizada',
    origem: text(formData, 'origem') || 'manual',
    origem_chave: optionalText(formData, 'origem_chave'),
  }
}

function extratoPayload(formData: FormData) {
  return {
    banco: text(formData, 'banco') || 'Manual',
    conta: optionalText(formData, 'conta'),
    periodo_inicio: dateOrNull(formData, 'periodo_inicio'),
    periodo_fim: dateOrNull(formData, 'periodo_fim'),
    saldo_inicial: money(formData, 'saldo_inicial'),
    saldo_final: money(formData, 'saldo_final'),
    status: text(formData, 'status') || 'processado',
  }
}

function lancamentoPayload(formData: FormData, extratoId: string) {
  const tipo = text(formData, 'tipo') || 'saida'
  const categoriaId = optionalUuid(formData, 'categoria_id')
  const macrogrupo = optionalText(formData, 'macrogrupo')
  const previsaoDespesaId = optionalUuid(formData, 'previsao_despesa_id')

  return {
    extrato_id: extratoId,
    categoria_id: categoriaId,
    previsao_despesa_id: previsaoDespesaId,
    data_lancamento: requiredDate(formData, 'data_lancamento', 'Data do lancamento'),
    fornecedor: optionalText(formData, 'fornecedor'),
    historico: optionalText(formData, 'historico'),
    descricao: optionalText(formData, 'descricao'),
    valor: money(formData, 'valor'),
    tipo,
    macrogrupo,
    status_classificacao: categoriaId ? 'classificado' : 'pendente',
    confianca: categoriaId ? 100 : null,
    conciliado: false,
  }
}

type FlexOfxTransaction = {
  amount: number
  date: string
  fitId: string
  memo: string
  name: string
  trnType: string
}

type FlexOmieReceitaRow = {
  categoriaOmie: string | null
  cliente: string
  clienteDocumento: string | null
  clienteRazaoSocial: string | null
  competencia: string
  dataRecebimento: string
  documento: string | null
  incluidoEm: string | null
  notaFiscal: string | null
  observacoes: string | null
  origem: string | null
  origemChave: string
  parcela: string | null
  pedido: string | null
  situacao: string | null
  tipoDocumento: string | null
  valor: number
  vendedor: string | null
}

export type FlexImportPreviewState = {
  error?: string
  ok: boolean
  preview?: {
    arquivo: string
    columns: string[]
    kind: 'despesas' | 'receitas'
    rows: Array<Record<string, string>>
    summary: Array<{ label: string; value: string; hint?: string }>
    title: string
  }
}

export type FlexComissaoPreviewRow = {
  key: string
  receita_id: string
  colaborador_id: string
  tipo_comissao_id: string
  competencia: string
  cliente: string
  categoria: string
  colaborador: string
  tipo: string
  escopo: string
  valor_base: number
  percentual: number
  valor_comissao: number
  observacao: string
  geravel?: boolean
  diagnostico?: 'sem_regra' | 'sem_colaborador' | 'sem_time' | 'time_sem_membros' | 'colaborador_inelegivel' | 'base_zerada' | 'ja_gerada'
}

export type FlexComissaoPreviewState = {
  error?: string
  ok: boolean
  competencia?: string
  diagnostics?: Array<{ label: string; value: string }>
  diagnosticRows?: FlexComissaoPreviewRow[]
  rows?: FlexComissaoPreviewRow[]
  summary?: Array<{ label: string; value: string; hint?: string }>
}

const omieDataHeaders = ['data', 'ultimo recebimento', 'previsao de recebimento']
const omieClienteHeaders = ['cliente ou fornecedor', 'cliente nome fantasia']
const omieValorHeaders = ['valor r', 'valor recebido', 'valor liquido']
const omieDocumentoHeaders = ['documento', 'operacao', 'numero do boleto']
const omieNossoNumeroHeaders = ['nosso numero', 'numero do boleto', 'numero nsu cupom fiscal']
const omiePedidoHeaders = ['pedido', 'no do pedido do cliente', 'no do contrato de venda']
const omieClienteDocumentoHeaders = ['cliente ou fornecedor cnpj cpf', 'cliente cnpj cpf']
const omieClienteRazaoHeaders = ['cliente ou fornecedor razao social', 'cliente razao social']
const omieIncluidoHeaders = ['incluido em', 'inclusao']
const omieObservacaoHeaders = ['observacoes', 'observacao']
const omieOrigemReceita = new Set(['conta recebida', 'conta a receber', 'credito em conta corrente'])

function ofxTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i'))
  return match?.[1]?.trim() ?? ''
}

function ofxDate(value: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!match) return null
  return `${match[1]}-${match[2]}-${match[3]}`
}

function parseOfxAmount(value: string) {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function parseFlexOfxContent(content: string) {
  const transactionBlocks = content.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|<\/STMTTRN>)/gi) ?? []
  const transactions = transactionBlocks.map((block) => ({
    amount: parseOfxAmount(ofxTag(block, 'TRNAMT')),
    date: ofxDate(ofxTag(block, 'DTPOSTED')) ?? '',
    fitId: ofxTag(block, 'FITID') || createHash('sha1').update(block).digest('hex'),
    memo: ofxTag(block, 'MEMO'),
    name: ofxTag(block, 'NAME'),
    trnType: ofxTag(block, 'TRNTYPE'),
  })).filter((item) => item.date && item.amount !== 0)

  return {
    accountId: ofxTag(content, 'ACCTID'),
    bankId: ofxTag(content, 'BANKID'),
    branchId: ofxTag(content, 'BRANCHID'),
    end: ofxDate(ofxTag(content, 'DTEND')),
    ledgerBalance: parseOfxAmount(ofxTag(content, 'BALAMT')),
    start: ofxDate(ofxTag(content, 'DTSTART')),
    transactions,
  }
}

async function parseFlexOfxFile(formData: FormData) {
  const file = formData.get('arquivo')
  if (!(file instanceof File) || file.size === 0) throw new Error('Selecione um arquivo OFX.')
  const content = await file.text()
  const parsed = parseFlexOfxContent(content)
  if (!parsed.transactions.length) throw new Error('Nenhum lancamento OFX encontrado.')

  return {
    arquivo: file.name,
    arquivoHash: createHash('sha1').update(content).digest('hex'),
    ...parsed,
  }
}

async function parseFlexOmieReceitasFile(formData: FormData) {
  const file = formData.get('arquivo')
  if (!(file instanceof File) || file.size === 0) throw new Error('Selecione uma planilha XLSX do Omie.')
  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as any)
  const worksheet = workbook.getWorksheet('financas') ?? workbook.worksheets[0]
  if (!worksheet) throw new Error('Planilha sem abas.')

  const headerRowNumber = findOmieHeaderRow(worksheet)
  if (!headerRowNumber) throw new Error('Cabecalho do Omie nao encontrado.')

  const headers = new Map<string, number>()
  worksheet.getRow(headerRowNumber).eachCell((cell, column) => {
    const label = normalizeOmieHeader(cell.value)
    if (label) headers.set(label, column)
  })

  const requiredHeaders = [
    { label: 'data de recebimento', aliases: omieDataHeaders },
    { label: 'cliente', aliases: omieClienteHeaders },
    { label: 'categoria', aliases: ['categoria'] },
    { label: 'valor recebido', aliases: omieValorHeaders },
    { label: 'tipo de documento', aliases: ['tipo de documento'] },
  ]

  for (const header of requiredHeaders) {
    if (!hasOmieHeader(headers, header.aliases)) throw new Error(`Coluna obrigatoria ausente: ${header.label}.`)
  }

  const rows: FlexOmieReceitaRow[] = []
  for (let rowNumber = headerRowNumber + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber)
    const data = excelDate(cellValue(row, headers, omieDataHeaders))
    const cliente = excelText(cellValue(row, headers, omieClienteHeaders))
    const categoriaOmie = optionalCellText(row, headers, ['categoria'])
    const valor = numberCell(cellValue(row, headers, omieValorHeaders))
    const tipoDocumento = optionalCellText(row, headers, ['tipo de documento'])
    const origem = optionalCellText(row, headers, ['origem'])
    const situacao = optionalCellText(row, headers, ['situacao'])

    if (!data || valor <= 0) continue
    if (['SALDO', 'SALDO ANTERIOR'].includes(cliente.toUpperCase())) continue
    if (tipoDocumento?.toLowerCase() === 'tarifa') continue
    if (origem && !omieOrigemReceita.has(normalizeOmieHeader(origem))) continue
    if (!origem && situacao && normalizeOmieHeader(situacao) !== 'recebido') continue

    const documento = optionalCellText(row, headers, omieDocumentoHeaders)
    const notaFiscal = optionalCellText(row, headers, ['nota fiscal'])
    const parcela = optionalCellText(row, headers, ['parcela'])
    const nossoNumero = optionalCellText(row, headers, omieNossoNumeroHeaders)
    const pedido = optionalCellText(row, headers, omiePedidoHeaders)
    const clienteDocumento = optionalCellText(row, headers, omieClienteDocumentoHeaders)
    const clienteRazaoSocial = optionalCellText(row, headers, omieClienteRazaoHeaders)
    const incluidoEm = excelDateTime(cellValue(row, headers, omieIncluidoHeaders))

    rows.push({
      categoriaOmie,
      cliente: valueText(cliente, valueText(clienteRazaoSocial, 'Cliente Omie')),
      clienteDocumento,
      clienteRazaoSocial,
      competencia: `${data.slice(0, 7)}-01`,
      dataRecebimento: data,
      documento,
      incluidoEm,
      notaFiscal,
      observacoes: optionalCellText(row, headers, omieObservacaoHeaders),
      origem,
      origemChave: omieReceitaKey({ nossoNumero, notaFiscal, documento, pedido, clienteDocumento, data, valor, rowNumber }),
      parcela,
      pedido,
      situacao,
      tipoDocumento,
      valor,
      vendedor: optionalCellText(row, headers, ['vendedor']),
    })
  }

  if (!rows.length) throw new Error('Nenhuma receita Omie valida encontrada.')

  return {
    arquivo: file.name,
    arquivoHash: createHash('sha1').update(buffer).digest('hex'),
    rows,
    worksheet: worksheet.name,
  }
}

function formatPreviewMoney(value: number) {
  return value.toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })
}

function previewDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR')
}

function receitaCategoriaOrigem(value: unknown, fallback?: unknown) {
  return valueText(value, valueText(fallback, 'Sem categoria Omie'))
}

async function getReceitaCategoriaMapeamentos(supabase: any) {
  const { data, error } = await supabase
    .schema('flex')
    .from('receita_categoria_mapeamentos')
    .select('categoria_origem,categoria_id,status')
    .eq('origem', 'omie')
    .eq('status', 'ativo')
    .limit(1000)

  if (error) return new Map<string, string>()

  return new Map(((data ?? []) as any[]).map((row) => [
    String(row.categoria_origem ?? '').trim().toLowerCase(),
    String(row.categoria_id),
  ]))
}

async function salvarReceitaCategoriaMapeamento(supabase: any, categoriaOrigem: string, categoriaId: string, observacao?: string | null) {
  const { data, error } = await supabase
    .schema('flex')
    .from('receita_categoria_mapeamentos')
    .select('id,categoria_origem')
    .eq('origem', 'omie')
    .limit(1000)

  if (error) {
    throw new Error(`Cadastro de rotas de receita indisponivel. Execute sql/38_flex_receita_categoria_mapeamentos.sql no Supabase. Detalhe: ${error.message}`)
  }

  const existente = ((data ?? []) as any[]).find((row) => String(row.categoria_origem ?? '').trim().toLowerCase() === categoriaOrigem.trim().toLowerCase())
  const payload = {
    categoria_origem: categoriaOrigem,
    categoria_id: categoriaId,
    origem: 'omie',
    status: 'ativo',
    observacao: observacao ?? null,
    atualizado_em: new Date().toISOString(),
  }

  const result = existente?.id
    ? await supabase.schema('flex').from('receita_categoria_mapeamentos').update(payload).eq('id', existente.id)
    : await supabase.schema('flex').from('receita_categoria_mapeamentos').insert(payload)

  if (result.error) throw new Error(result.error.message)
}

type DespesaCategoriaMapping = {
  categoria_id: string
  macrogrupo: string | null
  termo_origem: string
}

async function getDespesaCategoriaMapeamentos(supabase: any): Promise<DespesaCategoriaMapping[]> {
  const { data, error } = await supabase
    .schema('flex')
    .from('despesa_categoria_mapeamentos')
    .select('termo_origem,categoria_id,macrogrupo,status,categoria:categoria_id(macrogrupo)')
    .eq('origem', 'ofx')
    .eq('status', 'ativo')
    .limit(1000)

  if (error) return []

  return ((data ?? []) as any[]).map((row) => ({
    categoria_id: String(row.categoria_id),
    macrogrupo: valueText(row.macrogrupo, valueText(row.categoria?.macrogrupo, 'operacional')),
    termo_origem: String(row.termo_origem ?? '').trim(),
  })).filter((row) => row.termo_origem)
}

function matchDespesaCategoriaMapeamento(transaction: FlexOfxTransaction, mapeamentos: DespesaCategoriaMapping[]) {
  if (transaction.amount >= 0) return null
  const source = normalizeForMatch(`${transaction.name} ${transaction.memo}`)
  return mapeamentos.find((row) => source.includes(normalizeForMatch(row.termo_origem))) ?? null
}

async function salvarDespesaCategoriaMapeamento(supabase: any, termoOrigem: string, categoriaId: string, macrogrupo?: string | null, observacao?: string | null) {
  const { data, error } = await supabase
    .schema('flex')
    .from('despesa_categoria_mapeamentos')
    .select('id,termo_origem')
    .eq('origem', 'ofx')
    .limit(1000)

  if (error) {
    throw new Error(`Cadastro de rotas de despesa indisponivel. Execute sql/39_flex_despesa_categoria_mapeamentos.sql no Supabase. Detalhe: ${error.message}`)
  }

  const existente = ((data ?? []) as any[]).find((row) => String(row.termo_origem ?? '').trim().toLowerCase() === termoOrigem.trim().toLowerCase())
  const payload = {
    termo_origem: termoOrigem,
    categoria_id: categoriaId,
    macrogrupo: macrogrupo || null,
    origem: 'ofx',
    status: 'ativo',
    observacao: observacao ?? null,
    atualizado_em: new Date().toISOString(),
  }

  const result = existente?.id
    ? await supabase.schema('flex').from('despesa_categoria_mapeamentos').update(payload).eq('id', existente.id)
    : await supabase.schema('flex').from('despesa_categoria_mapeamentos').insert(payload)

  if (result.error) throw new Error(result.error.message)
}

async function aplicarDespesaCategoriaMapeamentoAtual(supabase: any, termoOrigem: string, categoriaId: string, macrogrupo?: string | null) {
  const { data, error } = await supabase
    .schema('flex')
    .from('extrato_lancamentos')
    .select('id,fornecedor,descricao,historico,tipo,categoria_id')
    .eq('tipo', 'saida')
    .is('categoria_id', null)
    .limit(5000)

  if (error) throw new Error(error.message)

  const normalizedTerm = normalizeForMatch(termoOrigem)
  const ids = ((data ?? []) as any[])
    .filter((row) => normalizeForMatch(`${row.fornecedor ?? ''} ${row.descricao ?? ''} ${row.historico ?? ''}`).includes(normalizedTerm))
    .map((row) => row.id)

  for (let index = 0; index < ids.length; index += 500) {
    const batch = ids.slice(index, index + 500)
    const { error: updateError } = await supabase
      .schema('flex')
      .from('extrato_lancamentos')
      .update({
        categoria_id: categoriaId,
        macrogrupo,
        status_classificacao: 'classificado',
        confianca: 90,
      })
      .in('id', batch)

    if (updateError) throw new Error(updateError.message)
  }

  return ids.length
}

function findOmieHeaderRow(worksheet: ExcelJS.Worksheet) {
  for (let rowNumber = 1; rowNumber <= Math.min(worksheet.rowCount, 50); rowNumber++) {
    const row = worksheet.getRow(rowNumber)
    const headers = new Map<string, number>()
    row.eachCell((cell, column) => {
      const label = normalizeOmieHeader(cell.value)
      if (label) headers.set(label, column)
    })
    if (
      hasOmieHeader(headers, ['situacao'])
      && hasOmieHeader(headers, omieDataHeaders)
      && hasOmieHeader(headers, omieClienteHeaders)
      && hasOmieHeader(headers, ['categoria'])
      && hasOmieHeader(headers, omieValorHeaders)
    ) {
      return rowNumber
    }
  }
  return null
}

function hasOmieHeader(headers: Map<string, number>, aliases: string[]) {
  return aliases.some((alias) => headers.has(alias))
}

function normalizeOmieHeader(value: unknown) {
  return excelText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[º°]/g, 'o')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function cellValue(row: ExcelJS.Row, headers: Map<string, number>, aliases: string | string[]) {
  const column = (Array.isArray(aliases) ? aliases : [aliases])
    .map((alias) => headers.get(normalizeOmieHeader(alias)))
    .find((item): item is number => typeof item === 'number')
  return typeof column === 'number' ? row.getCell(column).value : null
}

function optionalCellText(row: ExcelJS.Row, headers: Map<string, number>, aliases: string | string[]) {
  const value = excelText(cellValue(row, headers, aliases))
  return value || null
}

function excelText(value: unknown) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object' && 'text' in value) return valueText((value as { text?: unknown }).text)
  if (typeof value === 'object' && 'result' in value) return valueText((value as { result?: unknown }).result)
  return valueText(value)
}

function numberCell(value: unknown) {
  if (typeof value === 'number') return value
  const parsed = Number(excelText(value).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function excelDate(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const textValue = excelText(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(textValue)) return textValue.slice(0, 10)
  if (/^\d{2}\/\d{2}\/\d{4}/.test(textValue)) {
    const [day, month, year] = textValue.slice(0, 10).split('/')
    return `${year}-${month}-${day}`
  }
  return null
}

function excelDateTime(value: unknown) {
  if (value instanceof Date) return value.toISOString()
  const textValue = excelText(value)
  return textValue || null
}

function omieReceitaKey({
  data,
  documento,
  notaFiscal,
  nossoNumero,
  pedido,
  clienteDocumento,
  rowNumber,
  valor,
}: {
  data: string
  documento: string | null
  notaFiscal: string | null
  nossoNumero: string | null
  pedido: string | null
  clienteDocumento: string | null
  rowNumber: number
  valor: number
}) {
  const stable = nossoNumero || notaFiscal || [documento, pedido, clienteDocumento, data, valor.toFixed(2)].filter(Boolean).join('|')
  return `omie:${stable || `linha-${rowNumber}`}`
}

function flexOfxDescription(transaction: FlexOfxTransaction) {
  return valueText(transaction.memo, valueText(transaction.name, transaction.fitId))
}

function flexOfxFornecedor(transaction: FlexOfxTransaction) {
  return valueText(transaction.name, flexOfxDescription(transaction))
}

function matchPrevisaoDespesa(transaction: FlexOfxTransaction, previsoes: any[]) {
  if (transaction.amount >= 0) return null
  const source = normalizeForMatch(`${transaction.name} ${transaction.memo}`)
  return bestPrevisaoMatch(previsoes, source, Math.abs(transaction.amount))?.previsao ?? null
}

function previsaoDespesaPayload(formData: FormData) {
  const diaPrevisto = Math.min(Math.max(Number(text(formData, 'dia_previsto') || 5), 1), 31)

  return {
    fornecedor: requiredText(formData, 'fornecedor', 'Fornecedor'),
    tipo_despesa: requiredText(formData, 'tipo_despesa', 'Tipo de despesa'),
    aliases: aliases(formData),
    categoria_id: optionalUuid(formData, 'categoria_id'),
    macrogrupo: optionalText(formData, 'macrogrupo'),
    valor_previsto: money(formData, 'valor_previsto'),
    dia_previsto: diaPrevisto,
    competencia_inicio: competenciaMonth(formData, 'competencia_inicio'),
    competencia_fim: dateOrNull(formData, 'competencia_fim'),
    recorrente: text(formData, 'recorrente') !== 'false',
    status: text(formData, 'status') || 'ativo',
    origem: text(formData, 'origem') || 'manual',
    observacao: optionalText(formData, 'observacao'),
  }
}

export async function createFlexTimeAction(formData: FormData) {
  await requireFlexWrite('flex.colaboradores.write')
  const { data, error } = await admin().schema('flex').from('times').insert(timePayload(formData)).select('id').single()
  if (error) throw new Error(error.message)
  redirect(`/modulos/flex/times/${data.id}`)
}

export async function updateFlexTimeAction(formData: FormData) {
  await requireFlexWrite('flex.colaboradores.write')
  const id = requiredText(formData, 'id', 'ID')
  const { error } = await admin().schema('flex').from('times').update(timePayload(formData)).eq('id', id)
  if (error) throw new Error(error.message)
  redirect('/modulos/flex/times')
}

export async function createFlexColaboradorAction(formData: FormData) {
  await requireFlexWrite('flex.colaboradores.write')
  const payload = colaboradorPayload(formData)
  const supabase = admin()
  const { data: existente, error: existingError } = await supabase
    .schema('flex')
    .from('colaboradores')
    .select('id')
    .eq('usuario_id', payload.usuario_id)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (existente?.id) {
    await syncFlexColaboradorPagamentoAgendas(supabase, existente.id, payload)
    revalidatePath('/modulos/flex/colaboradores')
    revalidatePath('/modulos/flex/financeiro/previsao')
    redirect('/modulos/flex/colaboradores')
  }

  const { data, error } = await supabase.schema('flex').from('colaboradores').insert(payload).select('id').single()
  if (error) throw new Error(error.message)
  await syncFlexColaboradorPagamentoAgendas(supabase, data.id, payload)
  revalidatePath('/modulos/flex/colaboradores')
  revalidatePath('/modulos/flex/financeiro/previsao')
  redirect('/modulos/flex/colaboradores')
}

export async function updateFlexColaboradorAction(formData: FormData) {
  await requireFlexWrite('flex.colaboradores.write')
  const id = requiredText(formData, 'id', 'ID')
  const payload = colaboradorPayload(formData)
  const supabase = admin()
  const { error } = await supabase.schema('flex').from('colaboradores').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
  await syncFlexColaboradorPagamentoAgendas(supabase, id, payload)
  revalidatePath('/modulos/flex/colaboradores')
  revalidatePath(`/modulos/flex/colaboradores/${id}`)
  revalidatePath('/modulos/flex/financeiro/previsao')
  redirect('/modulos/flex/colaboradores')
}

export async function createFlexCategoriaAction(formData: FormData) {
  await requireFlexWrite('flex.configuracoes.write')
  const { data, error } = await admin().schema('flex').from('categorias_financeiras').insert(categoriaPayload(formData)).select('id').single()
  if (error) throw new Error(error.message)
  redirect(`/modulos/flex/configuracoes/categorias/${data.id}`)
}

export async function updateFlexCategoriaAction(formData: FormData) {
  await requireFlexWrite('flex.configuracoes.write')
  const id = requiredText(formData, 'id', 'ID')
  const { error } = await admin().schema('flex').from('categorias_financeiras').update(categoriaPayload(formData)).eq('id', id)
  if (error) throw new Error(error.message)
  redirect('/modulos/flex/configuracoes/categorias')
}

export async function createFlexTipoPagamentoAction(formData: FormData) {
  await requireFlexWrite('flex.configuracoes.write')
  const { data, error } = await admin().schema('flex').from('tipos_pagamento').insert(tipoPagamentoPayload(formData)).select('id').single()
  if (error) throw new Error(error.message)
  redirect(`/modulos/flex/configuracoes/tipos-pagamento/${data.id}`)
}

export async function updateFlexTipoPagamentoAction(formData: FormData) {
  await requireFlexWrite('flex.configuracoes.write')
  const id = requiredText(formData, 'id', 'ID')
  const { error } = await admin().schema('flex').from('tipos_pagamento').update(tipoPagamentoPayload(formData)).eq('id', id)
  if (error) throw new Error(error.message)
  redirect('/modulos/flex/configuracoes/tipos-pagamento')
}

export async function createFlexTipoComissaoAction(formData: FormData) {
  await requireFlexWrite('flex.comissoes.write')
  const { data, error } = await admin().schema('flex').from('tipos_comissao').insert(tipoComissaoPayload(formData)).select('id').single()
  if (error) throw new Error(error.message)
  redirect(`/modulos/flex/tipos-comissao/${data.id}`)
}

export async function updateFlexTipoComissaoAction(formData: FormData) {
  await requireFlexWrite('flex.comissoes.write')
  const id = requiredText(formData, 'id', 'ID')
  const { error } = await admin().schema('flex').from('tipos_comissao').update(tipoComissaoPayload(formData)).eq('id', id)
  if (error) throw new Error(error.message)
  redirect('/modulos/flex/tipos-comissao')
}

export async function createFlexReceitaMapeamentoAction(formData: FormData) {
  await requireFlexWrite('flex.comissoes.write')
  const { data, error } = await admin().schema('flex').from('receita_mapeamentos').insert(receitaMapeamentoPayload(formData)).select('id').single()
  if (error) throw new Error(error.message)
  redirect(`/modulos/flex/comissoes/mapeamentos/${data.id}`)
}

export async function updateFlexReceitaMapeamentoAction(formData: FormData) {
  await requireFlexWrite('flex.comissoes.write')
  const id = requiredText(formData, 'id', 'ID')
  const { error } = await admin().schema('flex').from('receita_mapeamentos').update(receitaMapeamentoPayload(formData)).eq('id', id)
  if (error) throw new Error(error.message)
  redirect('/modulos/flex/comissoes/mapeamentos')
}

type ReceitaVendedorMapping = {
  categoria_id: string | null
  colaborador_id: string | null
  destino_tipo: 'colaborador' | 'time'
  normalized: string
  prioridade: number
  time_id: string | null
  vendedor_nome: string
}

async function getReceitaVendedorMapeamentos(supabase: any): Promise<ReceitaVendedorMapping[]> {
  const [mapResult, timesResult] = await Promise.all([
    supabase
      .schema('flex')
      .from('receita_mapeamentos')
      .select('id,vendedor_nome,categoria_id,destino_tipo,colaborador_id,time_id,prioridade,status')
      .eq('origem', 'omie')
      .eq('status', 'ativo')
      .order('prioridade', { ascending: true }),
    supabase
      .schema('flex')
      .from('times')
      .select('id,nome,status')
      .eq('status', 'ativo')
      .limit(500),
  ])

  if (mapResult.error) throw new Error(mapResult.error.message)
  if (timesResult.error) throw new Error(timesResult.error.message)

  const manual = ((mapResult.data ?? []) as any[]).map((item) => ({
    categoria_id: item.categoria_id ?? null,
    colaborador_id: item.destino_tipo === 'colaborador' ? item.colaborador_id ?? null : null,
    destino_tipo: item.destino_tipo === 'colaborador' ? 'colaborador' as const : 'time' as const,
    normalized: normalizeForMatch(item.vendedor_nome),
    prioridade: Number(item.prioridade) || 100,
    time_id: item.destino_tipo === 'time' ? item.time_id ?? null : null,
    vendedor_nome: valueText(item.vendedor_nome, 'Vendedor Omie'),
  })).filter((item) => item.normalized && (item.colaborador_id || item.time_id))

  const manualKeys = new Set(manual.map((item) => `${item.normalized}:${item.categoria_id ?? ''}`))
  const automaticosPorTime = ((timesResult.data ?? []) as any[]).map((time) => {
    const normalized = normalizeForMatch(time.nome)
    return {
      categoria_id: null,
      colaborador_id: null,
      destino_tipo: 'time' as const,
      normalized,
      prioridade: 1000,
      time_id: String(time.id),
      vendedor_nome: valueText(time.nome, 'Time'),
    }
  }).filter((item) => item.normalized && !manualKeys.has(`${item.normalized}:`))

  return [...manual, ...automaticosPorTime].sort((a, b) => a.prioridade - b.prioridade)
}

function matchReceitaVendedorMapeamento(mappings: ReceitaVendedorMapping[], vendedor: unknown, categoriaId?: string | null) {
  const normalized = normalizeForMatch(vendedor)
  if (!normalized) return null
  return mappings.find((item) => item.normalized === normalized && (!item.categoria_id || item.categoria_id === categoriaId)) ?? null
}

async function aplicarFlexMapeamentosReceitas(supabase: any, competencia?: string) {
  let receitaQuery = supabase
    .schema('flex')
    .from('receitas')
    .select('id,categoria_id,colaborador_id,time_id,metadata')
    .eq('origem', 'omie_financas')
    .is('colaborador_id', null)
    .is('time_id', null)
    .limit(5000)

  if (competencia) receitaQuery = receitaQuery.eq('competencia', competencia)

  const [mappings, receitaResult] = await Promise.all([
    getReceitaVendedorMapeamentos(supabase),
    receitaQuery,
  ])

  if (receitaResult.error) throw new Error(receitaResult.error.message)

  const updates = ((receitaResult.data ?? []) as any[])
    .map((receita) => {
      const mapping = matchReceitaVendedorMapeamento(mappings, receita.metadata?.vendedor_omie, receita.categoria_id)
      if (!mapping) return null
      return {
        id: receita.id,
        colaborador_id: mapping.destino_tipo === 'colaborador' ? mapping.colaborador_id : null,
        time_id: mapping.destino_tipo === 'time' ? mapping.time_id : null,
      }
    })
    .filter(Boolean) as Array<{ id: string; colaborador_id: string | null; time_id: string | null }>

  for (const update of updates) {
    const { error } = await supabase
      .schema('flex')
      .from('receitas')
      .update({ colaborador_id: update.colaborador_id, time_id: update.time_id })
      .eq('id', update.id)

    if (error) throw new Error(error.message)
  }

  return updates.length
}

export async function aplicarFlexMapeamentosReceitasAction() {
  await requireFlexWrite('flex.comissoes.write')
  await aplicarFlexMapeamentosReceitas(admin())
  redirect('/modulos/flex/comissoes/mapeamentos')
}

export async function createFlexReceitaAction(formData: FormData) {
  const context = await requireFlexWrite('flex.importacoes.write')
  const supabase = admin()
  const payload = receitaPayload(formData)

  const { data: importacao, error: importError } = await supabase
    .schema('flex')
    .from('importacoes')
    .insert({
      tipo: 'receitas',
      origem: payload.origem,
      arquivo_nome: text(formData, 'arquivo_nome') || 'Receita manual',
      status: 'processado',
      total_itens: 1,
      total_processados: 1,
      usuario_id: context.usuario.id,
    })
    .select('id')
    .single()

  if (importError) throw new Error(importError.message)

  const { error } = await supabase
    .schema('flex')
    .from('receitas')
    .insert({ ...payload, importacao_id: importacao.id })

  if (error) throw new Error(error.message)
  redirect('/modulos/flex/financeiro/receitas')
}

export async function updateFlexReceitaClassificacaoAction(formData: FormData) {
  await requireFlexWrite('flex.financeiro.write')
  const id = requiredText(formData, 'id', 'Receita')
  const { error } = await admin()
    .schema('flex')
    .from('receitas')
    .update({
      categoria_id: optionalUuid(formData, 'categoria_id'),
      colaborador_id: optionalUuid(formData, 'colaborador_id'),
      time_id: optionalUuid(formData, 'time_id'),
      descricao: optionalText(formData, 'descricao'),
      status: text(formData, 'status') || 'realizada',
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/modulos/flex/financeiro')
  revalidatePath('/modulos/flex/financeiro/receitas')
  redirect('/modulos/flex/financeiro?pendencias=receitas')
}

export async function updateFlexReceitaCategoriaLoteAction(formData: FormData) {
  await requireFlexWrite('flex.financeiro.write')
  const categoriaOrigem = requiredText(formData, 'categoria_origem', 'Categoria de origem')
  const categoriaId = requiredText(formData, 'categoria_id', 'Categoria Flex')
  const supabase = admin()

  await salvarReceitaCategoriaMapeamento(supabase, categoriaOrigem, categoriaId, 'Criado a partir da classificacao em lote de receitas.')

  const { data, error } = await supabase
    .schema('flex')
    .from('receitas')
    .select('id,descricao,metadata')
    .is('categoria_id', null)
    .limit(5000)

  if (error) throw new Error(error.message)

  const ids = ((data ?? []) as any[])
    .filter((row) => valueText(row.metadata?.categoria_omie, valueText(row.descricao, 'Sem categoria Omie')) === categoriaOrigem)
    .map((row) => row.id)

  if (!ids.length) throw new Error('Nenhuma receita pendente encontrada para essa categoria de origem.')

  for (let index = 0; index < ids.length; index += 500) {
    const batch = ids.slice(index, index + 500)
    const { error: updateError } = await supabase
      .schema('flex')
      .from('receitas')
      .update({
        categoria_id: categoriaId,
        status: 'realizada',
        atualizado_em: new Date().toISOString(),
      })
      .in('id', batch)

    if (updateError) throw new Error(updateError.message)
  }

  revalidatePath('/modulos/flex/financeiro')
  revalidatePath('/modulos/flex/financeiro/receitas')
  redirect('/modulos/flex/financeiro/receitas#receitas-pendentes')
}

export async function upsertFlexReceitaCategoriaMapeamentoAction(formData: FormData) {
  await requireFlexWrite('flex.financeiro.write')
  const categoriaOrigem = requiredText(formData, 'categoria_origem', 'Categoria Omie')
  const categoriaId = requiredText(formData, 'categoria_id', 'Categoria Flex')
  const observacao = optionalText(formData, 'observacao')

  await salvarReceitaCategoriaMapeamento(admin(), categoriaOrigem, categoriaId, observacao)

  revalidatePath('/modulos/flex/financeiro')
  revalidatePath('/modulos/flex/financeiro/receitas')
  redirect('/modulos/flex/financeiro#rotas-receitas')
}

export async function updateFlexDespesaCategoriaLoteAction(formData: FormData) {
  await requireFlexWrite('flex.financeiro.write')
  const termoOrigem = requiredText(formData, 'termo_origem', 'Termo de origem')
  const categoriaId = requiredText(formData, 'categoria_id', 'Categoria Flex')
  const macrogrupo = optionalText(formData, 'macrogrupo')
  const supabase = admin()

  await salvarDespesaCategoriaMapeamento(supabase, termoOrigem, categoriaId, macrogrupo, 'Criado a partir da classificacao em lote de despesas.')
  const total = await aplicarDespesaCategoriaMapeamentoAtual(supabase, termoOrigem, categoriaId, macrogrupo)
  if (!total) throw new Error('Nenhuma despesa pendente encontrada para esse termo de origem.')

  revalidatePath('/modulos/flex/financeiro')
  revalidatePath('/modulos/flex/financeiro/despesas')
  redirect('/modulos/flex/financeiro#rotas-despesas')
}

export async function upsertFlexDespesaCategoriaMapeamentoAction(formData: FormData) {
  await requireFlexWrite('flex.financeiro.write')
  const termoOrigem = requiredText(formData, 'termo_origem', 'Termo do extrato')
  const categoriaId = requiredText(formData, 'categoria_id', 'Categoria Flex')
  const macrogrupo = optionalText(formData, 'macrogrupo')
  const observacao = optionalText(formData, 'observacao')
  const supabase = admin()

  await salvarDespesaCategoriaMapeamento(supabase, termoOrigem, categoriaId, macrogrupo, observacao)
  await aplicarDespesaCategoriaMapeamentoAtual(supabase, termoOrigem, categoriaId, macrogrupo)

  revalidatePath('/modulos/flex/financeiro')
  revalidatePath('/modulos/flex/financeiro/despesas')
  redirect('/modulos/flex/financeiro#rotas-despesas')
}

export async function importarFlexReceitasOmieAction(formData: FormData) {
  const context = await requireFlexWrite('flex.importacoes.write')
  const parsed = await parseFlexOmieReceitasFile(formData)
  const supabase = admin()
  const origemChaves = parsed.rows.map((row) => row.origemChave)

  const [duplicadosResult, categoriaMapeamentos] = await Promise.all([
    supabase
      .schema('flex')
      .from('receitas')
      .select('origem_chave')
      .in('origem_chave', origemChaves),
    getReceitaCategoriaMapeamentos(supabase),
  ])

  if (duplicadosResult.error) throw new Error(duplicadosResult.error.message)

  const existing = new Set(((duplicadosResult.data ?? []) as any[]).map((row) => String(row.origem_chave)))
  const novas = parsed.rows.filter((row) => !existing.has(row.origemChave))

  const { data: importacao, error: importError } = await supabase
    .schema('flex')
    .from('importacoes')
    .insert({
      tipo: 'receitas',
      origem: 'Omie financas',
      arquivo_nome: parsed.arquivo,
      arquivo_hash: parsed.arquivoHash,
      status: 'processado',
      total_itens: parsed.rows.length,
      total_processados: novas.length,
      total_alertas: parsed.rows.length - novas.length,
      usuario_id: context.usuario.id,
      metadata: {
        aba: parsed.worksheet,
        duplicados: parsed.rows.length - novas.length,
        layout: 'omie_financas_movimentacao',
      },
    })
    .select('id')
    .single()

  if (importError) throw new Error(importError.message)

  if (novas.length) {
    const rows = novas.map((row) => {
      const categoriaOrigem = receitaCategoriaOrigem(row.categoriaOmie)
      const categoriaId = categoriaMapeamentos.get(categoriaOrigem.toLowerCase()) ?? null

      return {
        importacao_id: importacao.id,
        categoria_id: categoriaId,
        cliente: row.cliente,
        descricao: row.categoriaOmie,
        competencia: row.competencia,
        data_recebimento: row.dataRecebimento,
        valor_base: row.valor,
        valor_recebido: row.valor,
        status: 'realizada',
        origem: 'omie_financas',
        origem_chave: row.origemChave,
        metadata: {
          categoria_omie: row.categoriaOmie,
          categoria_flex_automatica: Boolean(categoriaId),
          cliente_documento: row.clienteDocumento,
          cliente_razao_social: row.clienteRazaoSocial,
          documento: row.documento,
          incluido_em: row.incluidoEm,
          nota_fiscal: row.notaFiscal,
          observacoes: row.observacoes,
          origem_omie: row.origem,
          parcela: row.parcela,
          pedido: row.pedido,
          situacao: row.situacao,
          tipo_documento: row.tipoDocumento,
          vendedor_omie: row.vendedor,
        },
      }
    })

    const { error } = await supabase.schema('flex').from('receitas').insert(rows)
    if (error) throw new Error(error.message)
    await aplicarFlexMapeamentosReceitas(supabase)
  }

  redirect('/modulos/flex/financeiro/receitas')
}

export async function previewFlexReceitasOmieAction(_previousState: FlexImportPreviewState, formData: FormData): Promise<FlexImportPreviewState> {
  try {
    await requireFlexWrite('flex.importacoes.write')
    const parsed = await parseFlexOmieReceitasFile(formData)
    const origemChaves = parsed.rows.map((row) => row.origemChave)
    const supabase = admin()
    const [duplicadosResult, categoriaMapeamentos, vendedorMapeamentos] = await Promise.all([
      supabase
        .schema('flex')
        .from('receitas')
        .select('origem_chave')
        .in('origem_chave', origemChaves),
      getReceitaCategoriaMapeamentos(supabase),
      getReceitaVendedorMapeamentos(supabase),
    ])

    if (duplicadosResult.error) throw new Error(duplicadosResult.error.message)

    const duplicados = new Set(((duplicadosResult.data ?? []) as any[]).map((row) => String(row.origem_chave)))
    const novas = parsed.rows.filter((row) => !duplicados.has(row.origemChave))
    const competencias = new Set(parsed.rows.map((row) => row.competencia.slice(0, 7)))
    const categorias = new Set(parsed.rows.map((row) => row.categoriaOmie).filter(Boolean))
    const vendedores = new Set(parsed.rows.map((row) => row.vendedor).filter(Boolean))
    const automaticas = novas.filter((row) => categoriaMapeamentos.has(receitaCategoriaOrigem(row.categoriaOmie).toLowerCase())).length
    const vendedoresMapeados = novas.filter((row) => {
      const categoriaId = categoriaMapeamentos.get(receitaCategoriaOrigem(row.categoriaOmie).toLowerCase()) ?? null
      return Boolean(matchReceitaVendedorMapeamento(vendedorMapeamentos, row.vendedor, categoriaId))
    }).length
    const total = parsed.rows.reduce((sum, row) => sum + row.valor, 0)

    return {
      ok: true,
      preview: {
        arquivo: parsed.arquivo,
        columns: ['Data', 'Cliente', 'Categoria Omie', 'Vendedor', 'Valor', 'Status'],
        kind: 'receitas',
        rows: parsed.rows.slice(0, 8).map((row) => {
          const categoriaId = categoriaMapeamentos.get(receitaCategoriaOrigem(row.categoriaOmie).toLowerCase()) ?? null
          const vendedorMapeado = matchReceitaVendedorMapeamento(vendedorMapeamentos, row.vendedor, categoriaId)

          return {
            'Data': previewDate(row.dataRecebimento),
            'Cliente': row.cliente,
            'Categoria Omie': row.categoriaOmie ?? '-',
            'Vendedor': row.vendedor ?? '-',
            'Valor': formatPreviewMoney(row.valor),
            'Status': duplicados.has(row.origemChave) ? 'Duplicada' : vendedorMapeado ? 'Nova com time' : categoriaMapeamentos.has(receitaCategoriaOrigem(row.categoriaOmie).toLowerCase()) ? 'Nova classificada' : 'Nova pendente',
          }
        }),
        summary: [
          { label: 'Linhas lidas', value: String(parsed.rows.length), hint: `${novas.length} nova(s)` },
          { label: 'Duplicadas', value: String(parsed.rows.length - novas.length), hint: 'pela chave Omie' },
          { label: 'Auto classificadas', value: String(automaticas), hint: 'por rota de Gestão' },
          { label: 'Vendedores mapeados', value: String(vendedoresMapeados), hint: 'por regra ou nome do time' },
          { label: 'Valor total', value: formatPreviewMoney(total), hint: 'arquivo completo' },
          { label: 'Competências', value: String(competencias.size), hint: Array.from(competencias).join(', ') || '-' },
          { label: 'Categorias Omie', value: String(categorias.size), hint: 'distintas no arquivo' },
          { label: 'Vendedores', value: String(vendedores.size), hint: 'preenchidos no Omie' },
        ],
        title: 'Prévia das receitas Omie',
      },
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Nao foi possivel pre-visualizar o arquivo.' }
  }
}

export async function createFlexExtratoLancamentoAction(formData: FormData) {
  const context = await requireFlexWrite('flex.importacoes.write')
  const supabase = admin()

  const { data: importacao, error: importError } = await supabase
    .schema('flex')
    .from('importacoes')
    .insert({
      tipo: 'extrato',
      origem: text(formData, 'banco') || 'Manual',
      arquivo_nome: text(formData, 'arquivo_nome') || 'Extrato manual',
      status: 'processado',
      total_itens: 1,
      total_processados: 1,
      usuario_id: context.usuario.id,
    })
    .select('id')
    .single()

  if (importError) throw new Error(importError.message)

  const { data: extrato, error: extratoError } = await supabase
    .schema('flex')
    .from('extratos')
    .insert({ ...extratoPayload(formData), importacao_id: importacao.id })
    .select('id')
    .single()

  if (extratoError) throw new Error(extratoError.message)

  const { error } = await supabase
    .schema('flex')
    .from('extrato_lancamentos')
    .insert(lancamentoPayload(formData, extrato.id))

  if (error) throw new Error(error.message)
  const competencia = competenciaFromDate(requiredDate(formData, 'data_lancamento', 'Data lancamento'))
  await gerarFlexValidacaoItens(competencia, supabase)
  redirect(`/modulos/flex/financeiro/despesas?competencia=${competencia.slice(0, 7)}`)
}

export async function updateFlexExtratoLancamentoAction(formData: FormData) {
  await requireFlexWrite('flex.financeiro.write')
  const id = requiredText(formData, 'id', 'Lancamento')
  const categoriaId = optionalUuid(formData, 'categoria_id')
  const macrogrupo = optionalText(formData, 'macrogrupo')
  let previsaoDespesaId = optionalUuid(formData, 'previsao_despesa_id')
  const dataLancamento = requiredDate(formData, 'data_lancamento', 'Data do lancamento')
  const valor = money(formData, 'valor')
  const fornecedor = optionalText(formData, 'fornecedor')
  const descricao = optionalText(formData, 'descricao')
  const supabase = admin()

  if (formData.get('criar_previsao') === 'on' && !previsaoDespesaId) {
    const { data: previsao, error: previsaoError } = await supabase
      .schema('flex')
      .from('previsoes_despesa')
      .insert({
        fornecedor: valueText(fornecedor, valueText(descricao, 'Fornecedor pendente')),
        tipo_despesa: valueText(descricao, valueText(fornecedor, 'Despesa importada')),
        categoria_id: categoriaId,
        macrogrupo: macrogrupo ?? 'operacional',
        valor_previsto: valor,
        dia_previsto: Number(dataLancamento.slice(8, 10)),
        competencia_inicio: competenciaFromDate(dataLancamento),
        recorrente: true,
        status: 'ativo',
        origem: 'extrato',
      })
      .select('id')
      .single()
    if (previsaoError) throw new Error(previsaoError.message)
    previsaoDespesaId = previsao.id
  }

  const status = categoriaId ? 'classificado' : 'pendente'
  const { error } = await supabase
    .schema('flex')
    .from('extrato_lancamentos')
    .update({
      categoria_id: categoriaId,
      previsao_despesa_id: previsaoDespesaId,
      data_lancamento: dataLancamento,
      fornecedor,
      descricao,
      historico: optionalText(formData, 'historico'),
      valor,
      macrogrupo,
      status_classificacao: status,
      confianca: status === 'classificado' ? 100 : null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  const competencia = competenciaFromDate(dataLancamento)
  await gerarFlexValidacaoItens(competencia, supabase)
  revalidatePath('/modulos/flex/financeiro/despesas')
  redirect(`/modulos/flex/financeiro/despesas?competencia=${competencia.slice(0, 7)}`)
}

export async function importarFlexExtratoOfxAction(formData: FormData) {
  const context = await requireFlexWrite('flex.importacoes.write')
  const parsed = await parseFlexOfxFile(formData)
  const supabase = admin()
  const fitIds = parsed.transactions.map((item) => item.fitId)

  const [duplicados, previsoes, despesaMapeamentos] = await Promise.all([
    supabase
      .schema('flex')
      .from('extrato_lancamentos')
      .select('origem_chave')
      .in('origem_chave', fitIds),
    supabase
      .schema('flex')
      .from('previsoes_despesa')
      .select('id,fornecedor,tipo_despesa,aliases,categoria_id,macrogrupo,status,competencia_inicio,competencia_fim,valor_previsto,dia_previsto')
      .eq('status', 'ativo')
      .limit(1000),
    getDespesaCategoriaMapeamentos(supabase),
  ])

  if (duplicados.error) throw new Error(duplicados.error.message)
  if (previsoes.error) throw new Error(previsoes.error.message)

  const existing = new Set(((duplicados.data ?? []) as any[]).map((row) => String(row.origem_chave)))
  const newTransactions = parsed.transactions.filter((transaction) => !existing.has(transaction.fitId))
  const previsaoRows = (previsoes.data ?? []) as any[]

  const { data: importacao, error: importError } = await supabase
    .schema('flex')
    .from('importacoes')
    .insert({
      tipo: 'extrato',
      origem: 'Banco Inter OFX',
      arquivo_nome: parsed.arquivo,
      arquivo_hash: parsed.arquivoHash,
      status: 'processado',
      total_itens: parsed.transactions.length,
      total_processados: newTransactions.length,
      total_alertas: parsed.transactions.length - newTransactions.length,
      usuario_id: context.usuario.id,
      metadata: {
        banco: parsed.bankId,
        agencia: parsed.branchId,
        conta: parsed.accountId,
        duplicados: parsed.transactions.length - newTransactions.length,
      },
    })
    .select('id')
    .single()

  if (importError) throw new Error(importError.message)

  const { data: extrato, error: extratoError } = await supabase
    .schema('flex')
    .from('extratos')
    .insert({
      importacao_id: importacao.id,
      banco: parsed.bankId ? `Banco Inter ${parsed.bankId}` : 'Banco Inter',
      conta: parsed.accountId,
      periodo_inicio: parsed.start,
      periodo_fim: parsed.end,
      saldo_final: parsed.ledgerBalance,
      status: 'processado',
    })
    .select('id')
    .single()

  if (extratoError) throw new Error(extratoError.message)

  const rows = newTransactions.map((transaction) => {
    const tipo = transaction.amount < 0 ? 'saida' : 'entrada'
    const previsao = matchPrevisaoDespesa(transaction, previsaoRows)
    const rotaDespesa = previsao?.categoria_id ? null : matchDespesaCategoriaMapeamento(transaction, despesaMapeamentos)
    const categoriaId = previsao?.categoria_id ?? rotaDespesa?.categoria_id ?? null
    const macrogrupo = previsao?.macrogrupo ?? rotaDespesa?.macrogrupo ?? null
    const hasClassification = Boolean(categoriaId)

    return {
      extrato_id: extrato.id,
      categoria_id: categoriaId,
      previsao_despesa_id: previsao?.id ?? null,
      data_lancamento: transaction.date,
      fornecedor: flexOfxFornecedor(transaction),
      historico: flexOfxDescription(transaction),
      descricao: flexOfxDescription(transaction),
      valor: Math.abs(transaction.amount),
      tipo,
      macrogrupo,
      status_classificacao: tipo === 'saida' && !hasClassification ? 'pendente' : 'classificado',
      confianca: hasClassification ? 85 : null,
      conciliado: false,
      origem_chave: transaction.fitId,
      metadata: {
        trnType: transaction.trnType,
        fitId: transaction.fitId,
        valor_original: transaction.amount,
        categoria_flex_automatica: Boolean(rotaDespesa),
        memo: transaction.memo,
        name: transaction.name,
        rota_despesa: rotaDespesa?.termo_origem ?? null,
      },
    }
  })

  if (rows.length) {
    const { error } = await supabase.schema('flex').from('extrato_lancamentos').insert(rows)
    if (error) throw new Error(error.message)
  }

  const competenciaBase = parsed.start || parsed.transactions[0]?.date || parsed.end
  if (!competenciaBase) throw new Error('Nao foi possivel identificar a competencia do extrato.')
  const competencia = competenciaFromDate(competenciaBase)
  await gerarFlexValidacaoItens(competencia, supabase)
  redirect(`/modulos/flex/financeiro/despesas?competencia=${competencia.slice(0, 7)}`)
}

export async function previewFlexExtratoOfxAction(_previousState: FlexImportPreviewState, formData: FormData): Promise<FlexImportPreviewState> {
  try {
    await requireFlexWrite('flex.importacoes.write')
    const parsed = await parseFlexOfxFile(formData)
    const fitIds = parsed.transactions.map((item) => item.fitId)
    const supabase = admin()

    const [duplicados, previsoes, despesaMapeamentos] = await Promise.all([
      supabase
        .schema('flex')
        .from('extrato_lancamentos')
        .select('origem_chave')
        .in('origem_chave', fitIds),
      supabase
        .schema('flex')
        .from('previsoes_despesa')
        .select('id,fornecedor,tipo_despesa,aliases,categoria_id,macrogrupo,status,competencia_inicio,competencia_fim,valor_previsto,dia_previsto')
        .eq('status', 'ativo')
        .limit(1000),
      getDespesaCategoriaMapeamentos(supabase),
    ])

    if (duplicados.error) throw new Error(duplicados.error.message)
    if (previsoes.error) throw new Error(previsoes.error.message)

    const existing = new Set(((duplicados.data ?? []) as any[]).map((row) => String(row.origem_chave)))
    const previsaoRows = (previsoes.data ?? []) as any[]
    const novas = parsed.transactions.filter((transaction) => !existing.has(transaction.fitId))
    const saidas = parsed.transactions.filter((transaction) => transaction.amount < 0)
    const entradas = parsed.transactions.filter((transaction) => transaction.amount > 0)
    const saidasNovas = novas.filter((transaction) => transaction.amount < 0)
    const classificadas = saidasNovas.filter((transaction) => Boolean(matchPrevisaoDespesa(transaction, previsaoRows)))
    const autoRotas = saidasNovas.filter((transaction) => !matchPrevisaoDespesa(transaction, previsaoRows) && Boolean(matchDespesaCategoriaMapeamento(transaction, despesaMapeamentos)))
    const pendentes = saidasNovas.length - classificadas.length - autoRotas.length
    const totalSaidas = saidas.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0)
    const totalEntradas = entradas.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0)

    return {
      ok: true,
      preview: {
        arquivo: parsed.arquivo,
        columns: ['Data', 'Descrição', 'Tipo', 'Valor', 'Classificação', 'Status'],
        kind: 'despesas',
        rows: parsed.transactions.slice(0, 8).map((transaction) => {
          const previsao = matchPrevisaoDespesa(transaction, previsaoRows)
          const rotaDespesa = previsao ? null : matchDespesaCategoriaMapeamento(transaction, despesaMapeamentos)
          const tipo = transaction.amount < 0 ? 'Saída' : 'Entrada'
          return {
            'Data': previewDate(transaction.date),
            'Descrição': flexOfxDescription(transaction),
            'Tipo': tipo,
            'Valor': formatPreviewMoney(Math.abs(transaction.amount)),
            'Classificação': transaction.amount < 0 ? (previsao ? valueText(previsao.tipo_despesa, 'Prevista') : rotaDespesa ? `Rota: ${rotaDespesa.termo_origem}` : 'Pendente') : 'Entrada',
            'Status': existing.has(transaction.fitId) ? 'Duplicada' : 'Nova',
          }
        }),
        summary: [
          { label: 'Lançamentos', value: String(parsed.transactions.length), hint: `${novas.length} novo(s)` },
          { label: 'Duplicados', value: String(parsed.transactions.length - novas.length), hint: 'por FITID' },
          { label: 'Saídas', value: formatPreviewMoney(totalSaidas), hint: `${saidas.length} lançamento(s)` },
          { label: 'Entradas', value: formatPreviewMoney(totalEntradas), hint: `${entradas.length} lançamento(s)` },
          { label: 'Classificadas', value: String(classificadas.length), hint: 'por previsão ativa' },
          { label: 'Auto rotas', value: String(autoRotas.length), hint: 'por rota de Gestão' },
          { label: 'Pendentes', value: String(pendentes), hint: 'saídas novas sem regra' },
        ],
        title: 'Prévia do extrato OFX',
      },
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Nao foi possivel pre-visualizar o arquivo.' }
  }
}

export async function createFlexPrevisaoDespesaAction(formData: FormData) {
  await requireFlexWrite('flex.financeiro.write')
  const { error } = await admin().schema('flex').from('previsoes_despesa').insert(previsaoDespesaPayload(formData))
  if (error) throw new Error(error.message)
  redirect('/modulos/flex/financeiro/previsao')
}

export async function updateFlexPrevisaoDespesaAction(formData: FormData) {
  await requireFlexWrite('flex.financeiro.write')
  const id = requiredText(formData, 'id', 'Previsao')
  const { error } = await admin().schema('flex').from('previsoes_despesa').update(previsaoDespesaPayload(formData)).eq('id', id)
  if (error) throw new Error(error.message)
  redirect('/modulos/flex/financeiro/previsao')
}

export async function gerarFlexOrcamentoAction(formData: FormData) {
  await requireFlexWrite('flex.financeiro.write')
  const competenciaBase = competenciaMonth(formData, 'competencia_base')
  const meses = Math.min(Math.max(Number(text(formData, 'meses_previsao') || 3), 1), 12)
  const supabase = admin()

  const { data, error } = await supabase
    .schema('flex')
    .from('extrato_lancamentos')
    .select('categoria_id,macrogrupo,valor,tipo,data_lancamento')
    .eq('tipo', 'saida')
    .gte('data_lancamento', competenciaBase)
    .lt('data_lancamento', nextMonth(competenciaBase))

  if (error) throw new Error(error.message)

  const grouped = new Map<string, { categoria_id: string | null; macrogrupo: string | null; total: number }>()
  for (const row of (data ?? []) as any[]) {
    const key = String(row.categoria_id ?? row.macrogrupo ?? 'sem_categoria')
    const current = grouped.get(key) ?? { categoria_id: row.categoria_id ?? null, macrogrupo: row.macrogrupo ?? null, total: 0 }
    current.total += Math.abs(Number(row.valor) || 0)
    grouped.set(key, current)
  }

  if (!grouped.size) throw new Error('Nao ha despesas na competencia base para gerar orcamento.')

  await supabase.schema('flex').from('orcamentos').delete().gte('competencia', nextMonth(competenciaBase))

  const rows = []
  for (let index = 1; index <= meses; index++) {
    const competencia = addMonths(competenciaBase, index)
    for (const item of grouped.values()) {
      rows.push({
        competencia,
        categoria_id: item.categoria_id,
        macrogrupo: item.macrogrupo,
        valor_previsto: item.total,
        origem: 'despesa_realizada',
        status: 'publicado',
      })
    }
  }

  const { error: insertError } = await supabase.schema('flex').from('orcamentos').insert(rows)
  if (insertError) throw new Error(insertError.message)
  redirect('/modulos/flex/financeiro/orcamento')
}

export async function gerarFlexValidacaoAction(formData: FormData) {
  await requireFlexWrite('flex.financeiro.write')
  const competencia = competenciaMonth(formData)
  const supabase = admin()

  const [orcamentos, despesas] = await Promise.all([
    supabase.schema('flex').from('orcamentos').select('categoria_id,macrogrupo,valor_previsto').eq('competencia', competencia),
    supabase.schema('flex').from('extrato_lancamentos').select('categoria_id,macrogrupo,valor,tipo,data_lancamento').eq('tipo', 'saida').gte('data_lancamento', competencia).lt('data_lancamento', nextMonth(competencia)),
  ])

  if (orcamentos.error) throw new Error(orcamentos.error.message)
  if (despesas.error) throw new Error(despesas.error.message)

  const realized = new Map<string, number>()
  for (const row of (despesas.data ?? []) as any[]) {
    const key = String(row.categoria_id ?? row.macrogrupo ?? 'sem_categoria')
    realized.set(key, (realized.get(key) ?? 0) + Math.abs(Number(row.valor) || 0))
  }

  await supabase.schema('flex').from('validacoes').delete().eq('competencia', competencia)

  const rows = ((orcamentos.data ?? []) as any[]).map((row) => {
    const key = String(row.categoria_id ?? row.macrogrupo ?? 'sem_categoria')
    const previsto = Number(row.valor_previsto) || 0
    const realizado = realized.get(key) ?? 0
    const diferenca = realizado - previsto
    return {
      competencia,
      categoria_id: row.categoria_id ?? null,
      valor_previsto: previsto,
      valor_realizado: realizado,
      status: Math.abs(diferenca) > Math.max(previsto * 0.05, 50) ? 'pendente' : 'ok',
      tratamento: null,
    }
  })

  if (!rows.length) throw new Error('Nao ha orcamento publicado para validar esta competencia.')

  const { error } = await supabase.schema('flex').from('validacoes').insert(rows)
  if (error) throw new Error(error.message)
  redirect(`/modulos/flex/financeiro/despesas?competencia=${competencia.slice(0, 7)}`)
}

async function gerarFlexValidacaoItens(competencia: string, supabase = admin()) {
  const next = nextMonth(competencia)

  const [previsoes, lancamentos] = await Promise.all([
    supabase
      .schema('flex')
      .from('previsoes_despesa')
      .select('id,fornecedor,tipo_despesa,aliases,categoria_id,macrogrupo,valor_previsto,dia_previsto,competencia_inicio,competencia_fim,status')
      .eq('status', 'ativo')
      .lte('competencia_inicio', competencia)
      .limit(1000),
    supabase
      .schema('flex')
      .from('extrato_lancamentos')
      .select('id,previsao_despesa_id,categoria_id,fornecedor,descricao,historico,valor,data_lancamento,macrogrupo,status_classificacao,tipo')
      .eq('tipo', 'saida')
      .gte('data_lancamento', competencia)
      .lt('data_lancamento', next)
      .limit(2000),
  ])

  if (previsoes.error) throw new Error(previsoes.error.message)
  if (lancamentos.error) throw new Error(lancamentos.error.message)

  const previsaoRows = ((previsoes.data ?? []) as any[])
    .filter((row) => !row.competencia_fim || row.competencia_fim >= competencia)
  const lancamentoRows = (lancamentos.data ?? []) as any[]
  const usados = new Set<string>()
  const rows: Array<Record<string, unknown>> = []

  for (const previsao of previsaoRows) {
    const valorPrevisto = Number(previsao.valor_previsto || 0)
    const dataPrevista = paymentDateForCompetencia(competencia, Number(previsao.dia_previsto || 5))
    const match = bestLancamentoMatch(previsao, lancamentoRows, usados, dataPrevista)

    if (!match) {
      rows.push({
        competencia,
        previsao_id: previsao.id,
        tipo: 'previsto_nao_pago',
        fornecedor: previsao.fornecedor,
        descricao: previsao.tipo_despesa,
        valor_previsto: valorPrevisto,
        data_prevista: dataPrevista,
        status: 'pendente',
      })
      continue
    }

    for (const lancamento of match.lancamentos) usados.add(String(lancamento.id))
    const valorRealizado = match.valorRealizado
    const valorDivergente = Math.abs(valorRealizado - valorPrevisto) > 0.01
    const dataDivergente = String(match.dataRealizada) !== dataPrevista
    const categoriaPendente = match.lancamentos.some((lancamento) => String(lancamento.status_classificacao ?? '').includes('pendente') || !lancamento.categoria_id)
    const primary = match.lancamentos[0]

    if (valorDivergente || dataDivergente || categoriaPendente) {
      rows.push({
        competencia,
        previsao_id: previsao.id,
        extrato_lancamento_id: primary.id,
        tipo: categoriaPendente ? 'categoria_pendente' : valorDivergente ? 'valor_divergente' : 'data_divergente',
        fornecedor: valueText(primary.fornecedor, previsao.fornecedor),
        descricao: match.lancamentos.length > 1 ? `${previsao.tipo_despesa} (${match.lancamentos.length} lancamentos)` : valueText(primary.descricao, valueText(primary.historico, previsao.tipo_despesa)),
        valor_previsto: valorPrevisto,
        valor_realizado: valorRealizado,
        data_prevista: dataPrevista,
        data_realizada: match.dataRealizada,
        status: 'pendente',
      })
    }

    const vincularIds = match.lancamentos.filter((lancamento) => !lancamento.previsao_despesa_id).map((lancamento) => lancamento.id)
    if (vincularIds.length) {
      await supabase.schema('flex').from('extrato_lancamentos').update({ previsao_despesa_id: previsao.id }).in('id', vincularIds)
    }
  }

  for (const lancamento of lancamentoRows) {
    if (usados.has(String(lancamento.id))) continue
    if (!isOperationalExpenseCandidate(lancamento)) continue
    rows.push({
      competencia,
      extrato_lancamento_id: lancamento.id,
      tipo: 'pago_sem_previsao',
      fornecedor: valueText(lancamento.fornecedor),
      descricao: valueText(lancamento.descricao, valueText(lancamento.historico, 'Despesa realizada sem previsao')),
      valor_realizado: Math.abs(Number(lancamento.valor || 0)),
      data_realizada: lancamento.data_lancamento,
      status: 'pendente',
    })
  }

  const { data: tratados, error: tratadosError } = await supabase
    .schema('flex')
    .from('validacao_itens')
    .select('tipo,previsao_id,extrato_lancamento_id')
    .eq('competencia', competencia)
    .neq('status', 'pendente')
  if (tratadosError) throw new Error(tratadosError.message)

  const tratadosKeys = new Set(((tratados ?? []) as any[]).map(validacaoItemKey))
  const rowsPendentes = rows.filter((row) => !tratadosKeys.has(validacaoItemKey(row)))

  await supabase.schema('flex').from('validacao_itens').delete().eq('competencia', competencia).eq('status', 'pendente')
  if (rowsPendentes.length) {
    const { error } = await supabase.schema('flex').from('validacao_itens').insert(rowsPendentes)
    if (error) throw new Error(error.message)
  }

  return {
    gerados: rowsPendentes.length,
    ignoradosPorTratamento: rows.length - rowsPendentes.length,
    totalCalculado: rows.length,
  }
}

export async function gerarFlexValidacaoItensAction(formData: FormData) {
  await requireFlexWrite('flex.financeiro.write')
  const competencia = competenciaMonth(formData)
  await gerarFlexValidacaoItens(competencia)
  redirect(`/modulos/flex/financeiro/despesas?competencia=${competencia.slice(0, 7)}`)
}

function validacaoItemKey(row: Record<string, unknown>) {
  return [
    valueText(row.tipo),
    valueText(row.previsao_id),
    valueText(row.extrato_lancamento_id),
  ].join('|')
}

export async function decidirFlexValidacaoItemAction(formData: FormData) {
  const context = await requireFlexWrite('flex.financeiro.write')
  const id = requiredText(formData, 'id', 'Item de validacao')
  const decisao = requiredText(formData, 'decisao', 'Decisao')
  const justificativa = optionalText(formData, 'justificativa')
  const supabase = admin()

  const { data: item, error } = await supabase.schema('flex').from('validacao_itens').select('*').eq('id', id).single()
  if (error || !item) throw new Error(error?.message ?? 'Item de validacao nao encontrado.')

  if (decisao === 'atualizar_previsao') {
    if (!item.previsao_id) throw new Error('Esta decisao exige uma previsao vinculada.')
    const updatePayload: Record<string, unknown> = {}
    if (item.valor_realizado !== null && item.valor_realizado !== undefined) updatePayload.valor_previsto = Math.abs(Number(item.valor_realizado || 0))
    if (item.data_realizada) updatePayload.dia_previsto = Number(String(item.data_realizada).slice(8, 10))
    if (Object.keys(updatePayload).length) {
      const { error: updateError } = await supabase.schema('flex').from('previsoes_despesa').update(updatePayload).eq('id', item.previsao_id)
      if (updateError) throw new Error(updateError.message)
    }
  }

  if (decisao === 'incluir_previsao') {
    const fornecedor = valueText(item.fornecedor, 'Fornecedor pendente')
    const descricao = valueText(item.descricao, 'Despesa importada')
    const { data: previsao, error: insertError } = await supabase
      .schema('flex')
      .from('previsoes_despesa')
      .insert({
        fornecedor,
        tipo_despesa: descricao,
        valor_previsto: Math.abs(Number(item.valor_realizado || 0)),
        dia_previsto: item.data_realizada ? Number(String(item.data_realizada).slice(8, 10)) : 5,
        competencia_inicio: item.competencia,
        recorrente: true,
        status: 'ativo',
        origem: 'validacao',
      })
      .select('id')
      .single()
    if (insertError) throw new Error(insertError.message)
    if (item.extrato_lancamento_id) {
      await supabase.schema('flex').from('extrato_lancamentos').update({ previsao_despesa_id: previsao.id }).eq('id', item.extrato_lancamento_id)
    }
  }

  const { error: updateError } = await supabase
    .schema('flex')
    .from('validacao_itens')
    .update({
      status: decisao,
      decisao,
      justificativa,
      tratado_por: context.usuario.id,
      tratado_em: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) throw new Error(updateError.message)
  redirect(`/modulos/flex/financeiro/despesas?competencia=${String(item.competencia).slice(0, 7)}`)
}

export async function gerarFlexSugestoesAction(formData: FormData) {
  await requireFlexWrite('flex.financeiro.write')
  const competencia = text(formData, 'competencia') ? competenciaMonth(formData) : null
  const supabase = admin()

  let query = supabase
    .schema('flex')
    .from('extrato_lancamentos')
    .select('id,descricao,historico,valor,tipo,data_lancamento,status_classificacao')
    .eq('status_classificacao', 'pendente')
    .limit(50)

  if (competencia) query = query.gte('data_lancamento', competencia).lt('data_lancamento', nextMonth(competencia))

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = ((data ?? []) as any[]).map((row) => ({
    tipo: 'classificacao',
    competencia,
    referencia_id: row.id,
    titulo: 'Classificar lancamento',
    descricao: valueText(row.descricao, valueText(row.historico, 'Lancamento sem descricao')),
    status: 'pendente',
    payload: { valor: row.valor, tipo: row.tipo, data_lancamento: row.data_lancamento },
  }))

  if (!rows.length) throw new Error('Nenhum lancamento pendente encontrado para gerar sugestoes.')

  const { error: insertError } = await supabase.schema('flex').from('sugestoes').insert(rows)
  if (insertError) throw new Error(insertError.message)
  redirect('/modulos/flex/financeiro/sugestoes')
}

export async function updateFlexSugestaoStatusAction(formData: FormData) {
  await requireFlexWrite('flex.financeiro.write')
  const id = requiredText(formData, 'id', 'Sugestao')
  const nextStatus = requiredText(formData, 'status', 'Status')
  const { error } = await admin().schema('flex').from('sugestoes').update({ status: nextStatus }).eq('id', id)
  if (error) throw new Error(error.message)
  redirect('/modulos/flex/financeiro/sugestoes')
}

export async function createFlexComissaoAction(formData: FormData) {
  await requireFlexWrite('flex.comissoes.write')
  const { data, error } = await admin().schema('flex').from('comissoes').insert(comissaoPayload(formData)).select('id').single()
  if (error) throw new Error(error.message)
  redirect(`/modulos/flex/comissoes/${data.id}`)
}

export async function updateFlexComissaoAction(formData: FormData) {
  await requireFlexWrite('flex.comissoes.write')
  const id = requiredText(formData, 'id', 'ID')
  const { error } = await admin().schema('flex').from('comissoes').update(comissaoPayload(formData)).eq('id', id)
  if (error) throw new Error(error.message)
  redirect('/modulos/flex/comissoes')
}

async function calcularFlexComissoesReceitas(supabase: any, competencia: string): Promise<{
  diagnostics: Record<string, number>
  diagnosticRows: FlexComissaoPreviewRow[]
  rows: FlexComissaoPreviewRow[]
}> {
  const [receitas, tipos, colaboradores, categorias, existentes] = await Promise.all([
    supabase
      .schema('flex')
      .from('receitas')
      .select('id,colaborador_id,time_id,categoria_id,competencia,valor_base,valor_recebido,status,cliente,descricao')
      .eq('competencia', competencia),
    supabase
      .schema('flex')
      .from('tipos_comissao')
      .select('id,nome,categoria_id,percentual,status,escopo,base_calculo')
      .eq('status', 'ativo'),
    supabase
      .schema('flex')
      .from('colaboradores')
      .select('id,usuario_id,time_id,status,recebe_comissoes')
      .eq('status', 'ativo')
      .eq('recebe_comissoes', true),
    supabase.schema('flex').from('categorias_financeiras').select('id,nome').limit(1000),
    supabase.schema('flex').from('comissoes').select('receita_id,colaborador_id,tipo_comissao_id').eq('competencia', competencia).not('receita_id', 'is', null),
  ])

  if (receitas.error) throw new Error(receitas.error.message)
  if (tipos.error) throw new Error(tipos.error.message)
  if (colaboradores.error) throw new Error(colaboradores.error.message)
  if (categorias.error) throw new Error(categorias.error.message)
  if (existentes.error) throw new Error(existentes.error.message)

  const tipoRows = (tipos.data ?? []) as any[]
  const colaboradorRows = (colaboradores.data ?? []) as any[]
  const usuarioIds = Array.from(new Set(colaboradorRows.map((row) => String(row.usuario_id ?? '')).filter(Boolean)))
  const usuarios = usuarioIds.length
    ? await supabase.schema('security').from('usuarios').select('id,nome').in('id', usuarioIds)
    : { data: [], error: null }

  if (usuarios.error) throw new Error(usuarios.error.message)

  const categoriaNomePorId = new Map(((categorias.data ?? []) as any[]).map((row) => [String(row.id), valueText(row.nome, 'Categoria')]))
  const usuarioNomePorId = new Map(((usuarios.data ?? []) as any[]).map((row) => [String(row.id), valueText(row.nome, 'Colaborador')]))
  const colaboradorNome = (colaborador: any) => usuarioNomePorId.get(String(colaborador?.usuario_id ?? '')) ?? 'Colaborador'
  const existentesKeys = new Set(((existentes.data ?? []) as any[]).map((row) => `${row.receita_id}:${row.colaborador_id}:${row.tipo_comissao_id}`))
  const rows: FlexComissaoPreviewRow[] = []
  const diagnosticRows: FlexComissaoPreviewRow[] = []
  const addDiagnosticRow = (
    receita: any,
    diagnostico: NonNullable<FlexComissaoPreviewRow['diagnostico']>,
    observacao: string,
    tipoComissao?: any,
    base = 0,
  ) => {
    diagnosticRows.push({
      key: `${receita.id}:${diagnostico}`,
      receita_id: receita.id,
      colaborador_id: '',
      tipo_comissao_id: tipoComissao?.id ?? '',
      competencia,
      cliente: valueText(receita.cliente, 'Receita'),
      categoria: categoriaNomePorId.get(String(receita.categoria_id ?? '')) ?? 'Sem categoria',
      colaborador: receita.colaborador_id ? 'Nao elegivel' : 'Sem colaborador',
      tipo: tipoComissao ? valueText(tipoComissao.nome, 'Comissao') : 'Sem regra',
      escopo: tipoComissao?.escopo ?? '-',
      valor_base: base,
      percentual: Number(tipoComissao?.percentual) || 0,
      valor_comissao: 0,
      observacao,
      geravel: false,
      diagnostico,
    })
  }
  const diagnostics = {
    receitas: 0,
    semRegra: 0,
    baseZerada: 0,
    semTime: 0,
    timeSemMembros: 0,
    semColaborador: 0,
    colaboradorInelegivel: 0,
    jaGerada: 0,
    percentualZerado: 0,
  }

  for (const receita of ((receitas.data ?? []) as any[])) {
    diagnostics.receitas += 1
    const tipoComissao = tipoRows.find((tipo) => tipo.categoria_id && tipo.categoria_id === receita.categoria_id)
    if (!tipoComissao) {
      diagnostics.semRegra += 1
      addDiagnosticRow(receita, 'sem_regra', 'Categoria sem regra ativa de comissao.')
      continue
    }

    const baseOriginal = Number(tipoComissao.base_calculo === 'valor_base' ? receita.valor_base : receita.valor_recebido) || Number(receita.valor_base || receita.valor_recebido) || 0
    if (baseOriginal <= 0) {
      diagnostics.baseZerada += 1
      addDiagnosticRow(receita, 'base_zerada', 'Receita sem base de calculo para comissao.', tipoComissao)
      continue
    }

    if (tipoComissao.escopo === 'time') {
      const timeId = receita.time_id ?? colaboradorRows.find((colaborador) => colaborador.id === receita.colaborador_id)?.time_id
      if (!timeId) {
        diagnostics.semTime += 1
        addDiagnosticRow(receita, 'sem_time', 'Regra por time, mas receita/colaborador nao tem time mapeado.', tipoComissao, baseOriginal)
        continue
      }
      const membros = colaboradorRows.filter((colaborador) => colaborador.time_id === timeId)
      if (!membros.length) {
        diagnostics.timeSemMembros += 1
        addDiagnosticRow(receita, 'time_sem_membros', 'Time sem membros ativos e elegiveis para comissao.', tipoComissao, baseOriginal)
        continue
      }
      const percentualValue = Number(tipoComissao?.percentual) || 0
      if (percentualValue <= 0) diagnostics.percentualZerado += 1
      const baseRateada = baseOriginal / membros.length

      for (const membro of membros) {
        const key = `${receita.id}:${membro.id}:${tipoComissao.id}`
        if (existentesKeys.has(key)) {
          diagnostics.jaGerada += 1
          addDiagnosticRow(receita, 'ja_gerada', 'Comissao ja gerada para esta receita, colaborador e regra.', tipoComissao, baseRateada)
          continue
        }
        const valorComissao = baseRateada * percentualValue / 100
        if (valorComissao <= 0) continue
        rows.push({
          key,
          receita_id: receita.id,
          colaborador_id: membro.id,
          tipo_comissao_id: tipoComissao.id,
          competencia,
          cliente: valueText(receita.cliente, 'Receita'),
          categoria: categoriaNomePorId.get(String(receita.categoria_id ?? '')) ?? 'Categoria',
          colaborador: colaboradorNome(membro),
          tipo: valueText(tipoComissao.nome, 'Comissao'),
          escopo: 'time',
          valor_base: baseRateada,
          percentual: percentualValue,
          valor_comissao: valorComissao,
          observacao: `Rateio de comissao por time sobre base total ${baseOriginal.toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })}.`,
          geravel: true,
        })
      }
      continue
    }

    if (!receita.colaborador_id) {
      diagnostics.semColaborador += 1
      addDiagnosticRow(receita, 'sem_colaborador', 'Receita individual sem colaborador mapeado.', tipoComissao, baseOriginal)
      continue
    }
    const colaboradorElegivel = colaboradorRows.some((colaborador) => colaborador.id === receita.colaborador_id)
    if (!colaboradorElegivel) {
      diagnostics.colaboradorInelegivel += 1
      addDiagnosticRow(receita, 'colaborador_inelegivel', 'Colaborador inativo ou sem participacao em comissoes.', tipoComissao, baseOriginal)
      continue
    }
    const key = `${receita.id}:${receita.colaborador_id}:${tipoComissao.id}`
    if (existentesKeys.has(key)) {
      diagnostics.jaGerada += 1
      addDiagnosticRow(receita, 'ja_gerada', 'Comissao ja gerada para esta receita, colaborador e regra.', tipoComissao, baseOriginal)
      continue
    }

    const percentualValue = Number(tipoComissao?.percentual) || 0
    if (percentualValue <= 0) diagnostics.percentualZerado += 1
    const valorComissao = baseOriginal * percentualValue / 100
    if (valorComissao <= 0) continue
    rows.push({
      key,
      receita_id: receita.id,
      colaborador_id: receita.colaborador_id,
      tipo_comissao_id: tipoComissao.id,
      competencia,
      cliente: valueText(receita.cliente, 'Receita'),
      categoria: categoriaNomePorId.get(String(receita.categoria_id ?? '')) ?? 'Categoria',
      colaborador: colaboradorNome(colaboradorRows.find((colaborador) => colaborador.id === receita.colaborador_id)),
      tipo: valueText(tipoComissao.nome, 'Comissao'),
      escopo: 'individual',
      valor_base: baseOriginal,
      percentual: percentualValue,
      valor_comissao: valorComissao,
      observacao: '',
      geravel: true,
    })
  }

  return { diagnostics, diagnosticRows, rows }
}

function flexComissaoDiagnosticsMessage(competencia: string, diagnostics: Record<string, number>) {
  if (!diagnostics.receitas) return 'Nenhuma receita encontrada para a competencia selecionada.'
  const motivos = [
    diagnostics.semRegra ? `${diagnostics.semRegra} receita(s) sem regra ativa por categoria` : '',
    diagnostics.semColaborador ? `${diagnostics.semColaborador} receita(s) sem colaborador mapeado` : '',
    diagnostics.semTime ? `${diagnostics.semTime} receita(s) sem time mapeado` : '',
    diagnostics.timeSemMembros ? `${diagnostics.timeSemMembros} receita(s) com time sem membros elegiveis` : '',
    diagnostics.colaboradorInelegivel ? `${diagnostics.colaboradorInelegivel} receita(s) com colaborador inativo ou sem comissoes` : '',
    diagnostics.baseZerada ? `${diagnostics.baseZerada} receita(s) com base zerada` : '',
    diagnostics.percentualZerado ? `${diagnostics.percentualZerado} receita(s) com percentual zerado` : '',
    diagnostics.jaGerada ? `${diagnostics.jaGerada} comissao(oes) ja gerada(s)` : '',
  ].filter(Boolean).join('; ')

  return `Nenhuma receita elegivel para gerar comissoes em ${competencia.slice(5, 7)}/${competencia.slice(0, 4)}. ${motivos || 'Revise receitas, regras, mapeamentos e colaboradores ativos.'}`
}

function flexComissaoDiagnosticsList(diagnostics: Record<string, number>) {
  return [
    { label: 'Receitas analisadas', value: String(diagnostics.receitas || 0) },
    { label: 'Sem regra', value: String(diagnostics.semRegra || 0) },
    { label: 'Sem colaborador', value: String(diagnostics.semColaborador || 0) },
    { label: 'Sem time', value: String(diagnostics.semTime || 0) },
    { label: 'Time sem membros', value: String(diagnostics.timeSemMembros || 0) },
    { label: 'Colaborador inelegivel', value: String(diagnostics.colaboradorInelegivel || 0) },
    { label: 'Base zerada', value: String(diagnostics.baseZerada || 0) },
    { label: 'Ja geradas', value: String(diagnostics.jaGerada || 0) },
  ].filter((item) => item.value !== '0' || item.label === 'Receitas analisadas')
}

export async function previewFlexComissoesReceitasAction(_previousState: FlexComissaoPreviewState, formData: FormData): Promise<FlexComissaoPreviewState> {
  try {
    await requireFlexWrite('flex.comissoes.write')
    const competencia = competenciaMonth(formData)
    const supabase = admin()

    await aplicarFlexMapeamentosReceitas(supabase, competencia)

    const { diagnostics, diagnosticRows, rows } = await calcularFlexComissoesReceitas(supabase, competencia)
    if (!rows.length) {
      return {
        error: flexComissaoDiagnosticsMessage(competencia, diagnostics),
        ok: false,
        competencia: competencia.slice(0, 7),
        diagnostics: flexComissaoDiagnosticsList(diagnostics),
        diagnosticRows,
      }
    }

    const totalBase = rows.reduce((sum, row) => sum + Number(row.valor_base || 0), 0)
    const totalComissao = rows.reduce((sum, row) => sum + Number(row.valor_comissao || 0), 0)

    return {
      ok: true,
      competencia: competencia.slice(0, 7),
      rows,
      diagnosticRows,
      diagnostics: flexComissaoDiagnosticsList(diagnostics),
      summary: [
        { label: 'Linhas', value: String(rows.length), hint: 'prontas para gerar' },
        { label: 'Colaboradores', value: String(new Set(rows.map((row) => row.colaborador_id)).size), hint: 'com comissão' },
        { label: 'Base', value: formatPreviewMoney(totalBase), hint: 'valor considerado' },
        { label: 'Comissões', value: formatPreviewMoney(totalComissao), hint: 'valor previsto' },
      ],
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Nao foi possivel gerar a previa de comissoes.', ok: false }
  }
}

export async function gerarFlexComissoesReceitasAction(formData: FormData) {
  await requireFlexWrite('flex.comissoes.write')
  const competencia = competenciaMonth(formData)
  const rowCount = integer(formData, 'row_count', 0)
  if (!rowCount) throw new Error('Gere a previa antes de confirmar as comissoes.')

  const rows: Array<Record<string, unknown>> = []
  for (let index = 0; index < rowCount; index++) {
    if (!checked(formData, `incluir_${index}`)) continue
    const valorBase = decimalNumber(formData, `valor_base_${index}`)
    const percentualValue = percent(formData, `percentual_${index}`)
    const valorComissao = decimalNumber(formData, `valor_comissao_${index}`) || (valorBase * percentualValue / 100)
    if (valorComissao <= 0) continue

    rows.push({
      receita_id: requiredText(formData, `receita_id_${index}`, 'Receita'),
      colaborador_id: requiredText(formData, `colaborador_id_${index}`, 'Colaborador'),
      tipo_comissao_id: requiredText(formData, `tipo_comissao_id_${index}`, 'Tipo de comissao'),
      competencia,
      valor_base: valorBase,
      percentual: percentualValue,
      valor_comissao: valorComissao,
      status: 'calculada',
      origem: 'receita',
      observacao: optionalText(formData, `observacao_${index}`),
    })
  }

  if (!rows.length) throw new Error('Nenhuma linha selecionada para gerar comissoes.')

  const supabase = admin()
  const { data: existentes, error: existentesError } = await supabase
    .schema('flex')
    .from('comissoes')
    .select('receita_id,colaborador_id,tipo_comissao_id')
    .eq('competencia', competencia)
    .not('receita_id', 'is', null)

  if (existentesError) throw new Error(existentesError.message)

  const existentesKeys = new Set(((existentes ?? []) as any[]).map((row) => `${row.receita_id}:${row.colaborador_id}:${row.tipo_comissao_id}`))
  const payableRows = rows.filter((row) => !existentesKeys.has(`${row.receita_id}:${row.colaborador_id}:${row.tipo_comissao_id}`))

  if (!payableRows.length) {
    throw new Error('As comissoes selecionadas ja foram geradas para essa competencia.')
  }

  const { error } = await supabase.schema('flex').from('comissoes').insert(payableRows)
  if (error) throw new Error(error.message)
  revalidatePath('/modulos/flex/comissoes')
  redirect('/modulos/flex/comissoes')
}

export async function updateFlexComissaoStatusAction(formData: FormData) {
  const context = await requireFlexWrite('flex.comissoes.approve')
  const id = requiredText(formData, 'id', 'Comissao')
  const nextStatus = requiredText(formData, 'status', 'Status')
  const returnTo = text(formData, 'return_to') || '/modulos/flex/comissoes/aprovacao'
  const payload: Record<string, unknown> = { status: nextStatus }
  const supabase = admin()

  const { data: comissao, error: comissaoError } = await supabase
    .schema('flex')
    .from('comissoes')
    .select('id,colaborador_id,competencia,valor_comissao')
    .eq('id', id)
    .single()

  if (comissaoError) throw new Error(comissaoError.message)

  if (nextStatus === 'aprovada') {
    payload.aprovado_por = context.usuario.id
    payload.aprovado_em = new Date().toISOString()
  }

  const { error } = await supabase.schema('flex').from('comissoes').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
  if (nextStatus === 'aprovada') {
    await syncFlexPagamentoComissao(supabase, comissao)
    revalidatePath('/modulos/flex/financeiro/previsao')
    revalidatePath('/modulos/flex/pagamentos')
  }
  revalidatePath('/modulos/flex/comissoes')
  revalidatePath('/modulos/flex/comissoes/aprovacao')
  redirect(returnTo)
}

export async function approveFlexComissoesLoteAction(formData: FormData) {
  const context = await requireFlexWrite('flex.comissoes.approve')
  const ids = formData.getAll('ids').map((value) => String(value)).filter(Boolean)
  const returnTo = text(formData, 'return_to') || '/modulos/flex/comissoes'
  if (!ids.length) throw new Error('Selecione ao menos uma comissao para aprovar.')

  const supabase = admin()
  const { data: comissoes, error: comissoesError } = await supabase
    .schema('flex')
    .from('comissoes')
    .select('id,colaborador_id,competencia,valor_comissao,status')
    .in('id', ids)

  if (comissoesError) throw new Error(comissoesError.message)

  const elegiveis = ((comissoes ?? []) as any[]).filter((row) => ['calculada', 'em_conferencia', 'rejeitada'].includes(String(row.status)))
  if (!elegiveis.length) throw new Error('Nenhuma comissao selecionada esta pendente de aprovacao.')

  const elegiveisIds = elegiveis.map((row) => row.id)
  const { error } = await supabase
    .schema('flex')
    .from('comissoes')
    .update({
      aprovado_em: new Date().toISOString(),
      aprovado_por: context.usuario.id,
      status: 'aprovada',
    })
    .in('id', elegiveisIds)

  if (error) throw new Error(error.message)

  for (const comissao of elegiveis) {
    await syncFlexPagamentoComissao(supabase, comissao)
  }

  revalidatePath('/modulos/flex/comissoes')
  revalidatePath('/modulos/flex/comissoes/aprovacao')
  revalidatePath('/modulos/flex/financeiro/previsao')
  revalidatePath('/modulos/flex/pagamentos')
  redirect(returnTo)
}

export async function createFlexPagamentoAgendaAction(formData: FormData) {
  await requireFlexWrite('flex.pagamentos.write')
  const { data, error } = await admin().schema('flex').from('pagamento_agendas').insert(agendaPayload(formData)).select('id').single()
  if (error) throw new Error(error.message)
  redirect(`/modulos/flex/pagamentos/agenda/${data.id}`)
}

export async function updateFlexPagamentoAgendaAction(formData: FormData) {
  await requireFlexWrite('flex.pagamentos.write')
  const id = requiredText(formData, 'id', 'ID')
  const { error } = await admin().schema('flex').from('pagamento_agendas').update(agendaPayload(formData)).eq('id', id)
  if (error) throw new Error(error.message)
  redirect('/modulos/flex/pagamentos/agenda')
}

export async function createFlexPagamentoAction(formData: FormData) {
  await requireFlexWrite('flex.pagamentos.write')
  const { data, error } = await admin().schema('flex').from('pagamentos').insert(pagamentoPayload(formData)).select('id').single()
  if (error) throw new Error(error.message)
  redirect(`/modulos/flex/pagamentos/${data.id}`)
}

export async function updateFlexPagamentoAction(formData: FormData) {
  await requireFlexWrite('flex.pagamentos.write')
  const id = requiredText(formData, 'id', 'ID')
  const { error } = await admin().schema('flex').from('pagamentos').update(pagamentoPayload(formData)).eq('id', id)
  if (error) throw new Error(error.message)
  redirect('/modulos/flex/pagamentos')
}

export async function gerarFlexPagamentosAgendaAction(formData: FormData) {
  await requireFlexWrite('flex.pagamentos.write')
  const competencia = competenciaMonth(formData)
  const supabase = admin()

  const { data, error } = await supabase
    .schema('flex')
    .from('pagamento_agendas')
    .select('id,tipo_pagamento_id,colaborador_id,time_id,descricao,dia_previsto,valor_bruto,valor_descontos,inicio_competencia,fim_competencia,status')
    .eq('status', 'ativo')
    .lte('inicio_competencia', competencia)

  if (error) throw new Error(error.message)

  const rows = ((data ?? []) as any[])
    .filter((agenda) => !agenda.fim_competencia || agenda.fim_competencia >= competencia)
    .filter((agenda) => agenda.colaborador_id)
    .map((agenda) => ({
      colaborador_id: agenda.colaborador_id,
      tipo_pagamento_id: agenda.tipo_pagamento_id,
      agenda_id: agenda.id,
      competencia,
      descricao: agenda.descricao,
      data_prevista: paymentDateForCompetencia(competencia, agenda.dia_previsto ?? 5),
      valor_bruto: agenda.valor_bruto,
      valor_descontos: agenda.valor_descontos,
      status: 'previsto',
      origem: 'agenda',
    }))

  if (!rows.length) throw new Error('Nenhuma agenda elegivel para gerar pagamentos.')

  const { error: insertError } = await supabase.schema('flex').from('pagamentos').insert(rows)
  if (insertError) throw new Error(insertError.message)
  redirect('/modulos/flex/pagamentos')
}

export async function gerarFlexPagamentosComissoesAction(formData: FormData) {
  await requireFlexWrite('flex.pagamentos.write')
  const competencia = competenciaMonth(formData)
  const supabase = admin()
  const tipoPagamentoId = await ensureFlexTipoPagamento(supabase, 'comissao', 'Comissao')

  const { data, error } = await supabase
    .schema('flex')
    .from('comissoes')
    .select('id,colaborador_id,competencia,valor_comissao,status')
    .eq('competencia', competencia)
    .eq('status', 'aprovada')

  if (error) throw new Error(error.message)

  const ids = ((data ?? []) as any[]).map((row) => row.id)
  const existing = ids.length
    ? await supabase.schema('flex').from('pagamentos').select('comissao_id').in('comissao_id', ids)
    : { data: [] as any[], error: null }

  if (existing.error) throw new Error(existing.error.message)

  const paidIds = new Set(((existing.data ?? []) as any[]).map((row) => row.comissao_id))
  const rows = ((data ?? []) as any[])
    .filter((row) => !paidIds.has(row.id))
    .map((row) => ({
      colaborador_id: row.colaborador_id,
      comissao_id: row.id,
      tipo_pagamento_id: tipoPagamentoId,
      competencia,
      descricao: 'Comissao aprovada',
      data_prevista: paymentDateForCompetencia(competencia, FLEX_COMISSAO_PAGAMENTO_DIA),
      valor_bruto: row.valor_comissao,
      valor_descontos: 0,
      status: 'previsto',
      origem: 'comissao',
    }))

  if (!rows.length) throw new Error('Nenhuma comissao aprovada sem pagamento encontrada.')

  const { error: insertError } = await supabase.schema('flex').from('pagamentos').insert(rows)
  if (insertError) throw new Error(insertError.message)
  redirect('/modulos/flex/pagamentos')
}

export async function marcarFlexPagamentoPagoAction(formData: FormData) {
  await requireFlexWrite('flex.pagamentos.write')
  const id = requiredText(formData, 'id', 'Pagamento')
  const dataPagamento = dateOrNull(formData, 'data_pagamento') ?? new Date().toISOString().slice(0, 10)
  const { error } = await admin().schema('flex').from('pagamentos').update({ status: 'pago', data_pagamento: dataPagamento }).eq('id', id)
  if (error) throw new Error(error.message)
  redirect('/modulos/flex/pagamentos')
}

export async function conciliarFlexPagamentoAction(formData: FormData) {
  const context = await requireFlexWrite('flex.pagamentos.reconcile')
  const pagamentoId = requiredText(formData, 'pagamento_id', 'Pagamento')
  const lancamentoId = requiredText(formData, 'extrato_lancamento_id', 'Lancamento')
  const supabase = admin()

  const { error } = await supabase.schema('flex').from('conciliacoes').insert({
    pagamento_id: pagamentoId,
    extrato_lancamento_id: lancamentoId,
    status: 'conciliado',
    confianca: 100,
    conciliado_por: context.usuario.id,
  })
  if (error) throw new Error(error.message)

  const updates = await Promise.all([
    supabase.schema('flex').from('pagamentos').update({ status: 'conciliado' }).eq('id', pagamentoId),
    supabase.schema('flex').from('extrato_lancamentos').update({ conciliado: true }).eq('id', lancamentoId),
  ])
  for (const update of updates) {
    if (update.error) throw new Error(update.error.message)
  }

  redirect('/modulos/flex/pagamentos')
}

export async function recalcularFlexFechamentoAction(formData: FormData) {
  await requireFlexWrite('flex.fechamentos.write')
  const competencia = competenciaMonth(formData)
  const supabase = admin()
  const { data: existing, error: existingError } = await supabase
    .schema('flex')
    .from('fechamentos')
    .select('id,status')
    .eq('competencia', competencia)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (existing?.status === 'fechado') throw new Error('Competencia fechada precisa ser reaberta antes de recalcular.')

  const metrics = await flexFechamentoMetrics(competencia)
  const status = fechamentoStatus(metrics, existing?.status)

  const { data, error } = await supabase
    .schema('flex')
    .from('fechamentos')
    .upsert({ competencia, status, ...metrics.totals }, { onConflict: 'competencia' })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  await saveFlexChecklist(data.id, metrics.checklist)
  redirect(`/modulos/flex/fechamentos/${data.id}`)
}

export async function abrirFlexProximaCompetenciaAction(_formData: FormData) {
  void _formData
  await requireFlexWrite('flex.fechamentos.write')
  const supabase = admin()
  const { data: latest, error: latestError } = await supabase
    .schema('flex')
    .from('fechamentos')
    .select('competencia')
    .order('competencia', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) throw new Error(latestError.message)

  const competencia = latest?.competencia ? nextMonth(String(latest.competencia)) : previousMonthDate()
  const { data: existing, error: existingError } = await supabase
    .schema('flex')
    .from('fechamentos')
    .select('id,status')
    .eq('competencia', competencia)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (existing?.status === 'fechado') throw new Error('A proxima competencia calculada ja esta fechada.')

  const metrics = await flexFechamentoMetrics(competencia)
  const status = fechamentoStatus(metrics, existing?.status ?? 'aberto')
  const { data, error } = await supabase
    .schema('flex')
    .from('fechamentos')
    .upsert({ competencia, status, ...metrics.totals }, { onConflict: 'competencia' })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  await saveFlexChecklist(data.id, metrics.checklist)
  redirect(`/modulos/flex/fechamentos/${data.id}`)
}

export async function fecharFlexFechamentoAction(formData: FormData) {
  const context = await requireFlexWrite('flex.fechamentos.close')
  const id = requiredText(formData, 'id', 'Fechamento')
  const supabase = admin()
  const { data, error } = await supabase.schema('flex').from('fechamentos').select('competencia,status').eq('id', id).single()
  if (error) throw new Error(error.message)
  if (data?.status === 'fechado') redirect('/modulos/flex/fechamentos')

  const metrics = await flexFechamentoMetrics(String(data.competencia))
  await saveFlexChecklist(id, metrics.checklist)

  if (Number(metrics.totals.pendencias_total ?? 0) > 0) {
    const { error: pendingUpdateError } = await supabase
      .schema('flex')
      .from('fechamentos')
      .update({ status: fechamentoStatus(metrics, data?.status), ...metrics.totals })
      .eq('id', id)
    if (pendingUpdateError) throw new Error(pendingUpdateError.message)
    throw new Error('Nao e possivel fechar competencia com pendencias.')
  }

  const { error: updateError } = await supabase
    .schema('flex')
    .from('fechamentos')
    .update({ status: 'fechado', fechado_por: context.usuario.id, fechado_em: new Date().toISOString(), ...metrics.totals })
    .eq('id', id)

  if (updateError) throw new Error(updateError.message)
  redirect('/modulos/flex/fechamentos')
}

export async function reabrirFlexFechamentoAction(formData: FormData) {
  await requireFlexWrite('flex.fechamentos.close')
  const id = requiredText(formData, 'id', 'Fechamento')
  const motivo = requiredText(formData, 'reabertura_motivo', 'Motivo')
  const { error } = await admin().schema('flex').from('fechamentos').update({ status: 'reaberto', reabertura_motivo: motivo, fechado_em: null }).eq('id', id)
  if (error) throw new Error(error.message)
  redirect(`/modulos/flex/fechamentos/${id}`)
}

async function flexFechamentoMetrics(competencia: string) {
  const supabase = admin()
  const next = nextMonth(competencia)
  const [receitas, despesas, orcamentos, comissoes, pagamentos, validacoes, validacaoItens, extratos] = await Promise.all([
    supabase.schema('flex').from('receitas').select('valor_recebido,status,categoria_id,colaborador_id,time_id').eq('competencia', competencia),
    supabase.schema('flex').from('extrato_lancamentos').select('valor,tipo,status_classificacao,conciliado').eq('tipo', 'saida').gte('data_lancamento', competencia).lt('data_lancamento', next),
    supabase.schema('flex').from('orcamentos').select('valor_previsto,status').eq('competencia', competencia),
    supabase.schema('flex').from('comissoes').select('valor_comissao,status').eq('competencia', competencia),
    supabase.schema('flex').from('pagamentos').select('valor_bruto,valor_descontos,valor_liquido,status').eq('competencia', competencia),
    supabase.schema('flex').from('validacoes').select('status').eq('competencia', competencia),
    supabase.schema('flex').from('validacao_itens').select('status').eq('competencia', competencia),
    supabase.schema('flex').from('extratos').select('id').lt('periodo_inicio', next).gte('periodo_fim', competencia),
  ])

  for (const result of [receitas, despesas, orcamentos, comissoes, pagamentos, validacoes, validacaoItens, extratos]) {
    if (result.error) throw new Error(result.error.message)
  }

  const receitaRows = (receitas.data ?? []) as any[]
  const despesaRows = (despesas.data ?? []) as any[]
  const orcamentoRows = (orcamentos.data ?? []) as any[]
  const comissaoRows = (comissoes.data ?? []) as any[]
  const pagamentoRows = (pagamentos.data ?? []) as any[]
  const validacaoRows = (validacoes.data ?? []) as any[]
  const validacaoItemRows = (validacaoItens.data ?? []) as any[]
  const extratoRows = (extratos.data ?? []) as any[]

  const receitaTotal = receitaRows.reduce((sum, row) => sum + Number(row.valor_recebido || 0), 0)
  const despesaTotal = despesaRows.reduce((sum, row) => sum + Math.abs(Number(row.valor || 0)), 0)
  const orcamentoTotal = orcamentoRows.reduce((sum, row) => sum + Number(row.valor_previsto || 0), 0)
  const comissaoTotal = comissaoRows.reduce((sum, row) => sum + Number(row.valor_comissao || 0), 0)
  const pagamentosPrevistosTotal = pagamentoRows.reduce((sum, row) => sum + Number(row.valor_liquido ?? (Number(row.valor_bruto || 0) - Number(row.valor_descontos || 0))), 0)
  const pagamentosPagosTotal = pagamentoRows
    .filter((row) => ['pago', 'conciliado'].includes(String(row.status)))
    .reduce((sum, row) => sum + Number(row.valor_liquido ?? (Number(row.valor_bruto || 0) - Number(row.valor_descontos || 0))), 0)

  const despesasPendentes = despesaRows.filter((row) => String(row.status_classificacao).includes('pendente')).length
  const validacoesPendentes = validacaoRows.filter((row) => String(row.status).includes('pendente')).length
  const validacaoItensPendentes = validacaoItemRows.filter((row) => String(row.status).includes('pendente')).length
  const receitasPendentes = receitaRows.filter((row) => !row.categoria_id || (!row.colaborador_id && !row.time_id)).length
  const comissoesPendentes = comissaoRows.filter((row) => ['calculada', 'em_conferencia', 'rejeitada'].includes(String(row.status))).length
  const pagamentosPendentes = pagamentoRows.filter((row) => ['previsto', 'em_processamento'].includes(String(row.status))).length
  const extratoPendente = extratoRows.length ? 0 : 1
  const pendenciasTotal = extratoPendente + receitasPendentes + despesasPendentes + validacoesPendentes + validacaoItensPendentes + comissoesPendentes + pagamentosPendentes

  const checklist = [
    { chave: 'extrato', titulo: 'Extrato importado', status: extratoPendente ? 'pendente' : 'ok', total: extratoRows.length, pendencias: extratoPendente, detalhe: 'A competencia precisa ter extrato bancario importado.' },
    { chave: 'receitas', titulo: 'Receitas preparadas', status: receitasPendentes ? 'pendente' : 'ok', total: receitaRows.length, pendencias: receitasPendentes, detalhe: 'Receitas sem categoria, colaborador ou time para comissionamento.' },
    { chave: 'despesas', titulo: 'Despesas classificadas', status: despesasPendentes ? 'pendente' : 'ok', total: despesaRows.length, pendencias: despesasPendentes, detalhe: 'Lancamentos de saida sem classificacao.' },
    { chave: 'validacoes', titulo: 'Validacoes tratadas', status: validacoesPendentes + validacaoItensPendentes ? 'pendente' : 'ok', total: validacaoRows.length + validacaoItemRows.length, pendencias: validacoesPendentes + validacaoItensPendentes, detalhe: 'Divergencias previsto x realizado ainda pendentes.' },
    { chave: 'comissoes', titulo: 'Comissoes aprovadas', status: comissoesPendentes ? 'pendente' : 'ok', total: comissaoRows.length, pendencias: comissoesPendentes, detalhe: 'Comissoes calculadas, em conferencia ou rejeitadas.' },
    { chave: 'pagamentos', titulo: 'Pagamentos processados', status: pagamentosPendentes ? 'pendente' : 'ok', total: pagamentoRows.length, pendencias: pagamentosPendentes, detalhe: 'Pagamentos previstos ou em processamento.' },
  ]

  return {
    checklist,
    totals: {
      receita_total: receitaTotal,
      despesa_total: despesaTotal,
      orcamento_total: orcamentoTotal,
      comissao_total: comissaoTotal,
      pagamentos_previstos_total: pagamentosPrevistosTotal,
      pagamentos_pagos_total: pagamentosPagosTotal,
      saldo_operacional: receitaTotal - despesaTotal - comissaoTotal,
      pendencias_total: pendenciasTotal,
    },
  }
}

function fechamentoStatus(metrics: Awaited<ReturnType<typeof flexFechamentoMetrics>>, currentStatus?: string | null) {
  if (metrics.totals.pendencias_total === 0) return 'pronto_para_fechar'
  if (currentStatus === 'reaberto') return 'reaberto'
  const validationPending = metrics.checklist.some((row) => ['extrato', 'despesas', 'validacoes'].includes(String(row.chave)) && Number(row.pendencias) > 0)
  return validationPending ? 'em_validacao' : 'aberto'
}

async function saveFlexChecklist(fechamentoId: string, rows: Array<Record<string, unknown>>) {
  const supabase = admin()
  await supabase.schema('flex').from('fechamento_checklist').delete().eq('fechamento_id', fechamentoId)
  const { error } = await supabase.schema('flex').from('fechamento_checklist').insert(rows.map((row) => ({ ...row, fechamento_id: fechamentoId })))
  if (error) throw new Error(error.message)
}

function addMonths(date: string, months: number) {
  const parsed = new Date(`${date}T00:00:00`)
  parsed.setMonth(parsed.getMonth() + months)
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-01`
}

function nextMonth(date: string) {
  return addMonths(date, 1)
}

function normalizeAliasList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => valueText(item)).filter(Boolean)
  return valueText(value)
    .split(/[\n,;]+/g)
    .map((item) => item.trim())
    .filter(Boolean)
}

function matchTerms(previsao: Record<string, unknown>) {
  return [
    ...normalizeAliasList(previsao.aliases).map((term) => ({ term, weight: 90 })),
    { term: valueText(previsao.fornecedor), weight: 70 },
    { term: valueText(previsao.tipo_despesa), weight: genericExpenseTerm(previsao.tipo_despesa) ? 15 : 35 },
  ]
    .map((item) => ({ ...item, normalized: normalizeForMatch(item.term) }))
    .filter((item) => item.normalized.length > 3)
}

function genericExpenseTerm(value: unknown) {
  const normalized = normalizeForMatch(value)
  return ['impostos', 'sistema', 'aluguel', 'escritorio', 'seguro', 'drive', 'ti'].includes(normalized)
}

function previsaoMatchScore(previsao: Record<string, unknown>, source: string, amount?: number, realizedDate?: string, expectedDate?: string) {
  let score = 0
  for (const item of matchTerms(previsao)) {
    if (source.includes(item.normalized)) score = Math.max(score, item.weight + Math.min(item.normalized.length, 20))
  }

  const previsto = Math.abs(Number(previsao.valor_previsto || 0))
  if (amount !== undefined && previsto > 0) {
    const diff = Math.abs(Math.abs(amount) - previsto)
    if (diff <= 1) score += 30
    else if (diff <= Math.max(50, previsto * 0.05)) score += 20
    else if (diff <= Math.max(150, previsto * 0.15)) score += 10
  }

  if (realizedDate && expectedDate) {
    const diffDays = Math.abs((new Date(`${realizedDate}T00:00:00`).getTime() - new Date(`${expectedDate}T00:00:00`).getTime()) / 86400000)
    if (diffDays <= 2) score += 10
    else if (diffDays <= 7) score += 5
  }

  return score
}

function bestPrevisaoMatch(previsoes: any[], source: string, amount?: number) {
  let best: { previsao: any; score: number } | null = null
  for (const previsao of previsoes) {
    const score = previsaoMatchScore(previsao, source, amount)
    if (score >= 50 && (!best || score > best.score)) best = { previsao, score }
  }
  return best
}

function bestLancamentoMatch(previsao: any, lancamentos: any[], usados: Set<string>, dataPrevista: string) {
  const linked = lancamentos.filter((lancamento) => !usados.has(String(lancamento.id)) && String(lancamento.previsao_despesa_id ?? '') === String(previsao.id))
  if (linked.length) return lancamentoMatchGroup(linked)

  const candidates = lancamentos
    .filter((lancamento) => !usados.has(String(lancamento.id)) && !lancamento.previsao_despesa_id)
    .map((lancamento) => {
      const source = normalizeForMatch([lancamento.fornecedor, lancamento.descricao, lancamento.historico].filter(Boolean).join(' '))
      return {
        lancamento,
        score: previsaoMatchScore(previsao, source, Math.abs(Number(lancamento.valor || 0)), String(lancamento.data_lancamento), dataPrevista),
      }
    })
    .filter((item) => item.score >= 50)
    .sort((a, b) => b.score - a.score)

  if (!candidates.length) return null

  const strongCandidates = candidates.filter((item) => item.score >= 80)
  return lancamentoMatchGroup((strongCandidates.length > 1 ? strongCandidates : [candidates[0]]).map((item) => item.lancamento))
}

function lancamentoMatchGroup(lancamentos: any[]) {
  const sorted = [...lancamentos].sort((a, b) => String(a.data_lancamento).localeCompare(String(b.data_lancamento)))
  return {
    lancamentos: sorted,
    valorRealizado: sorted.reduce((sum, lancamento) => sum + Math.abs(Number(lancamento.valor || 0)), 0),
    dataRealizada: String(sorted[sorted.length - 1]?.data_lancamento ?? sorted[0]?.data_lancamento ?? ''),
  }
}

function normalizeForMatch(value: unknown) {
  return valueText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isOperationalExpenseCandidate(row: Record<string, unknown>) {
  const source = normalizeForMatch([row.fornecedor, row.descricao, row.historico].filter(Boolean).join(' '))
  if (!source) return false

  const explicitExpenseTerms = [
    'pagamento efetuado',
    'pagamento de titulo',
    'pagamento pmsp',
    'simples nacional',
    'receita federal',
    'prefeitura',
  ]
  if (explicitExpenseTerms.some((term) => source.includes(term))) return true

  const organizationTerms = [
    'ltda',
    's a',
    'nacional',
    'federal',
    'cef',
    'banco',
    'claro',
    'telefonica',
    'enel',
    'aasp',
    'oab',
    'aurum',
    'omie',
    'recrutas',
  ]
  return organizationTerms.some((term) => source.includes(term))
}

function paymentDateForCompetencia(competencia: string, diaPrevisto: number) {
  const year = Number(competencia.slice(0, 4))
  const month = Number(competencia.slice(5, 7))
  const lastDay = new Date(year, month, 0).getDate()
  const day = Math.min(Math.max(Number(diaPrevisto) || 5, 1), lastDay)
  return `${competencia.slice(0, 8)}${String(day).padStart(2, '0')}`
}
