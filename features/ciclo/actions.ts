'use server'

import { inflateRawSync } from 'node:zlib'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export type PreviewImportacaoClientes = {
  total: number
  validas: number
  criar: number
  atualizar: number
  contatos: number
  ignorados: string[]
  amostras: Array<{
    linha: number
    acao: 'criar' | 'atualizar'
    nome: string
    documento: string
    carteira: string
    administradora: string | null
  }>
}

export type ImportacaoClientesResult = {
  total: number
  criadosOuAtualizados: number
  criados: number
  atualizados: number
  contatos: number
  ignorados: string[]
  loteId?: string | null
}

export type PreviewImportacaoAtendimentos = {
  total: number
  validas: number
  criar: number
  atualizar: number
  abertos: number
  encerrados: number
  vinculados: number
  semVinculoCliente: number
  ignorados: string[]
  amostras: Array<{
    linha: number
    acao: 'criar' | 'atualizar'
    titulo: string
    cliente: string
    responsavel: string | null
    tipo: string
    status: 'aberto' | 'encerrado'
    dataCriacao: string | null
    vinculado: boolean
  }>
}

export type ImportacaoAtendimentosResult = {
  total: number
  gravados: number
  criados: number
  atualizados: number
  ignorados: string[]
  loteId?: string | null
}

type PreparedImportRow = {
  linha: number
  row: Record<string, string>
  documento: string
  carteiraId: string
  carteiraNome: string
  nome: string
  administradoraNome: string | null
  existingClienteId: string | null
  acao: 'criar' | 'atualizar'
  contatos: number
}

type PreparedAtendimentoRow = {
  linha: number
  payload: Record<string, unknown>
  sourceKey: string
  titulo: string
  clienteNome: string
  responsavel: string | null
  tipoAtendimento: string
  status: 'aberto' | 'encerrado'
  dataCriacao: string | null
  clienteId: string | null
  carteiraId: string | null
  acao: 'criar' | 'atualizar'
}

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

function numberBetween(formData: FormData, key: string, min: number, max: number) {
  const parsed = Number(text(formData, key) || 0)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${key} deve ficar entre ${min} e ${max}.`)
  }
  return parsed
}

function tipoClienteValue(value: string) {
  return value === 'pontual' || value === 'cobranca' ? value : 'mensal'
}

function uuidOrNull(value: string) {
  return value || null
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/^\uFEFF/, '')
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

function onlyDigits(value: string | null | undefined) {
  return String(value ?? '').replace(/\D/g, '')
}

function decodeXml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function xmlAttr(tag: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = tag.match(new RegExp(`\\s${escaped}=(?:"([^"]*)"|'([^']*)')`))
  return match?.[1] ?? match?.[2] ?? null
}

function normalizeZipPath(path: string) {
  const parts: string[] = []
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

function readZipEntries(buffer: Buffer) {
  const entries = new Map<string, Buffer>()
  let eocdOffset = -1
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset
      break
    }
  }
  if (eocdOffset < 0) throw new Error('Arquivo XLSX invalido.')

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10)
  let directoryOffset = buffer.readUInt32LE(eocdOffset + 16)

  for (let index = 0; index < totalEntries; index += 1) {
    if (buffer.readUInt32LE(directoryOffset) !== 0x02014b50) throw new Error('Estrutura XLSX invalida.')
    const compression = buffer.readUInt16LE(directoryOffset + 10)
    const compressedSize = buffer.readUInt32LE(directoryOffset + 20)
    const fileNameLength = buffer.readUInt16LE(directoryOffset + 28)
    const extraLength = buffer.readUInt16LE(directoryOffset + 30)
    const commentLength = buffer.readUInt16LE(directoryOffset + 32)
    const localHeaderOffset = buffer.readUInt32LE(directoryOffset + 42)
    const name = normalizeZipPath(buffer.subarray(directoryOffset + 46, directoryOffset + 46 + fileNameLength).toString('utf8'))

    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) throw new Error('Estrutura XLSX invalida.')
    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26)
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28)
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize)

    if (compression === 0) entries.set(name, compressed)
    else if (compression === 8) entries.set(name, inflateRawSync(compressed))

    directoryOffset += 46 + fileNameLength + extraLength + commentLength
  }

  return entries
}

function parseSharedStrings(xml: string | undefined) {
  if (!xml) return []
  const strings: string[] = []
  const itemRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g
  let itemMatch: RegExpExecArray | null
  while ((itemMatch = itemRegex.exec(xml))) {
    const parts: string[] = []
    const textRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g
    let textMatch: RegExpExecArray | null
    while ((textMatch = textRegex.exec(itemMatch[1]))) parts.push(decodeXml(textMatch[1]))
    strings.push(parts.join(''))
  }
  return strings
}

function columnIndex(cellRef: string | null) {
  const letters = cellRef?.match(/[A-Z]+/i)?.[0]?.toUpperCase() ?? 'A'
  return letters.split('').reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0) - 1
}

function parseXlsxRows(buffer: Buffer) {
  const entries = readZipEntries(buffer)
  const workbookXml = entries.get('xl/workbook.xml')?.toString('utf8')
  const relsXml = entries.get('xl/_rels/workbook.xml.rels')?.toString('utf8')
  if (!workbookXml || !relsXml) throw new Error('Arquivo XLSX sem planilha valida.')

  const sheetTag = workbookXml.match(/<sheet\b[^>]*>/)?.[0]
  const relId = sheetTag ? xmlAttr(sheetTag, 'r:id') : null
  if (!relId) throw new Error('Arquivo XLSX sem aba inicial.')

  let target: string | null = null
  const relRegex = /<Relationship\b[^>]*>/g
  let relMatch: RegExpExecArray | null
  while ((relMatch = relRegex.exec(relsXml))) {
    if (xmlAttr(relMatch[0], 'Id') === relId) {
      target = xmlAttr(relMatch[0], 'Target')
      break
    }
  }

  if (!target) throw new Error('Arquivo XLSX sem relacionamento da aba inicial.')
  const sheetPath = normalizeZipPath(target.startsWith('/') ? target : `xl/${target}`)
  const sheetXml = entries.get(sheetPath)?.toString('utf8')
  if (!sheetXml) throw new Error('Arquivo XLSX sem dados na aba inicial.')

  const sharedStrings = parseSharedStrings(entries.get('xl/sharedStrings.xml')?.toString('utf8'))
  const rows: string[][] = []
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g
  let rowMatch: RegExpExecArray | null
  while ((rowMatch = rowRegex.exec(sheetXml))) {
    const row: string[] = []
    const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g
    let cellMatch: RegExpExecArray | null
    while ((cellMatch = cellRegex.exec(rowMatch[1]))) {
      const attrs = cellMatch[1]
      const body = cellMatch[2]
      const type = xmlAttr(`<c ${attrs}>`, 't')
      const ref = xmlAttr(`<c ${attrs}>`, 'r')
      const valueMatch = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)
      const inlineMatch = body.match(/<is\b[^>]*>([\s\S]*?)<\/is>/)
      const targetIndex = columnIndex(ref)
      let value = ''

      if (type === 's' && valueMatch) value = sharedStrings[Number(valueMatch[1])] ?? ''
      else if (type === 'inlineStr' && inlineMatch) {
        const pieces: string[] = []
        const textRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g
        let textMatch: RegExpExecArray | null
        while ((textMatch = textRegex.exec(inlineMatch[1]))) pieces.push(decodeXml(textMatch[1]))
        value = pieces.join('')
      } else if (valueMatch) value = decodeXml(valueMatch[1])

      row[targetIndex] = value.trim()
    }
    if (row.some(Boolean)) rows.push(row)
  }

  return rows
}

function rowsToObjects(rows: string[][]) {
  const [headersRaw, ...body] = rows
  const headers = (headersRaw ?? []).map(normalizeHeader)
  return body.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? ''])))
}

function rowValue(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const found = row[normalizeHeader(key)]
    if (found?.trim()) return found.trim()
  }
  return null
}

