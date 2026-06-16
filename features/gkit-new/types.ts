export type GkitNewTone = 'primary' | 'success' | 'warning' | 'danger'

export type GkitNewOption = {
  id: string
  label: string
  meta?: string
}

export type GkitNewListRow = {
  id: string
  title: string
  subtitle: string
  status: string
  value: string
  meta: string
  detailHref?: string
  tone?: GkitNewTone
}

export type GkitNewCliente = {
  id: string
  nome: string
  documento: string
  documento_tipo: 'cpf' | 'cnpj'
  status: 'prospecto' | 'ativo'
  observacoes: string | null
  contatos: number
  oportunidades: number
}

export type GkitNewContato = {
  id: string
  nome: string
  descricao: string | null
  email: string | null
  celular: string | null
  clientes: number
}

export type GkitNewWorkflowModelo = {
  id: string
  descricao: string
  dias: number
  responsavel_id: string | null
  responsavel_nome: string
  ativo: boolean
  ordem: number
}

export type GkitNewOportunidadeStatus = 'nova' | 'proposta_enviada' | 'em_negociacao' | 'aprovada' | 'encerrada'

export type GkitNewOportunidadeTipo = 'mensal' | 'pontual'

export type GkitNewOportunidade = {
  id: string
  cliente_id: string
  cliente_nome: string
  contato_id: string
  contato_nome: string
  data: string
  descricao: string
  tipo: GkitNewOportunidadeTipo
  valor: number
  escopo: string | null
  status: GkitNewOportunidadeStatus
  motivo_encerramento_antecipado: string | null
  responsavel_id: string | null
  responsavel_nome: string
  tarefas_pendentes: number
  tarefas_total: number
}

export type GkitNewTarefa = {
  id: string
  oportunidade_id: string
  oportunidade_descricao: string
  cliente_id: string
  cliente_nome: string
  descricao: string
  data_prevista: string
  responsavel_id: string | null
  responsavel_nome: string
  status: 'pendente' | 'concluida' | 'cancelada'
}

export type GkitNewEvento = {
  id: string
  entidade: string
  entidade_id: string
  usuario_id: string | null
  usuario_nome: string
  tipo: string
  descricao: string
  criado_em: string
}

export type GkitNewClienteRecord = {
  id: string
  nome: string
  documento: string
  documento_tipo: 'cpf' | 'cnpj'
  status: 'prospecto' | 'ativo'
  observacoes: string | null
}

export type GkitNewContatoRecord = {
  id: string
  nome: string
  descricao: string | null
  email: string | null
  celular: string | null
  cliente_ids: string[]
}

export type GkitNewWorkflowRecord = {
  id: string
  descricao: string
  dias: number
  responsavel_id: string | null
  ativo: boolean
  ordem: number
}

export type GkitNewOportunidadeRecord = {
  id: string
  cliente_id: string
  contato_id: string
  data: string
  descricao: string
  tipo: GkitNewOportunidadeTipo
  valor: number
  escopo: string | null
  status: GkitNewOportunidadeStatus
  motivo_encerramento_antecipado: string | null
  responsavel_id: string | null
}

export type GkitNewFormData = {
  clientes: GkitNewOption[]
  contatos: GkitNewOption[]
  clienteContatos: Array<{ cliente_id: string; contato_id: string }>
  oportunidades: GkitNewOption[]
  usuarios: GkitNewOption[]
}

export type GkitNewDashboardData = {
  cards: Array<{ label: string; value: string; hint: string }>
  tarefas: GkitNewListRow[]
  readiness: GkitNewListRow[]
  health?: GkitNewHealth
}

export type GkitNewGestaoData = {
  cards: Array<{ label: string; value: string; hint: string }>
  oportunidadesPorStatus: GkitNewListRow[]
  produtividade: GkitNewListRow[]
  eventos: GkitNewListRow[]
  health?: GkitNewHealth
}

export type GkitNewHealth = {
  ok: boolean
  title?: string
  message?: string
  detail?: string
}
