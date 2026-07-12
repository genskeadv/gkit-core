import type { OperationalKpi, OperationalQuickLink } from '@/features/shared/operational-ui'

export type GkitFatHealth = {
  ok: boolean
  title?: string
  message?: string
  detail?: string
}

export type GkitFatOption = {
  id: string
  label: string
  meta?: string
  carteira_id?: string | null
  tipo_cliente?: string | null
  tipo_pessoa?: string | null
}

export type GkitFatContratoStatus = 'em_elaboracao' | 'ativo' | 'suspenso' | 'cancelado' | 'encerrado'
export type GkitFatTipoCliente = 'mensal' | 'pontual' | 'cobranca'
export type GkitFatTipoPessoa = 'pessoa_fisica' | 'pessoa_juridica' | 'condominio'

export type GkitFatContrato = {
  id: string
  numero: string
  cliente_id: string
  cliente_nome: string
  cliente_documento: string | null
  cliente_tipo: GkitFatTipoCliente
  cliente_tipo_pessoa: GkitFatTipoPessoa
  carteira_id: string | null
  carteira_nome: string | null
  tipo_faturamento: GkitFatTipoCliente
  periodicidade_meses: number
  dia_faturamento: number | null
  dia_vencimento: number | null
  inicio_vigencia: string | null
  fim_vigencia: string | null
  valor_padrao: number
  valor_label: string
  descricao_servico: string
  iss_retido: boolean
  gerar_financeiro: boolean
  status: GkitFatContratoStatus
  observacoes: string | null
  atualizado_em: string | null
}

export type GkitFatOrdemServico = {
  id: string
  numero: string
  contrato_id: string | null
  contrato_numero: string | null
  cliente_id: string
  cliente_nome: string
  carteira_nome: string | null
  origem: string
  competencia: string | null
  data_vencimento: string | null
  descricao_servico: string
  valor_total: number
  valor_label: string
  situacao_operacional: string
  situacao_fiscal: string
  situacao_financeira: string
  atualizado_em: string | null
}

export type GkitFatDashboardData = {
  cards: OperationalKpi[]
  quickLinks: OperationalQuickLink[]
  contratosRecentes: GkitFatContrato[]
  ordensRecentes: GkitFatOrdemServico[]
}

export type GkitFatFormData = {
  clientes: GkitFatOption[]
  carteiras: GkitFatOption[]
  contratos: GkitFatOption[]
}