async function requireCicloWrite(carteiraId: string | null) {
  const context = await requireModuleAccess('ciclo')
  if (!canAccess(context.permissions, 'ciclo.clientes.write')) {
    throw new Error('Usuario sem permissao para gerenciar clientes do Ciclo.')
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

  if (error || !data) throw new Error('Usuario sem acesso a carteira selecionada.')

  return context
}

async function requireCicloDocumentWrite(carteiraId: string | null) {
  const context = await requireModuleAccess('ciclo')
  if (!canAccess(context.permissions, 'ciclo.documentos.write')) {
    throw new Error('Usuario sem permissao para gerenciar documentos do Ciclo.')
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

  if (error || !data) throw new Error('Usuario sem acesso a carteira selecionada.')

  return context
}

function clientePayload(formData: FormData) {
  const carteiraId = uuidOrNull(text(formData, 'carteira_id'))

  return {
    carteiraId,
    payload: {
      carteira_id: carteiraId,
      administradora_id: uuidOrNull(text(formData, 'administradora_id')),
      nome: required(text(formData, 'nome'), 'Nome'),
      nome_fantasia: nullableText(formData, 'nome_fantasia'),
      razao_social: nullableText(formData, 'razao_social'),
      documento: nullableText(formData, 'documento'),
      email: nullableText(formData, 'email'),
      telefone: nullableText(formData, 'telefone'),
      cidade: nullableText(formData, 'cidade'),
      estado: nullableText(formData, 'estado'),
      tipo_cliente: tipoClienteValue(text(formData, 'tipo_cliente')),
      status_operacional: text(formData, 'status_operacional') || 'novo',
      score_atual: numberBetween(formData, 'score_atual', 0, 100),
      risco_atual: text(formData, 'risco_atual') || 'medio',
      temperatura: text(formData, 'temperatura') || 'neutro',
      pasta_url: nullableText(formData, 'pasta_url'),
      observacoes: nullableText(formData, 'observacoes'),
      ativo: formData.get('ativo') !== 'off',
      ultimo_movimento_em: new Date().toISOString(),
    },
  }
}

function administradoraPayload(formData: FormData) {
  return {
    nome: required(text(formData, 'nome'), 'Nome'),
    documento: nullableText(formData, 'documento'),
    email: nullableText(formData, 'email'),
    telefone: nullableText(formData, 'telefone'),
    site: nullableText(formData, 'site'),
    observacoes: nullableText(formData, 'observacoes'),
    ativo: formData.get('ativo') !== 'off',
  }
}

function documentoPayload(formData: FormData, carteiraId: string | null) {
  const status = text(formData, 'status') || 'pendente'
  const validado = status === 'validado' || formData.get('validado') === 'on'
  return {
    carteira_id: carteiraId,
    tipo_documento: required(text(formData, 'tipo_documento'), 'Tipo de documento'),
    titulo: nullableText(formData, 'titulo') ?? required(text(formData, 'tipo_documento'), 'Tipo de documento'),
    status,
    obrigatorio: formData.get('obrigatorio') !== 'off',
    aplicavel: formData.get('aplicavel') !== 'off',
    validado,
    validado_em: validado ? new Date().toISOString() : null,
    data_assinatura: nullableText(formData, 'data_assinatura'),
    data_realizacao: nullableText(formData, 'data_realizacao'),
    data_renovacao: nullableText(formData, 'data_renovacao'),
    arquivo_url: nullableText(formData, 'arquivo_url'),
    observacoes: nullableText(formData, 'observacoes'),
  }
}

function alertaPayload(formData: FormData, carteiraId: string | null) {
  return {
    cliente_id: uuidOrNull(text(formData, 'cliente_id')),
    carteira_id: carteiraId,
    tipo: text(formData, 'tipo') || 'operacional',
    titulo: required(text(formData, 'titulo'), 'Titulo'),
    descricao: nullableText(formData, 'descricao'),
    status: text(formData, 'status') || 'aberto',
    severidade: text(formData, 'severidade') || 'media',
    vencimento_em: nullableText(formData, 'vencimento_em'),
    origem: nullableText(formData, 'origem'),
    referencia_id: uuidOrNull(text(formData, 'referencia_id')),
  }
}

function ocorrenciaPayload(formData: FormData, carteiraId: string | null) {
  return {
    cliente_id: uuidOrNull(text(formData, 'cliente_id')),
    carteira_id: carteiraId,
    tipo: text(formData, 'tipo') || 'operacional',
    impacto: text(formData, 'impacto') || 'neutro',
    titulo: required(text(formData, 'titulo'), 'Titulo'),
    descricao: nullableText(formData, 'descricao'),
    peso: numberBetween(formData, 'peso', 1, 10),
    impacto_score: numberBetween(formData, 'impacto_score', -100, 100),
    data_ocorrencia: text(formData, 'data_ocorrencia') || new Date().toISOString().slice(0, 10),
    metadata: {
      status: text(formData, 'status') || 'aberta',
      responsavel: nullableText(formData, 'responsavel'),
      prazo: nullableText(formData, 'prazo'),
    },
  }
}

function moneyValue(formData: FormData, key: string) {
  const raw = text(formData, key).replace(/\./g, '').replace(',', '.')
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) throw new Error(`${key} deve ser um valor numerico.`)
  return parsed
}

function contratoPayload(formData: FormData, carteiraId: string | null) {
  return {
    cliente_id: uuidOrNull(text(formData, 'cliente_id')),
    carteira_id: carteiraId,
    numero_contrato: nullableText(formData, 'numero_contrato'),
    data_assinatura: nullableText(formData, 'data_assinatura'),
    data_inicio: nullableText(formData, 'data_inicio'),
    data_fim: nullableText(formData, 'data_fim'),
    valor: moneyValue(formData, 'valor'),
    indice_reajuste: nullableText(formData, 'indice_reajuste'),
    proximo_reajuste: nullableText(formData, 'proximo_reajuste'),
    status: text(formData, 'status') || 'ativo',
    ativo: formData.get('ativo') !== 'off',
    observacoes: nullableText(formData, 'observacoes'),
  }
}

function ataPayload(formData: FormData, carteiraId: string | null) {
  return {
    cliente_id: uuidOrNull(text(formData, 'cliente_id')),
    carteira_id: carteiraId,
    tipo: required(text(formData, 'tipo'), 'Tipo'),
    data_ata: nullableText(formData, 'data_ata'),
    data_validade: nullableText(formData, 'data_validade'),
    status: text(formData, 'status') || 'vigente',
    ativo: formData.get('ativo') !== 'off',
    observacoes: nullableText(formData, 'observacoes'),
  }
}

async function logTimeline(clienteId: string, carteiraId: string | null, usuarioId: string, titulo: string, descricao: string) {
  try {
    await admin().schema('ciclo').from('timeline_cliente').insert({
      cliente_id: clienteId,
      carteira_id: carteiraId,
      usuario_id: usuarioId,
      tipo: 'cadastro',
      titulo,
      descricao,
    })
  } catch {
    // Evento auxiliar; nao deve impedir a gravacao principal.
  }
}

async function allowedCarteirasFor(usuarioId: string, tipo: string) {
  const supabase = admin()
  const carteirasResult = tipo === 'admin_global'
    ? await supabase.schema('core').from('carteiras').select('id,nome,status').eq('status', 'ativo')
    : await supabase
      .schema('security')
      .from('usuario_carteiras')
      .select('carteira_id')
      .eq('usuario_id', usuarioId)
      .eq('ativo', true)

  if (carteirasResult.error) throw new Error(carteirasResult.error.message)

  const carteiraIds = tipo === 'admin_global'
    ? []
    : ((carteirasResult.data ?? []) as Array<Record<string, any>>).map((row) => String(row.carteira_id)).filter(Boolean)

  const rows = tipo === 'admin_global'
    ? (carteirasResult.data ?? []) as Array<Record<string, any>>
    : carteiraIds.length
      ? (((await supabase.schema('core').from('carteiras').select('id,nome,status').in('id', carteiraIds).eq('status', 'ativo')).data ?? []) as Array<Record<string, any>>)
      : []

  const map = new Map<string, { id: string; nome: string }>()
  for (const carteira of rows) {
    const item = { id: String(carteira.id), nome: String(carteira.nome) }
    map.set(item.id, item)
    map.set(normalizeText(item.nome), item)
  }
  return map
}

async function readImportRows(formData: FormData) {
  const file = formData.get('arquivo')
  if (!(file instanceof File) || file.size === 0) throw new Error('Selecione um arquivo XLSX.')
  const isXlsx = file.name.toLowerCase().endsWith('.xlsx') || file.type.includes('spreadsheetml')
  if (!isXlsx) throw new Error('Use uma planilha XLSX para importar clientes.')

  const rows = rowsToObjects(parseXlsxRows(Buffer.from(await file.arrayBuffer())))

  return {
    fileInfo: { nome: file.name, tamanho: file.size },
    rows,
  }
}

async function readAtendimentoImportRows(formData: FormData) {
  const file = formData.get('arquivo')
  if (!(file instanceof File) || file.size === 0) throw new Error('Selecione um arquivo XLSX.')
  const isXlsx = file.name.toLowerCase().endsWith('.xlsx') || file.type.includes('spreadsheetml')
  if (!isXlsx) throw new Error('Use uma planilha XLSX exportada do ASTREA.')

  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const buffer = Buffer.from(await file.arrayBuffer())
  await workbook.xlsx.load(buffer as any)
  const sheet = workbook.getWorksheet('Processos') ?? workbook.worksheets[0]
  if (!sheet) throw new Error('Arquivo XLSX sem abas.')

  const firstRowValues = sheet.getRow(1).values
  const headerValues = Array.isArray(firstRowValues) ? firstRowValues.slice(1) : []
  const header = headerValues.map((value) => normalizeHeader(String(value ?? '')))
  const rows: Record<string, string>[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const record: Record<string, string> = {}
    let hasValue = false

    for (let index = 0; index < header.length; index += 1) {
      const key = header[index]
      if (!key) continue
      const value = excelCellText(row.getCell(index + 1).value)
      if (value) hasValue = true
      record[key] = value
    }

    if (hasValue) rows.push(record)
  })

  return {
    fileInfo: { nome: file.name, tamanho: file.size },
    rows,
  }
}

