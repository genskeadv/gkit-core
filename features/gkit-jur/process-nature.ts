export type GkitJurNaturezaOperacional =
  | 'execucao_titulo_extrajudicial'
  | 'execucao_fiscal'
  | 'cumprimento_sentenca'
  | 'cobranca_condominial'
  | 'cobranca_conhecimento'
  | 'acao_monitoria'
  | 'despejo_cobranca'
  | 'incidente_recurso'
  | 'conhecimento_civel'
  | 'nao_classificado'

export type GkitJurNaturezaConfianca = 'alta' | 'media' | 'baixa'

export type GkitJurNaturezaSinal = {
  campo: string
  valor: string
}

export type GkitJurProcessNatureIndicator = {
  tipo: GkitJurNaturezaOperacional
  label: string
  confianca: GkitJurNaturezaConfianca
  motivo: string
  sinais: GkitJurNaturezaSinal[]
}

type Rule = {
  confidence: GkitJurNaturezaConfianca
  label: string
  motivo: string
  pattern: RegExp
  tipo: GkitJurNaturezaOperacional
}

export const GKIT_JUR_NATURE_OPTIONS: Array<{ label: string; value: GkitJurNaturezaOperacional }> = [
  { label: 'Execução extrajudicial', value: 'execucao_titulo_extrajudicial' },
  { label: 'Execução fiscal', value: 'execucao_fiscal' },
  { label: 'Cumprimento de sentença', value: 'cumprimento_sentenca' },
  { label: 'Cobrança condominial', value: 'cobranca_condominial' },
  { label: 'Cobrança / conhecimento', value: 'cobranca_conhecimento' },
  { label: 'Ação monitória', value: 'acao_monitoria' },
  { label: 'Despejo com cobrança', value: 'despejo_cobranca' },
  { label: 'Incidente ou recurso', value: 'incidente_recurso' },
  { label: 'Conhecimento cível', value: 'conhecimento_civel' },
  { label: 'Não classificado', value: 'nao_classificado' },
]

const LABELS = new Map(GKIT_JUR_NATURE_OPTIONS.map((option) => [option.value, option.label]))

const CLASS_RULES: Rule[] = [
  {
    confidence: 'alta',
    label: 'Cumprimento de sentença',
    motivo: 'Classe processual indica cumprimento de sentença.',
    pattern: /\bcumprimento (provisorio |definitivo )?de sentenca\b/,
    tipo: 'cumprimento_sentenca',
  },
  {
    confidence: 'alta',
    label: 'Execução fiscal',
    motivo: 'Classe processual indica execução fiscal.',
    pattern: /\bexecucao fiscal\b/,
    tipo: 'execucao_fiscal',
  },
  {
    confidence: 'alta',
    label: 'Execução extrajudicial',
    motivo: 'Classe processual indica execução de título extrajudicial.',
    pattern: /\bexecucao (de )?titulo extrajudicial\b|\bexecucao extrajudicial\b/,
    tipo: 'execucao_titulo_extrajudicial',
  },
  {
    confidence: 'alta',
    label: 'Ação monitória',
    motivo: 'Classe processual indica ação monitória.',
    pattern: /\bmonitoria\b|\bacao monitoria\b/,
    tipo: 'acao_monitoria',
  },
  {
    confidence: 'alta',
    label: 'Despejo com cobrança',
    motivo: 'Classe processual indica despejo com cobrança.',
    pattern: /\bdespejo\b/,
    tipo: 'despejo_cobranca',
  },
  {
    confidence: 'alta',
    label: 'Cobrança / conhecimento',
    motivo: 'Classe processual indica ação de cobrança.',
    pattern: /\bacao de cobranca\b|\bcobranca\b/,
    tipo: 'cobranca_conhecimento',
  },
  {
    confidence: 'media',
    label: 'Incidente ou recurso',
    motivo: 'Classe processual indica recurso ou incidente.',
    pattern: /\b(agravo|apelacao|embargos|recurso|conflito de competencia|incidente)\b/,
    tipo: 'incidente_recurso',
  },
]

