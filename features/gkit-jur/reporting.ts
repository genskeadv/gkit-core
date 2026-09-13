import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { formatCnj } from './normalizer'
import {
  classifyGkitJurProcessNature,
  normalizeGkitJurProcessNature,
} from './process-nature'

type ReportSource = {
  consultaEm: string | null
  detalhes: Record<string, unknown>
  nome: string
  tipo: 'gkit_jur' | 'datajud' | 'aasp' | 'manual' | 'pre_juridico'
}

type ReportMovement = {
  codigo: number | null
  dataHora: string | null
  descricao: string
  geraAlerta: boolean
  id: string
  origem: string
  relevante: boolean
}

type ReportTask = {
  id: string
  prazoAt: string | null
  prioridade: string
  status: string
  tipo: string
  titulo: string
}

type ReportCounterparty = {
  documento: string | null
  nome: string
  papel: string | null
}

type ReportLawyer = {
  nome: string
  oab: string | null
  representacao: 'atual' | 'anterior' | 'nao_confirmada'
}

type ReportDebt = {
  competencia: string | null
  fonte: string
  recibo: string | null
  valor: number | null
  vencimento: string | null
}

type ReportProcessUnit = {
  bloco: string | null
  nivelVinculo: 'nominal' | 'unidade_identificada' | 'debito_identificado'
  observacao: string | null
  unidade: string | null
}

type ReportProcessSummary = {
  baseSincronizacaoEm: string | null
  faseProcessual: string | null
  geradoEm: string | null
  nivelProntidao: string
  pendenciasIdentificadas: string[]
  proximasAcoesSugeridas: string[]
  resumoOperacional: string | null
  riscosAlertas: string[]
}

type ReportProcess = {
  acompanhamentoObservacoes: string | null
  alertas: string[]
  assuntos: string[]
  classe: string | null
  classificacaoRelatorio: 'cobranca_execucao' | 'demais_processos'
  dataAjuizamento: string | null
  debitosCobrados: ReportDebt[]
  escritorio: {
    advogados: ReportLawyer[]
    nomeAtual: string | null
    tipo: 'genske_advogados' | 'outro_escritorio' | 'nao_identificado' | 'multiplo'
  }
  fontes: ReportSource[]
  foroOrgao: string | null
  grau: string | null
  incluirRelatorioMensal: boolean
  marcacaoAutomaticaPermitida: boolean
  movimentacoesPeriodo: ReportMovement[]
  naturezaOperacional: string
  numeroCnj: string
  numeroCnjLimpo: string
  observacoesLimitacoes: string[]
  partesContrarias: ReportCounterparty[]
  pendencias: ReportTask[]
  poloCondominio: 'autor' | 'reu' | 'terceiro' | 'nao_confirmado'
  processoId: string
  processoPrincipalId: string | null
  processoRelacionadoTipo: 'principal' | 'cumprimento' | 'recurso' | 'incidente' | 'nao_identificado'
  resumo: ReportProcessSummary | null
  sistema: string | null
  situacaoProcessual: 'em_andamento' | 'suspenso' | 'encerrado' | 'nao_confirmada'
  statusMonitoramento: string
  statusProcesso: string
  tipoAcompanhamento: string
  titulo: string | null
  tribunal: string | null
  ultimaMovimentacao: ReportMovement | null
  ultimaSincronizacaoComResultadoEm: string | null
  ultimaSincronizacaoEm: string | null
  unidades: ReportProcessUnit[]
  valorAcao: number | null
}

type ReportPreJuridico = {
  alertas: string[]
  area: string | null
  bloco: string | null
  cotasDebito: ReportDebt[]
  dataEntrada: string | null
  descricao: string
  documentos: {
    ataEleicaoStatus: string | null
    ataPrestacaoContasStatus: string | null
    debitosAtualizadosStatus: string | null
    procuracaoStatus: string | null
  }
  id: string
  motivoStatus: string | null
  origem: string | null
  prioridade: string
  probabilidade: string
  prontoDistribuicaoEm: string | null
  responsavelUnidade: string | null
  status: string
  titulo: string
  unidade: string | null
  valorEstimado: number | null
}

