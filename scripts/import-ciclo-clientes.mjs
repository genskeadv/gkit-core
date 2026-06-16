import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'
import { readArg, readLocalEnv } from './env.mjs'

const DEFAULT_SERVICOS_PATH = 'C:\\Users\\Genske\\Downloads\\servicos_e_nfs-e_465005727993774.xlsx'
const DEFAULT_FINANCAS_PATH = 'C:\\Users\\Genske\\Downloads\\financas_464417442073024.xlsx'
const DEFAULT_CARTEIRAS_PATH = 'D:\\Meu Drive\\DISTRIBUIÇÃO DE CARTEIRAS\\Carteiras 022026.xlsx'

const VALID_STATUS = new Set(['novo', 'implantacao', 'ativo', 'pausado', 'encerrado'])
const VALID_RISCO = new Set(['baixo', 'medio', 'alto', 'critico'])
const VALID_TEMPERATURA = new Set(['quente', 'neutro', 'frio'])

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

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '')
}

function nullable(value) {
  const text = String(value ?? '').trim()
  return text ? text : null
}

function parseMoney(value) {
  if (typeof value === 'number') return value
  const text = String(value ?? '').trim()
  if (!text) return 0
  return Number(text.replace(/\./g, '').replace(',', '.')) || 0
}

function excelDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const text = String(value ?? '').trim()
  return text ? text.slice(0, 10) : null
}

function normalizeEnum(value, valid, fallback) {
  const normalized = normalizeText(value).replace(/\s+/g, '_')
  return valid.has(normalized) ? normalized : fallback
}

function tipoClienteValue(value) {
  const normalized = normalizeText(value)
  if (normalized === 'pontual') return 'pontual'
  if (normalized === 'cobranca' || normalized === 'cobrança') return 'cobranca'
  return 'mensal'
}

async function readSheetRows(path, headerRow) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path)
  const sheet = workbook.worksheets[0]
  if (!sheet) throw new Error(`Planilha sem abas: ${path}`)

  const header = sheet.getRow(headerRow).values.slice(1).map((value) => String(value ?? '').trim())
  const rows = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return
    const record = {}
    let hasValue = false
    for (let index = 0; index < header.length; index += 1) {
      const key = header[index]
      if (!key) continue
      const raw = row.getCell(index + 1).value
      const value = raw && typeof raw === 'object' && 'text' in raw ? raw.text : raw
      if (value !== null && value !== undefined && String(value).trim()) hasValue = true
      record[key] = value
    }
    if (hasValue) rows.push(record)
  })

  return rows
}

function buildCarteiraNameMap(rows) {
  const map = new Map()
  for (const row of rows) {
    const cliente = nullable(row.Cliente)
    const carteira = nullable(row.Carteira)
    if (!cliente || !carteira) continue
    map.set(normalizeText(cliente), {
      cliente,
      carteira,
      tipo: nullable(row.Tipo),
    })
  }
  return map
}

function buildFinanceiroByCnpj(rows) {
  const map = new Map()
  for (const row of rows) {
    const cnpj = onlyDigits(row['Cliente (CNPJ/CPF)'])
    if (cnpj.length !== 14) continue

    const item = map.get(cnpj) ?? {
      cnpj,
      nomes: new Set(),
      categorias: new Set(),
      contratos: new Set(),
      tags: new Set(),
      totalLiquido: 0,
      totalRecebido: 0,
      totalAReceber: 0,
      receitas: 0,
      primeiraEmissao: null,
      ultimoVencimento: null,
    }

    for (const field of ['Cliente (Nome Fantasia)', 'Cliente (Razão Social)']) {
      const value = nullable(row[field])
      if (value) item.nomes.add(value)
    }
    for (const category of String(row.Categoria ?? '').split(',')) {
      const value = nullable(category)
      if (value) item.categorias.add(value)
    }
    for (const tag of String(row['Tags do Cliente'] ?? '').split(',')) {
      const value = nullable(tag)
      if (value) item.tags.add(value)
    }
    const contrato = nullable(row['Nº do Contrato de Venda'])
    if (contrato) item.contratos.add(contrato)

    item.totalLiquido += parseMoney(row['Valor Líquido'])
    item.totalRecebido += parseMoney(row['Valor Recebido'])
    item.totalAReceber += parseMoney(row['Valor a Receber'])
    item.receitas += 1

    const emissao = excelDate(row['Data de Emissão'])
    const vencimento = excelDate(row.Vencimento)
    if (emissao && (!item.primeiraEmissao || emissao < item.primeiraEmissao)) item.primeiraEmissao = emissao
    if (vencimento && (!item.ultimoVencimento || vencimento > item.ultimoVencimento)) item.ultimoVencimento = vencimento

    map.set(cnpj, item)
  }
  return map
}

