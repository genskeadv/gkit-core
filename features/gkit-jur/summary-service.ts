import { createHash } from 'node:crypto'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export type GkitJurNivelProntidao = 'sem_base' | 'capa' | 'parcial' | 'pronto' | 'desatualizado' | 'erro'

type MovementSummaryRow = {
  created_at: string | null
  data_hora: string | null
  gera_alerta: boolean | null
  nome: string | null
  origem: string | null
  relevante: boolean | null
}

type GkitJurResumoInteligente = {
  doQueSeTrata: string
  faseAtual: string
  leituraExecutiva: string
  nivelConfianca: 'alto' | 'medio' | 'baixo'
  precisaRevisaoHumana: boolean
  principaisAndamentos: string[]
  proximasAcoesSugeridas: string[]
  riscosAlertas: string[]
  ultimosMarcos: string[]
}

const SUMMARY_MODEL_VERSION = 'inteligente-v1'
const MIN_READY_MOVEMENTS = 5
const INTELLIGENT_SUMMARY_MAX_MOVEMENTS = 80
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'

function admin() {
  return createSupabaseAdminClient() as any
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function dateLabel(value: unknown) {
  const current = text(value)
  if (!current) return null
  const date = new Date(current)
  if (!Number.isFinite(date.getTime())) return null
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

function compactMovement(row: MovementSummaryRow) {
  return {
    data: row.data_hora ?? row.created_at ?? null,
    nome: text(row.nome, 'Movimentação processual'),
    origem: text(row.origem, 'datajud'),
    relevante: Boolean(row.relevante || row.gera_alerta),
  }
}

function compactText(value: unknown, maxLength = 900) {
  const current = text(value)
    .replace(/\s+/g, ' ')
    .trim()
  return current.length > maxLength ? `${current.slice(0, maxLength - 1).trim()}...` : current
}

function listLabel(items: string[]) {
  return items.filter(Boolean).slice(0, 3).join('; ')
}

function movementLabel(row: ReturnType<typeof compactMovement>) {
  const date = dateLabel(row.data) ?? (text(row.data) || 'sem data')
  return `${date}: ${compactText(row.nome, 220)}`
}

function inferPhaseFromMovements(movements: Array<ReturnType<typeof compactMovement>>, classe: string | null) {
  const joined = movements.map((item) => item.nome).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/\bsentenca|julgad[ao]|procedente|improcedente|homolog/.test(joined)) return 'sentenca ou julgamento recente'
  if (/\bacordao|recurso ordinario|agravo|embargos|turma|tribunal/.test(joined)) return 'fase recursal'
  if (/\baudiencia|instrucao|conciliacao|depoimento|pericia/.test(joined)) return 'instrução ou audiência'
  if (/\bintimacao|prazo|manifestar|contestacao|replica|despacho/.test(joined)) return 'cumprimento de prazo ou manifestação'
  return classe || 'fase processual em acompanhamento'
}

function fallbackResumoInteligente(input: {
  classe: string | null
  clienteNome: string | null
  latestMovements: Array<ReturnType<typeof compactMovement>>
  movementCount: number
  numeroCnj: string
  orgao: string | null
  relevantMovements: Array<ReturnType<typeof compactMovement>>
  tarefas: Array<{ vencimento: string | null; prioridade: string; status: string; titulo: string }>
  titulo: string | null
  tribunal: string | null
}): GkitJurResumoInteligente {
  const baseMovements = input.relevantMovements.length ? input.relevantMovements : input.latestMovements
  const faseAtual = inferPhaseFromMovements(baseMovements, input.classe)
  const ultimosMarcos = baseMovements.slice(0, 5).map(movementLabel)
  const principaisAndamentos = baseMovements.slice().reverse().slice(-5).map(movementLabel)
  const riscosAlertas = [
    input.movementCount === 0 ? 'Sem movimentações locais suficientes para leitura jurídica conclusiva.' : null,
    input.tarefas.some((task) => task.prioridade === 'critica' || task.prioridade === 'alta') ? 'Há tarefas abertas de prioridade alta ou crítica.' : null,
    !input.clienteNome ? 'Cliente ainda não identificado no cadastro operacional.' : null,
  ].filter(Boolean) as string[]
  const proximasAcoes = input.tarefas.length
    ? input.tarefas.slice(0, 5).map((task) => {
      const vencimento = task.vencimento ? ` com vencimento em ${dateLabel(task.vencimento) ?? task.vencimento}` : ''
      return `${task.titulo}${vencimento}`
    })
    : ['Revisar últimos andamentos e confirmar se há prazo, intimação ou providência pendente.']
  const doQueSeTrata = [
    `Processo ${input.numeroCnj}`,
    input.classe ? `classe ${input.classe}` : null,
    input.tribunal ? `no ${input.tribunal}` : null,
    input.orgao ? `em ${input.orgao}` : null,
    input.titulo ? `título: ${input.titulo}` : null,
  ].filter(Boolean).join(', ')

  return {
    doQueSeTrata,
    faseAtual,
    leituraExecutiva: [
      `A leitura automática indica ${faseAtual}.`,
      ultimosMarcos.length ? `Principais marcos: ${listLabel(ultimosMarcos)}.` : 'Ainda não há marcos suficientes na base local.',
      proximasAcoes.length ? `Próxima ação sugerida: ${proximasAcoes[0]}.` : null,
    ].filter(Boolean).join(' '),
    nivelConfianca: input.movementCount >= MIN_READY_MOVEMENTS ? 'medio' : 'baixo',
    precisaRevisaoHumana: true,
    principaisAndamentos,
    proximasAcoesSugeridas: proximasAcoes,
    riscosAlertas,
    ultimosMarcos,
  }
}

function resumoInteligenteSchema() {
  return {
    additionalProperties: false,
    properties: {
      doQueSeTrata: { type: 'string' },
      faseAtual: { type: 'string' },
      leituraExecutiva: { type: 'string' },
      nivelConfianca: { enum: ['alto', 'medio', 'baixo'], type: 'string' },
      precisaRevisaoHumana: { type: 'boolean' },
      principaisAndamentos: { items: { type: 'string' }, type: 'array' },
      proximasAcoesSugeridas: { items: { type: 'string' }, type: 'array' },
      riscosAlertas: { items: { type: 'string' }, type: 'array' },
      ultimosMarcos: { items: { type: 'string' }, type: 'array' },
    },
    required: [
      'doQueSeTrata',
      'faseAtual',
      'leituraExecutiva',
      'nivelConfianca',
      'precisaRevisaoHumana',
      'principaisAndamentos',
      'proximasAcoesSugeridas',
      'riscosAlertas',
      'ultimosMarcos',
    ],
    type: 'object',
  }
}

function extractResponseText(payload: any): string | null {
  if (typeof payload?.output_text === 'string') return payload.output_text
  const parts: string[] = []
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === 'string') parts.push(content.text)
    }
  }
  return parts.join('').trim() || null
}

