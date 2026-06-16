export type CrmStage = 'lead' | 'diagnostico' | 'proposta' | 'negociacao' | 'fechado' | 'perdido'

export type CrmEmpresa = {
  id: string
  nome: string
  documento: string
  tipo: 'PF' | 'PJ'
  segmento: string
  status: 'prospecto' | 'ativo'
  carteira: string
  contatos: number
  oportunidades: number
  valorPipeline: number
}

export type CrmContato = {
  id: string
  nome: string
  email: string
  telefone: string
  cargo: string
}

export type CrmOportunidade = {
  id: string
  titulo: string
  empresa: string
  contato: string
  etapa: CrmStage
  status: 'aberta' | 'ganha' | 'perdida'
  valor: number
  probabilidade: number
  diasSemInteracao: number
  responsavel: string
  carteira: string
  origem: string
  ultimaInteracao: string
  proximaAcao: string
}

export type CrmPropostaResumo = {
  total: number
  valorTotal: number
  enviadas: number
}

export type CrmData = {
  empresas: CrmEmpresa[]
  contatos: CrmContato[]
  oportunidades: CrmOportunidade[]
  propostas: CrmPropostaResumo
  databaseReady: boolean
}

export type CrmListRow = {
  id: string
  title: string
  subtitle: string
  status: string
  value: string
  meta: string
  tone?: 'primary' | 'success' | 'warning' | 'danger'
}

export type CrmOpportunityFormOption = {
  id: string
  label: string
}

export type CrmOpportunityFormData = {
  empresas: CrmOpportunityFormOption[]
  contatos: CrmOpportunityFormOption[]
  carteiras: CrmOpportunityFormOption[]
  oportunidades: CrmOpportunityFormOption[]
}

export type CrmOpportunityRecord = {
  id: string
  carteira_id: string | null
  empresa_id: string
  contato_id: string | null
  titulo: string
  descricao: string | null
  etapa: CrmStage
  status: 'aberta' | 'ganha' | 'perdida'
  valor: number
  probabilidade: number
  origem: string | null
  proxima_acao: string | null
  data_ultima_interacao: string | null
  data_proxima_acao: string | null
  motivo_perda: string | null
}

export type CrmEmpresaRecord = {
  id: string
  carteira_id: string | null
  nome: string
  documento: string | null
  tipo: 'PF' | 'PJ'
  segmento: string | null
  origem: string | null
  status: 'prospecto' | 'ativo'
  observacoes: string | null
}

export type CrmContatoRecord = {
  id: string
  empresa_ids: string[]
  nome: string
  email: string | null
  telefone: string | null
  cargo: string | null
  origem: string | null
  status: 'ativo' | 'inativo' | 'arquivado'
}

export type CrmPropostaRecord = {
  id: string
  oportunidade_id: string
  carteira_id: string | null
  numero: string | null
  titulo: string
  status: 'rascunho' | 'enviada' | 'aprovada' | 'recusada' | 'expirada'
  valor_total: number
  enviada_em: string | null
  validade_em: string | null
  observacoes: string | null
}

export type CrmAtividadeRecord = {
  id: string
  oportunidade_id: string | null
  empresa_id: string | null
  contato_id: string | null
  carteira_id: string | null
  tipo: 'ligacao' | 'email' | 'reuniao' | 'tarefa' | 'nota'
  titulo: string
  descricao: string | null
  realizada_em: string | null
  prazo_em: string | null
  concluida: boolean
}
