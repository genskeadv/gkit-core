import { statSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import { readArg, readLocalEnv } from './env.mjs'

const DEFAULT_FILE = 'C:\\Users\\Genske\\Downloads\\Processo(1).xlsx'

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
    .replace(/\s+/g, ' ')
}

function normalizeHeader(value) {
  return normalizeText(value).replace(/^\uFEFF/, '')
}

function rowValue(row, ...keys) {
  for (const key of keys) {
    const value = row[normalizeHeader(key)]
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim()
  }
  return null
}

function slugKey(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140)
}

function cadastroSlug(value) {
  return slugKey(value).slice(0, 120) || 'sem-tipo'
}

function titleCase(value) {
  return String(value ?? '')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function astreaCode(titulo, numero) {
  const fromTitle = String(titulo ?? '').match(/\bATE\d+\b/i)?.[0]
  if (fromTitle) return fromTitle.toUpperCase()
  const fromNumber = String(numero ?? '').match(/\bATE\d+\b/i)?.[0]
  return fromNumber ? fromNumber.toUpperCase() : null
}

function sourceKey(codigo, url, titulo, cliente, dataCriacao) {
  if (codigo) return `astrea:${codigo}`
  if (url) return `astrea-url:${url}`
  return `astrea-row:${slugKey(`${titulo}-${cliente}-${dataCriacao ?? 'sem-data'}`)}`
}

function splitTags(value) {
  if (!value) return []
  return value
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function moneyValue(value) {
  if (!value) return null
  const normalized = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function excelDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString()
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      return new Date(Date.UTC(
        parsed.y,
        parsed.m - 1,
        parsed.d,
        parsed.H ?? 0,
        parsed.M ?? 0,
        Math.floor(parsed.S ?? 0),
      )).toISOString()
    }
  }

  const raw = String(value ?? '').trim()
  if (!raw) return null

  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/)
  if (br) {
    const year = Number(br[3].length === 2 ? `20${br[3]}` : br[3])
    const date = new Date(Date.UTC(year, Number(br[2]) - 1, Number(br[1]), Number(br[4] ?? 0), Number(br[5] ?? 0)))
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }

  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function excelDateOnly(value) {
  const iso = excelDate(value)
  return iso ? iso.slice(0, 10) : null
}

function formatCodigoPublico(date) {
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = String(date.getUTCFullYear()).slice(-2)
  const hour = String(date.getUTCHours()).padStart(2, '0')
  const minute = String(date.getUTCMinutes()).padStart(2, '0')
  return `ATE${day}${month}${year}${hour}${minute}`
}

function reserveCodigoPublico(baseIso, reservedCodes) {
  const parsed = baseIso ? new Date(baseIso) : new Date()
  const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed

  for (let offset = 0; offset < 525600; offset += 1) {
    const codigo = formatCodigoPublico(new Date(base.getTime() + offset * 60_000))
    if (!reservedCodes.has(codigo)) {
      reservedCodes.add(codigo)
      return codigo
    }
  }

  throw new Error('Nao foi possivel gerar codigo unico para o atendimento.')
}

function inferAtendimentoTipo(titulo, row) {
  const parts = String(titulo ?? '').split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean)
  const afterCode = /^ATE\d+$/i.test(parts[0] ?? '') ? parts[1] : parts[0]
  return afterCode || rowValue(row, 'Objeto') || rowValue(row, 'Materia') || rowValue(row, 'Tipo') || 'Atendimento consultivo'
}

function tarefaTipoFromAtendimentoTipo(tipo) {
  const normalized = normalizeText(tipo)
  if (normalized.startsWith('analise de ')) return titleCase(`analisar ${normalized.slice('analise de '.length)}`)
  if (normalized.startsWith('analise ')) return titleCase(`analisar ${normalized.slice('analise '.length)}`)
  if (normalized.startsWith('notificacao')) return 'Notificar'
  if (normalized.startsWith('contranotificacao')) return 'Contranotificar'
  if (normalized.startsWith('cobranca')) return 'Cobrar'
  if (normalized.startsWith('revisao de ')) return titleCase(`revisar ${normalized.slice('revisao de '.length)}`)
  return titleCase(tipo)
}