function sanitizeResumoInteligente(value: unknown): GkitJurResumoInteligente | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const nivel = text(record.nivelConfianca)
  if (!['alto', 'medio', 'baixo'].includes(nivel)) return null

  return {
    doQueSeTrata: compactText(record.doQueSeTrata, 900),
    faseAtual: compactText(record.faseAtual, 240),
    leituraExecutiva: compactText(record.leituraExecutiva, 1200),
    nivelConfianca: nivel as GkitJurResumoInteligente['nivelConfianca'],
    precisaRevisaoHumana: Boolean(record.precisaRevisaoHumana),
    principaisAndamentos: Array.isArray(record.principaisAndamentos) ? record.principaisAndamentos.map((item) => compactText(item, 320)).filter(Boolean).slice(0, 8) : [],
    proximasAcoesSugeridas: Array.isArray(record.proximasAcoesSugeridas) ? record.proximasAcoesSugeridas.map((item) => compactText(item, 320)).filter(Boolean).slice(0, 8) : [],
    riscosAlertas: Array.isArray(record.riscosAlertas) ? record.riscosAlertas.map((item) => compactText(item, 320)).filter(Boolean).slice(0, 8) : [],
    ultimosMarcos: Array.isArray(record.ultimosMarcos) ? record.ultimosMarcos.map((item) => compactText(item, 320)).filter(Boolean).slice(0, 8) : [],
  }
}

