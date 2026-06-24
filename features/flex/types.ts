export type FlexTone = 'primary' | 'success' | 'warning' | 'danger'

export type FlexListRow = {
  id: string
  title: string
  subtitle: string
  status: string
  value: string
  meta: string
  detailHref?: string
  tone?: FlexTone
}

export type FlexComissaoListItem = {
  id: string
  competencia: string
  colaborador: string
  receita: string
  tipo: string
  valor_base: number
  percentual: number
  valor_comissao: number
  status: string
  origem: string | null
  observacao: string | null
}

export type FlexOption = {
  id: string
  label: string
  meta?: string
}

export type FlexColaborador = {
  id: string
  usuario_id: string
  carteira_id: string | null
  time_id: string | null
  gestor_usuario_id: string | null
  cargo_operacional: string | null
  data_inicio: string | null
  status: string
  salario: number
  participacao_honorarios: number
  pro_labore: number
  ajuda_custo: number
  outros_vencimentos: number
  beneficio_descricao: string | null
  beneficio_valor: number
  recebe_comissoes: boolean
  observacoes: string | null
}

export type FlexTime = {
  id: string
  nome: string
  descricao: string | null
  status: string
}

export type FlexCategoriaFinanceira = {
  id: string
  nome: string
  macrogrupo: string
  tipo: string
  status: string
}

export type FlexTipoPagamento = {
  id: string
  codigo: string
  nome: string
  status: string
}

export type FlexTipoComissao = {
  id: string
  nome: string
  categoria_id: string | null
  percentual: number
  base_calculo: string
  escopo: string
  inicio_vigencia: string | null
  fim_vigencia: string | null
  status: string
  observacao: string | null
}

export type FlexReceita = {
  id: string
  colaborador_id: string | null
  time_id: string | null
  categoria_id: string | null
  cliente: string
  descricao: string | null
  competencia: string
  data_recebimento: string | null
  valor_base: number
  valor_recebido: number
  status: string
  origem: string | null
  metadata?: Record<string, unknown> | null
}

export type FlexExtrato = {
  id: string
  banco: string | null
  conta: string | null
  periodo_inicio: string | null
  periodo_fim: string | null
  saldo_inicial: number | null
  saldo_final: number | null
  status: string
}

export type FlexExtratoLancamento = {
  id: string
  extrato_id: string
  categoria_id: string | null
  previsao_despesa_id?: string | null
  data_lancamento: string
  fornecedor?: string | null
  historico: string | null
  descricao: string | null
  valor: number
  tipo: string
  macrogrupo: string | null
  status_classificacao: string
  confianca: number | null
  conciliado: boolean
}

export type FlexDespesaInlineRow = FlexExtratoLancamento & {
  categoria_nome?: string | null
}

export type FlexPrevisaoDespesa = {
  id: string
  fornecedor: string
  tipo_despesa: string
  aliases?: string[]
  categoria_id: string | null
  macrogrupo: string | null
  valor_previsto: number
  dia_previsto: number
  competencia_inicio: string
  competencia_fim: string | null
  recorrente: boolean
  status: string
  origem: string
  observacao: string | null
}

export type FlexValidacaoItem = {
  id: string
  competencia: string
  previsao_id: string | null
  extrato_lancamento_id: string | null
  tipo: string
  fornecedor: string | null
  descricao: string | null
  valor_previsto: number | null
  valor_realizado: number | null
  data_prevista: string | null
  data_realizada: string | null
  diferenca: number
  status: string
  decisao: string | null
  justificativa: string | null
}

export type FlexComissao = {
  id: string
  receita_id: string | null
  colaborador_id: string
  tipo_comissao_id: string | null
  fechamento_id: string | null
  competencia: string
  valor_base: number
  percentual: number
  valor_comissao: number
  status: string
  origem: string | null
  observacao: string | null
}

export type FlexReceitaMapeamento = {
  id: string
  origem: string
  vendedor_nome: string
  categoria_id: string | null
  destino_tipo: 'colaborador' | 'time'
  colaborador_id: string | null
  time_id: string | null
  prioridade: number
  status: string
  observacao: string | null
}

export type FlexReceitaCategoriaPendencia = {
  categoriaOrigem: string
  count: number
  latestCompetencia: string
  sample: string
  total: number
}

export type FlexReceitaCategoriaMapeamento = {
  id: string
  origem: string
  categoria_origem: string
  categoria_id: string
  status: string
  observacao: string | null
  categoria?: {
    nome?: string | null
    macrogrupo?: string | null
  } | null
}

export type FlexDespesaCategoriaPendencia = {
  termoOrigem: string
  count: number
  latestCompetencia: string
  sample: string
  total: number
}

export type FlexDespesaCategoriaMapeamento = {
  id: string
  origem: string
  termo_origem: string
  categoria_id: string
  macrogrupo: string | null
  status: string
  observacao: string | null
  categoria?: {
    nome?: string | null
    macrogrupo?: string | null
  } | null
}

export type FlexPagamentoAgenda = {
  id: string
  tipo_pagamento_id: string | null
  colaborador_id: string | null
  time_id: string | null
  descricao: string | null
  dia_previsto: number | null
  valor_bruto: number
  valor_descontos: number
  percentual: number
  inicio_competencia: string
  fim_competencia: string | null
  status: string
}

export type FlexPagamento = {
  id: string
  colaborador_id: string
  tipo_pagamento_id: string | null
  agenda_id: string | null
  comissao_id: string | null
  fechamento_id: string | null
  competencia: string
  descricao: string | null
  data_prevista: string | null
  data_pagamento: string | null
  valor_bruto: number
  valor_descontos: number
  valor_liquido: number
  status: string
  origem: string | null
  observacao: string | null
}

export type FlexFechamento = {
  id: string
  competencia: string
  status: string
  receita_total: number
  despesa_total: number
  orcamento_total: number
  comissao_total: number
  pagamentos_previstos_total: number
  pagamentos_pagos_total: number
  saldo_operacional: number
  pendencias_total: number
  fechado_em: string | null
  reabertura_motivo: string | null
}

export type FlexFormData = {
  categorias: FlexOption[]
  categoriasDespesa: FlexOption[]
  categoriasReceita: FlexOption[]
  carteiras: FlexOption[]
  colaboradores: FlexOption[]
  comissoes: FlexOption[]
  competencias: FlexOption[]
  extratoLancamentos: FlexOption[]
  previsoesDespesa: FlexOption[]
  tiposPagamento: FlexOption[]
  tiposComissao: FlexOption[]
  times: FlexOption[]
  usuarios: FlexOption[]
  usuariosColaborador: FlexOption[]
}

export type FlexDashboardData = {
  cards: Array<{ label: string; value: string; hint: string; tone?: FlexTone }>
  pendencias: FlexListRow[]
  pendenciasReceitas: FlexListRow[]
  pendenciasDespesas: FlexListRow[]
}

export type FlexCashFlowData = {
  competenciaMes: string
  label: string
  cards: Array<{ label: string; value: string; hint: string; tone?: FlexTone }>
  previstas: FlexListRow[]
  abertas: FlexListRow[]
  movimentos: FlexListRow[]
}