function cleanPayload(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
}

function readRows(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true })
  const sheetName = workbook.SheetNames.includes('Processos') ? 'Processos' : workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) throw new Error(`Planilha sem abas: ${filePath}`)

  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true })
  return rawRows.map((raw, index) => ({
    linha: index + 2,
    row: Object.fromEntries(Object.entries(raw).map(([key, value]) => [normalizeHeader(key), value])),
  }))
}

async function fetchAll(supabase, table, columns) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.schema('gkit_ate').from(table).select(columns).range(from, from + 999)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return rows
}

async function ensureTarefaTipo(supabase, cache, nome) {
  const slug = cadastroSlug(nome)
  if (cache.has(slug)) return cache.get(slug)

  const found = await supabase
    .schema('gkit_ate')
    .from('tarefa_tipos')
    .select('id,descricao_padrao')
    .eq('slug', slug)
    .maybeSingle()

  if (found.error) throw found.error
  if (found.data?.id) {
    const value = {
      id: String(found.data.id),
      descricao: String(found.data.descricao_padrao ?? nome),
    }
    cache.set(slug, value)
    return value
  }

  const inserted = await supabase
    .schema('gkit_ate')
    .from('tarefa_tipos')
    .insert({ nome, slug, descricao_padrao: nome })
    .select('id,descricao_padrao')
    .single()

  if (inserted.error) throw inserted.error
  const value = {
    id: String(inserted.data.id),
    descricao: String(inserted.data.descricao_padrao ?? nome),
  }
  cache.set(slug, value)
  return value
}

async function ensureAtendimentoTipo(supabase, cache, nome, tarefaTipoId) {
  const slug = cadastroSlug(nome)
  if (cache.has(slug)) return cache.get(slug)

  const found = await supabase
    .schema('gkit_ate')
    .from('atendimento_tipos')
    .select('id,tarefa_tipo_id')
    .eq('slug', slug)
    .maybeSingle()

  if (found.error) throw found.error
  if (found.data?.id) {
    if (!found.data.tarefa_tipo_id) {
      const { error } = await supabase
        .schema('gkit_ate')
        .from('atendimento_tipos')
        .update({ tarefa_tipo_id: tarefaTipoId })
        .eq('id', found.data.id)
      if (error) throw error
    }
    const value = String(found.data.id)
    cache.set(slug, value)
    return value
  }

  const inserted = await supabase
    .schema('gkit_ate')
    .from('atendimento_tipos')
    .insert({ nome, slug, tarefa_tipo_id: tarefaTipoId })
    .select('id')
    .single()

  if (inserted.error) throw inserted.error
  const value = String(inserted.data.id)
  cache.set(slug, value)
  return value
}