async function generateOpenAiResumoInteligente(input: {
  classe: string | null
  clienteNome: string | null
  latestMovements: Array<ReturnType<typeof compactMovement>>
  numeroCnj: string
  orgao: string | null
  relevantMovements: Array<ReturnType<typeof compactMovement>>
  tarefas: Array<{ vencimento: string | null; prioridade: string; status: string; titulo: string }>
  titulo: string | null
  tribunal: string | null
}) {
  const apiKey = text(process.env.OPENAI_API_KEY)
  if (!apiKey) return null

  const model = text(process.env.GKIT_JUR_AI_MODEL, 'gpt-5.1-mini')
  const body = {
    input: [
      {
        content: 'Você é um assistente jurídico operacional. Analise apenas os dados fornecidos. Não invente fatos, pedidos, valores, partes ou prazos. Se a base for insuficiente, marque baixa confiança e peça revisão humana. Escreva em português do Brasil, com linguagem objetiva para um escritório jurídico.',
        role: 'developer',
      },
      {
        content: JSON.stringify({
          capa: {
            classe: input.classe,
            clienteNome: input.clienteNome,
            numeroCnj: input.numeroCnj,
            orgao: input.orgao,
            titulo: input.titulo,
            tribunal: input.tribunal,
          },
          movimentacoesRecentes: input.latestMovements.map((item) => ({
            data: item.data,
            nome: compactText(item.nome, 500),
            origem: item.origem,
            relevante: item.relevante,
          })),
          movimentacoesRelevantes: input.relevantMovements.map((item) => ({
            data: item.data,
            nome: compactText(item.nome, 500),
            origem: item.origem,
            relevante: item.relevante,
          })),
          tarefasAbertas: input.tarefas,
        }),
        role: 'user',
      },
    ],
    max_output_tokens: 1600,
    model,
    store: false,
    text: {
      format: {
        name: 'gkit_jur_resumo_inteligente',
        schema: resumoInteligenteSchema(),
        strict: true,
        type: 'json_schema',
      },
    },
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    body: JSON.stringify(body),
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`OpenAI retornou ${response.status} ao gerar resumo inteligente.`)
  }

  const payload = await response.json()
  const outputText = extractResponseText(payload)
  if (!outputText) throw new Error('OpenAI nao retornou texto para o resumo inteligente.')
  return sanitizeResumoInteligente(JSON.parse(outputText))
}

async function generateResumoInteligente(input: Parameters<typeof fallbackResumoInteligente>[0]) {
  const fallback = fallbackResumoInteligente(input)
  try {
    const ai = await generateOpenAiResumoInteligente(input)
    return {
      fonte: ai ? 'openai' : 'sistema',
      modelo: ai ? text(process.env.GKIT_JUR_AI_MODEL, 'gpt-5.1-mini') : 'regras-locais',
      resumo: ai ?? fallback,
    }
  } catch (error) {
    return {
      erro: error instanceof Error ? error.message : 'Falha ao gerar resumo inteligente com IA.',
      fonte: 'sistema',
      modelo: 'regras-locais',
      resumo: fallback,
    }
  }
}

