'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type PreparedAtendimentoRow = {
  linha: number
  payload: Record<string, unknown>
  sourceKey: string
  codigoPublico: string | null
  codigo: string | null
  titulo: string
  cliente: string
  responsavel: string | null
  status: 'aberto' | 'encerrado'
  dataCriacao: string | null
  prazoFinalizacao: string | null
  atendimentoTipoNome: string
  tarefaTipoNome: string
  tarefaDescricao: string
  acao: 'criar' | 'atualizar'
}

export type PreviewGkitAteImport = {
  total: number
  validas: number
  criar: number
  atualizar: number
  abertos: number
  encerrados: number
  clientes: number
  ignorados: string[]
  amostras: Array<{
    linha: number
    acao: 'criar' | 'atualizar'
    sourceKey: string
    codigoPublico: string | null
    codigo: string | null
    titulo: string
    cliente: string
    responsavel: string | null
    status: 'aberto' | 'encerrado'
    atendimentoTipo: string
    tarefaTipo: string
  }>
}

export type ImportGkitAteResult = {
  total: number
  gravados: number
  criados: number
  atualizados: number
  ignorados: string[]
  loteId?: string | null
}

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

function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeHeader(value: unknown) {
  return normalizeText(value).replace(/^\uFEFF/, '')
}

function rowValue(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeHeader(key)]
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim()
  }
  return null
}

function splitTags(value: string | null) {
  if (!value) return []
  return value
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function astreaCode(titulo: string, numero: string | null) {
  const fromTitle = titulo.match(/\bATE\d+\b/i)?.[0]
  if (fromTitle) return fromTitle.toUpperCase()
  const fromNumber = numero?.match(/\bATE\d+\b/i)?.[0]
  return fromNumber ? fromNumber.toUpperCase() : null
}

function slugKey(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140)
}

function cadastroSlug(value: string) {
  return slugKey(value).slice(0, 120) || 'sem-tipo'
}

function sourceKey(codigo: string | null, url: string | null, titulo: string, cliente: string, dataCriacao: string | null) {
  if (codigo) return `astrea:${codigo}`
  if (url) return `astrea-url:${url}`
  return `astrea-row:${slugKey(`${titulo}-${cliente}-${dataCriacao ?? 'sem-data'}`)}`
}

function formatCodigoPublico(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = String(date.getUTCFullYear()).slice(-2)
  const hour = String(date.getUTCHours()).padStart(2, '0')
  const minute = String(date.getUTCMinutes()).padStart(2, '0')
  return `ATE${day}${month}${year}${hour}${minute}`
}

function reserveCodigoPublico(baseIso: string | null, reservedCodes: Set<string>) {
  const parsed = baseIso ? new Date(baseIso) : new Date()
  const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed

  for (let offset = 0; offset < 525600; offset += 1) {
    const candidateDate = new Date(base.getTime() + offset * 60_000)
    const codigo = formatCodigoPublico(candidateDate)
    if (!reservedCodes.has(codigo)) {
      reservedCodes.add(codigo)
      return codigo
    }
  }

  throw new Error('Nao foi possivel gerar codigo unico para o atendimento.')
}

function moneyValue(value: string | null) {
  if (!value) return null
  const normalized = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function cleanPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function inferAtendimentoTipo(titulo: string, row: Record<string, unknown>) {
  const parts = titulo.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean)
  const afterCode = parts[0]?.match(/^ATE\d+$/i) ? parts[1] : parts[0]
  return afterCode || rowValue(row, 'Objeto') || rowValue(row, 'Materia', 'Matéria') || rowValue(row, 'Tipo') || 'Atendimento consultivo'
}

function tarefaTipoFromAtendimentoTipo(tipo: string) {
  const normalized = normalizeText(tipo)
  if (normalized.startsWith('analise de ')) return titleCase(`analisar ${normalized.slice('analise de '.length)}`)
  if (normalized.startsWith('analise ')) return titleCase(`analisar ${normalized.slice('analise '.length)}`)
  if (normalized.startsWith('notificacao')) return 'Notificar'
  if (normalized.startsWith('contranotificacao')) return 'Contranotificar'
  if (normalized.startsWith('cobranca')) return 'Cobrar'
  if (normalized.startsWith('revisao de ')) return titleCase(`revisar ${normalized.slice('revisao de '.length)}`)
  return titleCase(tipo)
}

