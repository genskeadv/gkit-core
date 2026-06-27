'use server'

import { createHash } from 'node:crypto'
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

function uuidOrNull(value: string) {
  return value || null
}

function money(formData: FormData, key: string) {
  const raw = text(formData, key).replace(/\./g, '').replace(',', '.')
  const parsed = Number(raw || 0)
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${key} deve ser um valor positivo.`)
  return parsed
}

function optionalMoney(formData: FormData, key: string) {
  const raw = text(formData, key)
  if (!raw) return null
  return money(formData, key)
}

function percent(formData: FormData, key: string) {
  const parsed = Number(text(formData, key) || 0)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) throw new Error(`${key} deve ficar entre 0 e 100.`)
  return parsed
}

function integerInRange(formData: FormData, key: string, min: number, max: number) {
  const parsed = Number(text(formData, key))
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`${key} deve ficar entre ${min} e ${max}.`)
  return parsed
}

function competenciaMonth(formData: FormData, key: string, label: string) {
  const value = required(text(formData, key), label)
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value.slice(0, 7)}-01`
  throw new Error(`${label} deve ser informado em mes/ano.`)
}

function optionalCompetenciaMonth(formData: FormData, key: string, label: string) {
  const value = text(formData, key)
  if (!value) return null
  return competenciaMonth(formData, key, label)
}

function calculateCommission(base: number, commissionPercent: number) {
  return Math.round(base * (commissionPercent / 100) * 100) / 100
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

type IntrWritePermission =
  | 'intr.agenda_pagamentos.write'
  | 'intr.colaboradores.write'
  | 'intr.comissoes.write'
  | 'intr.fechamentos.write'
  | 'intr.pagamentos.write'
  | 'intr.receitas.write'
  | 'intr.times.write'

async function requireIntrWrite(permission: IntrWritePermission) {
  const context = await requireModuleAccess('intr')
  if (!canAccess(context.permissions, permission)) {
    throw new Error('Usuario sem permissao para gerenciar o Intr.')
  }
  return context
}

type OfxPaymentMatch = {
  dataExtrato: string
  diferenca: number
  descricaoExtrato: string
  fitId: string
  pagamentoColaborador: string
  pagamentoDescricao: string
  pagamentoId: string
  pagamentoTipo: string
  valor: number
  valorPrevisto: number
}

type OfxConciliationItem = {
  data: string
  descricao: string
  fitId: string
  sugestoes: OfxPaymentMatch[]
  valor: number
}

function ofxTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i'))
  return match?.[1]?.trim() ?? ''
}

function ofxDate(value: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!match) return ''
  return `${match[1]}-${match[2]}-${match[3]}`
}

function parseOfxAmount(value: string) {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function dateDistanceInDays(a: string, b: string | null) {
  if (!a || !b) return 9999
  const first = new Date(`${a}T00:00:00.000Z`).getTime()
  const second = new Date(`${b}T00:00:00.000Z`).getTime()
  if (Number.isNaN(first) || Number.isNaN(second)) return 9999
  return Math.abs(first - second) / 86400000
}

async function parseOfxFile(formData: FormData) {
  const file = formData.get('arquivo')
  if (!(file instanceof File) || file.size === 0) throw new Error('Selecione um arquivo OFX.')
  const content = await file.text()
  const blocks = content.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|<\/STMTTRN>)/gi) ?? []
  const transactions = blocks.map((block) => ({
    amount: parseOfxAmount(ofxTag(block, 'TRNAMT')),
    date: ofxDate(ofxTag(block, 'DTPOSTED')),
    fitId: ofxTag(block, 'FITID') || createHash('sha1').update(block).digest('hex'),
    memo: ofxTag(block, 'MEMO'),
    name: ofxTag(block, 'NAME'),
  })).filter((item) => item.date && item.amount < 0)

  return {
    arquivo: file.name,
    transactions,
  }
}

function moneyEquals(a: number, b: number) {
  return Math.abs(a - b) < 0.01
}

function roundDifference(value: number) {
  return Math.round(value * 100) / 100
}

function textIncludesName(source: unknown, name: unknown) {
  const normalizedSource = normalizeName(String(source ?? ''))
  const normalizedName = normalizeName(String(name ?? ''))
  return Boolean(normalizedName && normalizedSource.includes(normalizedName))
}

async function buildOfxPaymentConciliationPreview(formData: FormData) {
  const { arquivo, transactions } = await parseOfxFile(formData)
  const { data, error } = await admin()
    .from('gkli_intr_pagamentos_resumo')
    .select('id,colaborador_nome,tipo,descricao,competencia,data_prevista,valor_bruto,valor_descontos,valor_liquido,status')
    .in('status', ['previsto', 'em_processamento'])
    .limit(2000)

  if (error) throw new Error(error.message)

  const pagamentos = ((data ?? []) as Array<Record<string, unknown>>)
  const lancamentos: OfxConciliationItem[] = []
  const semCorrespondencia: Array<{ data: string; descricao: string; valor: number }> = []

  transactions.forEach((transaction) => {
    const valor = Math.abs(transaction.amount)
    const descricao = transaction.memo || transaction.name || 'Lancamento do extrato'
    const candidates = pagamentos
      .map((pagamento) => ({
        pagamento,
        distance: dateDistanceInDays(transaction.date, String(pagamento.data_prevista ?? pagamento.competencia ?? '') || null),
        nameMatch: textIncludesName(`${transaction.name} ${transaction.memo}`, pagamento.colaborador_nome),
        valueDifference: Math.abs(Number(pagamento.valor_liquido ?? 0) - valor),
      }))
      .filter((candidate) => candidate.nameMatch || candidate.distance <= 7 || candidate.valueDifference <= 100)
      .sort((a, b) => Number(b.nameMatch) - Number(a.nameMatch) || a.distance - b.distance || a.valueDifference - b.valueDifference)
      .slice(0, 5)

    if (!candidates.length) {
      semCorrespondencia.push({
        data: transaction.date,
        descricao,
        valor,
      })
      return
    }

    lancamentos.push({
      data: transaction.date,
      descricao,
      fitId: transaction.fitId,
      sugestoes: candidates.map((candidate) => {
        const valorPrevisto = Number(candidate.pagamento.valor_liquido ?? 0)
        return {
          dataExtrato: transaction.date,
          descricaoExtrato: descricao,
          diferenca: roundDifference(valor - valorPrevisto),
          fitId: transaction.fitId,
          pagamentoColaborador: String(candidate.pagamento.colaborador_nome ?? 'Colaborador'),
          pagamentoDescricao: String(candidate.pagamento.descricao ?? 'Pagamento previsto'),
          pagamentoId: String(candidate.pagamento.id),
          pagamentoTipo: String(candidate.pagamento.tipo ?? 'Pagamento'),
          valor,
          valorPrevisto,
        }
      }),
      valor,
    })
  })

  return {
    arquivo,
    lancamentos,
    semCorrespondencia,
    totalExtrato: transactions.length,
    totalPagamentosPrevistos: pagamentos.length,
  }
}

function timePayload(formData: FormData) {
  return {
    nome: required(text(formData, 'nome'), 'Nome'),
    descricao: nullableText(formData, 'descricao'),
    ativo: formData.get('ativo') !== 'off',
  }
}

function comissaoTipoPayload(formData: FormData) {
  return {
    nome: required(text(formData, 'nome'), 'Nome'),
    categoria: nullableText(formData, 'categoria'),
    percentual: percent(formData, 'percentual'),
    comissao_de_time: formData.get('comissao_de_time') === 'on',
    ativo: formData.get('ativo') !== 'off',
    observacao: nullableText(formData, 'observacao'),
  }
}

function isMissingComissaoDeTimeColumn(error: { message?: string; code?: string } | null) {
  const message = String(error?.message ?? '').toLowerCase()
  return message.includes('comissao_de_time') || message.includes('schema cache') || error?.code === 'PGRST204'
}

function withoutComissaoDeTime(payload: ReturnType<typeof comissaoTipoPayload>) {
  const { comissao_de_time: _comissaoDeTime, ...rest } = payload
  return rest
}

function comissaoDeTimeMigrationError() {
  return new Error('Para usar "Comissao de time", execute primeiro o SQL 16_intr_comissao_tipos_time.sql no Supabase.')
}

function isMissingAgendaPorTipoMigration(error: { message?: string; code?: string } | null) {
  const message = String(error?.message ?? '').toLowerCase()
  return (
    message.includes('colaborador_id') ||
    message.includes('no unique') ||
    message.includes('unique or exclusion constraint') ||
    message.includes('pagamentos_agenda_competencia_uidx') ||
    message.includes('duplicate key')
  )
}

function agendaPorTipoMigrationError() {
  return new Error('Para usar agenda por tipo de pagamento, execute primeiro o SQL 17_intr_agenda_por_tipo_pagamento.sql no Supabase.')
}

async function colaboradorPayload(formData: FormData) {
  const usuarioId = uuidOrNull(text(formData, 'usuario_id'))
  let coreUsuario: Record<string, unknown> | null = null

  if (usuarioId) {
    const { data, error } = await admin()
      .schema('security')
      .from('usuarios')
      .select('id,nome,email,status')
      .eq('id', usuarioId)
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Usuario Core nao encontrado.')
    coreUsuario = data as Record<string, unknown>
  }

  return {
    usuario_id: usuarioId,
    nome: coreUsuario ? required(String(coreUsuario.nome ?? '').trim(), 'Nome do usuario Core') : required(text(formData, 'nome'), 'Nome'),
    cpf_cnpj: nullableText(formData, 'cpf_cnpj'),
    email: coreUsuario ? required(String(coreUsuario.email ?? '').trim().toLowerCase(), 'E-mail do usuario Core') : required(text(formData, 'email'), 'E-mail'),
    telefone: nullableText(formData, 'telefone'),
    status: text(formData, 'status') || 'ativo',
    time_id: uuidOrNull(text(formData, 'time_id')),
    cargo: nullableText(formData, 'cargo'),
    gestor_id: uuidOrNull(text(formData, 'gestor_id')),
    salario: money(formData, 'salario'),
    pro_labore: money(formData, 'pro_labore'),
    ajuda_custo: money(formData, 'ajuda_custo'),
    participacao_honorarios: money(formData, 'participacao_honorarios'),
    outros_vencimentos: money(formData, 'outros_vencimentos'),
    beneficio_descricao: nullableText(formData, 'beneficio_descricao'),
    beneficio_valor: money(formData, 'beneficio_valor'),
    observacoes: nullableText(formData, 'observacoes'),
  }
}