export type GkitJurInadimplenciaReportData = {
  alertas: string[]
  cliente: {
    cnpj: string | null
    id: string
    nome: string
  } | null
  consultaProcessualEm: string
  contratoVersao: 'jur-report-v1'
  filtros: {
    clienteId: string | null
    cnpj: string | null
    competencia: string
    dataFimExclusive: string
    dataInicio: string
    movimentosLimitPorProcesso: number
  }
  fontes: ReportSource[]
  processos: {
    cobrancasExecucoes: ReportProcess[]
    demaisProcessos: ReportProcess[]
    todos: ReportProcess[]
  }
  preJuridicos: ReportPreJuridico[]
}

export type GkitJurInadimplenciaReportInput = {
  clienteId?: string | null
  cnpj?: string | null
  competencia?: string | null
  dataFim?: string | null
  dataInicio?: string | null
  movimentosLimitPorProcesso?: number
}

const PROCESS_SELECT = [
  'id',
  'numero_cnj',
  'numero_cnj_limpo',
  'titulo',
  'parte_contraria',
  'unidade',
  'bloco',
  'cliente_id',
  'cliente_nome',
  'tipo_acompanhamento',
  'escritorio_responsavel_nome',
  'escritorio_responsavel_contato',
  'acompanhamento_autorizado_em',
  'acompanhamento_observacoes',
  'incluir_relatorio_mensal',
  'tribunal_sigla',
  'tribunal_alias',
  'grau',
  'classe_codigo',
  'classe_nome',
  'sistema_nome',
  'formato_nome',
  'assuntos',
  'natureza_operacional',
  'natureza_operacional_label',
  'natureza_operacional_confianca',
  'natureza_operacional_sinais',
  'orgao_julgador_nome',
  'data_ajuizamento',
  'ultima_movimentacao_em',
  'ultima_sincronizacao_em',
  'ultima_tentativa_sincronizacao_em',
  'ultima_sincronizacao_com_resultado_em',
  'ultimo_status_sincronizacao',
  'status',
  'status_monitoramento',
  'metadata_datajud',
  'observacoes',
  'updated_at',
].join(',')

const PRE_JURIDICO_SELECT = [
  'id',
  'titulo',
  'descricao',
  'origem',
  'area',
  'valor_estimado',
  'probabilidade',
  'prioridade',
  'status',
  'motivo_status',
  'data_entrada',
  'unidade',
  'bloco',
  'responsavel_unidade',
  'cotas_debito',
  'ata_eleicao_status',
  'ata_prestacao_contas_status',
  'debitos_atualizados_status',
  'procuracao_status',
  'pronto_distribuicao_em',
  'convertido_processo_id',
  'convertido_em',
  'metadata',
].join(',')

const SUMMARY_SELECT = [
  'processo_id',
  'nivel_prontidao',
  'resumo_operacional',
  'fase_processual',
  'pendencias_identificadas',
  'proximas_acoes_sugeridas',
  'riscos_alertas',
  'base_sincronizacao_em',
  'gerado_em',
].join(',')

const COLLECTION_NATURES = new Set([
  'execucao_titulo_extrajudicial',
  'cumprimento_sentenca',
  'cobranca_condominial',
  'cobranca_conhecimento',
  'acao_monitoria',
  'despejo_cobranca',
])

const OPEN_TASK_STATUSES = ['aberta', 'em_andamento', 'aguardando_terceiro']