function readinessLevel(input: {
  hasCapa: boolean
  movementCount: number
  statusMonitoramento: string
  successSyncCount: number
}): GkitJurNivelProntidao {
  if (input.statusMonitoramento === 'erro' && !input.movementCount && !input.successSyncCount) return 'erro'
  if (input.successSyncCount > 0 && input.movementCount >= MIN_READY_MOVEMENTS) return 'pronto'
  if (input.successSyncCount > 0 || input.movementCount > 0) return 'parcial'
  if (input.hasCapa) return 'capa'
  return 'sem_base'
}

function readinessDescription(nivel: GkitJurNivelProntidao) {
  if (nivel === 'pronto') return 'pronto para acompanhamento operacional'
  if (nivel === 'parcial') return 'com base parcial para acompanhamento'
  if (nivel === 'capa') return 'com capa identificada, mas ainda sem base histórica suficiente'
  if (nivel === 'desatualizado') return 'com base operacional desatualizada'
  if (nivel === 'erro') return 'com erro de monitoramento que exige verificação'
  return 'sem base operacional suficiente'
}

function summaryText(input: {
  carteiraId: string | null
  classe: string | null
  clienteNome: string | null
  movementCount: number
  nivel: GkitJurNivelProntidao
  numeroCnj: string
  orgao: string | null
  relevanteCount: number
  responsavelId: string | null
  tribunal: string | null
  ultimaMovimentacao: string | null
}) {
  const classe = input.classe ? ` de ${input.classe}` : ''
  const tribunal = input.tribunal ? ` no ${input.tribunal}` : ''
  const orgao = input.orgao ? `, em tramitação no ${input.orgao}` : ''
  const ultima = input.ultimaMovimentacao
    ? `Último marco considerado em ${dateLabel(input.ultimaMovimentacao) ?? input.ultimaMovimentacao}.`
    : 'Ainda não há marco processual recente consolidado na base local.'
  const base = input.movementCount
    ? `A base local está ${input.nivel === 'pronto' ? 'completa para operação' : 'em formação'}, com ${input.movementCount.toLocaleString('pt-BR')} movimentação(ões) analisada(s) e ${input.relevanteCount.toLocaleString('pt-BR')} relevante(s).`
    : 'Ainda não há movimentações locais suficientes para uma leitura operacional conclusiva.'
  const ownership = [
    input.clienteNome ? `Cliente: ${input.clienteNome}.` : 'Cliente ainda não identificado.',
    input.carteiraId ? 'Carteira operacional definida.' : 'Carteira operacional pendente.',
    input.responsavelId ? 'Responsável operacional definido.' : 'Ponto de atenção: ainda sem responsável operacional definido.',
  ]

  const parts = [
    `Processo ${input.numeroCnj}${classe}${tribunal}${orgao}.`,
    ultima,
    base,
    `Nível de prontidão: ${readinessDescription(input.nivel)}.`,
    ...ownership,
  ]

  return parts.join(' ')
}

async function countRows(table: string, processoId: string, extra?: (query: any) => any) {
  let query = admin()
    .schema('gkit_jur')
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('processo_id', processoId)

  if (extra) query = extra(query)

  const result = await query
  if (result.error) throw new Error(result.error.message)
  return result.count ?? 0
}