async function findExistingColaborador(payload: Awaited<ReturnType<typeof colaboradorPayload>>) {
  const matches = new Map<string, Record<string, unknown>>()

  if (payload.usuario_id) {
    const { data, error } = await admin()
      .schema('gkli_intr')
      .from('colaboradores')
      .select('id,usuario_id,email')
      .eq('usuario_id', payload.usuario_id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (data) matches.set(String(data.id), data as Record<string, unknown>)
  }

  if (payload.email) {
    const { data, error } = await admin()
      .schema('gkli_intr')
      .from('colaboradores')
      .select('id,usuario_id,email')
      .eq('email', payload.email)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (data) matches.set(String(data.id), data as Record<string, unknown>)
  }

  if (matches.size > 1) {
    throw new Error('O usuario Core e o e-mail informados apontam para colaboradores diferentes no Intr.')
  }

  return Array.from(matches.values())[0] ?? null
}

function comissaoPayload(formData: FormData) {
  const valorBase = money(formData, 'valor_base')
  const percentual = percent(formData, 'percentual')
  const valorInformado = optionalMoney(formData, 'valor_comissao')
  const calcularAutomatico = formData.get('calcular_automatico') === 'on'

  return {
    colaborador_id: required(text(formData, 'colaborador_id'), 'Colaborador'),
    receita_id: uuidOrNull(text(formData, 'receita_id')),
    fechamento_id: uuidOrNull(text(formData, 'fechamento_id')),
    vendedor_nome: nullableText(formData, 'vendedor_nome'),
    cliente: nullableText(formData, 'cliente'),
    categoria: nullableText(formData, 'categoria'),
    tipo_comissao_nome: nullableText(formData, 'tipo_comissao_nome'),
    percentual,
    valor_base: valorBase,
    valor_comissao: calcularAutomatico || valorInformado === null ? calculateCommission(valorBase, percentual) : valorInformado,
    competencia: nullableText(formData, 'competencia'),
    data_recebimento: nullableText(formData, 'data_recebimento'),
    status: text(formData, 'status') || 'calculada',
    observacao: nullableText(formData, 'observacao'),
    origem: nullableText(formData, 'origem'),
    aprovado_em: text(formData, 'status') === 'aprovada' ? new Date().toISOString() : null,
    pago_em: text(formData, 'status') === 'paga' ? new Date().toISOString() : null,
  }
}

function receitaPayload(formData: FormData) {
  return {
    colaborador_id: uuidOrNull(text(formData, 'colaborador_id')),
    vendedor_nome: nullableText(formData, 'vendedor_nome'),
    cliente: required(text(formData, 'cliente'), 'Cliente'),
    categoria: nullableText(formData, 'categoria'),
    descricao: nullableText(formData, 'descricao'),
    competencia: required(text(formData, 'competencia'), 'Competencia'),
    data_recebimento: nullableText(formData, 'data_recebimento'),
    valor_base: money(formData, 'valor_base'),
    valor_recebido: money(formData, 'valor_recebido'),
    status: text(formData, 'status') || 'recebida',
    origem: nullableText(formData, 'origem'),
    observacao: nullableText(formData, 'observacao'),
  }
}

function pagamentoPayload(formData: FormData) {
  return {
    colaborador_id: required(text(formData, 'colaborador_id'), 'Colaborador'),
    agenda_id: uuidOrNull(text(formData, 'agenda_id')),
    fechamento_id: uuidOrNull(text(formData, 'fechamento_id')),
    tipo: nullableText(formData, 'tipo'),
    descricao: nullableText(formData, 'descricao'),
    competencia: required(text(formData, 'competencia'), 'Competencia'),
    data_prevista: nullableText(formData, 'data_prevista'),
    data_pagamento: nullableText(formData, 'data_pagamento'),
    valor_bruto: money(formData, 'valor_bruto'),
    valor_descontos: money(formData, 'valor_descontos'),
    status: text(formData, 'status') || 'previsto',
    comissao_id: uuidOrNull(text(formData, 'comissao_id')),
    origem: nullableText(formData, 'origem'),
    observacao: nullableText(formData, 'observacao'),
  }
}

function agendaPagamentoPayload(formData: FormData) {
  return {
    colaborador_id: uuidOrNull(text(formData, 'colaborador_id')),
    tipo: required(text(formData, 'tipo'), 'Tipo de pagamento'),
    descricao: nullableText(formData, 'descricao'),
    dia_previsto: integerInRange(formData, 'dia_previsto', 1, 31),
    percentual: percent(formData, 'percentual'),
    valor_bruto: money(formData, 'valor_bruto'),
    valor_descontos: money(formData, 'valor_descontos'),
    inicio_competencia: competenciaMonth(formData, 'inicio_competencia', 'Inicio da competencia'),
    fim_competencia: optionalCompetenciaMonth(formData, 'fim_competencia', 'Fim da competencia'),
    ativo: formData.get('ativo') !== 'off',
    origem: nullableText(formData, 'origem'),
    observacao: nullableText(formData, 'observacao'),
  }
}

function scheduledDate(competencia: string, day: number) {
  const base = new Date(`${competencia}T00:00:00.000Z`)
  if (Number.isNaN(base.getTime())) throw new Error('Competencia invalida.')
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate()
  const safeDay = Math.min(day, lastDay)
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
}

function monthLabel(competencia: string) {
  const date = new Date(`${competencia}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return competencia
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC', year: 'numeric' }).format(date)
}

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function parseBrazilianMoney(value: string) {
  const parsed = Number(value.replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(parsed)) return 0
  return Math.round(parsed * 100) / 100
}

const monthMap: Record<string, string> = {
  janeiro: '01',
  fevereiro: '02',
  marco: '03',
  abril: '04',
  maio: '05',
  junho: '06',
  julho: '07',
  agosto: '08',
  setembro: '09',
  outubro: '10',
  novembro: '11',
  dezembro: '12',
}

type ParsedPayrollReceipt = {
  page: number
  nomeRecibo: string
  competencia: string
  competenciaLabel: string
  tipo: string
  valorBruto: number
  valorDescontos: number
  valorLiquido: number
}

type PayrollPreviewItem = ParsedPayrollReceipt & {
  colaboradorId: string | null
  colaboradorNome: string | null
  acao: 'criar' | 'atualizar' | 'sem_vinculo'
  pagamentoId: string | null
}

type ParsedRevenueRow = {
  linha: number
  chave: string
  origemId: string
  vendedorNome: string | null
  cliente: string
  categoria: string | null
  descricao: string | null
  competencia: string
  dataRecebimento: string | null
  valorBase: number
  valorRecebido: number
  status: 'prevista' | 'recebida' | 'conciliada' | 'cancelada'
  observacao: string | null
}

type RevenuePreviewItem = ParsedRevenueRow & {
  acao: 'criar' | 'atualizar'
  receitaId: string | null
  recebedorTipo: 'colaborador' | 'time' | null
  recebedorNome: string | null
  comissoes: RevenueCommissionPreviewItem[]
  alertas: string[]
}

type RevenueCommissionPreviewItem = {
  origemId: string
  colaboradorId: string
  colaboradorNome: string
  receitaOrigemId: string
  comissaoId: string | null
  tipoComissaoId: string | null
  tipoComissaoNome: string
  percentual: number
  percentualTotal: number
  valorBase: number
  valorComissao: number
  status: 'calculada' | 'em_conferencia'
  acao: 'criar' | 'atualizar'
}

async function extractPdfPageTexts(file: File) {
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    throw new Error('Selecione um arquivo PDF.')
  }

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const document = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    disableWorker: true,
  } as any).promise

  const pages: string[] = []
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    pages.push(content.items.map((item: any) => ('str' in item ? String(item.str) : '')).join('\n'))
  }

  return pages
}

function parsePayrollReceiptPage(text: string, page: number): ParsedPayrollReceipt | null {
  const compact = text.replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n')
  const employeeBlock = compact.split('CNPJ:')[1] ?? compact
  const nameMatch = employeeBlock.match(/Codigo\s+([\s\S]*?)\s+Nome do Funcion/i) ?? employeeBlock.match(/Código\s+([\s\S]*?)\s+Nome do Funcion/i)
  const folhaMatch = compact.match(/Folha Mensal\s+([A-Za-z\u00c0-\u017f]+)\s+de\s+(\d{4})/i)
  const totalsMatch = compact.match(/Declaro[\s\S]*?\n\s*([\d.]+,\d{2})\s*\n\s*([\d.]+,\d{2})\s*\n\s*([\d.]+,\d{2})/)

  if (!nameMatch || !folhaMatch || !totalsMatch) return null

  const monthKey = normalizeName(folhaMatch[1])
  const month = monthMap[monthKey]
  if (!month) return null

  const year = folhaMatch[2]
  const competencia = `${year}-${month}-01`
  const nomeRecibo = nameMatch[1].replace(/\s+/g, ' ').trim()

  return {
    page,
    nomeRecibo,
    competencia,
    competenciaLabel: monthLabel(competencia),
    tipo: /PRO-LABORE/i.test(compact) ? 'Pro-labore' : 'Salario CLT',
    valorBruto: parseBrazilianMoney(totalsMatch[1]),
    valorDescontos: parseBrazilianMoney(totalsMatch[2]),
    valorLiquido: parseBrazilianMoney(totalsMatch[3]),
  }
}

async function parsePayrollReceiptPdf(formData: FormData) {
  const file = formData.get('arquivo')
  if (!(file instanceof File) || file.size === 0) throw new Error('Selecione um arquivo PDF.')
  const pages = await extractPdfPageTexts(file)
  const parsed = pages
    .map((pageText, index) => parsePayrollReceiptPage(pageText, index + 1))
    .filter((item): item is ParsedPayrollReceipt => Boolean(item))

  if (!parsed.length) throw new Error('Nenhum recibo reconhecido no PDF.')
  return { fileName: file.name, parsed }
}

function stableUuid(seed: string) {
  const hex = createHash('sha1').update(seed).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0')}${hex.slice(18, 20)}-${hex.slice(20, 32)}`
}

function normalizeHeader(value: string) {
  return normalizeName(value).replace(/\s+/g, ' ')
}

function getRowValue(row: Record<string, unknown>, ...headers: string[]) {
  const entries = Object.entries(row).map(([key, value]) => [normalizeHeader(key), value] as const)
  for (const header of headers) {
    const wanted = normalizeHeader(header)
    const found = entries.find(([key]) => key === wanted)
    if (found) return found[1]
  }
  return null
}

function xlsxDate(value: unknown) {
  if (!value) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  if (typeof value === 'number') {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000))
    if (Number.isNaN(date.getTime())) return null
    return date.toISOString().slice(0, 10)
  }
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function spreadsheetMoney(value: unknown) {
  if (typeof value === 'number') return Math.round(value * 100) / 100
  if (!value) return 0
  return parseBrazilianMoney(String(value))
}

function revenueStatus(value: unknown, amountOpen: number): ParsedRevenueRow['status'] {
  const status = normalizeName(String(value ?? ''))
  if (status.includes('cancel')) return 'cancelada'
  if (amountOpen > 0) return 'prevista'
  if (status.includes('receb')) return 'conciliada'
  return 'recebida'
}

function buildRevenueObservation(row: Record<string, unknown>, chave: string) {
  const pieces = [
    `Chave: ${chave}`,
    `CNPJ/CPF: ${textValue(getRowValue(row, 'Cliente (CNPJ/CPF)', 'Cliente ou Fornecedor (CNPJ/CPF)')) || '-'}`,
    `Boleto: ${textValue(getRowValue(row, 'Numero do Boleto', 'Número do Boleto', 'Nosso Número')) || '-'}`,
    `Documento: ${textValue(getRowValue(row, 'Documento')) || '-'}`,
    `Parcela: ${textValue(getRowValue(row, 'Parcela')) || '-'}`,
    `Contrato: ${textValue(getRowValue(row, 'Nº do Contrato de Venda', 'No do Contrato de Venda')) || '-'}`,
    `Conta: ${textValue(getRowValue(row, 'Conta Corrente')) || '-'}`,
    `Origem Omie: ${textValue(getRowValue(row, 'Origem')) || '-'}`,
    `Juros/Multa: ${spreadsheetMoney(getRowValue(row, 'Juros e Multa')).toFixed(2)}`,
    `Valor a receber: ${spreadsheetMoney(getRowValue(row, 'Valor a Receber')).toFixed(2)}`,
  ]
  const note = textValue(getRowValue(row, 'Observacao', 'Observação', 'Observações'))
  if (note) pieces.push(`Obs origem: ${note}`)
  return pieces.join('; ')
}

function textValue(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object' && 'text' in value) return String(value.text ?? '').trim()
  if (typeof value === 'object' && 'result' in value) return String(value.result ?? '').trim()
  if (typeof value === 'object' && 'richText' in value) return (value.richText as Array<{ text?: string }>).map((item) => item.text ?? '').join('').trim()
  return String(value).trim()
}

async function parseRevenueXlsx(formData: FormData) {
  const file = formData.get('arquivo')
  if (!(file instanceof File) || file.size === 0) throw new Error('Selecione um arquivo XLSX.')
  if (!file.name.toLowerCase().endsWith('.xlsx')) throw new Error('O arquivo de receitas precisa estar em XLSX.')

  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const sheet = workbook.worksheets[0]
  if (!sheet) throw new Error('Nenhuma aba encontrada no XLSX.')

  const headerRow = sheet.getRow(3)
  const headers = headerRow.values as unknown[]
  const rows: Array<Record<string, unknown>> = []
  for (let rowNumber = 4; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    const item: Record<string, unknown> = {}
    headers.forEach((header, index) => {
      const key = textValue(header)
      if (!key) return
      item[key] = row.getCell(index).value
    })
    if (Object.values(item).some((value) => textValue(value))) rows.push(item)
  }
  const parsed: ParsedRevenueRow[] = []
  const ignored: string[] = []
  const fileLooksLikeOmieMovimento = rows.some((row) => textValue(getRowValue(row, 'Cliente ou Fornecedor')) || textValue(getRowValue(row, 'Valor (R$)')) || textValue(getRowValue(row, 'Origem')))

  rows.forEach((row, index) => {
    const linha = index + 4
    const origem = textValue(getRowValue(row, 'Origem'))
    const valorMovimento = spreadsheetMoney(getRowValue(row, 'Valor (R$)'))
    const isSaldoRow = ['saldo', 'saldo anterior'].includes(normalizeName(textValue(getRowValue(row, 'Cliente ou Fornecedor', 'Cliente (Nome Fantasia)'))))

    if (fileLooksLikeOmieMovimento) {
      const isContaRecebida = normalizeName(origem) === 'conta recebida'
      if (isSaldoRow || valorMovimento <= 0 || !isContaRecebida) return

      const cliente = textValue(getRowValue(row, 'Cliente ou Fornecedor', 'Cliente ou Fornecedor (Razão Social)'))
      const categoria = textValue(getRowValue(row, 'Categoria'))
      const dataMovimento = xlsxDate(getRowValue(row, 'Data'))
      const documento = textValue(getRowValue(row, 'Documento'))
      const notaFiscal = textValue(getRowValue(row, 'Nota Fiscal'))
      const parcela = textValue(getRowValue(row, 'Parcela'))
      const nossoNumero = textValue(getRowValue(row, 'Nosso Número', 'Nosso Numero'))
      const pedido = textValue(getRowValue(row, 'Pedido'))
      const vendedorNome = textValue(getRowValue(row, 'Vendedor'))
      const cnpj = textValue(getRowValue(row, 'Cliente ou Fornecedor (CNPJ/CPF)'))
      const tipoDocumento = textValue(getRowValue(row, 'Tipo de Documento'))

      if (!cliente || !dataMovimento) {
        ignored.push(`Linha ${linha}: cliente ou data ausente no movimento Omie.`)
        return
      }

      const chave = [documento || notaFiscal || nossoNumero || pedido || 'sem-documento', parcela, cnpj, dataMovimento, valorMovimento].filter(Boolean).join('|')
      if (!chave) {
        ignored.push(`Linha ${linha}: sem chave de origem suficiente no movimento Omie.`)
        return
      }

      parsed.push({
        linha,
        chave,
        origemId: stableUuid(`omie-movimento-conta:${chave}`),
        vendedorNome: vendedorNome || null,
        cliente,
        categoria: categoria || null,
        descricao: [tipoDocumento, documento || notaFiscal || pedido].filter(Boolean).join(' - ') || origem || null,
        competencia: dataMovimento,
        dataRecebimento: dataMovimento,
        valorBase: valorMovimento,
        valorRecebido: valorMovimento,
        status: revenueStatus(getRowValue(row, 'Situacao', 'Situação'), 0),
        observacao: buildRevenueObservation(row, chave),
      })
      return
    }

    const cliente = textValue(getRowValue(row, 'Cliente (Nome Fantasia)'))
    const categoria = textValue(getRowValue(row, 'Categoria'))
    const previsao = xlsxDate(getRowValue(row, 'Previsao de Recebimento', 'Previsão de Recebimento'))
    const vencimento = xlsxDate(getRowValue(row, 'Vencimento'))
    const recebimento = xlsxDate(getRowValue(row, 'Ultimo Recebimento', 'Último Recebimento'))
    const competencia = previsao ?? vencimento ?? recebimento
    const valorBase = spreadsheetMoney(getRowValue(row, 'Valor Liquido', 'Valor Líquido'))
    const valorRecebido = spreadsheetMoney(getRowValue(row, 'Valor Recebido'))
    const valorAberto = spreadsheetMoney(getRowValue(row, 'Valor a Receber'))
    const boleto = textValue(getRowValue(row, 'Numero do Boleto', 'Número do Boleto'))
    const operacao = textValue(getRowValue(row, 'Operacao', 'Operação'))
    const vendedorNome = textValue(getRowValue(row, 'Vendedor'))
    const cnpj = textValue(getRowValue(row, 'Cliente (CNPJ/CPF)'))

    if (!cliente || !competencia) {
      ignored.push(`Linha ${linha}: cliente ou competencia ausente.`)
      return
    }

    const chave = boleto || [operacao, cnpj, competencia, valorRecebido || valorBase].filter(Boolean).join('|')
    if (!chave) {
      ignored.push(`Linha ${linha}: sem boleto ou chave de origem suficiente.`)
      return
    }

    parsed.push({
      linha,
      chave,
      origemId: stableUuid(`omie-receita:${chave}`),
      vendedorNome: vendedorNome || null,
      cliente,
      categoria: categoria || null,
      descricao: operacao || textValue(getRowValue(row, 'Tipo de Documento')) || null,
      competencia,
      dataRecebimento: recebimento,
      valorBase,
      valorRecebido,
      status: revenueStatus(getRowValue(row, 'Situacao', 'Situação'), valorAberto),
      observacao: buildRevenueObservation(row, chave),
    })
  })

  if (!parsed.length) throw new Error(fileLooksLikeOmieMovimento ? 'Nenhuma entrada de receita Conta Recebida foi encontrada no XLSX de movimentação Omie.' : 'Nenhuma receita valida encontrada no XLSX.')
  return { arquivo: file.name, parsed, ignored }
}

function activeRows<T extends Record<string, unknown>>(rows: T[], activeField = 'ativo') {
  return rows.filter((row) => row[activeField] !== false && row.status !== 'inativo' && row.status !== 'desligado')
}

async function buildRevenueCommissionPreviewItems(parsed: ParsedRevenueRow[]) {
  const [colaboradoresResult, timesResult, tiposResult] = await Promise.all([
    admin().schema('gkli_intr').from('colaboradores').select('id,nome,status,time_id'),
    admin().schema('gkli_intr').from('times').select('id,nome,ativo'),
    admin().schema('gkli_intr').from('comissao_tipos').select('*'),
  ])
  if (colaboradoresResult.error) throw new Error(colaboradoresResult.error.message)
  if (timesResult.error) throw new Error(timesResult.error.message)
  if (tiposResult.error) throw new Error(tiposResult.error.message)

  const colaboradores = activeRows((colaboradoresResult.data ?? []) as Array<Record<string, unknown>>, 'status')
  const times = activeRows((timesResult.data ?? []) as Array<Record<string, unknown>>)
  const tipos = activeRows((tiposResult.data ?? []) as Array<Record<string, unknown>>)
  const colaboradorByName = new Map(colaboradores.map((row) => [normalizeName(String(row.nome ?? '')), row]))
  const timeByName = new Map(times.map((row) => [normalizeName(String(row.nome ?? '')), row]))
  const membersByTime = new Map<string, Array<Record<string, unknown>>>()
  colaboradores.forEach((row) => {
    const timeId = String(row.time_id ?? '')
    if (!timeId) return
    membersByTime.set(timeId, [...(membersByTime.get(timeId) ?? []), row])
  })

  const typeByCategory = new Map<string, Record<string, unknown>>()
  const typeByName = new Map<string, Record<string, unknown>>()
  tipos.forEach((row) => {
    const category = normalizeName(String(row.categoria ?? ''))
    const name = normalizeName(String(row.nome ?? ''))
    if (category) typeByCategory.set(category, row)
    if (name) typeByName.set(name, row)
  })

  const generated: Record<string, { recebedorTipo: 'colaborador' | 'time' | null; recebedorNome: string | null; comissoes: RevenueCommissionPreviewItem[]; alertas: string[] }> = {}
  const allCommissionOriginIds: string[] = []

  parsed.forEach((receita) => {
    const alertas: string[] = []
    const vendedorKey = normalizeName(receita.vendedorNome ?? '')
    const tipoKey = normalizeName(receita.categoria ?? '')
    const tipo = typeByCategory.get(tipoKey) ?? typeByName.get(tipoKey)
    const colaborador = vendedorKey ? colaboradorByName.get(vendedorKey) : null
    const comissaoDeTime = tipo?.comissao_de_time === true
    const time = vendedorKey
      ? timeByName.get(vendedorKey) ?? (comissaoDeTime && colaborador?.time_id ? times.find((item) => String(item.id) === String(colaborador.time_id)) : null)
      : null
    const percentualTotal = Number(tipo?.percentual ?? 0)
    const tipoComissaoNome = String(tipo?.nome ?? receita.categoria ?? 'Tipo nao definido')
    let receivers: Array<Record<string, unknown>> = []
    let recebedorTipo: 'colaborador' | 'time' | null = null

    if (!receita.vendedorNome) alertas.push(`Linha ${receita.linha}: vendedor vazio; comissao em conferencia.`)
    if (!tipo || percentualTotal <= 0) alertas.push(`Linha ${receita.linha}: tipo de comissao nao encontrado para "${receita.categoria ?? 'Sem categoria'}".`)

    if (comissaoDeTime) {
      receivers = time ? membersByTime.get(String(time.id)) ?? [] : []
      recebedorTipo = time ? 'time' : null
      if (!time && receita.vendedorNome) alertas.push(`Linha ${receita.linha}: time "${receita.vendedorNome}" nao localizado para comissao de time.`)
      if (time && !receivers.length) alertas.push(`Linha ${receita.linha}: time "${String(time.nome ?? receita.vendedorNome)}" sem membros ativos.`)
    } else if (colaborador) {
      receivers = [colaborador]
      recebedorTipo = 'colaborador'
    } else if (time) {
      alertas.push(`Linha ${receita.linha}: vendedor "${receita.vendedorNome}" localizado como time, mas o tipo de comissao nao esta marcado como comissao de time.`)
    } else if (receita.vendedorNome) {
      alertas.push(`Linha ${receita.linha}: vendedor "${receita.vendedorNome}" nao localizado como colaborador ou time.`)
    }

    const splitPercentual = receivers.length ? percentualTotal / receivers.length : 0
    const comissoes = tipo && receivers.length
      ? receivers.map((receiver) => {
          const origemId = stableUuid(`omie-comissao:${receita.origemId}:${receiver.id}`)
          allCommissionOriginIds.push(origemId)
          return {
            origemId,
            colaboradorId: String(receiver.id),
            colaboradorNome: String(receiver.nome ?? 'Colaborador'),
            receitaOrigemId: receita.origemId,
            comissaoId: null,
            tipoComissaoId: String(tipo.id ?? '') || null,
            tipoComissaoNome,
            percentual: splitPercentual,
            percentualTotal,
            valorBase: receita.valorRecebido || receita.valorBase,
            valorComissao: calculateCommission(receita.valorRecebido || receita.valorBase, splitPercentual),
            status: 'calculada' as const,
            acao: 'criar' as const,
          }
        })
      : []

    generated[receita.origemId] = {
      recebedorTipo,
      recebedorNome: receita.vendedorNome,
      comissoes,
      alertas,
    }
  })

  const existing = allCommissionOriginIds.length
    ? await admin().schema('gkli_intr').from('comissoes').select('id,origem_id').in('origem_id', allCommissionOriginIds)
    : { data: [], error: null }
  if (existing.error) throw new Error(existing.error.message)

  const existingByOrigin = new Map(((existing.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.origem_id), String(row.id)]))
  Object.values(generated).forEach((item) => {
    item.comissoes = item.comissoes.map((comissao) => {
      const comissaoId = existingByOrigin.get(comissao.origemId) ?? null
      return { ...comissao, comissaoId, acao: comissaoId ? 'atualizar' : 'criar' }
    })
  })

  return generated
}