function prepareRows(rows, existingBySource, reservedCodes) {
  const prepared = []
  const ignored = []

  for (const { linha, row } of rows) {
    const titulo = rowValue(row, 'Titulo')
    const cliente = rowValue(row, 'Cliente')

    if (!titulo || !cliente) {
      ignored.push({ linha, motivo: 'titulo_ou_cliente_ausente' })
      continue
    }

    const numero = rowValue(row, 'Numero')
    const codigo = astreaCode(titulo, numero)
    const url = rowValue(row, 'URL do Processo')
    const dataCriacao = excelDate(row[normalizeHeader('Data de Criacao')])
    const dataEncerramento = excelDate(row[normalizeHeader('Data de Encerramento')])
    const key = sourceKey(codigo, url, titulo, cliente, dataCriacao)
    const exists = existingBySource.has(key)
    const existingCodigo = existingBySource.get(key)
    const codigoPublico = existingCodigo ?? reserveCodigoPublico(dataCriacao, reservedCodes)
    const status = dataEncerramento ? 'encerrado' : 'aberto'
    const atendimentoTipoNome = inferAtendimentoTipo(titulo, row)
    const tarefaTipoNome = tarefaTipoFromAtendimentoTipo(atendimentoTipoNome)
    const prazoFinalizacao = excelDateOnly(row[normalizeHeader('Data de Encerramento')])

    prepared.push({
      linha,
      sourceKey: key,
      codigoPublico,
      atendimentoTipoNome,
      tarefaTipoNome,
      tarefaDescricao: tarefaTipoNome,
      responsavel: rowValue(row, 'Responsavel'),
      cliente,
      titulo,
      status,
      dataEncerramento,
      prazoFinalizacao,
      acao: exists ? 'atualizar' : 'criar',
      payload: cleanPayload({
        source_key: key,
        codigo_publico: exists && existingCodigo ? undefined : codigoPublico,
        astrea_codigo: codigo,
        tipo: atendimentoTipoNome,
        titulo,
        papel_cliente: rowValue(row, 'Papel do cliente'),
        cliente_nome: cliente,
        outros_clientes: rowValue(row, 'Outros clientes'),
        outros_envolvidos: rowValue(row, 'Outros envolvidos'),
        pasta: rowValue(row, 'Pasta'),
        acao: rowValue(row, 'Acao'),
        numero,
        data_distribuicao: excelDateOnly(row[normalizeHeader('Data de distribuicao')]),
        objeto: rowValue(row, 'Objeto'),
        observacoes: rowValue(row, 'Observacoes'),
        materia: rowValue(row, 'Materia'),
        detalhes: rowValue(row, 'Detalhes'),
        valor_original: moneyValue(rowValue(row, 'Valor original')),
        valor_total_envolvido: moneyValue(rowValue(row, 'Valor total envolvido')),
        valor_total_provisao: moneyValue(rowValue(row, 'Valor total da provisao')),
        valor_causa: moneyValue(rowValue(row, 'Valor da causa')),
        valor_condenacao: moneyValue(rowValue(row, 'Valor da condenacao')),
        decisao_processo: rowValue(row, 'Decisao do processo'),
        resultado_processo: rowValue(row, 'Resultado do processo'),
        etiquetas: splitTags(rowValue(row, 'Etiquetas')),
        data_criacao: dataCriacao,
        prazo_finalizacao: prazoFinalizacao,
        data_encerramento: dataEncerramento,
        data_ultimo_historico: excelDate(row[normalizeHeader('Data do ultimo historico')]),
        ultimo_historico: rowValue(row, 'Descricao do ultimo historico'),
        instancia_original: rowValue(row, 'Instancia Original'),
        instancia_atual: rowValue(row, 'Instancia Atual'),
        url_processo: url,
        numero_juizo: rowValue(row, 'Numero do Juizo'),
        vara: rowValue(row, 'Vara'),
        foro: rowValue(row, 'Foro'),
        responsavel: rowValue(row, 'Responsavel'),
        acesso: rowValue(row, 'Acesso'),
        status,
        metadata: { origem: 'scripts/import-gkit-ate-astrea.mjs' },
      }),
    })
  }

  return { prepared, ignored }
}