function excelCellText(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  if (value && typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text.trim()
    if ('result' in value) return excelCellText(value.result)
    if ('hyperlink' in value && typeof value.hyperlink === 'string') return value.hyperlink.trim()
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((item: { text?: string }) => item.text ?? '').join('').trim()
    }
  }
  return String(value ?? '').trim()
}

function astreaNormalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function astreaNameKeys(value: string | null | undefined) {
  const base = astreaNormalizeText(value)
  if (!base) return []
  const variants = new Set([base])
  variants.add(base.replace(/^(condominio|condominial|subcondominio|edificio)\s+/, '').trim())
  variants.add(base.replace(/^(condominio|condominial)\s+edificio\s+/, '').trim())
  variants.add(base.replace(/\s+subcondominio\s+/g, ' ').trim())
  variants.add(base.replace(/\s+setor\s+(residencial|moradia)\s*/g, ' ').trim())
  return [...variants].filter(Boolean)
}

function nullableValue(value: string | null | undefined) {
  const normalized = String(value ?? '').trim()
  return normalized ? normalized : null
}

function excelSerialDate(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  const timestamp = Date.UTC(1899, 11, 30) + Math.floor(parsed) * 86400000
  return new Date(timestamp).toISOString().slice(0, 10)
}

function parseAstreaDate(value: string | null | undefined) {
  const raw = nullableValue(value)
  if (!raw) return null
  const numericDate = /^\d+(\.\d+)?$/.test(raw) ? excelSerialDate(raw) : null
  if (numericDate) return numericDate

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`

  return null
}

function parseAstreaTimestamp(value: string | null | undefined) {
  const raw = nullableValue(value)
  if (!raw) return null
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw
  const date = parseAstreaDate(raw)
  return date ? `${date}T00:00:00-03:00` : null
}

function splitAstreaEtiquetas(value: string | null | undefined) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function tipoAtendimentoAstrea(etiquetas: string[]) {
  const specific = etiquetas.find((item) => astreaNormalizeText(item) !== 'consultivo')
  return specific ?? etiquetas[0] ?? 'Sem etiqueta'
}

function astreaCodigo(title: string | null | undefined) {
  return nullableValue(title)?.match(/\bATE\d+\b/i)?.[0]?.toUpperCase() ?? null
}

function astreaSourceKey(row: Record<string, string>, line: number) {
  const titulo = rowValue(row, 'Título', 'Titulo')
  const codigo = astreaCodigo(titulo)
  if (codigo) return codigo
  return astreaNormalizeText(`${titulo ?? ''}-${rowValue(row, 'Cliente') ?? ''}-${rowValue(row, 'Data de Criação', 'Data de Criacao') ?? ''}-${line}`)
}

async function loadAtendimentoClienteMap(context: Awaited<ReturnType<typeof requireCicloWrite>>) {
  const { data, error } = await admin()
    .schema('ciclo')
    .from('clientes')
    .select('id,carteira_id,nome,nome_fantasia,razao_social')
    .limit(3000)

  if (error) throw new Error(`Clientes Ciclo: ${error.message}`)

  const carteiras = await allowedCarteirasFor(context.usuario.id, context.usuario.tipo)
  const allowedCarteiraIds = context.usuario.tipo === 'admin_global' ? null : new Set([...carteiras.values()].map((carteira) => carteira.id))
  const map = new Map<string, { id: string; carteira_id: string | null }>()

  for (const cliente of (data ?? []) as Array<Record<string, any>>) {
    const carteiraId = typeof cliente.carteira_id === 'string' ? cliente.carteira_id : null
    if (allowedCarteiraIds && carteiraId && !allowedCarteiraIds.has(carteiraId)) continue
    for (const name of [cliente.nome, cliente.nome_fantasia, cliente.razao_social]) {
      for (const key of astreaNameKeys(String(name ?? ''))) {
        if (key && !map.has(key)) map.set(key, { id: String(cliente.id), carteira_id: carteiraId })
      }
    }
  }

  return map
}

function findAtendimentoCliente(clienteNome: string, clienteMap: Map<string, { id: string; carteira_id: string | null }>) {
  for (const key of astreaNameKeys(clienteNome)) {
    const hit = clienteMap.get(key)
    if (hit) return hit
  }
  return null
}

async function existingAtendimentoKeys(sourceKeys: string[]) {
  const existing = new Set<string>()
  const uniqueKeys = [...new Set(sourceKeys)].filter(Boolean)
  for (let index = 0; index < uniqueKeys.length; index += 200) {
    const chunk = uniqueKeys.slice(index, index + 200)
    const { data, error } = await admin()
      .schema('ciclo')
      .from('atendimentos_consultivos')
      .select('source_key')
      .in('source_key', chunk)

    if (error) throw new Error(`Atendimentos existentes: ${error.message}`)
    for (const row of (data ?? []) as Array<Record<string, any>>) existing.add(String(row.source_key))
  }
  return existing
}

async function prepararImportacaoAtendimentosAstrea(formData: FormData) {
  const context = await requireCicloWrite(null)
  const { rows, fileInfo } = await readAtendimentoImportRows(formData)
  const clienteMap = await loadAtendimentoClienteMap(context)
  const ignorados: string[] = []
  const preliminary: Omit<PreparedAtendimentoRow, 'acao'>[] = []
  const seen = new Set<string>()

  for (const [index, row] of rows.entries()) {
    const linha = index + 2
    const titulo = rowValue(row, 'Título', 'Titulo')
    const clienteNome = rowValue(row, 'Cliente')

    if (!titulo || !clienteNome) {
      ignorados.push(`Linha ${linha}: titulo ou cliente vazio.`)
      continue
    }

    const sourceKey = astreaSourceKey(row, linha)
    if (seen.has(sourceKey)) {
      ignorados.push(`Linha ${linha}: atendimento duplicado no arquivo (${sourceKey}).`)
      continue
    }
    seen.add(sourceKey)

    const etiquetas = splitAstreaEtiquetas(rowValue(row, 'Etiquetas'))
    const cliente = findAtendimentoCliente(clienteNome, clienteMap)
    const dataEncerramento = parseAstreaTimestamp(rowValue(row, 'Data de Encerramento'))
    const dataCriacao = parseAstreaDate(rowValue(row, 'Data de Criação', 'Data de Criacao'))
    const responsavel = nullableValue(rowValue(row, 'Responsável', 'Responsavel'))
    const tipoAtendimento = tipoAtendimentoAstrea(etiquetas)
    const status = dataEncerramento ? 'encerrado' : 'aberto'

    preliminary.push({
      carteiraId: cliente?.carteira_id ?? null,
      clienteId: cliente?.id ?? null,
      clienteNome,
      dataCriacao,
      linha,
      payload: {
        source_key: sourceKey,
        astrea_codigo: astreaCodigo(titulo),
        titulo,
        cliente_nome: clienteNome,
        cliente_id: cliente?.id ?? null,
        carteira_id: cliente?.carteira_id ?? null,
        responsavel,
        etiquetas,
        tipo_atendimento: tipoAtendimento,
        status,
        data_criacao: dataCriacao,
        data_encerramento: dataEncerramento,
        data_ultimo_historico: parseAstreaDate(rowValue(row, 'Data do último histórico', 'Data do ultimo historico')),
        objeto: nullableValue(rowValue(row, 'Objeto')),
        ultimo_historico: nullableValue(rowValue(row, 'Descrição do último histórico', 'Descricao do ultimo historico')),
        url_processo: nullableValue(rowValue(row, 'URL do Processo')),
        raw: row,
        imported_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      responsavel,
      sourceKey,
      status,
      tipoAtendimento,
      titulo,
    })
  }

  const existing = await existingAtendimentoKeys(preliminary.map((row) => row.sourceKey))
  const prepared: PreparedAtendimentoRow[] = preliminary.map((row) => ({
    ...row,
    acao: existing.has(row.sourceKey) ? 'atualizar' : 'criar',
  }))

  return { context, fileInfo, ignorados, prepared, total: rows.length }
}

async function ensureAdministradora(nome: string | null) {
  if (!nome) return null
  const db = admin().schema('ciclo')
  const existing = await db.from('administradoras').select('id').eq('nome_normalizado', normalizeText(nome)).maybeSingle()
  if (existing.error) throw new Error(`Administradora ${nome}: ${existing.error.message}`)
  if (existing.data?.id) return existing.data.id as string

  const { data, error } = await db.from('administradoras').insert({ nome, ativo: true }).select('id').single()
  if (error) throw new Error(`Administradora ${nome}: ${error.message}`)
  return data.id as string
}

async function prepararImportacaoClientes(formData: FormData) {
  const context = await requireCicloWrite(null)
  const { rows, fileInfo } = await readImportRows(formData)
  const carteiras = await allowedCarteirasFor(context.usuario.id, context.usuario.tipo)
  const seen = new Set<string>()
  const ignorados: string[] = []
  const prepared: PreparedImportRow[] = []

  for (const [index, row] of rows.entries()) {
    const linha = index + 2
    const documento = onlyDigits(rowValue(row, 'cnpj', 'documento'))
    if (documento.length !== 14) {
      ignorados.push(`Linha ${linha}: CNPJ invalido.`)
      continue
    }

    if (seen.has(documento)) {
      ignorados.push(`Linha ${linha}: CNPJ duplicado no arquivo.`)
      continue
    }
    seen.add(documento)

    const carteiraRaw = rowValue(row, 'carteira', 'carteira_id')
    const carteira = carteiraRaw ? carteiras.get(carteiraRaw) ?? carteiras.get(normalizeText(carteiraRaw)) : null
    if (!carteira) {
      ignorados.push(`Linha ${linha}: carteira nao encontrada ou sem acesso.`)
      continue
    }

    const existingCliente = await admin()
      .schema('ciclo')
      .from('clientes')
      .select('id')
      .eq('cnpj_normalizado', documento)
      .maybeSingle()

    if (existingCliente.error) {
      ignorados.push(`Linha ${linha}: ${existingCliente.error.message}`)
      continue
    }

    const nome = rowValue(row, 'nome_fantasia', 'nome', 'razao_social') ?? 'Cliente sem nome'
    prepared.push({
      linha,
      row,
      documento,
      carteiraId: carteira.id,
      carteiraNome: carteira.nome,
      nome,
      administradoraNome: rowValue(row, 'administradora', 'administradora_nome'),
      existingClienteId: existingCliente.data?.id ?? null,
      acao: existingCliente.data?.id ? 'atualizar' : 'criar',
      contatos: Number(Boolean(rowValue(row, 'sindico_nome'))) + Number(Boolean(rowValue(row, 'gerente_adm_nome'))),
    })
  }

  return { context, fileInfo, ignorados, prepared, total: rows.length }
}

async function criarLoteImportacao(analysis: Awaited<ReturnType<typeof prepararImportacaoClientes>>) {
  const { data, error } = await admin()
    .schema('ciclo')
    .from('importacao_lotes')
    .insert({
      tipo: 'clientes_xlsx',
      status: 'processando',
      arquivo_nome: analysis.fileInfo.nome,
      arquivo_tamanho: analysis.fileInfo.tamanho,
      usuario_id: analysis.context.usuario.id,
      carteira_ids: [...new Set(analysis.prepared.map((row) => row.carteiraId))],
      total_linhas: analysis.total,
      linhas_validas: analysis.prepared.length,
      linhas_ignoradas: analysis.ignorados.length,
      resumo: {
        criar: analysis.prepared.filter((row) => row.acao === 'criar').length,
        atualizar: analysis.prepared.filter((row) => row.acao === 'atualizar').length,
        contatos: analysis.prepared.reduce((total, row) => total + row.contatos, 0),
      },
    })
    .select('id')
    .single()

  if (error) throw new Error(`Lote de importação: ${error.message}`)
  return data.id as string
}

async function registrarItemImportacao(payload: Record<string, unknown>) {
  const { error } = await admin().schema('ciclo').from('importacao_lote_itens').insert(payload)
  if (error) throw new Error(`Item de importação: ${error.message}`)
}

async function finalizarLoteImportacao(loteId: string, result: ImportacaoClientesResult, status: 'concluido' | 'parcial' | 'falhou', erro?: string) {
  await admin()
    .schema('ciclo')
    .from('importacao_lotes')
    .update({
      status,
      clientes_criados: result.criados,
      clientes_atualizados: result.atualizados,
      contatos_importados: result.contatos,
      linhas_ignoradas: result.ignorados.length,
      resumo: {
        total: result.total,
        criados_ou_atualizados: result.criadosOuAtualizados,
        ignorados: result.ignorados.slice(0, 50),
      },
      erro: erro ?? null,
      finalizado_em: new Date().toISOString(),
    })
    .eq('id', loteId)
}

async function criarLoteImportacaoAtendimentos(analysis: Awaited<ReturnType<typeof prepararImportacaoAtendimentosAstrea>>) {
  const { data, error } = await admin()
    .schema('ciclo')
    .from('importacao_lotes')
    .insert({
      tipo: 'atendimentos_astrea_xlsx',
      status: 'processando',
      arquivo_nome: analysis.fileInfo.nome,
      arquivo_tamanho: analysis.fileInfo.tamanho,
      usuario_id: analysis.context.usuario.id,
      carteira_ids: [...new Set(analysis.prepared.map((row) => row.carteiraId).filter(Boolean))],
      total_linhas: analysis.total,
      linhas_validas: analysis.prepared.length,
      linhas_ignoradas: analysis.ignorados.length,
      resumo: {
        criar: analysis.prepared.filter((row) => row.acao === 'criar').length,
        atualizar: analysis.prepared.filter((row) => row.acao === 'atualizar').length,
        abertos: analysis.prepared.filter((row) => row.status === 'aberto').length,
        encerrados: analysis.prepared.filter((row) => row.status === 'encerrado').length,
        vinculados: analysis.prepared.filter((row) => row.clienteId).length,
      },
    })
    .select('id')
    .single()

  if (error) throw new Error(`Lote de importacao: ${error.message}`)
  return data.id as string
}

async function finalizarLoteImportacaoAtendimentos(
  loteId: string,
  result: ImportacaoAtendimentosResult,
  analysis: Awaited<ReturnType<typeof prepararImportacaoAtendimentosAstrea>>,
  status: 'concluido' | 'parcial' | 'falhou',
  erro?: string,
) {
  await admin()
    .schema('ciclo')
    .from('importacao_lotes')
    .update({
      status,
      clientes_criados: result.criados,
      clientes_atualizados: result.atualizados,
      contatos_importados: 0,
      linhas_ignoradas: result.ignorados.length,
      resumo: {
        total: result.total,
        gravados: result.gravados,
        criados: result.criados,
        atualizados: result.atualizados,
        abertos: analysis.prepared.filter((row) => row.status === 'aberto').length,
        encerrados: analysis.prepared.filter((row) => row.status === 'encerrado').length,
        vinculados: analysis.prepared.filter((row) => row.clienteId).length,
        sem_vinculo_cliente: analysis.prepared.filter((row) => !row.clienteId).length,
        ignorados: result.ignorados.slice(0, 50),
      },
      erro: erro ?? null,
      finalizado_em: new Date().toISOString(),
    })
    .eq('id', loteId)
}

async function upsertAtendimentosAstrea(rows: PreparedAtendimentoRow[]) {
  let count = 0
  for (let index = 0; index < rows.length; index += 200) {
    const chunk = rows.slice(index, index + 200).map((row) => row.payload)
    const { error } = await admin()
      .schema('ciclo')
      .from('atendimentos_consultivos')
      .upsert(chunk, { onConflict: 'source_key' })

    if (error) throw new Error(`Atendimentos ASTREA: ${error.message}`)
    count += chunk.length
  }
  return count
}

async function upsertContato(payload: Record<string, unknown>) {
  const db = admin().schema('ciclo')
  const email = typeof payload.email === 'string' && payload.email.trim() ? payload.email.trim() : null
  let existing = null

  if (email) {
    const byEmail = await db.from('cliente_contatos').select('id').eq('cliente_id', payload.cliente_id).eq('email', email).maybeSingle()
    if (byEmail.error) throw new Error(`Contato: ${byEmail.error.message}`)
    existing = byEmail.data
  }

  if (!existing) {
    const byName = await db.from('cliente_contatos').select('id').eq('cliente_id', payload.cliente_id).eq('nome', payload.nome).eq('tipo', payload.tipo).maybeSingle()
    if (byName.error) throw new Error(`Contato: ${byName.error.message}`)
    existing = byName.data
  }

  if (existing?.id) {
    const { error } = await db.from('cliente_contatos').update(payload).eq('id', existing.id)
    if (error) throw new Error(`Contato: ${error.message}`)
    return
  }

  const { error } = await db.from('cliente_contatos').insert(payload)
  if (error) throw new Error(`Contato: ${error.message}`)
}

async function runOptionalRpc(name: string, clienteId: string) {
  try {
    await admin().schema('ciclo').rpc(name, { p_cliente_id: clienteId })
  } catch {
    // Rotinas auxiliares podem nao existir em ambientes sem a migracao completa.
  }
}

const onboardingDocumentos = [
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

async function getClienteAccess(clienteId: string) {
  const { data, error } = await admin()
    .schema('ciclo')
    .from('clientes')
    .select('id,carteira_id,nome,status_operacional')
    .eq('id', clienteId)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Cliente nao encontrado.')
  return data as { id: string; carteira_id: string | null; nome: string; status_operacional: string }
}

async function requireCicloAlertWrite(carteiraId: string | null) {
  const context = await requireModuleAccess('ciclo')
  if (!canAccess(context.permissions, 'ciclo.alertas.write')) {
    throw new Error('Usuario sem permissao para gerenciar alertas do Ciclo.')
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

  if (error || !data) throw new Error('Usuario sem acesso a carteira selecionada.')

  return context
}

async function ensureOnboardingChecklist(clienteId: string, carteiraId: string | null) {
  const rows = onboardingDocumentos.map((documento) => ({
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

  if (error) throw new Error(`Checklist de onboarding: ${error.message}`)
}

async function ensureOnboardingWorkflow(clienteId: string, carteiraId: string | null) {
  const { data, error } = await admin()
    .schema('ciclo')
    .from('onboarding_workflow_atividades')
    .select('id,ordem,descricao,responsavel_padrao,obrigatoria')
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  if (error) throw new Error(`Workflow de onboarding: ${error.message}`)

  const rows = ((data ?? []) as Array<Record<string, any>>).map((atividade) => ({
    cliente_id: clienteId,
    carteira_id: carteiraId,
    atividade_id: atividade.id,
    ordem: atividade.ordem ?? 0,
    descricao: atividade.descricao,
    responsavel: atividade.responsavel_padrao ?? null,
    obrigatoria: atividade.obrigatoria !== false,
    status: 'pendente',
  }))

  if (!rows.length) return

  const upsert = await admin()
    .schema('ciclo')
    .from('onboarding_cliente_atividades')
    .upsert(rows, { onConflict: 'cliente_id,atividade_id', ignoreDuplicates: true })

  if (upsert.error) throw new Error(`Workflow de onboarding: ${upsert.error.message}`)
}

async function recalcularRegularidade(clienteId: string, carteiraId: string | null) {
  const { data, error } = await admin()
    .schema('ciclo')
    .from('cliente_documentos')
    .select('status,validado,obrigatorio,aplicavel,tipo_documento,titulo')
    .eq('cliente_id', clienteId)

  if (error) throw new Error(`Regularidade: ${error.message}`)

  const obrigatorios = ((data ?? []) as Array<Record<string, any>>).filter((documento) => (
    documento.obrigatorio !== false &&
    documento.aplicavel !== false &&
    documento.status !== 'dispensado'
  ))
  const concluidos = obrigatorios.filter((documento) => documento.validado || documento.status === 'validado').length
  const percentual = obrigatorios.length ? Math.round((concluidos / obrigatorios.length) * 100) : 0
  const pendencias = obrigatorios
    .filter((documento) => !(documento.validado || documento.status === 'validado'))
    .map((documento) => documento.titulo ?? documento.tipo_documento)

  const { error: upsertError } = await admin()
    .schema('ciclo')
    .from('regularidade_cliente')
    .upsert({
      cliente_id: clienteId,
      carteira_id: carteiraId,
      percentual_regularidade: percentual,
      status: percentual >= 75 ? 'saudavel' : percentual >= 50 ? 'atencao' : 'critico',
      pendencias,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'cliente_id' })

  if (upsertError) throw new Error(`Regularidade: ${upsertError.message}`)
}

export async function createCicloAdministradoraAction(formData: FormData) {
  await requireCicloWrite(null)
  const { data, error } = await admin()
    .schema('ciclo')
    .from('administradoras')
    .insert(administradoraPayload(formData))
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/ciclo/administradoras')
  redirect(`/modulos/ciclo/administradoras/${data.id}`)
}

export async function updateCicloAdministradoraAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Administradora')
  await requireCicloWrite(null)

  const { error } = await admin()
    .schema('ciclo')
    .from('administradoras')
    .update(administradoraPayload(formData))
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/ciclo/administradoras')
  revalidatePath(`/modulos/ciclo/administradoras/${id}`)
  redirect('/modulos/ciclo/administradoras')
}

export async function createCicloClienteAction(formData: FormData) {
  const { carteiraId, payload } = clientePayload(formData)
  const context = await requireCicloWrite(carteiraId)

  const { data, error } = await admin()
    .schema('ciclo')
    .from('clientes')
    .insert(payload)
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  await logTimeline(data.id, carteiraId, context.usuario.id, 'Cliente criado no Ciclo', 'Entrada do cliente na esteira operacional.')

  revalidatePath('/modulos/ciclo')
  revalidatePath('/modulos/ciclo/clientes')
  revalidatePath('/modulos/ciclo/onboarding')
  redirect('/modulos/ciclo/clientes')
}

export async function updateCicloClienteAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Cliente')
  const { carteiraId, payload } = clientePayload(formData)
  const context = await requireCicloWrite(carteiraId)

  const { error } = await admin()
    .schema('ciclo')
    .from('clientes')
    .update(payload)
    .eq('id', id)

  if (error) throw new Error(error.message)

  await logTimeline(id, carteiraId, context.usuario.id, 'Cliente atualizado no Ciclo', 'Cadastro operacional atualizado.')

  revalidatePath('/modulos/ciclo')
  revalidatePath('/modulos/ciclo/clientes')
  revalidatePath('/modulos/ciclo/onboarding')
  revalidatePath(`/modulos/ciclo/clientes/${id}`)
  redirect('/modulos/ciclo/clientes')
}

export async function createCicloDocumentoAction(formData: FormData) {
  const clienteId = required(text(formData, 'cliente_id'), 'Cliente')
  const cliente = await getClienteAccess(clienteId)
  const context = await requireCicloDocumentWrite(cliente.carteira_id)

  const { data, error } = await admin()
    .schema('ciclo')
    .from('cliente_documentos')
    .insert({
      cliente_id: clienteId,
      ...documentoPayload(formData, cliente.carteira_id),
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  await recalcularRegularidade(clienteId, cliente.carteira_id)
  await logTimeline(clienteId, cliente.carteira_id, context.usuario.id, 'Documento cadastrado', `${text(formData, 'titulo') || text(formData, 'tipo_documento')} incluido no controle documental.`)

  revalidatePath('/modulos/ciclo/documentos')
  revalidatePath('/modulos/ciclo/regularidade')
  revalidatePath('/modulos/ciclo/onboarding')
  redirect(`/modulos/ciclo/documentos/${data.id}`)
}

export async function updateCicloDocumentoAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Documento')
  const clienteId = required(text(formData, 'cliente_id'), 'Cliente')
  const cliente = await getClienteAccess(clienteId)
  const context = await requireCicloDocumentWrite(cliente.carteira_id)

  const { error } = await admin()
    .schema('ciclo')
    .from('cliente_documentos')
    .update(documentoPayload(formData, cliente.carteira_id))
    .eq('id', id)

  if (error) throw new Error(error.message)

  await recalcularRegularidade(clienteId, cliente.carteira_id)
  await logTimeline(clienteId, cliente.carteira_id, context.usuario.id, 'Documento atualizado', `${text(formData, 'titulo') || text(formData, 'tipo_documento')} atualizado no controle documental.`)

  revalidatePath('/modulos/ciclo/documentos')
  revalidatePath(`/modulos/ciclo/documentos/${id}`)
  revalidatePath('/modulos/ciclo/regularidade')
  revalidatePath('/modulos/ciclo/onboarding')
  redirect('/modulos/ciclo/documentos')
}

export async function createCicloAlertaAction(formData: FormData) {
  const clienteId = uuidOrNull(text(formData, 'cliente_id'))
  const cliente = clienteId ? await getClienteAccess(clienteId) : null
  const context = await requireCicloAlertWrite(cliente?.carteira_id ?? null)

  const { data, error } = await admin()
    .schema('ciclo')
    .from('alertas_cliente')
    .insert(alertaPayload(formData, cliente?.carteira_id ?? null))
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  if (cliente) await logTimeline(cliente.id, cliente.carteira_id, context.usuario.id, 'Alerta criado', text(formData, 'titulo'))

  revalidatePath('/modulos/ciclo')
  revalidatePath('/modulos/ciclo/alertas')
  redirect(`/modulos/ciclo/alertas/${data.id}`)
}

export async function updateCicloAlertaAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Alerta')
  const clienteId = uuidOrNull(text(formData, 'cliente_id'))
  const cliente = clienteId ? await getClienteAccess(clienteId) : null
  const context = await requireCicloAlertWrite(cliente?.carteira_id ?? null)

  const { error } = await admin()
    .schema('ciclo')
    .from('alertas_cliente')
    .update(alertaPayload(formData, cliente?.carteira_id ?? null))
    .eq('id', id)

  if (error) throw new Error(error.message)
  if (cliente) await logTimeline(cliente.id, cliente.carteira_id, context.usuario.id, 'Alerta atualizado', `${text(formData, 'titulo')} - ${text(formData, 'status')}`)

  revalidatePath('/modulos/ciclo')
  revalidatePath('/modulos/ciclo/alertas')
  revalidatePath(`/modulos/ciclo/alertas/${id}`)
  redirect('/modulos/ciclo/alertas')
}

export async function resolveCicloAlertaAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Alerta')
  const clienteId = uuidOrNull(text(formData, 'cliente_id'))
  const cliente = clienteId ? await getClienteAccess(clienteId) : null
  const context = await requireCicloAlertWrite(cliente?.carteira_id ?? null)

  const { error } = await admin()
    .schema('ciclo')
    .from('alertas_cliente')
    .update({ status: 'resolvido' })
    .eq('id', id)

  if (error) throw new Error(error.message)
  if (cliente) await logTimeline(cliente.id, cliente.carteira_id, context.usuario.id, 'Alerta resolvido', text(formData, 'titulo') || 'Alerta operacional resolvido.')

  revalidatePath('/modulos/ciclo')
  revalidatePath('/modulos/ciclo/alertas')
}

export async function createCicloOcorrenciaAction(formData: FormData) {
  const clienteId = uuidOrNull(text(formData, 'cliente_id'))
  const cliente = clienteId ? await getClienteAccess(clienteId) : null
  const context = await requireCicloAlertWrite(cliente?.carteira_id ?? null)
  const payload = ocorrenciaPayload(formData, cliente?.carteira_id ?? null)

  const { data, error } = await admin()
    .schema('ciclo')
    .from('ocorrencias')
    .insert(payload)
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  if (cliente) {
    await logTimeline(cliente.id, cliente.carteira_id, context.usuario.id, 'Ocorrencia registrada', text(formData, 'titulo'))
  }

  if (formData.get('criar_alerta') === 'on') {
    const alerta = await admin()
      .schema('ciclo')
      .from('alertas_cliente')
      .insert({
        cliente_id: cliente?.id ?? null,
        carteira_id: cliente?.carteira_id ?? null,
        tipo: payload.tipo,
        titulo: payload.titulo,
        descricao: payload.descricao,
        status: 'aberto',
        severidade: payload.impacto === 'critico' ? 'critica' : payload.impacto === 'alto' ? 'alta' : payload.impacto === 'baixo' ? 'baixa' : 'media',
        vencimento_em: text(formData, 'prazo') || null,
        origem: 'ocorrencia',
        referencia_id: data.id,
      })
    if (alerta.error) throw new Error(alerta.error.message)
  }

  revalidatePath('/modulos/ciclo')
  revalidatePath('/modulos/ciclo/ocorrencias')
  revalidatePath('/modulos/ciclo/alertas')
  redirect(`/modulos/ciclo/ocorrencias/${data.id}`)
}

export async function updateCicloOcorrenciaAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Ocorrencia')
  const clienteId = uuidOrNull(text(formData, 'cliente_id'))
  const cliente = clienteId ? await getClienteAccess(clienteId) : null
  const context = await requireCicloAlertWrite(cliente?.carteira_id ?? null)
  const payload = ocorrenciaPayload(formData, cliente?.carteira_id ?? null)

  const { error } = await admin()
    .schema('ciclo')
    .from('ocorrencias')
    .update(payload)
    .eq('id', id)

  if (error) throw new Error(error.message)
  if (cliente) await logTimeline(cliente.id, cliente.carteira_id, context.usuario.id, 'Ocorrencia atualizada', `${payload.titulo} - ${payload.metadata.status}`)

  revalidatePath('/modulos/ciclo')
  revalidatePath('/modulos/ciclo/ocorrencias')
  revalidatePath(`/modulos/ciclo/ocorrencias/${id}`)
  redirect('/modulos/ciclo/ocorrencias')
}

export async function createCicloContratoAction(formData: FormData) {
  const clienteId = uuidOrNull(text(formData, 'cliente_id'))
  const cliente = clienteId ? await getClienteAccess(clienteId) : null
  const context = await requireCicloWrite(cliente?.carteira_id ?? null)
  const payload = contratoPayload(formData, cliente?.carteira_id ?? null)

  const { data, error } = await admin()
    .schema('ciclo')
    .from('contratos')
    .insert(payload)
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  if (cliente) await logTimeline(cliente.id, cliente.carteira_id, context.usuario.id, 'Contrato cadastrado', payload.numero_contrato ?? 'Contrato operacional cadastrado.')

  revalidatePath('/modulos/ciclo/contratos')
  revalidatePath('/modulos/ciclo/timeline')
  redirect(`/modulos/ciclo/contratos/${data.id}`)
}

export async function updateCicloContratoAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Contrato')
  const clienteId = uuidOrNull(text(formData, 'cliente_id'))
  const cliente = clienteId ? await getClienteAccess(clienteId) : null
  const context = await requireCicloWrite(cliente?.carteira_id ?? null)
  const payload = contratoPayload(formData, cliente?.carteira_id ?? null)

  const { error } = await admin()
    .schema('ciclo')
    .from('contratos')
    .update(payload)
    .eq('id', id)

  if (error) throw new Error(error.message)
  if (cliente) await logTimeline(cliente.id, cliente.carteira_id, context.usuario.id, 'Contrato atualizado', payload.numero_contrato ?? 'Contrato operacional atualizado.')

  revalidatePath('/modulos/ciclo/contratos')
  revalidatePath(`/modulos/ciclo/contratos/${id}`)
  revalidatePath('/modulos/ciclo/timeline')
  redirect('/modulos/ciclo/contratos')
}

export async function createCicloAtaAction(formData: FormData) {
  const clienteId = uuidOrNull(text(formData, 'cliente_id'))
  const cliente = clienteId ? await getClienteAccess(clienteId) : null
  const context = await requireCicloWrite(cliente?.carteira_id ?? null)
  const payload = ataPayload(formData, cliente?.carteira_id ?? null)

  const { data, error } = await admin()
    .schema('ciclo')
    .from('atas')
    .insert(payload)
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  if (cliente) await logTimeline(cliente.id, cliente.carteira_id, context.usuario.id, 'Ata cadastrada', payload.tipo)

  revalidatePath('/modulos/ciclo/atas')
  revalidatePath('/modulos/ciclo/timeline')
  redirect(`/modulos/ciclo/atas/${data.id}`)
}

export async function updateCicloAtaAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Ata')
  const clienteId = uuidOrNull(text(formData, 'cliente_id'))
  const cliente = clienteId ? await getClienteAccess(clienteId) : null
  const context = await requireCicloWrite(cliente?.carteira_id ?? null)
  const payload = ataPayload(formData, cliente?.carteira_id ?? null)

  const { error } = await admin()
    .schema('ciclo')
    .from('atas')
    .update(payload)
    .eq('id', id)

  if (error) throw new Error(error.message)
  if (cliente) await logTimeline(cliente.id, cliente.carteira_id, context.usuario.id, 'Ata atualizada', payload.tipo)

  revalidatePath('/modulos/ciclo/atas')
  revalidatePath(`/modulos/ciclo/atas/${id}`)
  revalidatePath('/modulos/ciclo/timeline')
  redirect('/modulos/ciclo/atas')
}

export async function startCicloOnboardingAction(formData: FormData) {
  const clienteId = required(text(formData, 'cliente_id'), 'Cliente')
  const cliente = await getClienteAccess(clienteId)
  const context = await requireCicloWrite(cliente.carteira_id)

  await ensureOnboardingChecklist(clienteId, cliente.carteira_id)
  await ensureOnboardingWorkflow(clienteId, cliente.carteira_id)

  const { error } = await admin()
    .schema('ciclo')
    .from('clientes')
    .update({
      status_operacional: 'implantacao',
      ultimo_movimento_em: new Date().toISOString(),
    })
    .eq('id', clienteId)

  if (error) throw new Error(error.message)

  await recalcularRegularidade(clienteId, cliente.carteira_id)
  await logTimeline(clienteId, cliente.carteira_id, context.usuario.id, 'Onboarding iniciado', 'Checklist operacional criado e cliente movido para implantacao.')

  revalidatePath('/modulos/ciclo')
  revalidatePath('/modulos/ciclo/onboarding')
  revalidatePath(`/modulos/ciclo/onboarding/${clienteId}`)
  revalidatePath('/modulos/ciclo/clientes')
}

export async function updateCicloOnboardingDocumentoAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Documento')
  const clienteId = required(text(formData, 'cliente_id'), 'Cliente')
  const cliente = await getClienteAccess(clienteId)
  const context = await requireCicloDocumentWrite(cliente.carteira_id)
  const status = text(formData, 'status') || 'pendente'
  const validado = status === 'validado' || formData.get('validado') === 'on'

  const { error } = await admin()
    .schema('ciclo')
    .from('cliente_documentos')
    .update({
      status,
      validado,
      validado_em: validado ? new Date().toISOString() : null,
      data_renovacao: nullableText(formData, 'data_renovacao'),
      arquivo_url: nullableText(formData, 'arquivo_url'),
      observacoes: nullableText(formData, 'observacoes'),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  await recalcularRegularidade(clienteId, cliente.carteira_id)
  await logTimeline(clienteId, cliente.carteira_id, context.usuario.id, 'Documento de onboarding atualizado', `Status alterado para ${status}.`)
  await runOptionalRpc('gkli_recalcular_regularidade_cliente', clienteId)

  revalidatePath('/modulos/ciclo/onboarding')
  revalidatePath(`/modulos/ciclo/onboarding/${clienteId}`)
  revalidatePath('/modulos/ciclo/documentos')
  revalidatePath('/modulos/ciclo/regularidade')
}

export async function createCicloOnboardingWorkflowAtividadeAction(formData: FormData) {
  await requireCicloWrite(null)
  const descricao = required(text(formData, 'descricao'), 'Descricao')
  const ordem = Number(text(formData, 'ordem') || 0)

  const { error } = await admin()
    .schema('ciclo')
    .from('onboarding_workflow_atividades')
    .insert({
      ordem: Number.isFinite(ordem) ? ordem : 0,
      descricao,
      responsavel_padrao: nullableText(formData, 'responsavel_padrao'),
      obrigatoria: formData.get('obrigatoria') !== 'off',
      ativo: true,
    })

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/ciclo/onboarding')
  revalidatePath('/modulos/ciclo/onboarding/workflow')
}

export async function updateCicloOnboardingWorkflowAtividadeAction(formData: FormData) {
  await requireCicloWrite(null)
  const id = required(text(formData, 'id'), 'Atividade')
  const descricao = required(text(formData, 'descricao'), 'Descricao')
  const ordem = Number(text(formData, 'ordem') || 0)

  const { error } = await admin()
    .schema('ciclo')
    .from('onboarding_workflow_atividades')
    .update({
      ordem: Number.isFinite(ordem) ? ordem : 0,
      descricao,
      responsavel_padrao: nullableText(formData, 'responsavel_padrao'),
      obrigatoria: formData.get('obrigatoria') !== 'off',
      ativo: formData.get('ativo') !== 'off',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/ciclo/onboarding')
  revalidatePath('/modulos/ciclo/onboarding/workflow')
}

export async function updateCicloOnboardingAtividadeAction(formData: FormData) {
  const id = required(text(formData, 'id'), 'Atividade')
  const clienteId = required(text(formData, 'cliente_id'), 'Cliente')
  const cliente = await getClienteAccess(clienteId)
  const context = await requireCicloWrite(cliente.carteira_id)
  const status = text(formData, 'status') || 'pendente'

  const { error } = await admin()
    .schema('ciclo')
    .from('onboarding_cliente_atividades')
    .update({
      responsavel: nullableText(formData, 'responsavel'),
      status,
      concluido_em: status === 'concluido' ? new Date().toISOString() : null,
      observacoes: nullableText(formData, 'observacoes'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('cliente_id', clienteId)

  if (error) throw new Error(error.message)

  await logTimeline(clienteId, cliente.carteira_id, context.usuario.id, 'Atividade de onboarding atualizada', `${text(formData, 'descricao') || 'Atividade'} - ${status}`)

  revalidatePath('/modulos/ciclo/onboarding')
  revalidatePath(`/modulos/ciclo/onboarding/${clienteId}`)
}

export async function completeCicloOnboardingAction(formData: FormData) {
  const clienteId = required(text(formData, 'cliente_id'), 'Cliente')
  const cliente = await getClienteAccess(clienteId)
  const context = await requireCicloWrite(cliente.carteira_id)

  const [{ data, error }, atividadesResult] = await Promise.all([
    admin()
    .schema('ciclo')
    .from('cliente_documentos')
    .select('id,status,validado,obrigatorio,aplicavel')
      .eq('cliente_id', clienteId),
    admin()
      .schema('ciclo')
      .from('onboarding_cliente_atividades')
      .select('id,status,obrigatoria')
      .eq('cliente_id', clienteId),
  ])

  if (error) throw new Error(error.message)
  if (atividadesResult.error) throw new Error(atividadesResult.error.message)

  const pendentes = ((data ?? []) as Array<Record<string, any>>).filter((documento) => (
    documento.obrigatorio !== false &&
    documento.aplicavel !== false &&
    documento.status !== 'dispensado' &&
    documento.validado !== true
  ))

  if (pendentes.length) {
    throw new Error('Ainda existem documentos obrigatorios pendentes no onboarding.')
  }

  const atividades = (atividadesResult.data ?? []) as Array<Record<string, any>>
  if (!atividades.length) {
    throw new Error('Inicie o workflow de onboarding antes de concluir.')
  }

  const atividadesPendentes = atividades.filter((atividade) => (
    atividade.obrigatoria !== false &&
    atividade.status !== 'dispensado' &&
    atividade.status !== 'concluido'
  ))

  if (atividadesPendentes.length) {
    throw new Error('Ainda existem atividades obrigatorias pendentes no workflow de onboarding.')
  }

  const update = await admin()
    .schema('ciclo')
    .from('clientes')
    .update({
      status_operacional: 'ativo',
      ultimo_movimento_em: new Date().toISOString(),
    })
    .eq('id', clienteId)

  if (update.error) throw new Error(update.error.message)

  await logTimeline(clienteId, cliente.carteira_id, context.usuario.id, 'Onboarding concluido', 'Cliente ativado apos validacao documental.')
  await runOptionalRpc('gkli_recalcular_regularidade_cliente', clienteId)

  revalidatePath('/modulos/ciclo')
  revalidatePath('/modulos/ciclo/onboarding')
  revalidatePath(`/modulos/ciclo/onboarding/${clienteId}`)
  revalidatePath('/modulos/ciclo/clientes')
}

export async function previewImportacaoClientesXlsx(formData: FormData): Promise<PreviewImportacaoClientes> {
  const analysis = await prepararImportacaoClientes(formData)

  return {
    total: analysis.total,
    validas: analysis.prepared.length,
    criar: analysis.prepared.filter((row) => row.acao === 'criar').length,
    atualizar: analysis.prepared.filter((row) => row.acao === 'atualizar').length,
    contatos: analysis.prepared.reduce((total, row) => total + row.contatos, 0),
    ignorados: analysis.ignorados,
    amostras: analysis.prepared.slice(0, 10).map((row) => ({
      linha: row.linha,
      acao: row.acao,
      nome: row.nome,
      documento: row.documento,
      carteira: row.carteiraNome,
      administradora: row.administradoraNome,
    })),
  }
}

export async function importarClientesXlsx(formData: FormData): Promise<ImportacaoClientesResult> {
  const analysis = await prepararImportacaoClientes(formData)
  const result: ImportacaoClientesResult = {
    total: analysis.total,
    criadosOuAtualizados: 0,
    criados: 0,
    atualizados: 0,
    contatos: 0,
    ignorados: [...analysis.ignorados],
    loteId: null,
  }

  const loteId = await criarLoteImportacao(analysis)
  result.loteId = loteId

  for (const mensagem of analysis.ignorados) {
    const linhaMatch = mensagem.match(/^Linha (\d+):/)
    await registrarItemImportacao({
      lote_id: loteId,
      linha: linhaMatch ? Number(linhaMatch[1]) : 0,
      acao: 'ignorar',
      status: 'ignorado',
      mensagem,
    })
  }

  for (const item of analysis.prepared) {
    const { carteiraId, documento, linha, nome, row } = item
    try {
      const administradoraId = await ensureAdministradora(item.administradoraNome)
      const payload = {
        carteira_id: carteiraId,
        administradora_id: administradoraId,
        nome,
        nome_fantasia: nome,
        razao_social: rowValue(row, 'razao_social'),
        documento,
        email: rowValue(row, 'email', 'email_principal'),
        telefone: rowValue(row, 'telefone', 'telefone_principal'),
        cidade: rowValue(row, 'cidade'),
        estado: rowValue(row, 'estado')?.toUpperCase().slice(0, 2) ?? null,
        pasta_url: rowValue(row, 'pasta_url'),
        observacoes: rowValue(row, 'observacoes'),
        tipo_cliente: 'mensal',
        status_operacional: 'novo',
        score_atual: 75,
        risco_atual: 'medio',
        temperatura: 'neutro',
        ativo: true,
        ultimo_movimento_em: new Date().toISOString(),
      }

      const saved = item.existingClienteId
        ? await admin().schema('ciclo').from('clientes').update(payload).eq('id', item.existingClienteId).select('id').single()
        : await admin().schema('ciclo').from('clientes').insert(payload).select('id').single()

      if (saved.error) throw new Error(saved.error.message)

      const clienteId = saved.data.id as string
      const sindicoNome = rowValue(row, 'sindico_nome')
      if (sindicoNome) {
        await upsertContato({
          cliente_id: clienteId,
          nome: sindicoNome,
          tipo: 'sindico',
          email: rowValue(row, 'sindico_email'),
          telefone: rowValue(row, 'sindico_telefone'),
          principal: true,
          ativo: true,
        })
        result.contatos += 1
      }

      const gerenteNome = rowValue(row, 'gerente_adm_nome')
      if (gerenteNome) {
        await upsertContato({
          cliente_id: clienteId,
          nome: gerenteNome,
          tipo: 'administradora',
          email: rowValue(row, 'gerente_adm_email'),
          telefone: rowValue(row, 'gerente_adm_telefone'),
          principal: !sindicoNome,
          ativo: true,
        })
        result.contatos += 1
      }

      await runOptionalRpc('gkli_gerar_checklist_documental_cliente', clienteId)
      await runOptionalRpc('gkli_recalcular_regularidade_cliente', clienteId)
      await logTimeline(clienteId, carteiraId, analysis.context.usuario.id, 'Cliente importado', 'Cadastro criado ou atualizado por importação XLSX.')
      await registrarItemImportacao({
        lote_id: loteId,
        linha,
        carteira_id: carteiraId,
        cliente_id: clienteId,
        acao: item.acao,
        status: 'sucesso',
        cnpj_normalizado: documento,
        cliente_nome: nome,
        payload: row,
      })

      result.criadosOuAtualizados += 1
      if (item.acao === 'criar') result.criados += 1
      if (item.acao === 'atualizar') result.atualizados += 1
    } catch (err) {
      const mensagem = `Linha ${linha}: ${err instanceof Error ? err.message : 'Erro inesperado.'}`
      result.ignorados.push(mensagem)
      await registrarItemImportacao({
        lote_id: loteId,
        linha,
        carteira_id: carteiraId,
        acao: item.acao,
        status: 'erro',
        cnpj_normalizado: documento,
        cliente_nome: nome,
        mensagem,
        payload: row,
      })
    }
  }

  const finalStatus = result.criadosOuAtualizados === 0 && result.ignorados.length
    ? 'falhou'
    : result.ignorados.length
      ? 'parcial'
      : 'concluido'

  await finalizarLoteImportacao(loteId, result, finalStatus)

  revalidatePath('/modulos/ciclo')
  revalidatePath('/modulos/ciclo/clientes')
  revalidatePath('/modulos/ciclo/importacoes')
  revalidatePath('/modulos/ciclo/onboarding')
  return result
}

export async function previewImportacaoAtendimentosAstreaXlsx(formData: FormData): Promise<PreviewImportacaoAtendimentos> {
  const analysis = await prepararImportacaoAtendimentosAstrea(formData)

  return {
    total: analysis.total,
    validas: analysis.prepared.length,
    criar: analysis.prepared.filter((row) => row.acao === 'criar').length,
    atualizar: analysis.prepared.filter((row) => row.acao === 'atualizar').length,
    abertos: analysis.prepared.filter((row) => row.status === 'aberto').length,
    encerrados: analysis.prepared.filter((row) => row.status === 'encerrado').length,
    vinculados: analysis.prepared.filter((row) => row.clienteId).length,
    semVinculoCliente: analysis.prepared.filter((row) => !row.clienteId).length,
    ignorados: analysis.ignorados,
    amostras: analysis.prepared.slice(0, 10).map((row) => ({
      linha: row.linha,
      acao: row.acao,
      titulo: row.titulo,
      cliente: row.clienteNome,
      responsavel: row.responsavel,
      tipo: row.tipoAtendimento,
      status: row.status,
      dataCriacao: row.dataCriacao,
      vinculado: Boolean(row.clienteId),
    })),
  }
}

export async function importarAtendimentosAstreaXlsx(formData: FormData): Promise<ImportacaoAtendimentosResult> {
  const analysis = await prepararImportacaoAtendimentosAstrea(formData)
  const result: ImportacaoAtendimentosResult = {
    total: analysis.total,
    gravados: 0,
    criados: analysis.prepared.filter((row) => row.acao === 'criar').length,
    atualizados: analysis.prepared.filter((row) => row.acao === 'atualizar').length,
    ignorados: [...analysis.ignorados],
    loteId: null,
  }

  const loteId = await criarLoteImportacaoAtendimentos(analysis)
  result.loteId = loteId

  for (const mensagem of analysis.ignorados) {
    const linhaMatch = mensagem.match(/^Linha (\d+):/)
    await registrarItemImportacao({
      lote_id: loteId,
      linha: linhaMatch ? Number(linhaMatch[1]) : 0,
      acao: 'ignorar',
      status: 'ignorado',
      mensagem,
    })
  }

  try {
    result.gravados = await upsertAtendimentosAstrea(analysis.prepared)

    for (const item of analysis.prepared) {
      await registrarItemImportacao({
        lote_id: loteId,
        linha: item.linha,
        carteira_id: item.carteiraId,
        cliente_id: item.clienteId,
        acao: item.acao,
        status: 'sucesso',
        cliente_nome: item.clienteNome,
        mensagem: `${item.tipoAtendimento} - ${item.status}`,
        payload: item.payload,
      })
    }
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Erro inesperado ao importar atendimentos.'
    result.ignorados.push(mensagem)
    await finalizarLoteImportacaoAtendimentos(loteId, result, analysis, 'falhou', mensagem)
    throw err
  }

  const finalStatus = result.gravados === 0 && result.ignorados.length
    ? 'falhou'
    : result.ignorados.length
      ? 'parcial'
      : 'concluido'

  await finalizarLoteImportacaoAtendimentos(loteId, result, analysis, finalStatus)

  revalidatePath('/modulos/ciclo')
  revalidatePath('/modulos/ciclo/atendimento')
  revalidatePath('/modulos/ciclo/importacoes')
  return result
}