async function buildRevenuePreview(formData: FormData) {
  const { arquivo, parsed, ignored } = await parseRevenueXlsx(formData)
  const commissionsByRevenue = await buildRevenueCommissionPreviewItems(parsed)
  const origemIds = parsed.map((item) => item.origemId)
  const existing = origemIds.length
    ? await admin().schema('gkli_intr').from('receitas').select('id,origem_id').in('origem_id', origemIds)
    : { data: [], error: null }
  if (existing.error) throw new Error(existing.error.message)

  const existingByOrigin = new Map(((existing.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.origem_id), String(row.id)]))
  const itens: RevenuePreviewItem[] = parsed.map((item) => {
    const receitaId = existingByOrigin.get(item.origemId) ?? null
    const commissionInfo = commissionsByRevenue[item.origemId]
    return {
      ...item,
      receitaId,
      acao: receitaId ? 'atualizar' : 'criar',
      recebedorTipo: commissionInfo?.recebedorTipo ?? null,
      recebedorNome: commissionInfo?.recebedorNome ?? null,
      comissoes: commissionInfo?.comissoes ?? [],
      alertas: commissionInfo?.alertas ?? [],
    }
  })
  const comissoes = itens.flatMap((item) => item.comissoes)
  const alertas = [...ignored, ...itens.flatMap((item) => item.alertas)]

  return {
    arquivo,
    total: parsed.length + ignored.length,
    validas: parsed.length,
    criar: itens.filter((item) => item.acao === 'criar').length,
    atualizar: itens.filter((item) => item.acao === 'atualizar').length,
    ignoradas: alertas,
    valorBaseTotal: itens.reduce((sum, item) => sum + item.valorBase, 0),
    valorRecebidoTotal: itens.reduce((sum, item) => sum + item.valorRecebido, 0),
    comissoesTotal: comissoes.length,
    comissoesCriar: comissoes.filter((item) => item.acao === 'criar').length,
    comissoesAtualizar: comissoes.filter((item) => item.acao === 'atualizar').length,
    valorComissaoTotal: comissoes.reduce((sum, item) => sum + item.valorComissao, 0),
    categorias: Array.from(new Set(itens.map((item) => item.categoria ?? 'Sem categoria'))).length,
    amostras: itens.slice(0, 12),
    itens,
  }
}

