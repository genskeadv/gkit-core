import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'
import { readArg, readLocalEnv } from './env.mjs'

const DEFAULT_SOURCE = 'C:\\Users\\Genske\\Downloads\\Omie_Ordens_Servico_Extrajudicial_07_Ausentes.xlsx'
const DEFAULT_SHEET = 'Omie_Ordens_Servico'
const DEFAULT_HEADER_ROW = 5
const DEFAULT_COMPETENCIA = '2026-07-01'
const DEFAULT_PERIODO_INICIO = '2026-07-01'
const DEFAULT_PERIODO_FIM = '2026-07-31'
const DEFAULT_PREFIX = 'SIM-OMIE-20260720'

function flag(name) {
  return process.argv.includes(`--${name}`)
}

function arg(name, fallback = '') {
  return readArg(name) || fallback
}

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '')
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

function nullable(value) {
  const text = String(value ?? '').trim()
  return text ? text : null
}

function dateValue(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const text = String(value ?? '').trim()
  if (!text) return null
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
  return text.slice(0, 10)
}

function moneyValue(value) {
  if (typeof value === 'number') return Number(value.toFixed(2))
  const text = String(value ?? '').trim()
  if (!text) return 0
  const parsed = Number(text.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0
}

function findColumn(columns, ...needles) {
  const normalizedNeedles = needles.map(normalizeText)
  const column = columns.find((item) => {
    const normalized = normalizeText(item)
    return normalizedNeedles.every((needle) => normalized.includes(needle))
  })
  if (!column) throw new Error(`Coluna nao encontrada: ${needles.join(' / ')}`)
  return column
}

async function readOmieRows(source, sheetName, headerRow) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(source)
  const sheet = workbook.getWorksheet(sheetName)
  if (!sheet) throw new Error(`Aba nao encontrada: ${sheetName}`)

  const headers = sheet.getRow(headerRow).values.slice(1).map((value) => String(value ?? '').trim())
  const columns = headers.filter(Boolean)
  const clienteCol = findColumn(columns, 'cliente')
  const previsaoCol = findColumn(columns, 'previsao', 'faturamento')
  const categoriaCol = findColumn(columns, 'categoria')
  const dadosNotaCol = findColumn(columns, 'dados adicionais', 'nota fiscal')
  const tributoCol = findColumn(columns, 'tributacao', 'servico')
  const servicoMunicipalCol = findColumn(columns, 'codigo', 'servico municipal')
  const lc116Col = findColumn(columns, 'codigo', 'servico lc116')
  const quantidadeCol = findColumn(columns, 'quantidade')
  const valorCol = findColumn(columns, 'valor unitario')

  const rows = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return
    const record = {}
    let hasValue = false
    for (let index = 0; index < headers.length; index += 1) {
      const key = headers[index]
      if (!key) continue
      const raw = row.getCell(index + 1).value
      const value = raw && typeof raw === 'object' && 'text' in raw ? raw.text : raw
      if (value !== null && value !== undefined && String(value).trim()) hasValue = true
      record[key] = value
    }
    if (!hasValue) return
    const documento = onlyDigits(record[clienteCol])
    const valorUnitario = moneyValue(record[valorCol])
    if (!documento || valorUnitario <= 0) return
    rows.push({
      rowNumber,
      documento,
      previsao: dateValue(record[previsaoCol]),
      categoria: nullable(record[categoriaCol]),
      dadosNotaFiscal: nullable(record[dadosNotaCol]),
      tributacao: nullable(record[tributoCol]),
      codigoServicoMunicipal: String(record[servicoMunicipalCol] ?? '').trim(),
      codigoLc116: String(record[lc116Col] ?? '').trim(),
      quantidade: moneyValue(record[quantidadeCol]) || 1,
      valorUnitario,
    })
  })
  return rows
}

function clienteName(cliente) {
  return cliente?.nome || cliente?.nome_fantasia || cliente?.razao_social || 'Cliente sem nome'
}

function buildValidation(ordem, empresa) {
  const tomador = ordem.tomador_snapshot && typeof ordem.tomador_snapshot === 'object' ? ordem.tomador_snapshot : {}
  const erros = []
  const alertas = []
  if (!empresa) erros.push('Empresa emissora nao configurada.')
  if (empresa && !onlyDigits(empresa.cnpj)) erros.push('CNPJ da empresa emissora ausente.')
  if (empresa && !empresa.municipio) erros.push('Municipio da empresa emissora ausente.')
  if (!onlyDigits(tomador.documento)) erros.push('CPF/CNPJ do tomador ausente.')
  if (!String(tomador.email ?? '').trim()) alertas.push('E-mail fiscal do tomador ausente.')
  if (!String(tomador.cidade ?? '').trim() || !String(tomador.estado ?? '').trim()) alertas.push('Endereco fiscal do tomador incompleto.')
  if (Number(ordem.valor_unitario ?? ordem.valor_total ?? 0) <= 0) erros.push('Valor da OS precisa ser maior que zero.')
  return { ok: erros.length === 0, erros, alertas }
}

