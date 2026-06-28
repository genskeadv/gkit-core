export type CicloStatusCliente = 'novo' | 'implantacao' | 'ativo' | 'pausado' | 'encerrado'
export type CicloRisco = 'baixo' | 'medio' | 'alto' | 'critico'
export type CicloTemperatura = 'quente' | 'neutro' | 'frio'
export type CicloTipoCliente = 'mensal' | 'pontual' | 'cobranca'
export type CicloAtendimentoStatus = 'aberto' | 'encerrado'
export type CicloAtendimentoTab = 'cliente' | 'responsavel' | 'carteira' | 'tipo'

export type CicloCliente = {
  id: string
  nome: string
  razaoSocial: string
  documento: string
  carteira: string
  administradora: string
  tipoCliente: CicloTipoCliente
  status: CicloStatusCliente
  risco: CicloRisco
  temperatura: CicloTemperatura
  score: number
  regularidade: number
  alertasAbertos: number
  cidade: string
  estado: string
  contatoPrincipal: string
}

export type CicloDocumento = {
  id: string
  cliente: string
  tipo: string
  titulo: string
  status: 'pendente' | 'recebido' | 'validado' | 'vencido' | 'dispensado'
  obrigatorio: boolean
  validado: boolean
  dataRenovacao: string
}

export type CicloAlerta = {
  id: string
  cliente: string
  titulo: string
  descricao: string
  tipo: string
  status: 'aberto' | 'em_tratamento' | 'resolvido' | 'cancelado'
  severidade: 'baixa' | 'media' | 'alta' | 'critica'
  vencimentoEm: string
}

export type CicloTimelineItem = {
  id: string
  cliente: string
  titulo: string
  descricao: string
  tipo: string
  createdAt: string
}

export type CicloData = {
  clientes: CicloCliente[]
  documentos: CicloDocumento[]
  alertas: CicloAlerta[]
  timeline: CicloTimelineItem[]
  databaseReady: boolean
}

export type CicloListRow = {
  id: string
  title: string
  subtitle: string
  status: string
  value: string
  meta: string
  detailHref?: string
  tone?: 'primary' | 'success' | 'warning' | 'danger'
}

export type CicloAtendimentoRecord = {
  id: string
  source_key: string
  astrea_codigo: string | null
  titulo: string
  cliente_nome: string
  cliente_id: string | null
  carteira_id: string | null
  carteira_nome: string
  responsavel: string
  etiquetas: string[]
  tipo_atendimento: string
  status: CicloAtendimentoStatus
  data_criacao: string | null
  data_encerramento: string | null
  data_ultimo_historico: string | null
  objeto: string | null
  ultimo_historico: string | null
  url_processo: string | null
}

export type CicloAtendimentoGroup = {
  label: string
  total: number
  abertos: number
  encerrados: number
  percentual: number
}

export type CicloAtendimentoMonth = {
  label: string
  total: number
  abertos: number
  encerrados: number
}

export type CicloAtendimentoDashboard = {
  rows: CicloAtendimentoRecord[]
  groups: Record<CicloAtendimentoTab, CicloAtendimentoGroup[]>
  months: CicloAtendimentoMonth[]
  kpis: {
    total: number
    abertos: number
    encerrados: number
    clientes: number
    responsaveis: number
    tipos: number
  }
  options: {
    carteiras: string[]
    responsaveis: string[]
    tipos: string[]
  }
  databaseReady: boolean
}

export type CicloFormOption = {
  id: string
  label: string
}

export type CicloClienteFormData = {
  carteiras: CicloFormOption[]
  administradoras: CicloFormOption[]
}

export type CicloDocumentoFormData = {
  clientes: CicloFormOption[]
}

export type CicloCockpitDocumento = {
  clienteId: string
  dataRenovacao: string | null
  id: string | null
  observacoes: string | null
  status: CicloDocumento['status']
  tipoDocumento: string
  titulo: string
  validado: boolean
}

export type CicloCockpitData = {
  clienteFormData: CicloClienteFormData
  clientesDocumentacaoPendente: CicloListRow[]
  documentoFormData: CicloDocumentoFormData
  documentos: CicloCockpitDocumento[]
}