const SUBJECT_RULES: Rule[] = [
  {
    confidence: 'media',
    label: 'Cobrança condominial',
    motivo: 'Assunto ou título indica débito condominial.',
    pattern: /\b(condominio|condominial|despesas condominiais|taxa condominial|cota condominial)\b/,
    tipo: 'cobranca_condominial',
  },
  {
    confidence: 'media',
    label: 'Cobrança / conhecimento',
    motivo: 'Assunto ou título indica recuperação de crédito/cobrança.',
    pattern: /\b(cobranca|inadimplemento|divida|debito|obrigacao de pagar|duplicata|cheque|nota promissoria)\b/,
    tipo: 'cobranca_conhecimento',
  },
]

const GENERAL_EXECUTION_RULE: Rule = {
  confidence: 'media',
  label: 'Execução extrajudicial',
  motivo: 'Classe processual indica execução, mas sem detalhe suficiente do título.',
  pattern: /\bexecucao\b/,
  tipo: 'execucao_titulo_extrajudicial',
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalize(value: unknown) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function assuntoNome(assunto: unknown) {
  if (typeof assunto === 'string') return assunto
  if (!assunto || typeof assunto !== 'object') return ''
  const record = assunto as Record<string, unknown>
  return text(record.nome) || text(record.name) || text(record.label) || text(record.descricao)
}

function makeSignal(campo: string, valor: unknown): GkitJurNaturezaSinal | null {
  const current = text(valor)
  return current ? { campo, valor: current } : null
}

function indicator(rule: Rule, sinais: Array<GkitJurNaturezaSinal | null>): GkitJurProcessNatureIndicator {
  return {
    tipo: rule.tipo,
    label: rule.label,
    confianca: rule.confidence,
    motivo: rule.motivo,
    sinais: sinais.filter(Boolean) as GkitJurNaturezaSinal[],
  }
}

function firstMatch(rules: Rule[], value: string) {
  return rules.find((rule) => rule.pattern.test(value)) ?? null
}

export function classifyGkitJurProcessNature(input: {
  assuntos?: unknown
  classeCodigo?: unknown
  classeNome?: unknown
  metadataDataJud?: unknown
  titulo?: unknown
}): GkitJurProcessNatureIndicator {
  const classeNome = text(input.classeNome)
  const classe = normalize(classeNome)
  const assuntos = Array.isArray(input.assuntos) ? input.assuntos.map(assuntoNome).filter(Boolean) : []
  const assuntosText = normalize(assuntos.join(' '))
  const titulo = text(input.titulo)
  const tituloText = normalize(titulo)
  const sinaisBase = [
    makeSignal('classe', classeNome),
    makeSignal('classe_codigo', input.classeCodigo === null || input.classeCodigo === undefined ? '' : String(input.classeCodigo)),
    makeSignal('assuntos', assuntos.slice(0, 4).join('; ')),
    makeSignal('titulo', titulo),
  ]

  const classRule = firstMatch(CLASS_RULES, classe)
  if (classRule) return indicator(classRule, sinaisBase)

  if (GENERAL_EXECUTION_RULE.pattern.test(classe)) {
    return indicator(GENERAL_EXECUTION_RULE, sinaisBase)
  }

  const subjectRule = firstMatch(SUBJECT_RULES, `${assuntosText} ${tituloText}`)
  if (subjectRule) return indicator(subjectRule, sinaisBase)

  if (/\bprocedimento comum civel\b|\bprocedimento comum\b/.test(classe)) {
    return indicator({
      confidence: 'baixa',
      label: 'Conhecimento cível',
      motivo: 'Classe é genérica; não há sinal suficiente de execução ou cobrança específica.',
      pattern: /./,
      tipo: 'conhecimento_civel',
    }, sinaisBase)
  }

  return {
    tipo: 'nao_classificado',
    label: LABELS.get('nao_classificado') ?? 'Não classificado',
    confianca: 'baixa',
    motivo: 'Dados do DataJud ainda não permitem identificar a natureza operacional.',
    sinais: sinaisBase.filter(Boolean) as GkitJurNaturezaSinal[],
  }
}

export function normalizeGkitJurProcessNature(value: unknown): GkitJurNaturezaOperacional {
  const current = text(value)
  return GKIT_JUR_NATURE_OPTIONS.some((option) => option.value === current)
    ? current as GkitJurNaturezaOperacional
    : 'nao_classificado'
}

