import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'
import { readArg, readLocalEnv } from './env.mjs'

const DEFAULT_PROCESSO_PATH = 'C:\\Users\\Genske\\Downloads\\Processo.xlsx'

function flag(name) {
  return process.argv.includes(`--${name}`)
}

function arg(name, fallback = '') {
  return readArg(name) || fallback
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function nameKeys(value) {
  const base = normalizeText(value)
  if (!base) return []
  const variants = new Set([base])
  variants.add(base.replace(/^(condominio|condominial|subcondominio|edificio)\s+/, '').trim())
  variants.add(base.replace(/^(condominio|condominial)\s+edificio\s+/, '').trim())
  variants.add(base.replace(/\s+subcondominio\s+/g, ' ').trim())
  variants.add(base.replace(/\s+setor\s+(residencial|moradia)\s*/g, ' ').trim())
  return [...variants].filter(Boolean)
}

function nullable(value) {
  const text = String(value ?? '').trim()
  return text ? text : null
}

function cellValue(value) {
  if (value && typeof value === 'object') {
    if ('text' in value) return value.text
    if ('result' in value) return value.result
    if ('richText' in value) return value.richText.map((item) => item.text).join('')
    if ('hyperlink' in value) return value.hyperlink
  }
  return value
}

function parseDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const text = nullable(value)
  if (!text) return null

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`

  return null
}

function parseTimestamp(value) {
  if (value instanceof Date) return value.toISOString()
  const text = nullable(value)
  if (!text) return null
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text
  const date = parseDate(text)
  return date ? `${date}T00:00:00-03:00` : null
}

function splitEtiquetas(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function tipoAtendimento(etiquetas) {
  const specific = etiquetas.find((item) => normalizeText(item) !== 'consultivo')
  return specific ?? etiquetas[0] ?? 'Sem etiqueta'
}

function astreaCodigo(title) {
  return nullable(title)?.match(/\bATE\d+\b/i)?.[0]?.toUpperCase() ?? null
}

function sourceKey(row, line) {
  const codigo = astreaCodigo(row.Titulo ?? row['Título'])
  if (codigo) return codigo
  return normalizeText(`${row['Título'] ?? ''}-${row.Cliente ?? ''}-${row['Data de Criação'] ?? ''}-${line}`)
}

async function readProcessos(path) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path)
  const sheet = workbook.getWorksheet('Processos') ?? workbook.worksheets[0]
  if (!sheet) throw new Error(`Planilha sem abas: ${path}`)

  const header = sheet.getRow(1).values.slice(1).map((value) => String(value ?? '').trim())
  const rows = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const record = {}
    let hasValue = false
    for (let index = 0; index < header.length; index += 1) {
      const key = header[index]
      if (!key) continue
      const value = cellValue(row.getCell(index + 1).value)
      if (value !== null && value !== undefined && String(value).trim()) hasValue = true
      record[key] = value
    }
    if (hasValue) rows.push({ line: rowNumber, record })
  })

  return rows
}

async function loadClienteMap(supabase) {
  const { data, error } = await supabase
    .schema('ciclo')
    .from('clientes')
    .select('id,carteira_id,nome,nome_fantasia,razao_social')
    .limit(2000)

  if (error) throw error

  const map = new Map()
  for (const cliente of data ?? []) {
    for (const name of [cliente.nome, cliente.nome_fantasia, cliente.razao_social]) {
      for (const key of nameKeys(name)) {
        if (key && !map.has(key)) map.set(key, { id: cliente.id, carteira_id: cliente.carteira_id })
      }
    }
  }
  return map
}

function findCliente(clienteNome, clienteMap) {
  for (const key of nameKeys(clienteNome)) {
    const hit = clienteMap.get(key)
    if (hit) return hit
  }
  return null
}

function buildPayload(rows, clienteMap) {
  const payloads = []
  const ignored = []

  for (const { line, record } of rows) {
    const titulo = nullable(record['Título'])
    const clienteNome = nullable(record.Cliente)
    const dataCriacao = parseDate(record['Data de Criação'])

    if (!titulo || !clienteNome) {
      ignored.push({ line, reason: 'sem_titulo_ou_cliente', titulo, cliente: clienteNome })
      continue
    }

    const etiquetas = splitEtiquetas(record.Etiquetas)
    const cliente = findCliente(clienteNome, clienteMap)
    const encerramento = parseTimestamp(record['Data de Encerramento'])

    payloads.push({
      source_key: sourceKey(record, line),
      astrea_codigo: astreaCodigo(titulo),
      titulo,
      cliente_nome: clienteNome,
      cliente_id: cliente?.id ?? null,
      carteira_id: cliente?.carteira_id ?? null,
      responsavel: nullable(record['Responsável']),
      etiquetas,
      tipo_atendimento: tipoAtendimento(etiquetas),
      status: encerramento ? 'encerrado' : 'aberto',
      data_criacao: dataCriacao,
      data_encerramento: encerramento,
      data_ultimo_historico: parseDate(record['Data do último histórico']),
      objeto: nullable(record.Objeto),
      ultimo_historico: nullable(record['Descrição do último histórico']),
      url_processo: nullable(record['URL do Processo']),
      raw: record,
      imported_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  return { payloads, ignored }
}

function summarize(payloads) {
  const byStatus = new Map()
  const byResponsavel = new Map()
  const byTipo = new Map()
  let vinculados = 0

  for (const item of payloads) {
    byStatus.set(item.status, (byStatus.get(item.status) ?? 0) + 1)
    byResponsavel.set(item.responsavel ?? 'Sem responsavel', (byResponsavel.get(item.responsavel ?? 'Sem responsavel') ?? 0) + 1)
    byTipo.set(item.tipo_atendimento, (byTipo.get(item.tipo_atendimento) ?? 0) + 1)
    if (item.cliente_id) vinculados += 1
  }

  const top = (map) => [...map.entries()]
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  return {
    total: payloads.length,
    vinculados,
    semVinculoCliente: payloads.length - vinculados,
    status: Object.fromEntries(byStatus),
    topResponsaveis: top(byResponsavel),
    topTipos: top(byTipo),
  }
}

async function upsertInChunks(supabase, payloads) {
  let count = 0
  for (let index = 0; index < payloads.length; index += 200) {
    const chunk = payloads.slice(index, index + 200)
    const { error } = await supabase
      .schema('ciclo')
      .from('atendimentos_consultivos')
      .upsert(chunk, { onConflict: 'source_key' })
    if (error) throw error
    count += chunk.length
  }
  return count
}

async function main() {
  const env = readLocalEnv()
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const path = arg('file', DEFAULT_PROCESSO_PATH)
  const rows = await readProcessos(path)
  const clienteMap = await loadClienteMap(supabase)
  const { payloads, ignored } = buildPayload(rows, clienteMap)
  const dryRun = !flag('apply')
  const gravados = dryRun ? 0 : await upsertInChunks(supabase, payloads)

  console.log(JSON.stringify({
    ok: true,
    dryRun,
    arquivo: path,
    linhas: rows.length,
    validos: payloads.length,
    gravados,
    ignorados: ignored,
    resumo: summarize(payloads),
    amostras: payloads.slice(0, 10).map((item) => ({
      source_key: item.source_key,
      cliente: item.cliente_nome,
      responsavel: item.responsavel,
      tipo: item.tipo_atendimento,
      status: item.status,
      data_criacao: item.data_criacao,
      carteira_id: item.carteira_id,
    })),
  }, null, 2))
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, message: error.message }, null, 2))
  process.exit(1)
})