function buildNfsePayload(ordem, empresa) {
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
    tomador: ordem.tomador_snapshot,
    servico: {
      codigo: '03220',
      descricao: ordem.descricao_servico,
      item_lc116: '17.14',
      aliquota_iss: empresa?.aliquota_iss ?? null,
      iss_retido: empresa?.iss_retido_padrao ?? false,
      valor_servico: Number(ordem.valor_unitario ?? 0),
    },
    os: {
      id: ordem.id,
      numero: ordem.numero,
      competencia: ordem.competencia,
      data_vencimento: ordem.data_vencimento,
    },
  }
}

async function main() {
  const source = arg('source', DEFAULT_SOURCE)
  const sheet = arg('sheet', DEFAULT_SHEET)
  const prefix = arg('prefix', DEFAULT_PREFIX)
  const apply = flag('apply')
  const reset = flag('reset')
  const env = readLocalEnv()
  const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/^["']|["']$/g, '')
  const serviceRoleKey = (env.SUPABASE_SERVICE_ROLE_KEY ?? '').replace(/^["']|["']$/g, '')
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.')

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const rows = await readOmieRows(source, sheet, DEFAULT_HEADER_ROW)
  const docs = [...new Set(rows.map((row) => row.documento))]
  const [clientesResult, empresasResult, existingResult] = await Promise.all([
    supabase
      .schema('ciclo')
      .from('clientes')
      .select('id,nome,nome_fantasia,razao_social,documento,email,telefone,cidade,estado,carteira_id,tipo_cliente,tipo_pessoa,ativo')
      .limit(5000),
    supabase
      .schema('gkit_fat')
      .from('empresas_emissoras')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .limit(1),
    supabase
      .schema('gkit_fat')
      .from('ordens_servico')
      .select('id,numero')
      .like('numero', `${prefix}-%`)
      .limit(1000),
  ])

  if (clientesResult.error) throw new Error(clientesResult.error.message)
  if (empresasResult.error) throw new Error(empresasResult.error.message)
  if (existingResult.error) throw new Error(existingResult.error.message)

  const clientesByDoc = new Map(
    (clientesResult.data ?? [])
      .map((cliente) => [onlyDigits(cliente.documento), cliente])
      .filter(([documento]) => documento),
  )
  const matched = rows.map((row, index) => ({ row, index, cliente: clientesByDoc.get(row.documento) })).filter((item) => item.cliente)
  const missing = rows.filter((row) => !clientesByDoc.has(row.documento))
  const empresa = (empresasResult.data ?? [])[0] ?? null

  if (reset && apply && (existingResult.data ?? []).length) {
    const ids = existingResult.data.map((row) => row.id)
    const deleteEvents = await supabase.schema('gkit_fat').from('nfse_eventos').delete().in('ordem_servico_id', ids)
    if (deleteEvents.error) throw new Error(deleteEvents.error.message)
    const deleteOrdens = await supabase.schema('gkit_fat').from('ordens_servico').delete().in('id', ids)
    if (deleteOrdens.error) throw new Error(deleteOrdens.error.message)
  }

  const existingNumbers = new Set(reset && apply ? [] : (existingResult.data ?? []).map((row) => row.numero))
  const payloads = matched
    .map(({ row, index, cliente }) => {
      const numero = `${prefix}-${String(index + 1).padStart(2, '0')}`
      const descricao = 'Servicos advocaticios - repasse de cobranca extrajudicial'
      return {
        numero,
        cliente_id: cliente.id,
        tomador_id: null,
        carteira_id: cliente.carteira_id ?? null,
        origem: 'importacao',
        competencia: DEFAULT_COMPETENCIA,
        periodo_inicio: DEFAULT_PERIODO_INICIO,
        periodo_fim: DEFAULT_PERIODO_FIM,
        data_prevista_faturamento: row.previsao,
        data_vencimento: row.previsao,
        servico_codigo: '03220',
        descricao_servico: descricao,
        quantidade: row.quantidade,
        valor_unitario: row.valorUnitario,
        situacao_operacional: 'rascunho',
        situacao_fiscal: 'nao_enviada',
        situacao_financeira: 'prevista',
        tomador_snapshot: cliente,
        servico_snapshot: {
          codigo: '03220',
          descricao: 'Advocacia',
          descricao_servico: descricao,
          item_lc116: row.codigoLc116 || '17.14',
          codigo_servico_municipal: row.codigoServicoMunicipal || '03220',
          tributacao: row.tributacao,
          categoria_omie: row.categoria,
          valor_unitario: row.valorUnitario,
          dados_adicionais_nota_fiscal: row.dadosNotaFiscal,
          origem_planilha: source,
          linha_planilha: row.rowNumber,
        },
        observacoes: [
          'Simulacao gerada a partir da planilha Omie de OS ausentes.',
          row.categoria ? `Categoria Omie: ${row.categoria}.` : '',
          row.dadosNotaFiscal ? `Dados adicionais da NF: ${row.dadosNotaFiscal}` : '',
        ].filter(Boolean).join('\n\n'),
      }
    })
    .filter((payload) => !existingNumbers.has(payload.numero))

  let inserted = []
  let prepared = []
  if (apply && payloads.length) {
    const insertResult = await supabase.schema('gkit_fat').from('ordens_servico').insert(payloads).select('*')
    if (insertResult.error) throw new Error(insertResult.error.message)
    inserted = insertResult.data ?? []

    for (const ordem of inserted) {
      const validacao = buildValidation(ordem, empresa)
      const nfsePayload = buildNfsePayload(ordem, empresa)
      const statusNovo = validacao.ok ? 'manual_pendente' : 'nao_configurada'
      const updateResult = await supabase
        .schema('gkit_fat')
        .from('ordens_servico')
        .update({
          empresa_emissora_id: empresa?.id ?? null,
          serie_rps: empresa?.serie_rps ?? null,
          numero_rps: empresa?.proximo_numero_rps ? String(empresa.proximo_numero_rps) : null,
          nfse_payload: nfsePayload,
          validacao_fiscal: validacao,
          situacao_fiscal: statusNovo,
          situacao_operacional: validacao.ok ? 'pronta_para_faturar' : 'em_conferencia',
        })
        .eq('id', ordem.id)
        .select('id,numero,situacao_operacional,situacao_fiscal,validacao_fiscal,valor_total')
        .single()
      if (updateResult.error) throw new Error(updateResult.error.message)

      const eventResult = await supabase.schema('gkit_fat').from('nfse_eventos').insert({
        ordem_servico_id: ordem.id,
        tipo_evento: validacao.ok ? 'manual_pendente' : 'pre_nota',
        status_fiscal_anterior: ordem.situacao_fiscal,
        status_fiscal_novo: statusNovo,
        payload: { nfse_payload: nfsePayload, validacao },
        observacoes: validacao.ok ? 'Simulacao Omie pronta para emissao manual.' : 'Simulacao Omie com pendencias de configuracao fiscal.',
      })
      if (eventResult.error) throw new Error(eventResult.error.message)
      prepared.push(updateResult.data)
    }
  }

  const totalPlanilha = rows.reduce((sum, row) => sum + row.valorUnitario, 0)
  const totalMatched = matched.reduce((sum, item) => sum + item.row.valorUnitario, 0)
  const totalInserted = inserted.reduce((sum, item) => sum + Number(item.valor_total ?? item.valor_unitario ?? 0), 0)
  console.log(JSON.stringify({
    source,
    apply,
    reset,
    prefix,
    rows: rows.length,
    unique_docs: docs.length,
    total_planilha: Number(totalPlanilha.toFixed(2)),
    matched_clientes: matched.length,
    total_reconciliado: Number(totalMatched.toFixed(2)),
    missing_clientes: missing.map((row) => row.documento),
    existing_with_prefix: existingResult.data?.length ?? 0,
    novos_payloads: payloads.length,
    inserted: inserted.length,
    prepared: prepared.length,
    total_inserted: Number(totalInserted.toFixed(2)),
    empresa_emissora: empresa ? {
      nome: empresa.nome,
      ambiente: empresa.ambiente,
      tem_cnpj: Boolean(empresa.cnpj),
      tem_municipio: Boolean(empresa.municipio),
    } : null,
    fiscal_status: prepared.reduce((acc, item) => {
      acc[item.situacao_fiscal] = (acc[item.situacao_fiscal] ?? 0) + 1
      return acc
    }, {}),
    validation_errors: [...new Set(prepared.flatMap((item) => item.validacao_fiscal?.erros ?? []))],
    sample_ordens: prepared.slice(0, 5).map((item) => ({
      numero: item.numero,
      valor_total: Number(item.valor_total ?? 0),
      situacao_operacional: item.situacao_operacional,
      situacao_fiscal: item.situacao_fiscal,
    })),
    sample_clientes: matched.slice(0, 5).map((item) => ({
      documento: item.row.documento,
      cliente: clienteName(item.cliente),
      valor: item.row.valorUnitario,
    })),
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