function findCarteiraForNames(names, carteiraByClienteName) {
  for (const name of names) {
    const hit = carteiraByClienteName.get(normalizeText(name))
    if (hit) return hit
  }
  return null
}

function shouldImportServico(row, cnpj, financeiro, carteiraHit, includeAllCnpj) {
  if (includeAllCnpj) return true
  const tags = normalizeText(row.Tags)
  return tags.includes('cliente') || financeiro.has(cnpj) || Boolean(carteiraHit)
}

function buildCandidates(servicosRows, financeiroByCnpj, carteiraByClienteName, options) {
  const byCnpj = new Map()
  const ignored = []

  for (const [index, row] of servicosRows.entries()) {
    const sourceLine = index + 4
    const cnpj = onlyDigits(row['CNPJ / CPF'])
    if (cnpj.length !== 14) {
      ignored.push({ line: sourceLine, reason: 'documento_nao_cnpj', documento: nullable(row['CNPJ / CPF']) })
      continue
    }

    const financeiro = financeiroByCnpj.get(cnpj)
    const names = [
      nullable(row['Nome Fantasia / Nome Abreviado']),
      nullable(row['Razão Social / Nome Completo']),
      ...(financeiro ? [...financeiro.nomes] : []),
    ].filter(Boolean)
    const carteiraHit = findCarteiraForNames(names, carteiraByClienteName)

    if (!shouldImportServico(row, cnpj, financeiroByCnpj, carteiraHit, options.includeAllCnpj)) {
      ignored.push({ line: sourceLine, reason: 'nao_identificado_como_cliente', documento: cnpj, nome: names[0] ?? null })
      continue
    }

    const tags = String(row.Tags ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    byCnpj.set(cnpj, {
      cnpj,
      sourceLine,
      carteiraNome: carteiraHit?.carteira ?? options.defaultCarteira ?? null,
      tipoCarteira: carteiraHit?.tipo ?? null,
      nome: names[0] ?? 'Cliente sem nome',
      nomeFantasia: nullable(row['Nome Fantasia / Nome Abreviado']) ?? names[0] ?? 'Cliente sem nome',
      razaoSocial: nullable(row['Razão Social / Nome Completo']) ?? names[0] ?? null,
      email: nullable(row['E-mail para NF-e e Boleto']) ?? nullable(row['E-mail']),
      telefone: nullable(row.Telefone),
      cidade: nullable(row.Cidade)?.replace(/\s*\([A-Z]{2}\)\s*$/, '') ?? null,
      estado: nullable(row.Estado)?.toUpperCase().slice(0, 2) ?? null,
      contatoNome: nullable(row.Contato),
      tags,
      servicos: {
        situacao: nullable(row['Situação']),
        endereco: nullable(row.Endereço),
        bairro: nullable(row.Bairro),
        cep: nullable(row.CEP),
        inscricao_estadual: nullable(row['Inscrição Estadual']),
        inscricao_municipal: nullable(row['Inscrição Municipal']),
        tipo_atividade: nullable(row['Tipo de Atividade']),
        vendedor_padrao: nullable(row['Vendedor (padrão)']),
        faturamento_bloqueado: nullable(row['Faturamento Bloqueado']),
        credito_total: parseMoney(row['Crédito Total']),
        total_a_receber: parseMoney(row['Total a Receber']),
        credito_disponivel: parseMoney(row['Crédito Disponível']),
        inclusao: excelDate(row.Inclusão),
        ultima_alteracao: excelDate(row['Última Alteração']),
      },
      financeiro: financeiro
        ? {
            receitas: financeiro.receitas,
            categorias: [...financeiro.categorias],
            contratos: [...financeiro.contratos],
            tags: [...financeiro.tags],
            total_liquido: Number(financeiro.totalLiquido.toFixed(2)),
            total_recebido: Number(financeiro.totalRecebido.toFixed(2)),
            total_a_receber: Number(financeiro.totalAReceber.toFixed(2)),
            primeira_emissao: financeiro.primeiraEmissao,
            ultimo_vencimento: financeiro.ultimoVencimento,
          }
        : null,
    })
  }

  return { candidates: [...byCnpj.values()], ignored }
}

async function loadCarteiras(supabase, names, createMissing, apply) {
  const { data, error } = await supabase.schema('core').from('carteiras').select('id,nome,nome_normalizado,status')
  if (error) throw new Error(`Erro ao buscar carteiras: ${error.message}`)

  const map = new Map()
  for (const row of data ?? []) {
    map.set(normalizeText(row.nome), { id: row.id, nome: row.nome, status: row.status })
  }

  const missing = [...new Set(names.filter(Boolean))].filter((name) => !map.has(normalizeText(name)))
  if (createMissing && missing.length) {
    if (apply) {
      const payload = missing.map((nome) => ({
        nome,
        descricao: 'Criada pelo importador de clientes Ciclo.',
        status: 'ativo',
        metadata: { origem: 'scripts/import-ciclo-clientes.mjs' },
      }))
      const { data: inserted, error: insertError } = await supabase
        .schema('core')
        .from('carteiras')
        .insert(payload)
        .select('id,nome,status')

      if (insertError) throw new Error(`Erro ao criar carteiras: ${insertError.message}`)
      for (const row of inserted ?? []) map.set(normalizeText(row.nome), { id: row.id, nome: row.nome, status: row.status })
    } else {
      for (const nome of missing) map.set(normalizeText(nome), { id: null, nome, status: 'simular_criacao' })
    }
  }

  return { map, missing }
}

async function upsertContato(supabase, contato, apply) {
  if (!apply || !contato.nome) return false

  const query = supabase
    .schema('ciclo')
    .from('cliente_contatos')
    .select('id')
    .eq('cliente_id', contato.cliente_id)

  const existing = contato.email
    ? await query.eq('email', contato.email).maybeSingle()
    : await query.eq('nome', contato.nome).maybeSingle()

  if (existing.error) throw new Error(`Contato ${contato.nome}: ${existing.error.message}`)

  if (existing.data?.id) {
    const { error } = await supabase.schema('ciclo').from('cliente_contatos').update(contato).eq('id', existing.data.id)
    if (error) throw new Error(`Contato ${contato.nome}: ${error.message}`)
    return false
  }

  const { error } = await supabase.schema('ciclo').from('cliente_contatos').insert(contato)
  if (error) throw new Error(`Contato ${contato.nome}: ${error.message}`)
  return true
}

async function saveImportLog(supabase, result, apply) {
  if (!apply) return null
  const { data, error } = await supabase
    .schema('ciclo')
    .from('importacao_lotes')
    .insert({
      tipo: 'clientes_xlsx_script',
      status: result.ignorados.length ? 'parcial' : 'concluido',
      arquivo_nome: 'servicos_e_nfs-e + financas + carteiras',
      total_linhas: result.total,
      linhas_validas: result.validos,
      clientes_criados: result.criados,
      clientes_atualizados: result.atualizados,
      contatos_importados: result.contatos,
      linhas_ignoradas: result.ignorados.length,
      carteira_ids: [...new Set(result.carteiraIds)],
      resumo: {
        script: 'scripts/import-ciclo-clientes.mjs',
        dry_run: false,
        ignorados: result.ignorados.slice(0, 100),
      },
      finalizado_em: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    const missingLogTable = /schema cache|importacao_lotes|does not exist|not find the table/i.test(error.message)
    if (missingLogTable) {
      result.aviso = `Clientes importados, mas o log de lote nao foi registrado porque ciclo.importacao_lotes nao existe ou nao esta no schema cache: ${error.message}`
      return null
    }
    throw new Error(`Erro ao registrar lote: ${error.message}`)
  }
  return data.id
}

async function main() {
  const apply = flag('apply')
  const options = {
    apply,
    createCarteiras: flag('create-carteiras'),
    includeAllCnpj: flag('include-all-cnpj'),
    defaultCarteira: arg('default-carteira'),
    status: normalizeEnum(arg('status'), VALID_STATUS, 'novo'),
    risco: normalizeEnum(arg('risco'), VALID_RISCO, 'medio'),
    temperatura: normalizeEnum(arg('temperatura'), VALID_TEMPERATURA, 'neutro'),
    servicosPath: arg('servicos', DEFAULT_SERVICOS_PATH),
    financasPath: arg('financas', DEFAULT_FINANCAS_PATH),
    carteirasPath: arg('carteiras', DEFAULT_CARTEIRAS_PATH),
  }

  const env = readLocalEnv()
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.')
  }

  const [servicosRows, financasRows, carteirasRows] = await Promise.all([
    readSheetRows(options.servicosPath, 3),
    readSheetRows(options.financasPath, 3),
    readSheetRows(options.carteirasPath, 1),
  ])

  const carteiraByClienteName = buildCarteiraNameMap(carteirasRows)
  const financeiroByCnpj = buildFinanceiroByCnpj(financasRows)
  const { candidates, ignored } = buildCandidates(servicosRows, financeiroByCnpj, carteiraByClienteName, options)

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const carteiraNames = candidates.map((candidate) => candidate.carteiraNome).filter(Boolean)
  const { map: carteiras, missing: missingCarteiras } = await loadCarteiras(supabase, carteiraNames, options.createCarteiras, apply)

  const result = {
    ok: true,
    dryRun: !apply,
    total: candidates.length + ignored.length,
    validos: 0,
    criados: 0,
    atualizados: 0,
    contatos: 0,
    ignorados: [...ignored],
    carteirasNaoEncontradas: missingCarteiras,
    carteiraIds: [],
    amostras: [],
    loteId: null,
  }

  for (const candidate of candidates) {
    const carteira = candidate.carteiraNome ? carteiras.get(normalizeText(candidate.carteiraNome)) : null
    if (!carteira && !flag('allow-sem-carteira')) {
      result.ignorados.push({
        line: candidate.sourceLine,
        reason: 'carteira_nao_encontrada',
        documento: candidate.cnpj,
        nome: candidate.nome,
        carteira: candidate.carteiraNome,
      })
      continue
    }

    const existing = await supabase
      .schema('ciclo')
      .from('clientes')
      .select('id')
      .eq('cnpj_normalizado', candidate.cnpj)
      .maybeSingle()

    if (existing.error) throw new Error(`Cliente ${candidate.cnpj}: ${existing.error.message}`)

    const payload = {
      carteira_id: carteira?.id ?? null,
      administradora_id: null,
      nome: candidate.nome,
      nome_fantasia: candidate.nomeFantasia,
      razao_social: candidate.razaoSocial,
      documento: candidate.cnpj,
      email: candidate.email,
      telefone: candidate.telefone,
      cidade: candidate.cidade,
      estado: candidate.estado,
      pasta_url: null,
      observacoes: null,
      tipo_cliente: tipoClienteValue(candidate.tipoCarteira),
      status_operacional: options.status,
      score_atual: 75,
      risco_atual: options.risco,
      temperatura: options.temperatura,
      ativo: true,
      ultimo_movimento_em: new Date().toISOString(),
      metadata: {
        origem: 'omie_planilhas',
        importador: 'scripts/import-ciclo-clientes.mjs',
        carteira_planilha: candidate.carteiraNome,
        tipo_carteira_planilha: candidate.tipoCarteira,
        tags: candidate.tags,
        servicos: candidate.servicos,
        financeiro: candidate.financeiro,
      },
    }

    let clienteId = existing.data?.id ?? null
    if (apply) {
      const saved = clienteId
        ? await supabase.schema('ciclo').from('clientes').update(payload).eq('id', clienteId).select('id').single()
        : await supabase.schema('ciclo').from('clientes').insert(payload).select('id').single()

      if (saved.error) throw new Error(`Cliente ${candidate.cnpj}: ${saved.error.message}`)
      clienteId = saved.data.id

      if (candidate.contatoNome) {
        const inserted = await upsertContato(supabase, {
          cliente_id: clienteId,
          nome: candidate.contatoNome,
          tipo: 'contato_omie',
          cargo: null,
          email: candidate.email,
          telefone: candidate.telefone,
          principal: true,
          ativo: true,
          metadata: { origem: 'omie_servicos' },
        }, apply)
        if (inserted) result.contatos += 1
      }
    }

    result.validos += 1
    if (existing.data?.id) result.atualizados += 1
    else result.criados += 1
    if (carteira?.id) result.carteiraIds.push(carteira.id)

    if (result.amostras.length < 20) {
      result.amostras.push({
        acao: existing.data?.id ? 'atualizar' : 'criar',
        documento: candidate.cnpj,
        nome: candidate.nome,
        carteira: carteira?.nome ?? null,
        receitas: candidate.financeiro?.receitas ?? 0,
      })
    }
  }

  result.loteId = await saveImportLog(supabase, result, apply)
  result.ignorados = result.ignorados.slice(0, 200)

  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, message: error.message }, null, 2))
  process.exitCode = 1
})