function summarize(prepared, ignored, gravados = 0) {
  const count = (items, predicate) => items.filter(predicate).length
  const top = (field) => Object.entries(prepared.reduce((acc, item) => {
    const key = item[field] || 'Sem informacao'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 10)

  return {
    validos: prepared.length,
    gravados,
    criar: count(prepared, (item) => item.acao === 'criar'),
    atualizar: count(prepared, (item) => item.acao === 'atualizar'),
    abertos: count(prepared, (item) => item.status === 'aberto'),
    encerrados: count(prepared, (item) => item.status === 'encerrado'),
    clientes: new Set(prepared.map((item) => item.cliente)).size,
    tiposAtendimento: new Set(prepared.map((item) => item.atendimentoTipoNome)).size,
    tiposTarefa: new Set(prepared.map((item) => item.tarefaTipoNome)).size,
    ignorados: ignored.length,
    topResponsaveis: top('responsavel'),
    topTipos: top('atendimentoTipoNome'),
  }
}

async function createLote(supabase, filePath, total, prepared, ignored) {
  const stats = statSync(filePath)
  const { data, error } = await supabase
    .schema('gkit_ate')
    .from('import_lotes')
    .insert({
      arquivo_nome: filePath.split(/[\\/]/).pop(),
      arquivo_tamanho: stats.size,
      total_linhas: total,
      linhas_validas: prepared.length,
      linhas_ignoradas: ignored.length,
      metadata: { origem: 'scripts/import-gkit-ate-astrea.mjs', arquivo: filePath },
    })
    .select('id')
    .single()

  if (error) throw error
  return String(data.id)
}

async function registerItem(supabase, payload) {
  const { error } = await supabase.schema('gkit_ate').from('import_itens').insert(payload)
  if (error) throw error
}

async function finalizeLote(supabase, loteId, result, status, erro = null) {
  const { error } = await supabase
    .schema('gkit_ate')
    .from('import_lotes')
    .update({
      status,
      atendimentos_criados: result.criados,
      atendimentos_atualizados: result.atualizados,
      linhas_ignoradas: result.ignorados,
      erro,
      finalizado_em: new Date().toISOString(),
    })
    .eq('id', loteId)

  if (error) throw error
}

async function applyImport(supabase, filePath, rows, prepared, ignored) {
  const loteId = await createLote(supabase, filePath, rows.length, prepared, ignored)
  const result = { loteId, gravados: 0, criados: 0, atualizados: 0, ignorados: ignored.length }
  const tarefaTipoCache = new Map()
  const atendimentoTipoCache = new Map()

  for (const item of ignored) {
    await registerItem(supabase, {
      lote_id: loteId,
      linha: item.linha,
      acao: 'ignorar',
      status: 'ignorado',
      mensagem: item.motivo,
    })
  }

  try {
    for (const item of prepared) {
      const tarefaTipo = await ensureTarefaTipo(supabase, tarefaTipoCache, item.tarefaTipoNome)
      const atendimentoTipoId = await ensureAtendimentoTipo(supabase, atendimentoTipoCache, item.atendimentoTipoNome, tarefaTipo.id)
      const saved = await supabase
        .schema('gkit_ate')
        .from('atendimentos')
        .upsert(cleanPayload({
          ...item.payload,
          atendimento_tipo_id: atendimentoTipoId,
        }), { onConflict: 'source_key' })
        .select('id,source_key')
        .single()

      if (saved.error) throw saved.error

      const atendimentoId = String(saved.data.id)
      const taskStatus = item.status === 'encerrado' ? 'concluida' : 'pendente'
      const task = await supabase
        .schema('gkit_ate')
        .from('tarefas')
        .upsert({
          atendimento_id: atendimentoId,
          tarefa_tipo_id: tarefaTipo.id,
          source_key: `initial:${item.sourceKey}`,
          descricao: tarefaTipo.descricao || item.tarefaDescricao,
          responsavel: item.responsavel,
          data_prevista: item.prazoFinalizacao,
          data_conclusao: item.status === 'encerrado' ? item.dataEncerramento : null,
          status: taskStatus,
          origem: 'astrea_tipo_atendimento',
          metadata: {
            atendimento_tipo: item.atendimentoTipoNome,
            tarefa_tipo: item.tarefaTipoNome,
          },
        }, { onConflict: 'atendimento_id,source_key' })

      if (task.error) throw task.error

      result.gravados += 1
      if (item.acao === 'criar') result.criados += 1
      if (item.acao === 'atualizar') result.atualizados += 1

      await registerItem(supabase, {
        lote_id: loteId,
        atendimento_id: atendimentoId,
        linha: item.linha,
        source_key: item.sourceKey,
        acao: item.acao,
        status: 'sucesso',
        cliente_nome: item.cliente,
        titulo: item.titulo,
        mensagem: `${item.status} - ${item.responsavel ?? 'sem responsavel'}`,
        payload: item.payload,
      })

      if (result.gravados % 100 === 0) {
        console.error(`Importados ${result.gravados}/${prepared.length} atendimentos...`)
      }
    }
  } catch (error) {
    await finalizeLote(supabase, loteId, result, 'falhou', error.message)
    throw error
  }

  const status = result.gravados === 0 && result.ignorados ? 'falhou' : result.ignorados ? 'parcial' : 'concluido'
  await finalizeLote(supabase, loteId, result, status)
  return result
}

async function verify(supabase) {
  const [atendimentos, tarefas, abertosSemTarefa, lotes] = await Promise.all([
    supabase.schema('gkit_ate').from('atendimentos').select('id', { count: 'exact', head: true }),
    supabase.schema('gkit_ate').from('tarefas').select('id', { count: 'exact', head: true }),
    supabase
      .schema('gkit_ate')
      .from('atendimentos')
      .select('id,status')
      .eq('status', 'aberto')
      .limit(5000),
    supabase
      .schema('gkit_ate')
      .from('import_lotes')
      .select('id,status,total_linhas,linhas_validas,atendimentos_criados,atendimentos_atualizados,linhas_ignoradas,finalizado_em')
      .order('criado_em', { ascending: false })
      .limit(1),
  ])

  if (atendimentos.error) throw atendimentos.error
  if (tarefas.error) throw tarefas.error
  if (abertosSemTarefa.error) throw abertosSemTarefa.error
  if (lotes.error) throw lotes.error

  let openWithoutTask = 0
  const openRows = abertosSemTarefa.data ?? []
  if (openRows.length) {
    const ids = openRows.map((item) => item.id)
    const openTasks = await supabase
      .schema('gkit_ate')
      .from('tarefas')
      .select('atendimento_id')
      .in('atendimento_id', ids)
      .in('status', ['pendente', 'em_andamento'])
      .limit(10000)
    if (openTasks.error) throw openTasks.error
    const withTask = new Set((openTasks.data ?? []).map((item) => item.atendimento_id))
    openWithoutTask = ids.filter((id) => !withTask.has(id)).length
  }

  return {
    atendimentos: atendimentos.count,
    tarefas: tarefas.count,
    atendimentosAbertosSemTarefaAberta: openWithoutTask,
    ultimoLote: lotes.data?.[0] ?? null,
  }
}

async function main() {
  const filePath = arg('file', DEFAULT_FILE)
  const env = readLocalEnv()
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.')
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const rows = readRows(filePath)
  const [existingAtendimentos, allAtendimentos] = await Promise.all([
    fetchAll(supabase, 'atendimentos', 'source_key,codigo_publico'),
    fetchAll(supabase, 'atendimentos', 'codigo_publico'),
  ])
  const existingBySource = new Map(existingAtendimentos.map((row) => [
    String(row.source_key),
    row.codigo_publico ? String(row.codigo_publico) : null,
  ]))
  const reservedCodes = new Set(allAtendimentos.map((row) => String(row.codigo_publico)).filter(Boolean))
  const { prepared, ignored } = prepareRows(rows, existingBySource, reservedCodes)
  const dryRun = !flag('apply')
  const result = dryRun ? null : await applyImport(supabase, filePath, rows, prepared, ignored)
  const verification = dryRun ? null : await verify(supabase)

  console.log(JSON.stringify({
    ok: true,
    dryRun,
    arquivo: filePath,
    linhas: rows.length,
    loteId: result?.loteId ?? null,
    resumo: summarize(prepared, ignored, result?.gravados ?? 0),
    importacao: result,
    verificacao: verification,
    ignorados: ignored.slice(0, 20),
    amostras: prepared.slice(0, 10).map((item) => ({
      linha: item.linha,
      acao: item.acao,
      sourceKey: item.sourceKey,
      codigoPublico: item.codigoPublico,
      titulo: item.titulo,
      cliente: item.cliente,
      responsavel: item.responsavel,
      status: item.status,
      atendimentoTipo: item.atendimentoTipoNome,
      tarefaTipo: item.tarefaTipoNome,
    })),
  }, null, 2))
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, message: error.message }, null, 2))
  process.exit(1)
})