async function buildPayrollReceiptPreview(formData: FormData) {
  const { fileName, parsed } = await parsePayrollReceiptPdf(formData)
  const { data: colaboradores, error } = await admin()
    .schema('gkli_intr')
    .from('colaboradores')
    .select('id,nome,status')
    .neq('status', 'inativo')
  if (error) throw new Error(error.message)

  const byName = new Map(
    ((colaboradores ?? []) as Array<Record<string, unknown>>).map((row) => [
      normalizeName(String(row.nome ?? '')),
      { id: String(row.id), nome: String(row.nome ?? '') },
    ]),
  )

  const matched = parsed.map((item) => {
    const colaborador = byName.get(normalizeName(item.nomeRecibo))
    return { ...item, colaboradorId: colaborador?.id ?? null, colaboradorNome: colaborador?.nome ?? null }
  })

  const existingQueries = matched
    .filter((item) => item.colaboradorId)
    .map(async (item) => {
      const { data, error: existingError } = await admin()
        .schema('gkli_intr')
        .from('pagamentos')
        .select('id')
        .eq('colaborador_id', item.colaboradorId)
        .eq('competencia', item.competencia)
        .eq('tipo', item.tipo)
        .eq('origem', 'recibo_pagamento_pdf')
        .limit(1)
      if (existingError) throw new Error(existingError.message)
      const [first] = (data ?? []) as Array<Record<string, unknown>>
      return [item.page, first?.id ? String(first.id) : null] as const
    })

  const existingByPage = new Map(await Promise.all(existingQueries))
  const itens: PayrollPreviewItem[] = matched.map((item) => {
    const pagamentoId = existingByPage.get(item.page) ?? null
    return {
      ...item,
      pagamentoId,
      acao: item.colaboradorId ? (pagamentoId ? 'atualizar' : 'criar') : 'sem_vinculo',
    }
  })

  return {
    arquivo: fileName,
    total: parsed.length,
    vinculados: itens.filter((item) => item.colaboradorId).length,
    criar: itens.filter((item) => item.acao === 'criar').length,
    atualizar: itens.filter((item) => item.acao === 'atualizar').length,
    importaveis: itens.filter((item) => item.acao !== 'sem_vinculo').length,
    ignorados: itens
      .filter((item) => item.acao === 'sem_vinculo')
      .map((item) => `Pagina ${item.page}: ${item.nomeRecibo} sem colaborador ativo com o mesmo nome.`),
    itens,
  }
}

function sumRows(rows: Array<Record<string, unknown>>, field: string) {
  return rows.reduce((sum, row) => sum + Number(row[field] ?? 0), 0)
}

function normalizePaymentType(value: unknown) {
  return normalizeName(String(value ?? ''))
}

function isCommissionPaymentType(value: unknown) {
  return normalizePaymentType(value).includes('comiss')
}

function agendaPaymentBase({
  agenda,
  colaborador,
  comissoes,
}: {
  agenda: Record<string, unknown>
  colaborador: Record<string, unknown>
  comissoes: Array<Record<string, unknown>>
}) {
  const tipo = normalizePaymentType(agenda.tipo)
  const colaboradorId = String(colaborador.id ?? '')

  if (isCommissionPaymentType(agenda.tipo)) {
    const colaboradorComissoes = comissoes.filter((row) => String(row.colaborador_id ?? '') === colaboradorId)
    return { base: sumRows(colaboradorComissoes, 'valor_comissao'), baseLabel: 'comissoes do colaborador na competencia' }
  }

  if (tipo.includes('salario')) return { base: Number(colaborador.salario ?? 0), baseLabel: 'salario do colaborador' }
  if (tipo.includes('pro labore')) return { base: Number(colaborador.pro_labore ?? 0), baseLabel: 'pro-labore do colaborador' }
  if (tipo.includes('participacao') && tipo.includes('honorarios')) return { base: Number(colaborador.participacao_honorarios ?? 0), baseLabel: 'participacao em honorarios fixos do colaborador' }
  if (tipo.includes('beneficio')) return { base: Number(colaborador.beneficio_valor ?? 0), baseLabel: 'beneficios do colaborador' }
  if (tipo.includes('ajuda') && tipo.includes('custo')) return { base: Number(colaborador.ajuda_custo ?? 0), baseLabel: 'ajuda de custo do colaborador' }
  if (tipo.includes('outro')) return { base: Number(colaborador.outros_vencimentos ?? 0), baseLabel: 'outros vencimentos do colaborador' }

  return { base: Number(agenda.valor_bruto ?? 0), baseLabel: 'valor fixo da agenda' }
}

async function computeFechamento(competencia: string) {
  const [receitasResult, comissoesResult, pagamentosResult] = await Promise.all([
    admin().schema('gkli_intr').from('receitas').select('valor_recebido,status').eq('competencia', competencia),
    admin().schema('gkli_intr').from('comissoes').select('id,valor_comissao,status').eq('competencia', competencia),
    admin().schema('gkli_intr').from('pagamentos').select('id,valor_liquido,status,observacao').eq('competencia', competencia),
  ])
  if (receitasResult.error) throw new Error(receitasResult.error.message)
  if (comissoesResult.error) throw new Error(comissoesResult.error.message)
  if (pagamentosResult.error) throw new Error(pagamentosResult.error.message)

  const receitas = ((receitasResult.data ?? []) as Array<Record<string, unknown>>).filter((row) => row.status !== 'cancelada')
  const comissoes = ((comissoesResult.data ?? []) as Array<Record<string, unknown>>).filter((row) => row.status !== 'cancelada')
  const comissoesAprovadas = comissoes.filter((row) => row.status === 'aprovada')
  const pagamentos = ((pagamentosResult.data ?? []) as Array<Record<string, unknown>>).filter((row) => row.status !== 'cancelado')
  const pagamentosDivergentes = pagamentos.filter((row) => String(row.observacao ?? '').includes('VALOR_DIVERGENTE_OFX'))
  const receitaTotal = sumRows(receitas, 'valor_recebido')
  const pagamentosPrevistosTotal = sumRows(pagamentos, 'valor_liquido')

  return {
    receita_total: receitaTotal,
    comissao_total: sumRows(comissoesAprovadas, 'valor_comissao'),
    pagamentos_previstos_total: pagamentosPrevistosTotal,
    pagamentos_pagos_total: sumRows(pagamentos.filter((row) => row.status === 'pago'), 'valor_liquido'),
    saldo_operacional: receitaTotal - pagamentosPrevistosTotal,
    pendencias_total:
      comissoes.filter((row) => ['calculada', 'em_conferencia'].includes(String(row.status))).length +
      pagamentos.filter((row) => ['previsto', 'em_processamento'].includes(String(row.status))).length +
      pagamentosDivergentes.length,
  }
}