export type CicloClienteRecord = {
  id: string
  carteira_id: string | null
  administradora_id: string | null
  nome: string
  nome_fantasia: string | null
  razao_social: string | null
  documento: string | null
  email: string | null
  telefone: string | null
  cidade: string | null
  estado: string | null
  status_operacional: CicloStatusCliente
  tipo_cliente: CicloTipoCliente
  score_atual: number
  risco_atual: CicloRisco
  temperatura: CicloTemperatura
  pasta_url: string | null
  observacoes: string | null
  ativo: boolean
}

export type CicloDocumentoRecord = {
  id: string
  cliente_id: string
  carteira_id: string | null
  tipo_documento: string
  titulo: string | null
  status: CicloDocumento['status']
  obrigatorio: boolean
  aplicavel: boolean
  validado: boolean
  data_assinatura: string | null
  data_realizacao: string | null
  data_renovacao: string | null
  arquivo_url: string | null
  observacoes: string | null
}

export type CicloAlertaRecord = {
  id: string
  cliente_id: string | null
  carteira_id: string | null
  tipo: string
  titulo: string
  descricao: string | null
  status: CicloAlerta['status']
  severidade: CicloAlerta['severidade']
  vencimento_em: string | null
  origem: string | null
  referencia_id: string | null
}

export type CicloOcorrenciaRecord = {
  id: string
  cliente_id: string | null
  carteira_id: string | null
  tipo: string
  impacto: string
  titulo: string
  descricao: string | null
  peso: number
  impacto_score: number
  data_ocorrencia: string
  status: string
  responsavel: string | null
  prazo: string | null
}

export type CicloContratoRecord = {
  id: string
  cliente_id: string | null
  carteira_id: string | null
  numero_contrato: string | null
  data_assinatura: string | null
  data_inicio: string | null
  data_fim: string | null
  valor: number | null
  indice_reajuste: string | null
  proximo_reajuste: string | null
  status: string
  ativo: boolean
  observacoes: string | null
}

export type CicloAtaRecord = {
  id: string
  cliente_id: string | null
  carteira_id: string | null
  tipo: string | null
  data_ata: string | null
  data_validade: string | null
  status: string
  ativo: boolean
  observacoes: string | null
}

export type CicloClienteIntegral = {
  cliente: CicloClienteRecord
  carteira: string
  administradora: string
  regularidade: number
  pendencias: string[]
  documentos: CicloOnboardingDocumento[]
  alertas: CicloAlertaRecord[]
  ocorrencias: CicloOcorrenciaRecord[]
  contratos: CicloContratoRecord[]
  atas: CicloAtaRecord[]
  timeline: CicloTimelineItem[]
}

export type CicloAdministradoraRecord = {
  id: string
  nome: string
  documento: string | null
  email: string | null
  telefone: string | null
  site: string | null
  observacoes: string | null
  ativo: boolean
}

export type CicloOnboardingDocumento = {
  id: string
  tipo_documento: string
  titulo: string | null
  status: CicloDocumento['status']
  obrigatorio: boolean
  validado: boolean
  data_renovacao: string | null
  arquivo_url: string | null
  observacoes: string | null
}

export type CicloOnboardingWorkflowAtividade = {
  id: string
  ordem: number
  descricao: string
  responsavel_padrao: string | null
  obrigatoria: boolean
  ativo: boolean
}

export type CicloOnboardingClienteAtividade = {
  id: string
  atividade_id: string | null
  ordem: number
  descricao: string
  responsavel: string | null
  status: 'pendente' | 'em_andamento' | 'concluido' | 'dispensado'
  obrigatoria: boolean
  concluido_em: string | null
  observacoes: string | null
}

export type CicloOnboardingDetail = {
  cliente: CicloClienteRecord
  documentos: CicloOnboardingDocumento[]
  atividades: CicloOnboardingClienteAtividade[]
  timeline: CicloTimelineItem[]
  progresso: {
    total: number
    concluidos: number
    percentual: number
    pendentes: number
  }
  workflow: {
    total: number
    concluidas: number
    percentual: number
    pendentes: number
  }
}

export type CicloImportacaoLote = {
  id: string
  tipo: string
  status: string
  arquivo_nome: string | null
  total_linhas: number
  linhas_validas: number
  clientes_criados: number
  clientes_atualizados: number
  contatos_importados: number
  linhas_ignoradas: number
  erro: string | null
  created_at: string
  finalizado_em: string | null
}

export type CicloImportacaoItem = {
  id: string
  linha: number
  acao: string
  status: string
  cnpj_normalizado: string | null
  cliente_nome: string | null
  mensagem: string | null
  created_at: string
}