export async function refreshGkitJurProcessSummary(processoId: string) {
  const processoResult = await admin()
    .schema('gkit_jur')
    .from('processos')
    .select('id,numero_cnj,titulo,tribunal_sigla,classe_nome,orgao_julgador_nome,data_ajuizamento,ultima_sincronizacao_em,ultima_movimentacao_em,status_monitoramento,cliente_nome,carteira_id,responsavel_id')
    .eq('id', processoId)
    .single()

  if (processoResult.error || !processoResult.data) {
    throw new Error(processoResult.error?.message ?? 'Processo não encontrado para resumo operacional.')
  }

  const processo = processoResult.data as Record<string, unknown>
  const [
    movementCount,
    relevantCount,
    successSyncCount,
    latestMovementsResult,
    relevantMovementsResult,
    openTasksResult,
  ] = await Promise.all([
    countRows('movimentacoes', processoId),
    countRows('movimentacoes', processoId, (query) => query.or('relevante.eq.true,gera_alerta.eq.true')),
    countRows('sincronizacoes', processoId, (query) => query.eq('status', 'sucesso')),
    admin()
      .schema('gkit_jur')
      .from('movimentacoes')
      .select('nome,data_hora,origem,relevante,gera_alerta,created_at')
      .eq('processo_id', processoId)
      .order('data_hora', { ascending: false, nullsFirst: false })
      .limit(INTELLIGENT_SUMMARY_MAX_MOVEMENTS),
    admin()
      .schema('gkit_jur')
      .from('movimentacoes')
      .select('nome,data_hora,origem,relevante,gera_alerta,created_at')
      .eq('processo_id', processoId)
      .or('relevante.eq.true,gera_alerta.eq.true')
      .order('data_hora', { ascending: false, nullsFirst: false })
      .limit(INTELLIGENT_SUMMARY_MAX_MOVEMENTS),
    admin()
      .schema('gkit_jur')
      .from('tarefas')
      .select('titulo,descricao,status,prioridade,prazo_at,origem')
      .eq('processo_id', processoId)
      .in('status', ['aberta', 'em_andamento', 'aguardando_terceiro'])
      .order('prazo_at', { ascending: true, nullsFirst: false })
      .limit(10),
  ])

  for (const result of [latestMovementsResult, relevantMovementsResult, openTasksResult]) {
    if (result.error) throw new Error(result.error.message)
  }

  const latestMovements = ((latestMovementsResult.data ?? []) as MovementSummaryRow[]).map(compactMovement)
  const relevantMovements = ((relevantMovementsResult.data ?? []) as MovementSummaryRow[]).map(compactMovement)
  const openTasks = ((openTasksResult.data ?? []) as Array<Record<string, unknown>>).map((task) => ({
    origem: text(task.origem, 'manual'),
    vencimento: text(task.prazo_at) || null,
    prioridade: text(task.prioridade, 'media'),
    status: text(task.status, 'aberta'),
    titulo: text(task.titulo, 'Tarefa operacional'),
  }))

  const hasCapa = Boolean(
    text(processo.classe_nome)
    || text(processo.orgao_julgador_nome)
    || text(processo.data_ajuizamento)
    || text(processo.ultima_sincronizacao_em),
  )
  const nivel = readinessLevel({
    hasCapa,
    movementCount,
    statusMonitoramento: text(processo.status_monitoramento),
    successSyncCount,
  })
  const ultimaMovimentacao = text(processo.ultima_movimentacao_em)
    || latestMovements.map((item) => text(item.data)).find(Boolean)
    || null
  const resumoOperacional = summaryText({
    carteiraId: text(processo.carteira_id) || null,
    classe: text(processo.classe_nome) || null,
    clienteNome: text(processo.cliente_nome) || null,
    movementCount,
    nivel,
    numeroCnj: text(processo.numero_cnj, 'sem CNJ'),
    orgao: text(processo.orgao_julgador_nome) || null,
    relevanteCount: relevantCount,
    responsavelId: text(processo.responsavel_id) || null,
    tribunal: text(processo.tribunal_sigla) || null,
    ultimaMovimentacao,
  })
  const intelligent = await generateResumoInteligente({
    classe: text(processo.classe_nome) || null,
    clienteNome: text(processo.cliente_nome) || null,
    latestMovements,
    movementCount,
    numeroCnj: text(processo.numero_cnj, 'sem CNJ'),
    orgao: text(processo.orgao_julgador_nome) || null,
    relevantMovements,
    tarefas: openTasks,
    titulo: text(processo.titulo) || null,
    tribunal: text(processo.tribunal_sigla) || null,
  })
  const pendencias = [
    !text(processo.carteira_id) ? { tipo: 'sem_carteira', label: 'Vincular carteira operacional.' } : null,
    !text(processo.responsavel_id) ? { tipo: 'sem_responsavel', label: 'Definir responsável pelo acompanhamento.' } : null,
    nivel === 'sem_base' || nivel === 'capa' ? { tipo: 'sincronizacao', label: 'Enriquecer base antes do resumo final.' } : null,
  ].filter(Boolean)
  const riscos = [
    text(processo.status_monitoramento) === 'erro' ? { tipo: 'monitoramento', label: 'Ultima coleta registrou erro.' } : null,
    successSyncCount === 0 && movementCount > 0 ? { tipo: 'historico_parcial', label: 'Há movimentações sem sincronização concluída.' } : null,
  ].filter(Boolean)
  const criterio = {
    hasCapa,
    minReadyMovements: MIN_READY_MOVEMENTS,
    movementCount,
    successSyncCount,
  }
  const hashPayload = JSON.stringify({
    criterio,
    intelligent,
    latestMovements,
    nivel,
    openTasks,
    relevantMovements,
    resumoOperacional: intelligent.resumo.leituraExecutiva || resumoOperacional,
  })
  const now = new Date().toISOString()
  const payload = {
    base_sincronizacao_em: text(processo.ultima_sincronizacao_em) || null,
    criterio_prontidao: criterio,
    erro_mensagem: nivel === 'erro' ? 'Processo sem base operacional e com monitoramento em erro.' : null,
    fase_processual: text(processo.classe_nome) || null,
    fonte_resumo: intelligent.fonte === 'openai' ? 'hibrido' : 'sistema',
    gerado_em: nivel === 'sem_base' ? null : now,
    metadata: {
      latestMovements,
      resumoInteligente: {
        ...intelligent.resumo,
        erroGeracaoIa: intelligent.erro ?? null,
        fonte: intelligent.fonte,
        geradoEm: now,
        modelo: intelligent.modelo,
      },
      openTasks,
      processo: {
        clienteNome: text(processo.cliente_nome) || null,
        dataAjuizamento: text(processo.data_ajuizamento) || null,
        tribunal: text(processo.tribunal_sigla) || null,
      },
    },
    modelo_versao: SUMMARY_MODEL_VERSION,
    movimentacoes_consideradas: movementCount,
    movimentacoes_relevantes: relevantCount,
    nivel_prontidao: nivel,
    pendencias_identificadas: pendencias,
    proximas_acoes_sugeridas: intelligent.resumo.proximasAcoesSugeridas.length ? intelligent.resumo.proximasAcoesSugeridas.map((label) => ({ label })) : openTasks,
    resumo_hash: createHash('sha256').update(hashPayload).digest('hex'),
    resumo_operacional: intelligent.resumo.leituraExecutiva || resumoOperacional,
    riscos_alertas: intelligent.resumo.riscosAlertas.length ? intelligent.resumo.riscosAlertas.map((label) => ({ label })) : riscos,
    status_resumo: nivel === 'sem_base' ? 'pendente' : 'gerado',
    ultima_movimentacao_considerada_em: ultimaMovimentacao,
    ultimos_eventos_relevantes: intelligent.resumo.ultimosMarcos.length
      ? intelligent.resumo.ultimosMarcos.map((label) => ({ label }))
      : relevantMovements.length ? relevantMovements : latestMovements.slice(0, 5),
    updated_at: now,
  }

  const result = await admin()
    .schema('gkit_jur')
    .from('processos_resumos')
    .upsert({ processo_id: processoId, ...payload }, { onConflict: 'processo_id' })

  if (result.error) throw new Error(result.error.message)

  return { nivel, payload }
}