async function countFechamentoDivergencias(competencia: string) {
  const { data, error } = await admin()
    .schema('gkli_intr')
    .from('pagamentos')
    .select('id')
    .eq('competencia', competencia)
    .eq('status', 'pago')
    .ilike('observacao', '%VALOR_DIVERGENTE_OFX%')

  if (error) throw new Error(error.message)
  return (data ?? []).length
}

export async function createIntrTimeAction(formData: FormData) {
  await requireIntrWrite('intr.times.write')
  const { data, error } = await admin().schema('gkli_intr').from('times').insert(timePayload(formData)).select('id').single()
  if (error) throw new Error(error.message)
  revalidatePath('/modulos/fix/times')
  redirect(`/modulos/fix/times/${data.id}`)
}

export async function updateIntrTimeAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Time')
  await requireIntrWrite('intr.times.write')
  const { error } = await admin().schema('gkli_intr').from('times').update(timePayload(formData)).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulos/fix/times')
  revalidatePath(`/modulos/fix/times/${id}`)
  redirect('/modulos/fix/times')
}

export async function createIntrColaboradorAction(formData: FormData) {
  await requireIntrWrite('intr.colaboradores.write')
  const payload = await colaboradorPayload(formData)
  const existing = await findExistingColaborador(payload)

  if (existing) {
    const existingUserId = existing.usuario_id ? String(existing.usuario_id) : null
    if (payload.usuario_id && existingUserId && existingUserId !== payload.usuario_id) {
      throw new Error('Este e-mail ja esta vinculado a outro usuario Core no Intr.')
    }

    const { error } = await admin().schema('gkli_intr').from('colaboradores').update(payload).eq('id', existing.id)
    if (error) throw new Error(error.message)
    revalidatePath('/modulos/fix')
    revalidatePath('/modulos/fix/colaboradores')
    revalidatePath(`/modulos/fix/colaboradores/${existing.id}`)
    redirect(`/modulos/fix/colaboradores/${existing.id}`)
  }

  const { data, error } = await admin().schema('gkli_intr').from('colaboradores').insert(payload).select('id').single()
  if (error) throw new Error(error.message)
  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/colaboradores')
  redirect(`/modulos/fix/colaboradores/${data.id}`)
}

export async function updateIntrColaboradorAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Colaborador')
  await requireIntrWrite('intr.colaboradores.write')
  const { error } = await admin().schema('gkli_intr').from('colaboradores').update(await colaboradorPayload(formData)).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/colaboradores')
  revalidatePath(`/modulos/fix/colaboradores/${id}`)
  redirect('/modulos/fix/colaboradores')
}

export async function createIntrComissaoAction(formData: FormData) {
  await requireIntrWrite('intr.comissoes.write')
  const { data, error } = await admin().schema('gkli_intr').from('comissoes').insert(comissaoPayload(formData)).select('id').single()
  if (error) throw new Error(error.message)
  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/comissoes')
  redirect(`/modulos/fix/comissoes/${data.id}`)
}

export async function updateIntrComissaoStatusAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Comissao')
  const status = required(text(formData, 'status'), 'Status')
  await requireIntrWrite('intr.comissoes.write')
  const payload: Record<string, string | null> = { status }
  payload.aprovado_em = status === 'aprovada' ? new Date().toISOString() : null
  payload.pago_em = status === 'paga' ? new Date().toISOString() : null

  const { error } = await admin().schema('gkli_intr').from('comissoes').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/comissoes')
  revalidatePath(`/modulos/fix/comissoes/${id}`)
  redirect('/modulos/fix/comissoes')
}

export async function createIntrComissaoTipoAction(formData: FormData) {
  await requireIntrWrite('intr.comissoes.write')
  const payload = comissaoTipoPayload(formData)
  let { data, error } = await admin().schema('gkli_intr').from('comissao_tipos').insert(payload).select('id').single()
  if (error && isMissingComissaoDeTimeColumn(error)) {
    if (payload.comissao_de_time) throw comissaoDeTimeMigrationError()
    const retry = await admin().schema('gkli_intr').from('comissao_tipos').insert(withoutComissaoDeTime(payload)).select('id').single()
    data = retry.data
    error = retry.error
  }
  if (error) throw new Error(error.message)
  revalidatePath('/modulos/fix/tipos-comissao')
  revalidatePath('/modulos/fix/tipos-comissao')
  redirect(`/modulos/fix/tipos-comissao/${data.id}`)
}

export async function updateIntrComissaoTipoAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Tipo de comissao')
  await requireIntrWrite('intr.comissoes.write')
  const payload = comissaoTipoPayload(formData)
  let { error } = await admin().schema('gkli_intr').from('comissao_tipos').update(payload).eq('id', id)
  if (error && isMissingComissaoDeTimeColumn(error)) {
    if (payload.comissao_de_time) throw comissaoDeTimeMigrationError()
    const retry = await admin().schema('gkli_intr').from('comissao_tipos').update(withoutComissaoDeTime(payload)).eq('id', id)
    error = retry.error
  }
  if (error) throw new Error(error.message)
  revalidatePath('/modulos/fix/tipos-comissao')
  revalidatePath('/modulos/fix/tipos-comissao')
  revalidatePath(`/modulos/fix/tipos-comissao/${id}`)
  redirect('/modulos/fix/tipos-comissao')
}

export async function createIntrReceitaAction(formData: FormData) {
  await requireIntrWrite('intr.receitas.write')
  const { data, error } = await admin().schema('gkli_intr').from('receitas').insert(receitaPayload(formData)).select('id').single()
  if (error) throw new Error(error.message)
  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/importacoes')
  redirect(`/modulos/fix/importacoes/${data.id}`)
}

export async function updateIntrReceitaAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Receita')
  await requireIntrWrite('intr.receitas.write')
  const { error } = await admin().schema('gkli_intr').from('receitas').update(receitaPayload(formData)).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/importacoes')
  revalidatePath(`/modulos/fix/importacoes/${id}`)
  redirect('/modulos/fix/importacoes')
}

export async function previewIntrReceitasXlsx(formData: FormData) {
  await requireIntrWrite('intr.receitas.write')
  return buildRevenuePreview(formData)
}

export async function importarIntrReceitasXlsx(formData: FormData) {
  await requireIntrWrite('intr.receitas.write')
  const preview = await buildRevenuePreview(formData)

  let criadas = 0
  let atualizadas = 0

  for (const item of preview.itens) {
    const payload = {
      colaborador_id: item.recebedorTipo === 'colaborador' ? item.comissoes[0]?.colaboradorId ?? null : null,
      vendedor_nome: item.vendedorNome,
      cliente: item.cliente,
      categoria: item.categoria,
      descricao: item.descricao,
      competencia: item.competencia,
      data_recebimento: item.dataRecebimento,
      valor_base: item.valorBase,
      valor_recebido: item.valorRecebido,
      status: item.status,
      origem: 'omie_receitas_xlsx',
      origem_id: item.origemId,
      observacao: item.observacao,
    }

    if (item.receitaId) {
      const { error } = await admin().schema('gkli_intr').from('receitas').update(payload).eq('id', item.receitaId)
      if (error) throw new Error(error.message)
      item.receitaId = item.receitaId
      atualizadas += 1
    } else {
      const { data, error } = await admin().schema('gkli_intr').from('receitas').insert(payload).select('id').single()
      if (error) throw new Error(error.message)
      item.receitaId = String(data.id)
      criadas += 1
    }

    for (const comissao of item.comissoes) {
      const comissaoPayload = {
        colaborador_id: comissao.colaboradorId,
        receita_id: item.receitaId,
        comissao_tipo_id: comissao.tipoComissaoId,
        vendedor_nome: item.vendedorNome,
        vendedor_snapshot: item.vendedorNome,
        cliente: item.cliente,
        categoria: item.categoria,
        categoria_snapshot: item.categoria,
        tipo_comissao_nome: comissao.tipoComissaoNome,
        tipo_comissao_snapshot: comissao.tipoComissaoNome,
        percentual: comissao.percentual,
        valor_base: comissao.valorBase,
        valor_comissao: comissao.valorComissao,
        competencia: item.competencia,
        data_recebimento: item.dataRecebimento,
        status: comissao.status,
        origem: 'omie_receitas_xlsx',
        origem_id: comissao.origemId,
        observacao: item.recebedorTipo === 'time'
          ? `Rateio do time ${item.vendedorNome}: percentual total ${comissao.percentualTotal.toFixed(4)}% dividido entre ${item.comissoes.length} membro(s).`
          : `Comissao gerada pela importação de receita. Recebedor: ${item.vendedorNome ?? comissao.colaboradorNome}.`,
      }

      if (comissao.comissaoId) {
        const { error } = await admin().schema('gkli_intr').from('comissoes').update(comissaoPayload).eq('id', comissao.comissaoId)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await admin().schema('gkli_intr').from('comissoes').insert(comissaoPayload)
        if (error) throw new Error(error.message)
      }
    }
  }

  try {
    await admin().schema('gkli_intr').from('receita_importacoes').insert({
      nome_arquivo: preview.arquivo,
      status: preview.ignoradas.length ? 'processado_com_alertas' : 'processado',
      total_linhas: preview.total,
      total_receitas: preview.itens.length,
      total_alertas: preview.ignoradas.length,
      valor_base_total: preview.valorBaseTotal,
      valor_recebido_total: preview.valorRecebidoTotal,
      observacao: preview.ignoradas.slice(0, 20).join('\n') || null,
    })
  } catch {
    // Historico depende da migration de importações; a carga de receitas nao deve falhar por isso.
  }

  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/importacoes')
  revalidatePath('/modulos/fix/comissoes')
  revalidatePath('/modulos/fix/importacoes')
  revalidatePath('/modulos/fix/fechamentos')

  return {
    arquivo: preview.arquivo,
    processadas: preview.itens.length,
    criadas,
    atualizadas,
    ignoradas: preview.ignoradas,
    valorRecebidoTotal: preview.valorRecebidoTotal,
    comissoes: preview.comissoesTotal,
    valorComissaoTotal: preview.valorComissaoTotal,
  }
}

export async function updateIntrComissaoAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Comissao')
  await requireIntrWrite('intr.comissoes.write')
  const { error } = await admin().schema('gkli_intr').from('comissoes').update(comissaoPayload(formData)).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/comissoes')
  revalidatePath(`/modulos/fix/comissoes/${id}`)
  redirect('/modulos/fix/comissoes')
}

