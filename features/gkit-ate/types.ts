export type GkitAteTone = 'primary' | 'success' | 'warning' | 'danger'

export type GkitAteStatus = 'aberto' | 'encerrado'

export type GkitAteTarefaStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'

export type GkitAteListRow = {
  id: string
  title: string
  subtitle: string
  status: string
  value: string
  meta: string
  detailHref?: string
  tone?: GkitAteTone
}

export type GkitAteAtendimento = {
  id: string
  codigo_publico: string
  source_key: string
  astrea_codigo: string | null
  atendimento_tipo_id: string | null
  tipo: string | null
  titulo: string
  cliente_nome: string
  outros_envolvidos: string | null
  objeto: string | null
  observacoes: string | null
  etiquetas: string[]
  data_criacao: string | null
  prazo_finalizacao: string | null
  data_encerramento: string | null
  data_ultimo_historico: string | null
  ultimo_historico: string | null
  url_processo: string | null
  responsavel: string | null
  acesso: string | null
  status: GkitAteStatus
  tarefas_total: number
  tarefas_pendentes: number
}

export type GkitAteTarefa = {
  id: string
  atendimento_id: string
  atendimento_status: GkitAteStatus
  atendimento_titulo: string
  cliente_nome: string
  tarefa_tipo_id: string | null
  tipo_nome: string | null
  descricao: string
  responsavel: string | null
  data_prevista: string | null
  data_conclusao: string | null
  status: GkitAteTarefaStatus
  origem: string
  outras_tarefas_abertas: number
}

export type GkitAteAtendimentoDetail = GkitAteAtendimento & {
  papel_cliente: string | null
  outros_clientes: string | null
  pasta: string | null
  acao: string | null
  numero: string | null
  data_distribuicao: string | null
  materia: string | null
  detalhes: string | null
  valores: Array<{ label: string; value: string }>
  decisao_processo: string | null
  resultado_processo: string | null
  instancia_original: string | null
  instancia_atual: string | null
  numero_juizo: string | null
  vara: string | null
  foro: string | null
  tarefas: GkitAteTarefa[]
}

export type GkitAteTipoOption = {
  id: string
  label: string
  descricaoPadrao?: string
}

export type GkitAteFormData = {
  atendimentoTipos: GkitAteTipoOption[]
  tarefaTipos: GkitAteTipoOption[]
}

export type GkitAteDashboardData = {
  cards: Array<{ label: string; value: string; hint: string }>
  atendimentos: GkitAteListRow[]
  tarefas: GkitAteListRow[]
  porResponsavel: GkitAteListRow[]
  health?: GkitAteHealth
}

export type GkitAteImportacao = {
  id: string
  tipo: string
  status: string
  arquivo_nome: string | null
  total_linhas: number
  linhas_validas: number
  atendimentos_criados: number
  atendimentos_atualizados: number
  linhas_ignoradas: number
  erro: string | null
  criado_em: string
  finalizado_em: string | null
}

export type GkitAteHealth = {
  ok: boolean
  title?: string
  message?: string
  detail?: string
}
