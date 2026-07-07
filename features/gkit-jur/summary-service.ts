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

const SUMMARY_MODEL_VERSION = 'operacional-v1'
const MIN_READY_MOVEMENTS = 5

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
    nome: text(row.nome, 'Movimentacao processual'),
    origem: text(row.origem, 'datajud'),
    relevante: Boolean(row.relevante || row.gera_alerta),
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
  if (nivel === 'capa') return 'com capa identificada, mas ainda sem base historica suficiente'
  if (nivel === 'desatualizado') return 'com base operacional desatualizada'
  if (nivel === 'erro') return 'com erro de monitoramento que exige verificacao'
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
  const orgao = input.orgao ? `, em tramitacao no ${input.orgao}` : ''
  const ultima = input.ultimaMovimentacao
    ? `Ultimo marco considerado em ${dateLabel(input.ultimaMovimentacao) ?? input.ultimaMovimentacao}.`
    : 'Ainda nao ha marco processual recente consolidado na base local.'
  const base = input.movementCount
    ? `A base local esta ${input.nivel === 'pronto' ? 'completa para operacao' : 'em formacao'}, com ${input.movementCount.toLocaleString('pt-BR')} movimentacao(oes) analisada(s) e ${input.relevanteCount.toLocaleString('pt-BR')} relevante(s).`
    : 'Ainda nao ha movimentacoes locais suficientes para uma leitura operacional conclusiva.'
  const ownership = [
    input.clienteNome ? `Cliente: ${input.clienteNome}.` : 'Cliente ainda nao identificado.',
    input.carteiraId ? 'Carteira operacional definida.' : 'Carteira operacional pendente.',
    input.responsavelId ? 'Responsavel operacional definido.' : 'Ponto de atencao: ainda sem responsavel operacional definido.',
  ]

  const parts = [
    `Processo ${input.numeroCnj}${classe}${tribunal}${orgao}.`,
    ultima,
    base,
    `Nivel de prontidao: ${readinessDescription(input.nivel)}.`,
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
    .select('id,numero_cnj,tribunal_sigla,classe_nome,orgao_julgador_nome,data_ajuizamento,ultima_sincronizacao_em,ultima_movimentacao_em,status_monitoramento,cliente_nome,carteira_id,responsavel_id')
    .eq('id', processoId)
    .single()

  if (processoResult.error || !processoResult.data) {
    throw new Error(processoResult.error?.message ?? 'Processo nao encontrado para resumo operacional.')
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
      .limit(10),
    admin()
      .schema('gkit_jur')
      .from('movimentacoes')
      .select('nome,data_hora,origem,relevante,gera_alerta,created_at')
      .eq('processo_id', processoId)
      .or('relevante.eq.true,gera_alerta.eq.true')
      .order('data_hora', { ascending: false, nullsFirst: false })
      .limit(10),
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
    prazo: text(task.prazo_at) || null,
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
  const pendencias = [
    !text(processo.carteira_id) ? { tipo: 'sem_carteira', label: 'Vincular carteira operacional.' } : null,
    !text(processo.responsavel_id) ? { tipo: 'sem_responsavel', label: 'Definir responsavel pelo acompanhamento.' } : null,
    nivel === 'sem_base' || nivel === 'capa' ? { tipo: 'sincronizacao', label: 'Enriquecer base antes do resumo final.' } : null,
  ].filter(Boolean)
  const riscos = [
    text(processo.status_monitoramento) === 'erro' ? { tipo: 'monitoramento', label: 'Ultima coleta registrou erro.' } : null,
    successSyncCount === 0 && movementCount > 0 ? { tipo: 'historico_parcial', label: 'Ha movimentacoes sem sincronizacao concluida.' } : null,
  ].filter(Boolean)
  const criterio = {
    hasCapa,
    minReadyMovements: MIN_READY_MOVEMENTS,
    movementCount,
    successSyncCount,
  }
  const hashPayload = JSON.stringify({
    criterio,
    latestMovements,
    nivel,
    openTasks,
    relevantMovements,
    resumoOperacional,
  })
  const now = new Date().toISOString()
  const payload = {
    base_sincronizacao_em: text(processo.ultima_sincronizacao_em) || null,
    criterio_prontidao: criterio,
    erro_mensagem: nivel === 'erro' ? 'Processo sem base operacional e com monitoramento em erro.' : null,
    fase_processual: text(processo.classe_nome) || null,
    fonte_resumo: 'sistema',
    gerado_em: nivel === 'sem_base' ? null : now,
    metadata: {
      latestMovements,
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
    proximas_acoes_sugeridas: openTasks,
    resumo_hash: createHash('sha256').update(hashPayload).digest('hex'),
    resumo_operacional: resumoOperacional,
    riscos_alertas: riscos,
    status_resumo: nivel === 'sem_base' ? 'pendente' : 'gerado',
    ultima_movimentacao_considerada_em: ultimaMovimentacao,
    ultimos_eventos_relevantes: relevantMovements.length ? relevantMovements : latestMovements.slice(0, 5),
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