export async function recalcularIntrFechamentoAction(formData: FormData) {
  await requireIntrWrite('intr.fechamentos.write')
  const competencia = required(text(formData, 'competencia'), 'Competencia')
  const metrics = await computeFechamento(competencia)
  const status = text(formData, 'status') || (metrics.pendencias_total ? 'em_conferencia' : 'aberto')
  const payload = {
    competencia,
    competencia_label: monthLabel(competencia),
    status,
    ...metrics,
    observacao: nullableText(formData, 'observacao'),
    fechado_em: status === 'fechado' ? new Date().toISOString() : null,
  }

  const { data, error } = await admin()
    .schema('gkli_intr')
    .from('fechamentos')
    .upsert(payload, { onConflict: 'competencia' })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  await Promise.all([
    admin().schema('gkli_intr').from('comissoes').update({ fechamento_id: data.id }).eq('competencia', competencia),
    admin().schema('gkli_intr').from('pagamentos').update({ fechamento_id: data.id }).eq('competencia', competencia),
  ])

  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/fechamentos')
  redirect('/modulos/fix/fechamentos')
}

export async function fecharIntrFechamentoAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Fechamento')
  await requireIntrWrite('intr.fechamentos.write')
  const { data, error: getError } = await admin().schema('gkli_intr').from('fechamentos').select('competencia').eq('id', id).single()
  if (getError || !data) throw new Error(getError?.message ?? 'Fechamento nao encontrado.')
  const metrics = await computeFechamento(String(data.competencia))
  const divergencias = await countFechamentoDivergencias(String(data.competencia))
  const aceitarDivergencias = formData.get('aceitar_divergencias') === 'on'
  if (divergencias > 0 && !aceitarDivergencias) throw new Error('Existem pagamentos conciliados com valores divergentes. Corrija antes de fechar ou marque a opcao para lancar como valores divergentes.')
  const adjustedMetrics = aceitarDivergencias ? { ...metrics, pendencias_total: Math.max(metrics.pendencias_total - divergencias, 0) } : metrics
  if (adjustedMetrics.pendencias_total > 0) throw new Error('Nao e possivel fechar competencia com pendencias.')
  const { error } = await admin().schema('gkli_intr').from('fechamentos').update({ ...adjustedMetrics, status: 'fechado', fechado_em: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulos/fix/fechamentos')
  redirect('/modulos/fix/fechamentos')
}

export async function gerarPagamentosComissoesAprovadasAction(formData: FormData) {
  await requireIntrWrite('intr.comissoes.write')
  const competencia = required(text(formData, 'competencia'), 'Competencia')
  const dataPrevista = nullableText(formData, 'data_prevista') ?? scheduledDate(competencia, 5)
  const { data: comissoes, error } = await admin()
    .schema('gkli_intr')
    .from('comissoes')
    .select('id,colaborador_id,cliente,categoria,valor_comissao,fechamento_id')
    .eq('competencia', competencia)
    .eq('status', 'aprovada')
  if (error) throw new Error(error.message)

  const ids = ((comissoes ?? []) as Array<Record<string, unknown>>).map((row) => String(row.id))
  const existing = ids.length
    ? await admin().schema('gkli_intr').from('pagamentos').select('comissao_id').in('comissao_id', ids)
    : { data: [], error: null }
  if (existing.error) throw new Error(existing.error.message)
  const alreadyGenerated = new Set(((existing.data ?? []) as Array<Record<string, unknown>>).map((row) => String(row.comissao_id)))
  const rows = ((comissoes ?? []) as Array<Record<string, unknown>>)
    .filter((row) => !alreadyGenerated.has(String(row.id)))
    .map((row) => ({
      colaborador_id: String(row.colaborador_id),
      comissao_id: String(row.id),
      fechamento_id: row.fechamento_id ? String(row.fechamento_id) : null,
      tipo: 'Comissao',
      descricao: `Comissao ${row.cliente ?? ''} ${row.categoria ?? ''}`.trim(),
      competencia,
      data_prevista: dataPrevista,
      valor_bruto: Number(row.valor_comissao ?? 0),
      valor_descontos: 0,
      status: 'previsto',
      origem: 'comissao_aprovada',
      origem_id: String(row.id),
    }))

  if (rows.length) {
    const { error: insertError } = await admin().schema('gkli_intr').from('pagamentos').insert(rows)
    if (insertError) throw new Error(insertError.message)
  }

  revalidatePath('/modulos/fix/pagamentos')
  revalidatePath('/modulos/fix/comissoes')
  revalidatePath('/modulos/colab/pagamentos')
  redirect('/modulos/fix/pagamentos')
}

export async function createIntrPagamentoAction(formData: FormData) {
  await requireIntrWrite('intr.pagamentos.write')
  const { data, error } = await admin().schema('gkli_intr').from('pagamentos').insert(pagamentoPayload(formData)).select('id').single()
  if (error) throw new Error(error.message)
  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/pagamentos')
  redirect(`/modulos/fix/pagamentos/${data.id}`)
}

export async function previewIntrRecibosPagamentoPdf(formData: FormData) {
  await requireIntrWrite('intr.pagamentos.write')
  return buildPayrollReceiptPreview(formData)
}

export async function importarIntrRecibosPagamentoPdf(formData: FormData) {
  await requireIntrWrite('intr.pagamentos.write')
  const preview = await buildPayrollReceiptPreview(formData)
  const importaveis = preview.itens.filter((item) => item.acao !== 'sem_vinculo' && item.colaboradorId)

  let criados = 0
  let atualizados = 0

  for (const item of importaveis) {
    const payload = {
      colaborador_id: item.colaboradorId,
      tipo: item.tipo,
      descricao: `Recibo de pagamento - ${item.competenciaLabel}`,
      competencia: item.competencia,
      data_prevista: null,
      data_pagamento: null,
      valor_bruto: item.valorBruto,
      valor_descontos: item.valorDescontos,
      status: 'pago',
      origem: 'recibo_pagamento_pdf',
      observacao: `Arquivo: ${preview.arquivo}; pagina ${item.page}; nome no recibo: ${item.nomeRecibo}.`,
    }

    if (item.pagamentoId) {
      const { error } = await admin().schema('gkli_intr').from('pagamentos').update(payload).eq('id', item.pagamentoId)
      if (error) throw new Error(error.message)
      atualizados += 1
    } else {
      const { error } = await admin().schema('gkli_intr').from('pagamentos').insert(payload)
      if (error) throw new Error(error.message)
      criados += 1
    }
  }

  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/pagamentos')
  revalidatePath('/modulos/fix/pagamentos/importacoes')
  revalidatePath('/modulos/colab')
  revalidatePath('/modulos/colab/pagamentos')

  return {
    arquivo: preview.arquivo,
    processados: importaveis.length,
    criados,
    atualizados,
    ignorados: preview.ignorados,
  }
}

export async function previewConciliacaoExtratoOfx(formData: FormData) {
  await requireIntrWrite('intr.pagamentos.write')
  return buildOfxPaymentConciliationPreview(formData)
}

export async function confirmarConciliacaoExtratoOfx(formData: FormData) {
  await requireIntrWrite('intr.pagamentos.write')
  const preview = await buildOfxPaymentConciliationPreview(formData)
  const selected = JSON.parse(text(formData, 'selecoes') || '[]') as Array<{ fitId: string; pagamentoId: string }>
  const selectedKeys = new Set(selected.map((item) => `${item.fitId}:${item.pagamentoId}`))
  let conciliados = 0
  let divergentes = 0
  let valorConciliado = 0

  const matches = preview.lancamentos
    .flatMap((item) => item.sugestoes)
    .filter((item) => selectedKeys.has(`${item.fitId}:${item.pagamentoId}`))

  for (const item of matches) {
    const divergence = moneyEquals(item.valor, item.valorPrevisto)
      ? ''
      : ` VALOR_DIVERGENTE_OFX previsto ${item.valorPrevisto.toFixed(2)} pago ${item.valor.toFixed(2)} diferenca ${item.diferenca.toFixed(2)}.`
    const observacao = `Conciliado pelo extrato OFX ${preview.arquivo}; FITID ${item.fitId}; descricao: ${item.descricaoExtrato}.${divergence}`
    const { error } = await admin()
      .schema('gkli_intr')
      .from('pagamentos')
      .update({
        data_pagamento: item.dataExtrato,
        observacao,
        origem: 'extrato_ofx',
        status: 'pago',
      })
      .eq('id', item.pagamentoId)
      .in('status', ['previsto', 'em_processamento'])

    if (error) throw new Error(error.message)
    conciliados += 1
    valorConciliado += item.valor
    if (divergence) divergentes += 1
  }

  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/pagamentos')
  revalidatePath('/modulos/fix/pagamentos/conciliar-extrato')
  revalidatePath('/modulos/colab')
  revalidatePath('/modulos/colab/pagamentos')

  return {
    arquivo: preview.arquivo,
    conciliados,
    divergentes,
    semCorrespondencia: preview.semCorrespondencia,
    valorConciliado,
  }
}

export async function updateIntrPagamentoAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Pagamento')
  await requireIntrWrite('intr.pagamentos.write')
  const { error } = await admin().schema('gkli_intr').from('pagamentos').update(pagamentoPayload(formData)).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/pagamentos')
  revalidatePath(`/modulos/fix/pagamentos/${id}`)
  redirect('/modulos/fix/pagamentos')
}

export async function confirmarPagamentosPorTipoAction(formData: FormData) {
  await requireIntrWrite('intr.pagamentos.write')
  const competencia = competenciaMonth(formData, 'competencia', 'Competencia')
  const tipo = required(text(formData, 'tipo'), 'Tipo de pagamento')
  const dataPagamento = nullableText(formData, 'data_pagamento') ?? new Date().toISOString().slice(0, 10)

  const { error } = await admin()
    .schema('gkli_intr')
    .from('pagamentos')
    .update({
      data_pagamento: dataPagamento,
      status: 'pago',
    })
    .eq('competencia', competencia)
    .eq('tipo', tipo)
    .in('status', ['previsto', 'em_processamento'])

  if (error) throw new Error(error.message)
  revalidatePath('/modulos/fix')
  revalidatePath('/modulos/fix/pagamentos')
  revalidatePath('/modulos/colab')
  revalidatePath('/modulos/colab/pagamentos')
  redirect('/modulos/fix/pagamentos')
}

export async function createIntrPagamentoAgendaAction(formData: FormData) {
  await requireIntrWrite('intr.agenda_pagamentos.write')
  const { data, error } = await admin().schema('gkli_intr').from('pagamento_agendas').insert(agendaPagamentoPayload(formData)).select('id').single()
  if (error) {
    if (isMissingAgendaPorTipoMigration(error)) throw agendaPorTipoMigrationError()
    throw new Error(error.message)
  }
  revalidatePath('/modulos/fix/pagamentos')
  revalidatePath('/modulos/fix/pagamentos/agenda')
  redirect(`/modulos/fix/pagamentos/agenda/${data.id}`)
}

export async function updateIntrPagamentoAgendaAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Agenda')
  await requireIntrWrite('intr.agenda_pagamentos.write')
  const { error } = await admin().schema('gkli_intr').from('pagamento_agendas').update(agendaPagamentoPayload(formData)).eq('id', id)
  if (error) {
    if (isMissingAgendaPorTipoMigration(error)) throw agendaPorTipoMigrationError()
    throw new Error(error.message)
  }
  revalidatePath('/modulos/fix/pagamentos')
  revalidatePath('/modulos/fix/pagamentos/agenda')
  revalidatePath(`/modulos/fix/pagamentos/agenda/${id}`)
  redirect('/modulos/fix/pagamentos/agenda')
}