async function ensureTarefaTipo(nome: string, usuarioId: string) {
  const slug = cadastroSlug(nome)
  const found = await admin()
    .schema('gkit_ate')
    .from('tarefa_tipos')
    .select('id,descricao_padrao')
    .eq('slug', slug)
    .maybeSingle()

  if (found.error) throw new Error(found.error.message)
  if (found.data?.id) {
    return {
      id: String(found.data.id),
      descricao: String(found.data.descricao_padrao ?? nome),
    }
  }

  const { data, error } = await admin()
    .schema('gkit_ate')
    .from('tarefa_tipos')
    .insert({
      nome,
      slug,
      descricao_padrao: nome,
      criado_por: usuarioId,
      atualizado_por: usuarioId,
    })
    .select('id,descricao_padrao')
    .single()

  if (error) throw new Error(error.message)
  return {
    id: String(data.id),
    descricao: String(data.descricao_padrao ?? nome),
  }
}

async function ensureAtendimentoTipo(nome: string, tarefaTipoId: string, usuarioId: string) {
  const slug = cadastroSlug(nome)
  const found = await admin()
    .schema('gkit_ate')
    .from('atendimento_tipos')
    .select('id,tarefa_tipo_id')
    .eq('slug', slug)
    .maybeSingle()

  if (found.error) throw new Error(found.error.message)
  if (found.data?.id) {
    if (!found.data.tarefa_tipo_id) {
      await admin()
        .schema('gkit_ate')
        .from('atendimento_tipos')
        .update({ tarefa_tipo_id: tarefaTipoId, atualizado_por: usuarioId })
        .eq('id', found.data.id)
    }
    return String(found.data.id)
  }

  const { data, error } = await admin()
    .schema('gkit_ate')
    .from('atendimento_tipos')
    .insert({
      nome,
      slug,
      tarefa_tipo_id: tarefaTipoId,
      criado_por: usuarioId,
      atualizado_por: usuarioId,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return String(data.id)
}

function excelDate(value: unknown, XLSX: any) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString()
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H ?? 0, parsed.M ?? 0, Math.floor(parsed.S ?? 0)))
      return date.toISOString()
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

function excelDateOnly(value: unknown, XLSX: any) {
  const iso = excelDate(value, XLSX)
  return iso ? iso.slice(0, 10) : null
}

async function requireGkitAteWrite(permission = 'gkit_ate.importacoes.write') {
  const context = await requireModuleAccess('gkit-ate')
  if (!canAccess(context.permissions, permission)) {
    throw new Error('Usuario sem permissao para gravar no GKIT ATE.')
  }
  return context
}

async function readAstreaRows(formData: FormData) {
  const file = formData.get('arquivo')
  if (!(file instanceof File) || file.size === 0) throw new Error('Selecione um arquivo XLSX.')
  const isXlsx = file.name.toLowerCase().endsWith('.xlsx') || file.type.includes('spreadsheetml')
  if (!isXlsx) throw new Error('Use uma planilha XLSX exportada do ASTREA.')

  const XLSX = await import('xlsx')
  const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { cellDates: true, type: 'buffer' })
  const sheetName = workbook.SheetNames.includes('Processos') ? 'Processos' : workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) throw new Error('Arquivo XLSX sem abas.')

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true })
  const rows = rawRows.map((raw) => Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [normalizeHeader(key), value]),
  ))

  return {
    fileInfo: { nome: file.name, tamanho: file.size },
    rows,
    XLSX,
  }
}