export async function refreshGkitJurProcessSummaries(options: { limit?: number; onlyActive?: boolean } = {}) {
  const limit = Math.max(1, Math.min(options.limit ?? 2500, 5000))
  const rows: Array<{ id: string }> = []
  const pageSize = 1000

  for (let from = 0; rows.length < limit; from += pageSize) {
    let query = admin()
      .schema('gkit_jur')
      .from('processos')
      .select('id')
      .order('updated_at', { ascending: false })
      .range(from, from + Math.min(pageSize, limit - rows.length) - 1)

    if (options.onlyActive ?? true) query = query.eq('status', 'ativo')

    const result = await query
    if (result.error) throw new Error(result.error.message)
    const data = (result.data ?? []) as Array<{ id: string }>
    rows.push(...data)
    if (data.length < pageSize) break
  }

  const totals: Record<GkitJurNivelProntidao, number> = {
    capa: 0,
    desatualizado: 0,
    erro: 0,
    parcial: 0,
    pronto: 0,
    sem_base: 0,
  }

  for (const row of rows) {
    const result = await refreshGkitJurProcessSummary(row.id)
    totals[result.nivel] += 1
  }

  return { processados: rows.length, totals }
}

export async function refreshGkitJurIntelligentSummaryMonitor(options: { limit?: number } = {}) {
  const limit = Math.max(1, Math.min(options.limit ?? 25, 100))
  const processosResult = await admin()
    .schema('gkit_jur')
    .from('processos')
    .select('id,updated_at')
    .eq('status', 'ativo')
    .order('updated_at', { ascending: false })
    .limit(2000)

  if (processosResult.error) throw new Error(processosResult.error.message)

  const processos = (processosResult.data ?? []) as Array<Record<string, unknown>>
  const processoIds = processos.map((row) => text(row.id)).filter(Boolean)
  const resumoMap = new Map<string, Record<string, unknown>>()

  for (let index = 0; index < processoIds.length; index += 100) {
    const batchIds = processoIds.slice(index, index + 100)
    if (!batchIds.length) continue
    const summariesResult = await admin()
      .schema('gkit_jur')
      .from('processos_resumos')
      .select('processo_id,updated_at,metadata,status_resumo')
      .in('processo_id', batchIds)

    if (summariesResult.error) throw new Error(summariesResult.error.message)
    for (const row of (summariesResult.data ?? []) as Array<Record<string, unknown>>) {
      resumoMap.set(text(row.processo_id), row)
    }
  }

  const queue = processos.filter((processo) => {
    const processoId = text(processo.id)
    const resumo = resumoMap.get(processoId)
    const metadata = resumo && typeof resumo.metadata === 'object' && resumo.metadata !== null ? resumo.metadata as Record<string, unknown> : {}
    const inteligente = metadata.resumoInteligente && typeof metadata.resumoInteligente === 'object' && !Array.isArray(metadata.resumoInteligente)
      ? metadata.resumoInteligente as Record<string, unknown>
      : {}
    const processoUpdatedAt = Date.parse(text(processo.updated_at))
    const resumoUpdatedAt = Date.parse(text(resumo?.updated_at))
    const stale = Number.isFinite(processoUpdatedAt) && Number.isFinite(resumoUpdatedAt) && processoUpdatedAt > resumoUpdatedAt

    return !resumo
      || !Object.keys(inteligente).length
      || Boolean(inteligente.erroGeracaoIa)
      || stale
  }).slice(0, limit)

  const totals: Record<GkitJurNivelProntidao, number> = {
    capa: 0,
    desatualizado: 0,
    erro: 0,
    parcial: 0,
    pronto: 0,
    sem_base: 0,
  }
  const erros: Array<{ erro: string; processoId: string }> = []

  for (const row of queue) {
    const processoId = text(row.id)
    try {
      const result = await refreshGkitJurProcessSummary(processoId)
      totals[result.nivel] += 1
    } catch (error) {
      erros.push({
        erro: error instanceof Error ? error.message : 'Erro inesperado ao reprocessar resumo inteligente.',
        processoId,
      })
    }
  }

  return {
    erros,
    processados: queue.length - erros.length,
    selecionados: queue.length,
    totals,
  }
}