export async function gerarPagamentosPrevistosAction(formData: FormData) {
  await requireIntrWrite('intr.agenda_pagamentos.write')
  const competencia = competenciaMonth(formData, 'competencia', 'Competencia')
  const [agendasResult, colaboradoresResult, comissoesResult] = await Promise.all([
    admin()
      .schema('gkli_intr')
      .from('pagamento_agendas')
      .select('*')
      .eq('ativo', true)
      .lte('inicio_competencia', competencia)
      .or(`fim_competencia.is.null,fim_competencia.gte.${competencia}`),
    admin()
      .schema('gkli_intr')
      .from('colaboradores')
      .select('id,nome,status,salario,pro_labore,ajuda_custo,participacao_honorarios,outros_vencimentos,beneficio_valor'),
    admin()
      .schema('gkli_intr')
      .from('comissoes')
      .select('colaborador_id,valor_comissao,status')
      .eq('competencia', competencia),
  ])

  if (agendasResult.error) throw new Error(agendasResult.error.message)
  if (colaboradoresResult.error) throw new Error(colaboradoresResult.error.message)
  if (comissoesResult.error) throw new Error(comissoesResult.error.message)

  const colaboradores = activeRows((colaboradoresResult.data ?? []) as Array<Record<string, unknown>>, 'status')
  const comissoes = ((comissoesResult.data ?? []) as Array<Record<string, unknown>>).filter((row) => row.status === 'aprovada')
  const colaboradoresById = new Map(colaboradores.map((row) => [String(row.id), row]))

  const rows = ((agendasResult.data ?? []) as Array<Record<string, unknown>>).flatMap((agenda) => {
    const percentualAgenda = Number(agenda.percentual ?? 0)
    const shouldApplyPercentual = percentualAgenda > 0 && isCommissionPaymentType(agenda.tipo)
    const agendaColaboradorId = String(agenda.colaborador_id ?? '')
    const alvoColaboradores = agendaColaboradorId
      ? [colaboradoresById.get(agendaColaboradorId)].filter(Boolean) as Array<Record<string, unknown>>
      : colaboradores

    return alvoColaboradores.map((colaborador) => {
      const { base, baseLabel } = agendaPaymentBase({ agenda, colaborador, comissoes })
      const valorBruto = shouldApplyPercentual
      ? calculateCommission(base, percentualAgenda)
      : roundMoney(base)
      const observacoes = [
        agenda.observacao ? String(agenda.observacao) : null,
        shouldApplyPercentual
          ? `Percentual da agenda: ${percentualAgenda.toLocaleString('pt-BR')}% sobre ${baseLabel} (${base.toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })}).`
          : `Valor gerado por ${baseLabel}.`,
      ].filter(Boolean).join(' ')

      return {
        colaborador_id: String(colaborador.id),
        agenda_id: String(agenda.id),
        tipo: String(agenda.tipo ?? 'Pagamento recorrente'),
        descricao: agenda.descricao ? String(agenda.descricao) : 'Pagamento previsto pela agenda do Intr.',
        competencia,
        data_prevista: scheduledDate(competencia, Number(agenda.dia_previsto ?? 1)),
        valor_bruto: valorBruto,
        valor_descontos: Number(agenda.valor_descontos ?? 0),
        status: 'previsto',
        origem: agenda.origem ? String(agenda.origem) : 'agenda_pagamento',
        origem_id: String(agenda.id),
        observacao: observacoes || null,
      }
    })
  })

  if (rows.length) {
    const { error: insertError } = await admin()
      .schema('gkli_intr')
      .from('pagamentos')
      .upsert(rows, { ignoreDuplicates: true, onConflict: 'agenda_id,colaborador_id,competencia' })
    if (insertError) {
      if (isMissingAgendaPorTipoMigration(insertError)) throw agendaPorTipoMigrationError()
      throw new Error(insertError.message)
    }
  }

  revalidatePath('/modulos/fix/pagamentos')
  revalidatePath('/modulos/fix/pagamentos/agenda')
  revalidatePath('/modulos/colab')
  revalidatePath('/modulos/colab/pagamentos')
  redirect('/modulos/fix/pagamentos')
}

type FixCsvLancamento = {
  data: string
  historico: string
  descricao: string
  valor: number
  saldo: number
  hash: string
}

function splitCsvLine(line: string) {
  const separator = line.includes(';') ? ';' : ','
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted
      continue
    }
    if (char === separator && !quoted) {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

function parseFixDate(value: string) {
  const raw = value.trim()
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return raw
  return ''
}

function detectFixPeriod(lines: string[]) {
  const periodoLine = lines.find((line) => normalizeName(line).includes('periodo')) ?? ''
  const dates = [...periodoLine.matchAll(/(\d{2}\/\d{2}\/\d{4})/g)].map((match) => parseFixDate(match[1]))
  return {
    inicio: dates[0] || null,
    fim: dates[1] || dates[0] || null,
  }
}

function classifyFixLancamento(lancamento: Pick<FixCsvLancamento, 'historico' | 'descricao'>) {
  const source = normalizeName(`${lancamento.historico} ${lancamento.descricao}`)

  const rules = [
    { terms: ['telefonica', 'vivo'], macrogrupo: 'infraestrutura', categoria: 'telefonia_internet', label: 'Telefonia / Internet', confidence: 92 },
    { terms: ['enel'], macrogrupo: 'infraestrutura', categoria: 'energia', label: 'Energia', confidence: 92 },
    { terms: ['aurum', 'software'], macrogrupo: 'infraestrutura', categoria: 'sistemas_softwares', label: 'Sistemas / Softwares', confidence: 85 },
    { terms: ['ponto br', 'registro br', 'hospedagem', 'dominio'], macrogrupo: 'infraestrutura', categoria: 'dominio_hospedagem', label: 'Domínio / Hospedagem', confidence: 82 },
    { terms: ['simples nacional', 'receita federal', 'darf', 'pmsp', 'sf'], macrogrupo: 'operacional', categoria: 'tributos', label: 'Tributos', confidence: 94 },
    { terms: ['aasp', 'cef matriz', 'junta comercial'], macrogrupo: 'operacional', categoria: 'custas_taxas', label: 'Custas / Taxas', confidence: 84 },
    { terms: ['assessoria contabil', 'contabil', 'consultoria'], macrogrupo: 'operacional', categoria: 'servicos_profissionais', label: 'Serviços profissionais', confidence: 86 },
    { terms: ['pix enviado'], macrogrupo: 'pessoal', categoria: 'outros_vencimentos', label: 'Outros vencimentos', confidence: 60 },
  ]

  const matched = rules.find((rule) => rule.terms.some((term) => source.includes(term)))
  if (matched) return matched
  return { macrogrupo: 'nao_classificado', categoria: null, label: 'Não classificado', confidence: 0 }
}

async function parseFixExtratoCsv(formData: FormData) {
  const file = formData.get('arquivo')
  if (!(file instanceof File) || file.size === 0) throw new Error('Selecione um arquivo CSV.')
  const content = await file.text()
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const headerIndex = lines.findIndex((line) => normalizeName(line).includes('data lancamento') && normalizeName(line).includes('valor'))
  if (headerIndex < 0) throw new Error('Cabeçalho do extrato não encontrado. Esperado: Data Lançamento;Histórico;Descrição;Valor;Saldo.')

  const period = detectFixPeriod(lines.slice(0, headerIndex))
  const headerCells = splitCsvLine(lines[headerIndex]).map((cell) => normalizeName(cell))
  const dataIndex = headerCells.findIndex((cell) => cell.includes('data lancamento') || cell === 'data')
  const historicoIndex = headerCells.findIndex((cell) => cell.includes('historico'))
  const descricaoIndex = headerCells.findIndex((cell) => cell.includes('descricao'))
  const valorIndex = headerCells.findIndex((cell) => cell === 'valor' || cell.includes('valor'))
  const saldoIndex = headerCells.findIndex((cell) => cell === 'saldo' || cell.includes('saldo'))

  const lancamentos = lines.slice(headerIndex + 1).map((line, index) => {
    const cells = splitCsvLine(line)
    const dataRaw = cells[dataIndex >= 0 ? dataIndex : 0] ?? ''
    const historico = historicoIndex >= 0 ? (cells[historicoIndex] ?? '') : ''
    const descricao = descricaoIndex >= 0
      ? (cells[descricaoIndex] ?? '')
      : historicoIndex >= 0
        ? ''
        : (cells[1] ?? '')
    const valorRaw = cells[valorIndex >= 0 ? valorIndex : Math.max(cells.length - 2, 0)] ?? '0'
    const saldoRaw = cells[saldoIndex >= 0 ? saldoIndex : Math.max(cells.length - 1, 0)] ?? '0'
    const data = parseFixDate(dataRaw)
    if (!data) return null
    const valor = parseBrazilianMoney(valorRaw)
    const saldo = parseBrazilianMoney(saldoRaw)
    const hash = createHash('sha1').update(`${data}|${historico}|${descricao}|${valor}|${saldo}|${index}`).digest('hex')
    return { data, historico, descricao, valor, saldo, hash }
  }).filter(Boolean) as FixCsvLancamento[]

  if (!lancamentos.length) throw new Error('Nenhum lançamento válido encontrado no CSV.')

  return {
    arquivoNome: file.name,
    arquivoHash: createHash('sha1').update(content).digest('hex'),
    periodoInicio: period.inicio ?? lancamentos[0]?.data ?? null,
    periodoFim: period.fim ?? lancamentos[lancamentos.length - 1]?.data ?? null,
    lancamentos,
  }
}



async function classifyFixLancamentoFromDb(lancamento: Pick<FixCsvLancamento, 'historico' | 'descricao'>) {
  const source = normalizeName(`${lancamento.historico} ${lancamento.descricao}`)
  const { data, error } = await admin()
    .schema('gkli_intr')
    .from('financeiro_regras_classificacao')
    .select('termo,macrogrupo,categoria_id,prioridade,nome')
    .eq('ativo', true)
    .order('prioridade', { ascending: true })
    .limit(500)

  if (!error) {
    const matched = ((data ?? []) as Array<Record<string, unknown>>).find((rule) => {
      const termo = normalizeName(String(rule.termo ?? ''))
      return termo && source.includes(termo)
    })

    if (matched) {
      return {
        macrogrupo: String(matched.macrogrupo ?? 'nao_classificado'),
        categoria: null as string | null,
        categoriaId: String(matched.categoria_id ?? '') || null,
        label: String(matched.nome ?? 'Classificado por regra'),
        confidence: 90,
      }
    }
  }

  const fallback = classifyFixLancamento(lancamento)
  return { ...fallback, categoriaId: null as string | null }
}

async function findFixCategoriaId(codigo: string | null) {
  if (!codigo) return null
  const { data } = await admin()
    .schema('gkli_intr')
    .from('financeiro_categorias')
    .select('id')
    .eq('codigo', codigo)
    .maybeSingle()
  return data?.id ?? null
}

async function findFixColaborador(descricao: string) {
  const { data, error } = await admin()
    .schema('gkli_intr')
    .from('colaboradores')
    .select('id,nome,status')
    .neq('status', 'desligado')
    .limit(1000)

  if (error) return null
  const source = normalizeName(descricao)
  return ((data ?? []) as Array<Record<string, unknown>>).find((row) => {
    const nome = normalizeName(String(row.nome ?? ''))
    return nome && source.includes(nome)
  }) ?? null
}

async function findFixPagamentoPrevisto(colaboradorId: string, valor: number, dataLancamento: string) {
  const { data, error } = await admin()
    .schema('gkli_intr')
    .from('pagamentos')
    .select('id,valor_liquido,valor_bruto,data_prevista,status')
    .eq('colaborador_id', colaboradorId)
    .in('status', ['previsto', 'em_processamento', 'aprovado'])
    .limit(100)

  if (error) return null
  const candidates = ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => ({
      row,
      valueDistance: Math.abs(Number(row.valor_liquido ?? row.valor_bruto ?? 0) - valor),
      dateDistance: dateDistanceInDays(dataLancamento, String(row.data_prevista ?? '') || null),
    }))
    .filter((candidate) => candidate.valueDistance <= Math.max(100, valor * 0.08) || candidate.dateDistance <= 7)
    .sort((a, b) => a.valueDistance - b.valueDistance || a.dateDistance - b.dateDistance)
  return candidates[0]?.row ?? null
}