async function prepararImportacaoAstrea(formData: FormData) {
  const context = await requireGkitAteWrite()
  const { fileInfo, rows, XLSX } = await readAstreaRows(formData)
  const ignorados: string[] = []
  const candidates: Omit<PreparedAtendimentoRow, 'acao'>[] = []

  rows.forEach((row, index) => {
    const linha = index + 2
    const titulo = rowValue(row, 'Titulo', 'Título')
    const cliente = rowValue(row, 'Cliente')

    if (!titulo || !cliente) {
      ignorados.push(`Linha ${linha}: titulo ou cliente ausente.`)
      return
    }

    const numero = rowValue(row, 'Numero', 'Número')
    const codigo = astreaCode(titulo, numero)
    const url = rowValue(row, 'URL do Processo')
    const dataCriacao = excelDate(row[normalizeHeader('Data de Criacao')] ?? row[normalizeHeader('Data de Criação')], XLSX)
    const dataEncerramento = excelDate(row[normalizeHeader('Data de Encerramento')], XLSX)
    const key = sourceKey(codigo, url, titulo, cliente, dataCriacao)
    const status = dataEncerramento ? 'encerrado' : 'aberto'
    const atendimentoTipoNome = inferAtendimentoTipo(titulo, row)
    const tarefaTipoNome = tarefaTipoFromAtendimentoTipo(atendimentoTipoNome)
    const prazoFinalizacao = excelDateOnly(row[normalizeHeader('Data de Encerramento')], XLSX)

    candidates.push({
      linha,
      sourceKey: key,
      codigoPublico: null,
      codigo,
      titulo,
      cliente,
      responsavel: rowValue(row, 'Responsavel', 'Responsável'),
      status,
      dataCriacao,
      prazoFinalizacao,
      atendimentoTipoNome,
      tarefaTipoNome,
      tarefaDescricao: tarefaTipoNome,
      payload: {
        source_key: key,
        astrea_codigo: codigo,
        tipo: atendimentoTipoNome,
        titulo,
        papel_cliente: rowValue(row, 'Papel do cliente'),
        cliente_nome: cliente,
        outros_clientes: rowValue(row, 'Outros clientes'),
        outros_envolvidos: rowValue(row, 'Outros envolvidos'),
        pasta: rowValue(row, 'Pasta'),
        acao: rowValue(row, 'Acao', 'Ação'),
        numero,
        data_distribuicao: excelDateOnly(row[normalizeHeader('Data de distribuicao')] ?? row[normalizeHeader('Data de distribuição')], XLSX),
        objeto: rowValue(row, 'Objeto'),
        observacoes: rowValue(row, 'Observacoes', 'Observações'),
        materia: rowValue(row, 'Materia', 'Matéria'),
        detalhes: rowValue(row, 'Detalhes'),
        valor_original: moneyValue(rowValue(row, 'Valor original')),
        valor_total_envolvido: moneyValue(rowValue(row, 'Valor total envolvido')),
        valor_total_provisao: moneyValue(rowValue(row, 'Valor total da provisao', 'Valor total da provisão')),
        valor_causa: moneyValue(rowValue(row, 'Valor da causa')),
        valor_condenacao: moneyValue(rowValue(row, 'Valor da condenacao', 'Valor da condenação')),
        decisao_processo: rowValue(row, 'Decisao do processo', 'Decisão do processo'),
        resultado_processo: rowValue(row, 'Resultado do processo'),
        etiquetas: splitTags(rowValue(row, 'Etiquetas')),
        data_criacao: dataCriacao,
        prazo_finalizacao: prazoFinalizacao,
        data_encerramento: dataEncerramento,
        data_ultimo_historico: excelDate(row[normalizeHeader('Data do ultimo historico')] ?? row[normalizeHeader('Data do último histórico')], XLSX),
        ultimo_historico: rowValue(row, 'Descricao do ultimo historico', 'Descrição do último histórico'),
        instancia_original: rowValue(row, 'Instancia Original', 'Instância Original'),
        instancia_atual: rowValue(row, 'Instancia Atual', 'Instância Atual'),
        url_processo: url,
        numero_juizo: rowValue(row, 'Numero do Juizo', 'Número do Juízo'),
        vara: rowValue(row, 'Vara'),
        foro: rowValue(row, 'Foro'),
        responsavel: rowValue(row, 'Responsavel', 'Responsável'),
        acesso: rowValue(row, 'Acesso'),
        status,
        atualizado_por: context.usuario.id,
        metadata: { origem: 'astrea_processos_xlsx' },
      },
    })
  })

  const [existing, existingCodes] = await Promise.all([
    candidates.length
      ? admin().schema('gkit_ate').from('atendimentos').select('source_key,codigo_publico').in('source_key', [...new Set(candidates.map((row) => row.sourceKey))])
      : { data: [], error: null },
    admin().schema('gkit_ate').from('atendimentos').select('codigo_publico').limit(100000),
  ])
  if (existing.error) throw new Error(existing.error.message)
  if (existingCodes.error) throw new Error(existingCodes.error.message)
  const existingMap = new Map<string, string | null>(
    ((existing.data ?? []) as Array<Record<string, any>>).map((row) => [String(row.source_key), row.codigo_publico ? String(row.codigo_publico) : null]),
  )
  const reservedCodes = new Set<string>(
    ((existingCodes.data ?? []) as Array<Record<string, any>>).map((row) => String(row.codigo_publico)).filter(Boolean),
  )

  const prepared: PreparedAtendimentoRow[] = candidates.map((row) => {
    const exists = existingMap.has(row.sourceKey)
    const existingCodigo = existingMap.get(row.sourceKey)
    const codigoPublico = existingCodigo ?? reserveCodigoPublico(row.dataCriacao, reservedCodes)

    return {
      ...row,
      codigoPublico,
      acao: exists ? 'atualizar' : 'criar',
      payload: {
        ...row.payload,
        codigo_publico: exists && existingCodigo ? undefined : codigoPublico,
        criado_por: exists ? undefined : context.usuario.id,
      },
    }
  })

  return {
    context,
    fileInfo,
    total: rows.length,
    prepared,
    ignorados,
  }
}