function admin() {
  return createSupabaseAdminClient() as any
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function digits(value: unknown) {
  return String(value ?? '').replace(/\D/g, '')
}

function numberOrNull(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function stringList(value: unknown): string[] {
  return arrayValue(value).map((item) => {
    if (typeof item === 'string') return text(item)
    const record = recordValue(item)
    return text(record.nome) || text(record.label) || text(record.titulo) || text(record.descricao)
  }).filter(Boolean)
}

function positiveInt(value: unknown, fallback: number, max: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

function isoDate(value: unknown) {
  if (!value) return null
  const parsed = new Date(String(value))
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null
}

function monthPeriod(input: GkitJurInadimplenciaReportInput) {
  const competencia = text(input.competencia) || new Date().toISOString().slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(competencia)) throw new Error('competencia deve usar o formato YYYY-MM.')

  const start = input.dataInicio ? new Date(String(input.dataInicio)) : new Date(`${competencia}-01T00:00:00.000Z`)
  if (!Number.isFinite(start.getTime())) throw new Error('data_inicio invalida.')

  const end = input.dataFim ? new Date(String(input.dataFim)) : new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
  if (!Number.isFinite(end.getTime())) throw new Error('data_fim invalida.')
  if (end <= start) throw new Error('data_fim deve ser posterior a data_inicio.')

  return {
    competencia,
    dataFimExclusive: end.toISOString(),
    dataInicio: start.toISOString(),
  }
}

function clientName(row: Record<string, unknown>) {
  return text(row.nome) || text(row.razao_social) || text(row.nome_fantasia) || 'Cliente sem nome'
}

async function resolveClient(input: GkitJurInadimplenciaReportInput) {
  const cnpj = digits(input.cnpj)
  const clienteId = text(input.clienteId)
  if (!cnpj && !clienteId) throw new Error('Informe cnpj ou cliente_id.')

  let query = admin()
    .schema('ciclo')
    .from('clientes')
    .select('id,nome,nome_fantasia,razao_social,documento,cnpj_normalizado')
    .limit(1)

  if (clienteId) {
    query = query.eq('id', clienteId)
  } else {
    query = query.or(`documento.eq.${cnpj},cnpj_normalizado.eq.${cnpj}`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  const row = (data ?? [])[0] as Record<string, unknown> | undefined
  if (!row) return null

  return {
    cnpj: digits(row.cnpj_normalizado) || digits(row.documento) || cnpj || null,
    id: String(row.id),
    nome: clientName(row),
  }
}

function subjectList(row: Record<string, unknown>) {
  return arrayValue(row.assuntos).map((item) => {
    if (typeof item === 'string') return text(item)
    const record = recordValue(item)
    return text(record.nome) || text(record.name) || text(record.codigo)
  }).filter(Boolean)
}

function counterParties(value: unknown): ReportCounterparty[] {
  const raw = text(value)
  if (!raw) return []
  return raw
    .split(/\s*(?:;|\n|\r|\s\/\s)\s*/)
    .map((part) => text(part))
    .filter(Boolean)
    .map((nome) => ({ documento: null, nome, papel: null }))
}

function normalizeDebt(item: unknown, fonte: string): ReportDebt | null {
  const record = recordValue(item)
  if (!Object.keys(record).length) return null
  return {
    competencia: text(record.competencia) || null,
    fonte,
    recibo: text(record.recibo) || null,
    valor: numberOrNull(record.valor),
    vencimento: isoDate(record.vencimento),
  }
}

function sourceForProcess(row: Record<string, unknown>): ReportSource[] {
  const sources: ReportSource[] = [{
    consultaEm: text(row.updated_at) || null,
    detalhes: {
      origem_modulo: row.origem_modulo ?? null,
      tribunal_alias: row.tribunal_alias ?? null,
    },
    nome: 'GKIT Jur',
    tipo: 'gkit_jur',
  }]

  if (text(row.ultima_sincronizacao_com_resultado_em) || text(row.ultima_sincronizacao_em)) {
    sources.push({
      consultaEm: text(row.ultima_sincronizacao_com_resultado_em, text(row.ultima_sincronizacao_em)) || null,
      detalhes: {
        status: row.ultimo_status_sincronizacao ?? null,
        tribunal_alias: row.tribunal_alias ?? null,
      },
      nome: 'DataJud',
      tipo: 'datajud',
    })
  }

  return sources
}

function sourceForPreJuridico(row: Record<string, unknown>): ReportSource {
  return {
    consultaEm: text(row.convertido_em) || text(row.data_entrada) || null,
    detalhes: {
      origem: row.origem ?? null,
      status: row.status ?? null,
    },
    nome: 'GKIT Jur - pre-juridico',
    tipo: 'pre_juridico',
  }
}

function processSituation(row: Record<string, unknown>): ReportProcess['situacaoProcessual'] {
  const status = text(row.status)
  const syncStatus = text(row.ultimo_status_sincronizacao)
  if (status === 'suspenso') return 'suspenso'
  if (status === 'encerrado' || status === 'arquivado') return 'encerrado'
  if (status === 'ativo' && syncStatus === 'sucesso') return 'em_andamento'
  return 'nao_confirmada'
}

function relationType(row: Record<string, unknown>): ReportProcess['processoRelacionadoTipo'] {
  const natureza = text(row.natureza_operacional)
  const classe = text(row.classe_nome).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (natureza === 'cumprimento_sentenca' || classe.includes('cumprimento de sentenca')) return 'cumprimento'
  if (natureza === 'incidente_recurso' || /\b(agravo|apelacao|embargos|recurso)\b/.test(classe)) return 'recurso'
  return 'principal'
}

function office(row: Record<string, unknown>) {
  const tipo = text(row.tipo_acompanhamento, 'atuacao_genske')
  const escritorio = text(row.escritorio_responsavel_nome)
  if (tipo === 'atuacao_genske') {
    return { advogados: [] as ReportLawyer[], nomeAtual: 'Genske Advogados', tipo: 'genske_advogados' as const }
  }
  if (escritorio) {
    return { advogados: [] as ReportLawyer[], nomeAtual: escritorio, tipo: 'outro_escritorio' as const }
  }
  return { advogados: [] as ReportLawyer[], nomeAtual: null, tipo: 'nao_identificado' as const }
}

function movement(row: Record<string, unknown>): ReportMovement {
  return {
    codigo: numberOrNull(row.codigo),
    dataHora: text(row.data_hora) || null,
    descricao: text(row.nome, 'Movimentacao sem descricao'),
    geraAlerta: Boolean(row.gera_alerta),
    id: String(row.id),
    origem: text(row.origem, 'datajud'),
    relevante: Boolean(row.relevante),
  }
}

function summary(row: Record<string, unknown> | undefined): ReportProcessSummary | null {
  if (!row) return null
  return {
    baseSincronizacaoEm: text(row.base_sincronizacao_em) || null,
    faseProcessual: text(row.fase_processual) || null,
    geradoEm: text(row.gerado_em) || null,
    nivelProntidao: text(row.nivel_prontidao, 'sem_base'),
    pendenciasIdentificadas: stringList(row.pendencias_identificadas),
    proximasAcoesSugeridas: stringList(row.proximas_acoes_sugeridas),
    resumoOperacional: text(row.resumo_operacional) || null,
    riscosAlertas: stringList(row.riscos_alertas),
  }
}

function processAlerts(row: Record<string, unknown>, resumo: ReportProcessSummary | null) {
  const alerts: string[] = []
  if (!text(row.parte_contraria)) alerts.push('parte_contraria_nao_estruturada')
  if (!text(row.unidade) && !text(row.bloco)) alerts.push('unidade_nao_identificada_na_fonte_processual')
  if (!text(row.ultima_sincronizacao_com_resultado_em)) alerts.push('sem_sincronizacao_processual_com_resultado')
  if (text(row.ultimo_status_sincronizacao) === 'sem_resultado') alerts.push('processo_nao_confirmado_no_datajud')
  if (!resumo || resumo.nivelProntidao !== 'pronto') alerts.push('resumo_processual_nao_pronto')
  alerts.push('polo_do_condominio_nao_estruturado')
  alerts.push('advogado_e_oab_nao_estruturados')
  return alerts
}

function processUnits(row: Record<string, unknown>, debts: ReportDebt[]): ReportProcessUnit[] {
  const unidade = text(row.unidade) || null
  const bloco = text(row.bloco) || null
  if (!unidade && !bloco) return []
  return [{
    bloco,
    nivelVinculo: debts.length ? 'debito_identificado' : 'unidade_identificada',
    observacao: null,
    unidade,
  }]
}

function isCollectionProcess(row: Record<string, unknown>) {
  const calculated = classifyGkitJurProcessNature({
    assuntos: row.assuntos,
    classeCodigo: row.classe_codigo,
    classeNome: row.classe_nome,
    metadataDataJud: row.metadata_datajud,
    titulo: row.titulo,
  })
  const natureza = text(row.natureza_operacional)
    ? normalizeGkitJurProcessNature(row.natureza_operacional)
    : calculated.tipo
  return { collection: COLLECTION_NATURES.has(natureza), natureza }
}

function processRow(
  row: Record<string, unknown>,
  resumo: ReportProcessSummary | null,
  latestMovement: ReportMovement | null,
  periodMovements: ReportMovement[],
  tasks: ReportTask[],
): ReportProcess {
  const { collection, natureza } = isCollectionProcess(row)
  const metadata = recordValue(row.metadata_datajud)
  const debts = arrayValue(metadata.debitos_cobrados)
    .map((item) => normalizeDebt(item, 'gkit_jur.metadata_datajud.debitos_cobrados'))
    .filter((item): item is ReportDebt => Boolean(item))
  const units = processUnits(row, debts)
  const situacao = processSituation(row)
  const alerts = processAlerts(row, resumo)

  return {
    acompanhamentoObservacoes: text(row.acompanhamento_observacoes) || null,
    alertas: alerts,
    assuntos: subjectList(row),
    classe: text(row.classe_nome) || null,
    classificacaoRelatorio: collection ? 'cobranca_execucao' : 'demais_processos',
    dataAjuizamento: text(row.data_ajuizamento) || null,
    debitosCobrados: debts,
    escritorio: office(row),
    fontes: sourceForProcess(row),
    foroOrgao: text(row.orgao_julgador_nome) || null,
    grau: text(row.grau) || null,
    incluirRelatorioMensal: row.incluir_relatorio_mensal !== false,
    marcacaoAutomaticaPermitida: collection && units.some((unit) => unit.nivelVinculo === 'debito_identificado'),
    movimentacoesPeriodo: periodMovements,
    naturezaOperacional: natureza,
    numeroCnj: formatCnj(text(row.numero_cnj, text(row.numero_cnj_limpo))),
    numeroCnjLimpo: text(row.numero_cnj_limpo),
    observacoesLimitacoes: [
      text(row.observacoes) || null,
      ...alerts.map((alert) => `Limitacao: ${alert}.`),
    ].filter(Boolean) as string[],
    partesContrarias: counterParties(row.parte_contraria),
    pendencias: tasks,
    poloCondominio: 'nao_confirmado',
    processoId: String(row.id),
    processoPrincipalId: null,
    processoRelacionadoTipo: relationType(row),
    resumo,
    sistema: text(row.sistema_nome) || text(row.formato_nome) || null,
    situacaoProcessual: situacao,
    statusMonitoramento: text(row.status_monitoramento, 'monitorando'),
    statusProcesso: text(row.status, 'ativo'),
    tipoAcompanhamento: text(row.tipo_acompanhamento, 'atuacao_genske'),
    titulo: text(row.titulo) || null,
    tribunal: text(row.tribunal_sigla) || null,
    ultimaMovimentacao: latestMovement,
    ultimaSincronizacaoComResultadoEm: text(row.ultima_sincronizacao_com_resultado_em) || null,
    ultimaSincronizacaoEm: text(row.ultima_sincronizacao_em) || null,
    unidades: units,
    valorAcao: numberOrNull(metadata.valor_acao ?? recordValue(metadata.valores).causa),
  }
}

function taskRow(row: Record<string, unknown>): ReportTask {
  return {
    id: String(row.id),
    prazoAt: text(row.prazo_at) || null,
    prioridade: text(row.prioridade, 'media'),
    status: text(row.status, 'aberta'),
    tipo: text(row.tipo, 'providencia_interna'),
    titulo: text(row.titulo, 'Tarefa sem titulo'),
  }
}

function preJuridicoRow(row: Record<string, unknown>): ReportPreJuridico {
  const cotas = arrayValue(row.cotas_debito)
    .map((item) => normalizeDebt(item, 'gkit_jur.pre_juridicos.cotas_debito'))
    .filter((item): item is ReportDebt => Boolean(item))
  const alertas = [
    'pre_distribuicao_nao_comprova_ajuizamento',
    ...(!cotas.length ? ['debitos_pre_juridicos_nao_estruturados'] : []),
  ]

  return {
    alertas,
    area: text(row.area) || null,
    bloco: text(row.bloco) || null,
    cotasDebito: cotas,
    dataEntrada: text(row.data_entrada) || null,
    descricao: text(row.descricao),
    documentos: {
      ataEleicaoStatus: text(row.ata_eleicao_status) || null,
      ataPrestacaoContasStatus: text(row.ata_prestacao_contas_status) || null,
      debitosAtualizadosStatus: text(row.debitos_atualizados_status) || null,
      procuracaoStatus: text(row.procuracao_status) || null,
    },
    id: String(row.id),
    motivoStatus: text(row.motivo_status) || null,
    origem: text(row.origem) || null,
    prioridade: text(row.prioridade, 'media'),
    probabilidade: text(row.probabilidade, 'media'),
    prontoDistribuicaoEm: text(row.pronto_distribuicao_em) || null,
    responsavelUnidade: text(row.responsavel_unidade) || null,
    status: text(row.status, 'em_analise'),
    titulo: text(row.titulo, 'Pre-juridico sem titulo'),
    unidade: text(row.unidade) || null,
    valorEstimado: numberOrNull(row.valor_estimado),
  }
}

async function loadProcessRows(clienteId: string) {
  const result = await admin()
    .schema('gkit_jur')
    .from('processos')
    .select(PROCESS_SELECT)
    .eq('cliente_id', clienteId)
    .eq('incluir_relatorio_mensal', true)
    .order('updated_at', { ascending: false })
    .limit(1000)

  if (result.error) throw new Error(result.error.message)
  return (result.data ?? []) as Array<Record<string, unknown>>
}

async function loadSummaryRows(processIds: string[]) {
  if (!processIds.length) return new Map<string, Record<string, unknown>>()
  const result = await admin()
    .schema('gkit_jur')
    .from('processos_resumos')
    .select(SUMMARY_SELECT)
    .in('processo_id', processIds)

  if (result.error) throw new Error(result.error.message)
  return new Map(((result.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.processo_id), row]))
}

async function loadPeriodMovements(processIds: string[], dataInicio: string, dataFimExclusive: string, perProcessLimit: number) {
  const grouped = new Map<string, ReportMovement[]>()
  if (!processIds.length) return grouped

  const result = await admin()
    .schema('gkit_jur')
    .from('movimentacoes')
    .select('id,processo_id,codigo,nome,data_hora,origem,relevante,gera_alerta')
    .in('processo_id', processIds)
    .gte('data_hora', dataInicio)
    .lt('data_hora', dataFimExclusive)
    .order('data_hora', { ascending: false, nullsFirst: false })
    .limit(Math.min(processIds.length * perProcessLimit * 2, 5000))

  if (result.error) throw new Error(result.error.message)
  for (const row of (result.data ?? []) as Array<Record<string, unknown>>) {
    const processoId = String(row.processo_id)
    const rows = grouped.get(processoId) ?? []
    if (rows.length < perProcessLimit) rows.push(movement(row))
    grouped.set(processoId, rows)
  }
  return grouped
}

async function loadLatestMovements(processIds: string[]) {
  const grouped = new Map<string, ReportMovement>()
  if (!processIds.length) return grouped

  const result = await admin()
    .schema('gkit_jur')
    .from('movimentacoes')
    .select('id,processo_id,codigo,nome,data_hora,origem,relevante,gera_alerta')
    .in('processo_id', processIds)
    .order('data_hora', { ascending: false, nullsFirst: false })
    .limit(Math.min(processIds.length * 10, 5000))

  if (result.error) throw new Error(result.error.message)
  for (const row of (result.data ?? []) as Array<Record<string, unknown>>) {
    const processoId = String(row.processo_id)
    if (!grouped.has(processoId)) grouped.set(processoId, movement(row))
  }
  return grouped
}

async function loadOpenTasks(processIds: string[]) {
  const grouped = new Map<string, ReportTask[]>()
  if (!processIds.length) return grouped

  const result = await admin()
    .schema('gkit_jur')
    .from('tarefas')
    .select('id,processo_id,tipo,titulo,status,prioridade,prazo_at')
    .in('processo_id', processIds)
    .in('status', OPEN_TASK_STATUSES)
    .order('prazo_at', { ascending: true, nullsFirst: false })
    .limit(2000)

  if (result.error) throw new Error(result.error.message)
  for (const row of (result.data ?? []) as Array<Record<string, unknown>>) {
    const processoId = String(row.processo_id)
    const rows = grouped.get(processoId) ?? []
    rows.push(taskRow(row))
    grouped.set(processoId, rows)
  }
  return grouped
}

async function loadPreJuridicos(clienteId: string) {
  const result = await admin()
    .schema('gkit_jur')
    .from('pre_juridicos')
    .select(PRE_JURIDICO_SELECT)
    .eq('cliente_id', clienteId)
    .neq('status', 'descartado')
    .order('updated_at', { ascending: false })
    .limit(500)

  if (result.error) throw new Error(result.error.message)
  return (result.data ?? []) as Array<Record<string, unknown>>
}

export async function getGkitJurInadimplenciaReportData(input: GkitJurInadimplenciaReportInput): Promise<GkitJurInadimplenciaReportData> {
  const period = monthPeriod(input)
  const movimentosLimitPorProcesso = positiveInt(input.movimentosLimitPorProcesso, 25, 100)
  const cnpj = digits(input.cnpj) || null
  const cliente = await resolveClient(input)
  const consultaProcessualEm = new Date().toISOString()

  if (!cliente) {
    return {
      alertas: ['cliente_nao_encontrado_para_cnpj_ou_cliente_id_informado'],
      cliente: null,
      consultaProcessualEm,
      contratoVersao: 'jur-report-v1',
      filtros: {
        clienteId: text(input.clienteId) || null,
        cnpj,
        competencia: period.competencia,
        dataFimExclusive: period.dataFimExclusive,
        dataInicio: period.dataInicio,
        movimentosLimitPorProcesso,
      },
      fontes: [],
      processos: { cobrancasExecucoes: [], demaisProcessos: [], todos: [] },
      preJuridicos: [],
    }
  }

  const processRows = await loadProcessRows(cliente.id)
  const processIds = processRows.map((row) => String(row.id))
  const [summaryRows, periodMovements, latestMovements, tasks, preJuridicos] = await Promise.all([
    loadSummaryRows(processIds),
    loadPeriodMovements(processIds, period.dataInicio, period.dataFimExclusive, movimentosLimitPorProcesso),
    loadLatestMovements(processIds),
    loadOpenTasks(processIds),
    loadPreJuridicos(cliente.id),
  ])
  const processos = processRows.map((row) => {
    const processoId = String(row.id)
    return processRow(
      row,
      summary(summaryRows.get(processoId)),
      latestMovements.get(processoId) ?? null,
      periodMovements.get(processoId) ?? [],
      tasks.get(processoId) ?? [],
    )
  })
  const cobrancasExecucoes = processos.filter((processo) => processo.classificacaoRelatorio === 'cobranca_execucao')
  const demaisProcessos = processos.filter((processo) => processo.classificacaoRelatorio === 'demais_processos')
  const preJuridicoItems = preJuridicos.map(preJuridicoRow)

  return {
    alertas: [
      ...(!processos.length ? ['nenhum_processo_relatorio_mensal_encontrado_para_cliente'] : []),
      ...(!preJuridicoItems.length ? ['nenhum_pre_juridico_aberto_encontrado_para_cliente'] : []),
    ],
    cliente,
    consultaProcessualEm,
    contratoVersao: 'jur-report-v1',
    filtros: {
      clienteId: cliente.id,
      cnpj: cliente.cnpj ?? cnpj,
      competencia: period.competencia,
      dataFimExclusive: period.dataFimExclusive,
      dataInicio: period.dataInicio,
      movimentosLimitPorProcesso,
    },
    fontes: [{
      consultaEm: consultaProcessualEm,
      detalhes: {
        modulo: 'gkit-jur',
        contrato_versao: 'jur-report-v1',
      },
      nome: 'GKIT Jur',
      tipo: 'gkit_jur',
    }],
    processos: {
      cobrancasExecucoes,
      demaisProcessos,
      todos: processos,
    },
    preJuridicos: preJuridicoItems,
  }
}