export async function importarFixExtratoCsvAction(formData: FormData) {
  await requireIntrWrite('intr.pagamentos.write')
  const parsed = await parseFixExtratoCsv(formData)
  const banco = text(formData, 'banco') || 'Banco'
  const saidas = parsed.lancamentos.filter((item) => item.valor < 0)
  const entradas = parsed.lancamentos.filter((item) => item.valor > 0)

  const { data: importacao, error: importError } = await admin()
    .schema('gkli_intr')
    .from('extrato_importacoes')
    .upsert({
      arquivo_hash: parsed.arquivoHash,
      arquivo_nome: parsed.arquivoNome,
      banco,
      periodo_inicio: parsed.periodoInicio,
      periodo_fim: parsed.periodoFim,
      status: 'processado',
      total_lancamentos: parsed.lancamentos.length,
      total_entradas: entradas.length,
      total_saidas: saidas.length,
      valor_entradas: roundMoney(entradas.reduce((sum, item) => sum + item.valor, 0)),
      valor_saidas: roundMoney(Math.abs(saidas.reduce((sum, item) => sum + item.valor, 0))),
      processado_em: new Date().toISOString(),
    }, { onConflict: 'arquivo_hash' })
    .select('id')
    .single()

  if (importError || !importacao) throw new Error(importError?.message ?? 'Não foi possível registrar a importação.')

  for (const lancamento of parsed.lancamentos) {
    const tipoMovimento = lancamento.valor < 0 ? 'saida' : 'entrada'
    const valorAbsoluto = Math.abs(lancamento.valor)
    const classification = tipoMovimento === 'saida' ? await classifyFixLancamentoFromDb(lancamento) : { macrogrupo: null, categoria: null, categoriaId: null, label: '', confidence: 0 }
    const categoriaId = classification.categoriaId ?? await findFixCategoriaId(classification.categoria)
    const colaborador = tipoMovimento === 'saida' ? await findFixColaborador(`${lancamento.historico} ${lancamento.descricao}`) : null
    const pagamento = colaborador ? await findFixPagamentoPrevisto(String(colaborador.id), valorAbsoluto, lancamento.data) : null
    const confianca = pagamento ? 88 : colaborador ? 72 : classification.confidence

    const { data: inserted, error: lancamentoError } = await admin()
      .schema('gkli_intr')
      .from('extrato_lancamentos')
      .upsert({
        importacao_id: importacao.id,
        data_lancamento: lancamento.data,
        historico: lancamento.historico,
        descricao: lancamento.descricao,
        valor: lancamento.valor,
        saldo: lancamento.saldo,
        tipo_movimento: tipoMovimento,
        macrogrupo: colaborador ? 'pessoal' : classification.macrogrupo,
        categoria_id: colaborador ? await findFixCategoriaId('outros_vencimentos') : categoriaId,
        colaborador_id: colaborador?.id ?? null,
        pagamento_id: pagamento?.id ?? null,
        conciliado: Boolean(pagamento),
        tipo_conciliacao: pagamento ? 'colaborador' : colaborador ? 'colaborador_sugerido' : 'nao_conciliado',
        confianca,
        hash_lancamento: lancamento.hash,
      }, { onConflict: 'hash_lancamento' })
      .select('id')
      .single()

    if (lancamentoError) throw new Error(lancamentoError.message)

    if (tipoMovimento === 'saida' && !pagamento) {
      const mensagem = colaborador
        ? `Pagamento de colaborador identificado no extrato. Conferir previsão/agenda para ${String(colaborador.nome ?? 'colaborador')}.`
        : categoriaId
          ? `Criar ou ajustar recorrência em ${classification.macrogrupo} > ${classification.label}?`
          : 'Lançamento de saída sem classificação. Classificar e decidir se vira recorrência?'

      await admin()
        .schema('gkli_intr')
        .from('financeiro_sugestoes')
        .insert({
          competencia: parsed.periodoInicio ? `${parsed.periodoInicio.slice(0, 7)}-01` : lancamento.data.slice(0, 7) + '-01',
          tipo: colaborador ? 'revisar_pagamento_colaborador' : categoriaId ? 'criar_recorrencia' : 'classificar_lancamento',
          macrogrupo: colaborador ? 'pessoal' : classification.macrogrupo,
          categoria_id: colaborador ? await findFixCategoriaId('outros_vencimentos') : categoriaId,
          referencia_nome: colaborador ? String(colaborador.nome ?? '') : lancamento.descricao || lancamento.historico,
          colaborador_id: colaborador?.id ?? null,
          extrato_lancamento_id: inserted?.id ?? null,
          valor_atual: valorAbsoluto,
          valor_sugerido: valorAbsoluto,
          diferenca: 0,
          mensagem,
          status: 'pendente',
          confianca,
        })
    }
  }

  revalidatePath('/modulos/fix/financeiro')
  revalidatePath('/modulos/fix/financeiro/extratos')
  revalidatePath('/modulos/fix/financeiro/sugestoes')
  revalidatePath('/modulos/fix/financeiro')
  revalidatePath('/modulos/fix/financeiro/extratos')
  revalidatePath('/modulos/fix/financeiro/conciliacao')
  revalidatePath('/modulos/fix/financeiro/sugestoes')

  await admin()
    .schema('gkli_intr')
    .rpc('fix_recalcular_importacao', { p_importacao_id: importacao.id })

  const competenciaBase = parsed.periodoInicio ? `${parsed.periodoInicio.slice(0, 7)}-01` : new Date().toISOString().slice(0, 7) + '-01'
  await admin()
    .schema('gkli_intr')
    .rpc('fix_gerar_despesas_recorrentes_por_historico', { p_competencia_base: competenciaBase, p_meses_previsao: 3 })

  const base = new Date(`${competenciaBase}T00:00:00`)
  for (let offset = 1; offset <= 3; offset += 1) {
    const competencia = new Date(base.getFullYear(), base.getMonth() + offset, 1).toISOString().slice(0, 10)
    await admin()
      .schema('gkli_intr')
      .rpc('fix_gerar_previsao_mensal', { p_competencia: competencia })
  }

  revalidatePath('/modulos/fix/financeiro/contas-pagar')
  revalidatePath('/modulos/fix/financeiro/previsao')

  redirect('/modulos/fix/financeiro/extratos')
}

export async function gerarFixPrevisaoMensalAction(formData: FormData) {
  await requireIntrWrite('intr.pagamentos.write')
  const competencia = competenciaMonth(formData, 'competencia', 'Competencia')
  const { error } = await admin()
    .schema('gkli_intr')
    .rpc('fix_gerar_previsao_mensal', { p_competencia: competencia })

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/fix/financeiro')
  revalidatePath('/modulos/fix/financeiro/previsao')
  revalidatePath('/modulos/fix/financeiro')
  revalidatePath('/modulos/fix/financeiro/previsao')
  redirect('/modulos/fix/financeiro/previsao')
}

export async function gerarFixSugestoesInteligentesAction(formData: FormData) {
  await requireIntrWrite('intr.pagamentos.write')
  const competencia = competenciaMonth(formData, 'competencia', 'Competencia')
  const { error } = await admin()
    .schema('gkli_intr')
    .rpc('fix_gerar_sugestoes_competencia', { p_competencia: competencia })

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/fix/financeiro')
  revalidatePath('/modulos/fix/financeiro/sugestoes')
  revalidatePath('/modulos/fix/financeiro')
  revalidatePath('/modulos/fix/financeiro/sugestoes')
  redirect('/modulos/fix/financeiro/sugestoes')
}

export async function aceitarFixSugestaoAction(formData: FormData) {
  await requireIntrWrite('intr.pagamentos.write')
  const id = required(text(formData, 'id'), 'Sugestao')
  const { data: sugestao, error: loadError } = await admin()
    .schema('gkli_intr')
    .from('financeiro_sugestoes')
    .select('*')
    .eq('id', id)
    .single()

  if (loadError || !sugestao) throw new Error(loadError?.message ?? 'Sugestao nao encontrada.')

  if (sugestao.tipo === 'criar_recorrencia' && sugestao.macrogrupo !== 'pessoal') {
    const competencia = String(sugestao.competencia)
    const { error: contaError } = await admin()
      .schema('gkli_intr')
      .from('contas_pagar_operacionais')
      .insert({
        descricao: sugestao.mensagem ?? 'Conta operacional criada por sugestao FIX',
        favorecido_nome: sugestao.referencia_nome,
        categoria_id: sugestao.categoria_id,
        macrogrupo: sugestao.macrogrupo === 'infraestrutura' ? 'infraestrutura' : 'operacional',
        competencia,
        data_prevista: competencia,
        valor_previsto: Number(sugestao.valor_sugerido ?? sugestao.valor_atual ?? 0),
        status: 'prevista',
        recorrente: true,
        recorrencia_tipo: 'mensal',
        origem: 'fix_sugestao_inteligente',
        extrato_lancamento_id: sugestao.extrato_lancamento_id,
        observacao: 'Criada a partir da camada de inteligencia do FIX.',
      })
    if (contaError) throw new Error(contaError.message)
  }

  const { error } = await admin()
    .schema('gkli_intr')
    .from('financeiro_sugestoes')
    .update({ status: 'aceita', resolvido_em: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/fix/financeiro')
  revalidatePath('/modulos/fix/financeiro/sugestoes')
  revalidatePath('/modulos/fix/financeiro/contas-pagar')
  redirect('/modulos/fix/financeiro/sugestoes')
}

export async function rejeitarFixSugestaoAction(formData: FormData) {
  await requireIntrWrite('intr.pagamentos.write')
  const id = required(text(formData, 'id'), 'Sugestao')
  const { error } = await admin()
    .schema('gkli_intr')
    .from('financeiro_sugestoes')
    .update({ status: 'rejeitada', resolvido_em: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/fix/financeiro')
  revalidatePath('/modulos/fix/financeiro/sugestoes')
  redirect('/modulos/fix/financeiro/sugestoes')
}