export async function previewGkitAteAstreaXlsx(formData: FormData): Promise<PreviewGkitAteImport> {
  const analysis = await prepararImportacaoAstrea(formData)
  return {
    total: analysis.total,
    validas: analysis.prepared.length,
    criar: analysis.prepared.filter((row) => row.acao === 'criar').length,
    atualizar: analysis.prepared.filter((row) => row.acao === 'atualizar').length,
    abertos: analysis.prepared.filter((row) => row.status === 'aberto').length,
    encerrados: analysis.prepared.filter((row) => row.status === 'encerrado').length,
    clientes: new Set(analysis.prepared.map((row) => row.cliente)).size,
    ignorados: analysis.ignorados,
    amostras: analysis.prepared.slice(0, 10).map((row) => ({
      linha: row.linha,
      acao: row.acao,
      sourceKey: row.sourceKey,
      codigoPublico: row.codigoPublico,
      codigo: row.codigo,
      titulo: row.titulo,
      cliente: row.cliente,
      responsavel: row.responsavel,
      status: row.status,
      atendimentoTipo: row.atendimentoTipoNome,
      tarefaTipo: row.tarefaTipoNome,
    })),
  }
}

async function criarLote(analysis: Awaited<ReturnType<typeof prepararImportacaoAstrea>>) {
  const { data, error } = await admin()
    .schema('gkit_ate')
    .from('import_lotes')
    .insert({
      arquivo_nome: analysis.fileInfo.nome,
      arquivo_tamanho: analysis.fileInfo.tamanho,
      total_linhas: analysis.total,
      linhas_validas: analysis.prepared.length,
      linhas_ignoradas: analysis.ignorados.length,
      criado_por: analysis.context.usuario.id,
      metadata: { origem: 'astrea_processos_xlsx' },
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return String(data.id)
}

async function registrarItem(payload: Record<string, unknown>) {
  const { error } = await admin().schema('gkit_ate').from('import_itens').insert(payload)
  if (error) throw new Error(error.message)
}

async function finalizarLote(loteId: string, result: ImportGkitAteResult, status: string, erro?: string) {
  const { error } = await admin()
    .schema('gkit_ate')
    .from('import_lotes')
    .update({
      status,
      atendimentos_criados: result.criados,
      atendimentos_atualizados: result.atualizados,
      linhas_ignoradas: result.ignorados.length,
      erro: erro ?? null,
      finalizado_em: new Date().toISOString(),
    })
    .eq('id', loteId)

  if (error) throw new Error(error.message)
}

export async function importarGkitAteAstreaXlsx(formData: FormData): Promise<ImportGkitAteResult> {
  const analysis = await prepararImportacaoAstrea(formData)
  const result: ImportGkitAteResult = {
    total: analysis.total,
    gravados: 0,
    criados: 0,
    atualizados: 0,
    ignorados: [...analysis.ignorados],
    loteId: null,
  }

  const loteId = await criarLote(analysis)
  result.loteId = loteId

  for (const mensagem of analysis.ignorados) {
    const linhaMatch = mensagem.match(/^Linha (\d+):/)
    await registrarItem({
      lote_id: loteId,
      linha: linhaMatch ? Number(linhaMatch[1]) : 0,
      acao: 'ignorar',
      status: 'ignorado',
      mensagem,
    })
  }

  try {
    for (const item of analysis.prepared) {
      const tarefaTipo = await ensureTarefaTipo(item.tarefaTipoNome, analysis.context.usuario.id)
      const atendimentoTipoId = await ensureAtendimentoTipo(item.atendimentoTipoNome, tarefaTipo.id, analysis.context.usuario.id)
      const saved = await admin()
        .schema('gkit_ate')
        .from('atendimentos')
        .upsert(cleanPayload({
          ...item.payload,
          atendimento_tipo_id: atendimentoTipoId,
        }), { onConflict: 'source_key' })
        .select('id,source_key')
        .single()

      if (saved.error) throw new Error(saved.error.message)

      const atendimentoId = String(saved.data.id)
      const taskStatus = item.status === 'encerrado' ? 'concluida' : 'pendente'
      const initialTask = await admin()
        .schema('gkit_ate')
        .from('tarefas')
        .upsert({
          atendimento_id: atendimentoId,
          tarefa_tipo_id: tarefaTipo.id,
          source_key: `initial:${item.sourceKey}`,
          descricao: tarefaTipo.descricao || item.tarefaDescricao,
          responsavel: item.responsavel,
          data_prevista: item.prazoFinalizacao,
          data_conclusao: item.status === 'encerrado' ? new Date().toISOString() : null,
          status: taskStatus,
          origem: 'astrea_tipo_atendimento',
          criado_por: analysis.context.usuario.id,
          atualizado_por: analysis.context.usuario.id,
          metadata: {
            atendimento_tipo: item.atendimentoTipoNome,
            tarefa_tipo: item.tarefaTipoNome,
          },
        }, { onConflict: 'atendimento_id,source_key' })

      if (initialTask.error) throw new Error(initialTask.error.message)

      result.gravados += 1
      if (item.acao === 'criar') result.criados += 1
      if (item.acao === 'atualizar') result.atualizados += 1
      await registrarItem({
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
    }
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : 'Erro inesperado ao importar atendimentos.'
    result.ignorados.push(mensagem)
    await finalizarLote(loteId, result, 'falhou', mensagem)
    throw err
  }

  const finalStatus = result.gravados === 0 && result.ignorados.length
    ? 'falhou'
    : result.ignorados.length
      ? 'parcial'
      : 'concluido'

  await finalizarLote(loteId, result, finalStatus)

  revalidatePath('/modulos/gkit-ate')
  revalidatePath('/modulos/gkit-ate/atendimentos')
  revalidatePath('/modulos/gkit-ate/importacoes')
  return result
}

export async function createGkitAteTarefaAction(formData: FormData) {
  const context = await requireGkitAteWrite('gkit_ate.tarefas.write')
  const atendimentoId = required(text(formData, 'atendimento_id'), 'Atendimento')
  const descricao = required(text(formData, 'descricao'), 'Descricao')
  const tipoNome = text(formData, 'tipo_tarefa') || descricao
  const tarefaTipo = await ensureTarefaTipo(tipoNome, context.usuario.id)

  const { error } = await admin()
    .schema('gkit_ate')
    .from('tarefas')
    .insert({
      atendimento_id: atendimentoId,
      tarefa_tipo_id: tarefaTipo.id,
      descricao,
      responsavel: text(formData, 'responsavel') || null,
      data_prevista: text(formData, 'data_prevista') || null,
      origem: 'manual',
      criado_por: context.usuario.id,
      atualizado_por: context.usuario.id,
    })

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/gkit-ate/tarefas')
  revalidatePath(`/modulos/gkit-ate/atendimentos/${atendimentoId}`)
}

export async function completeGkitAteTarefaAction(formData: FormData) {
  const context = await requireGkitAteWrite('gkit_ate.tarefas.write')
  const id = required(text(formData, 'id'), 'Tarefa')
  const resolucao = text(formData, 'resolucao')

  const current = await admin()
    .schema('gkit_ate')
    .from('tarefas')
    .select('id,atendimento_id,status')
    .eq('id', id)
    .single()

  if (current.error || !current.data) throw new Error(current.error?.message ?? 'Tarefa nao encontrada.')

  const atendimentoId = String(current.data.atendimento_id)
  const abertas = await admin()
    .schema('gkit_ate')
    .from('tarefas')
    .select('id')
    .eq('atendimento_id', atendimentoId)
    .in('status', ['pendente', 'em_andamento'])

  if (abertas.error) throw new Error(abertas.error.message)
  const outrasAbertas = ((abertas.data ?? []) as Array<Record<string, any>>).filter((row) => String(row.id) !== id).length

  if (outrasAbertas === 0 && resolucao !== 'encerrar_atendimento' && resolucao !== 'adicionar_tarefa') {
    throw new Error('Esta e a ultima tarefa aberta. Escolha encerrar o atendimento ou adicionar uma nova tarefa.')
  }

  if (outrasAbertas === 0 && resolucao === 'encerrar_atendimento') {
    const atendimento = await admin()
      .schema('gkit_ate')
      .from('atendimentos')
      .update({
        status: 'encerrado',
        data_encerramento: new Date().toISOString(),
        atualizado_por: context.usuario.id,
      })
      .eq('id', atendimentoId)

    if (atendimento.error) throw new Error(atendimento.error.message)
  }

  if (outrasAbertas === 0 && resolucao === 'adicionar_tarefa') {
    const descricao = required(text(formData, 'nova_descricao'), 'Descricao da nova tarefa')
    const tipoNome = text(formData, 'novo_tipo_tarefa') || descricao
    const tarefaTipo = await ensureTarefaTipo(tipoNome, context.usuario.id)
    const nextTask = await admin()
      .schema('gkit_ate')
      .from('tarefas')
      .insert({
        atendimento_id: atendimentoId,
        tarefa_tipo_id: tarefaTipo.id,
        descricao,
        responsavel: text(formData, 'novo_responsavel') || null,
        data_prevista: text(formData, 'nova_data_prevista') || null,
        origem: 'manual',
        criado_por: context.usuario.id,
        atualizado_por: context.usuario.id,
      })

    if (nextTask.error) throw new Error(nextTask.error.message)
  }

  const { data, error } = await admin()
    .schema('gkit_ate')
    .from('tarefas')
    .update({
      status: 'concluida',
      data_conclusao: new Date().toISOString(),
      atualizado_por: context.usuario.id,
    })
    .eq('id', id)
    .select('atendimento_id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/modulos/gkit-ate/tarefas')
  revalidatePath(`/modulos/gkit-ate/tarefas/${id}`)
  if (data?.atendimento_id) revalidatePath(`/modulos/gkit-ate/atendimentos/${data.atendimento_id}`)
  redirect(`/modulos/gkit-ate/atendimentos/${data?.atendimento_id ?? atendimentoId}`)
}
