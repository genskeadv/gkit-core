export type GkitJurProcessoStatus = 'ativo' | 'arquivado' | 'suspenso' | 'encerrado' | 'erro';

export type GkitJurMonitoramentoStatus = 'monitorando' | 'pausado' | 'erro' | 'nao_monitorar';

export type GkitJurSyncStatus = 'sucesso' | 'erro' | 'sem_resultado' | 'parcial' | 'timeout';

export type GkitJurInboxFilaId = 'hoje' | 'tarefas' | 'criticos' | 'pendencias' | 'automacao' | 'sem-retorno';

export type GkitJurInboxPrioridade = 'critica' | 'alta' | 'media' | 'baixa';

export type GkitJurInboxOrdenacao = 'prioridade' | 'tipo' | 'responsavel' | 'carteira';

export type GkitJurTarefaStatus = 'aberta' | 'em_andamento' | 'aguardando_terceiro' | 'concluida' | 'cancelada';

export type GkitJurTarefaTipo =
  | 'prazo'
  | 'publicacao'
  | 'movimentacao_relevante'
  | 'documento_pendente'
  | 'providencia_interna'
  | 'audiencia'
  | 'cumprimento'
  | 'revisao';

export type GkitJurDocumentoStatus = 'ativo' | 'arquivado' | 'cancelado';

export type GkitJurAcordoStatus = 'ativo' | 'cumprido' | 'quebrado' | 'cancelado';

export type GkitJurAcordoParcelaStatus = 'pendente' | 'paga' | 'cancelada';

export type GkitJurAcordoLembreteEmailStatus = 'pendente' | 'enviado' | 'cancelado' | 'erro';

export type GkitJurAcordoLembreteEmailTipo = 'antes_vencimento' | 'no_vencimento' | 'apos_vencimento';

export type GkitJurPreJuridicoStatus = 'em_analise' | 'aguardando_documentos' | 'aprovado' | 'descartado' | 'convertido';

export type GkitJurPreJuridicoPrioridade = 'baixa' | 'media' | 'alta' | 'critica';

export type GkitJurPreJuridicoProbabilidade = 'baixa' | 'media' | 'alta';

export type GkitJurPreJuridicoAtaStatus = 'pendente' | 'solicitada' | 'recebida' | 'dispensada';

export type GkitJurPreJuridicoDebitoStatus = 'pendente' | 'solicitado' | 'recebido' | 'dispensado';

export type GkitJurPreJuridicoProcuracaoStatus = 'pendente' | 'gerada' | 'enviada' | 'assinada' | 'dispensada';

export type GkitJurPreJuridicoCotaDebito = {
  recibo: string;
  vencimento: string | null;
  valor: number;
};

export type GkitJurDocumentoTipo =
  | 'peticao'
  | 'publicacao'
  | 'decisao'
  | 'ata'
  | 'comprovante'
  | 'documento_interno'
  | 'contrato'
  | 'procuracao'
  | 'outro';

export type GkitJurEventoTipo =
  | 'publicacao'
  | 'intimacao'
  | 'despacho'
  | 'decisao'
  | 'audiencia'
  | 'prazo'
  | 'protocolo'
  | 'contato'
  | 'providencia_interna'
  | 'documento'
  | 'nota';

export type GkitJurAgenteExecucaoStatus =
  | 'pendente'
  | 'em_execucao'
  | 'sucesso'
  | 'falha'
  | 'precisa_intervencao'
  | 'aguardando_validacao'
  | 'cancelada';

export type GkitJurDashboardMetrics = {
  processosAtivos: number;
  processosMonitorados: number;
  movimentacoesUltimos7Dias: number;
  processosComErro: number;
  semCliente: number;
  semCarteira: number;
  semResponsavel: number;
};

export type GkitJurSelectOption = {
  label: string;
  value: string;
};

export type GkitJurEtiqueta = {
  id: string;
  nome: string;
  cor: string;
  ativo: boolean;
  updatedAt: string | null;
};

export type GkitJurProcessListItem = {
  id: string;
  numeroCnj: string;
  titulo: string | null;
  pasta: string | null;
  clienteNome: string | null;
  carteiraNome: string | null;
  responsavelNome: string | null;
  tribunalSigla: string | null;
  classeNome: string | null;
  orgaoJulgadorNome: string | null;
  ultimaMovimentacaoEm: string | null;
  ultimaSincronizacaoEm: string | null;
  status: GkitJurProcessoStatus;
  statusMonitoramento: GkitJurMonitoramentoStatus;
  etiquetas: GkitJurEtiqueta[];
};

export type GkitJurProcessFilters = {
  carteiraId: string;
  dir: 'asc' | 'desc';
  etiquetaId: string;
  monitoramento: string;
  page: number;
  q: string;
  responsavelId: string;
  saneamento: string;
  sort: string;
  status: string;
  tribunal: string;
};

export type GkitJurProcessFilterOptions = {
  carteiras: GkitJurSelectOption[];
  etiquetas: GkitJurEtiqueta[];
  responsaveis: GkitJurSelectOption[];
  tribunais: GkitJurSelectOption[];
};

export type GkitJurPagination = {
  currentPage: number;
  from: number;
  pageSize: number;
  to: number;
  total: number;
  totalPages: number;
};

export type GkitJurProcessListData = {
  filters: GkitJurProcessFilters;
  filterOptions: GkitJurProcessFilterOptions;
  metrics: GkitJurDashboardMetrics;
  pagination: GkitJurPagination;
  processes: GkitJurProcessListItem[];
};

export type GkitJurGlobalSearchResult = {
  id: string;
  type: 'processo' | 'tarefa' | 'movimentacao';
  title: string;
  subtitle: string;
  meta: string;
  href: string;
};

export type GkitJurGlobalSearchData = {
  query: string;
  total: number;
  processos: GkitJurGlobalSearchResult[];
  tarefas: GkitJurGlobalSearchResult[];
  movimentacoes: GkitJurGlobalSearchResult[];
};

export type GkitJurFormData = {
  carteiras: GkitJurSelectOption[];
  clientes: GkitJurSelectOption[];
  etiquetas: GkitJurEtiqueta[];
  responsaveis: GkitJurSelectOption[];
};

export type GkitJurPreJuridico = {
  id: string;
  titulo: string;
  clienteId: string | null;
  clienteNome: string | null;
  clienteSnapshotNome: string | null;
  descricao: string;
  carteiraId: string | null;
  carteiraNome: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  origem: string | null;
  area: string | null;
  valorEstimado: number | null;
  laudoPdfUrl: string | null;
  unidade: string | null;
  bloco: string | null;
  responsavelUnidade: string | null;
  cotasDebito: GkitJurPreJuridicoCotaDebito[];
  ataEleicaoStatus: GkitJurPreJuridicoAtaStatus;
  ataPrestacaoContasStatus: GkitJurPreJuridicoAtaStatus;
  debitosAtualizadosStatus: GkitJurPreJuridicoDebitoStatus;
  procuracaoStatus: GkitJurPreJuridicoProcuracaoStatus;
  administradoraEmail: string | null;
  sindicoEmail: string | null;
  administradoraSolicitadaEm: string | null;
  administradoraRetornoEm: string | null;
  procuracaoGeradaEm: string | null;
  procuracaoEnviadaEm: string | null;
  sindicoRetornoEm: string | null;
  prontoDistribuicaoEm: string | null;
  prontoDistribuicao: boolean;
  probabilidade: GkitJurPreJuridicoProbabilidade;
  prioridade: GkitJurPreJuridicoPrioridade;
  status: GkitJurPreJuridicoStatus;
  motivoStatus: string | null;
  dataEntrada: string | null;
  prazoAnalise: string | null;
  convertidoProcessoId: string | null;
  convertidoEm: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type GkitJurPreJuridicoFilters = {
  carteiraId: string;
  dir: 'asc' | 'desc';
  page: number;
  prioridade: string;
  q: string;
  responsavelId: string;
  sort: string;
  status: string;
};

export type GkitJurPreJuridicoMetrics = {
  total: number;
  emAnalise: number;
  aguardandoDocumentos: number;
  aprovados: number;
  descartados: number;
  convertidos: number;
};

export type GkitJurPreJuridicoData = {
  filters: GkitJurPreJuridicoFilters;
  filterOptions: {
    carteiras: GkitJurSelectOption[];
    clientes: GkitJurSelectOption[];
    responsaveis: GkitJurSelectOption[];
  };
  formData: GkitJurFormData;
  items: GkitJurPreJuridico[];
  metrics: GkitJurPreJuridicoMetrics;
  pagination: GkitJurPagination;
};

export type GkitJurProcessDetail = GkitJurProcessListItem & {
  clienteId: string | null;
  carteiraId: string | null;
  responsavelId: string | null;
  dataAjuizamento: string | null;
  observacoes: string | null;
  orgaoJulgadorNome: string | null;
  urlProcesso: string | null;
  tribunalAlias: string | null;
  origemModulo: string | null;
  importadoDe: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type GkitJurAcordoParcela = {
  id: string;
  acordoId: string;
  numero: number;
  valor: number;
  vencimento: string;
  status: GkitJurAcordoParcelaStatus;
  pagoEm: string | null;
  valorPago: number | null;
  observacoes: string | null;
  emAtraso: boolean;
};

export type GkitJurAcordoLembreteEmail = {
  id: string;
  acordoId: string;
  parcelaId: string;
  parcelaNumero: number | null;
  parcelaVencimento: string | null;
  diasReferencia: number;
  tipo: GkitJurAcordoLembreteEmailTipo;
  agendadoPara: string;
  destinatarioEmail: string | null;
  assunto: string | null;
  corpo: string | null;
  status: GkitJurAcordoLembreteEmailStatus;
  enviadoEm: string | null;
  erroMensagem: string | null;
};

export type GkitJurAcordoJudicial = {
  id: string;
  processoId: string;
  numeroCnj: string;
  processoTitulo: string | null;
  clienteNome: string | null;
  carteiraNome: string | null;
  responsavelNome: string | null;
  valorTotal: number;
  quantidadeParcelas: number;
  diaVencimento: number;
  primeiroVencimento: string;
  status: GkitJurAcordoStatus;
  emailLembrete: string | null;
  lembretesPagamentoAtivos: boolean;
  lembreteDias: number[];
  observacoes: string | null;
  quebradoEm: string | null;
  quitadoEm: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  parcelas: GkitJurAcordoParcela[];
  parcelasPagas: number;
  parcelasPendentes: number;
  parcelasAtrasadas: number;
  valorPago: number;
  valorPendente: number;
  proximoVencimento: string | null;
  lembretesEmail: GkitJurAcordoLembreteEmail[];
  lembretesPendentes: number;
  lembretesAtrasados: number;
  proximoLembreteEmail: string | null;
};

export type GkitJurProcessSummary = {
  baseSincronizacaoEm: string | null;
  criterioProntidao: Record<string, unknown>;
  erroMensagem: string | null;
  faseProcessual: string | null;
  fonteResumo: string | null;
  geradoEm: string | null;
  metadata: Record<string, unknown>;
  modeloVersao: string | null;
  movimentacoesConsideradas: number;
  movimentacoesRelevantes: number;
  nivelProntidao: GkitJurNivelProntidao;
  pendenciasIdentificadas: string[];
  proximasAcoesSugeridas: string[];
  resumoInteligente: {
    doQueSeTrata: string | null;
    erroGeracaoIa: string | null;
    faseAtual: string | null;
    fonte: string | null;
    geradoEm: string | null;
    leituraExecutiva: string | null;
    modelo: string | null;
    nivelConfianca: 'alto' | 'medio' | 'baixo' | null;
    precisaRevisaoHumana: boolean;
    principaisAndamentos: string[];
    proximasAcoesSugeridas: string[];
    riscosAlertas: string[];
    ultimosMarcos: string[];
  } | null;
  resumoOperacional: string | null;
  riscosAlertas: string[];
  statusResumo: string;
  ultimaMovimentacaoConsideradaEm: string | null;
  ultimosEventosRelevantes: string[];
  updatedAt: string | null;
};

export type GkitJurMovimentacao = {
  id: string;
  processoId: string;
  numeroCnj: string;
  clienteNome: string | null;
  dataHora: string | null;
  nome: string;
  origem: string;
  relevante: boolean;
  geraAlerta: boolean;
};

export type GkitJurMovimentacaoFilters = {
  carteiraId: string;
  dir: 'asc' | 'desc';
  origem: string;
  page: number;
  q: string;
  relevancia: string;
  responsavelId: string;
  sort: string;
  tribunal: string;
};

export type GkitJurPublicacaoStatus =
  | 'pendente'
  | 'triada_ia'
  | 'em_tratamento'
  | 'tratada'
  | 'dispensada'
  | 'duplicada'
  | 'erro';

export type GkitJurPublicacaoDecisao =
  | 'gerar_prazo'
  | 'gerar_tarefa'
  | 'registrar_ciencia'
  | 'vincular_documento'
  | 'atualizar_resumo'
  | 'dispensar_sem_acao'
  | 'marcar_duplicada'
  | 'revisar_cadastro_processo';

export type GkitJurPublicacao = {
  id: string;
  processoId: string | null;
  processoBaseId: string | null;
  processoBaseStatus: GkitJurProcessoStatus | null;
  processoBaseStatusMonitoramento: GkitJurMonitoramentoStatus | null;
  numeroCnj: string;
  numeroCnjLimpo: string;
  fonte: string;
  fonteEventoId: string | null;
  dataDisponibilizacao: string | null;
  dataPublicacao: string | null;
  jornal: string | null;
  termo: string | null;
  origemOrgao: string | null;
  arq: string | null;
  pub: string | null;
  textoPreview: string | null;
  textoCompleto: string | null;
  textoHash: string;
  status: GkitJurPublicacaoStatus;
  decisaoTratamento: GkitJurPublicacaoDecisao | null;
  classificacaoIa: Record<string, unknown>;
  confiancaIa: number | null;
  sugestaoIa: string | null;
  tarefaId: string | null;
  tratadoPor: string | null;
  tratadoEm: string | null;
  motivoTratamento: string | null;
  conteudoRemovidoEm: string | null;
  clienteNome: string | null;
  carteiraNome: string | null;
  responsavelNome: string | null;
  processoTitulo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GkitJurPublicacaoFilters = {
  carteiraId: string;
  dir: 'asc' | 'desc';
  fonte: string;
  page: number;
  q: string;
  responsavelId: string;
  sort: string;
  status: string;
  tribunal: string;
};

export type GkitJurPublicacaoFilterOptions = GkitJurProcessFilterOptions & {
  fontes: GkitJurSelectOption[];
  statuses: GkitJurSelectOption[];
};

export type GkitJurPublicacoesData = {
  filterOptions: GkitJurPublicacaoFilterOptions;
  filters: GkitJurPublicacaoFilters;
  metrics: {
    total: number;
    pendentes: number;
    triadasIa: number;
    emTratamento: number;
    tratadas: number;
    dispensadas: number;
    erros: number;
    semProcesso: number;
    foraOperacao: number;
    naoLocalizadas: number;
    encerradasOuArquivadas: number;
    vinculadasAtivas: number;
  };
  pagination: GkitJurPagination;
  publicacoes: GkitJurPublicacao[];
};

export type GkitJurMovimentacaoFilterOptions = GkitJurProcessFilterOptions & {
  origens: GkitJurSelectOption[];
};

export type GkitJurTarefa = {
  id: string;
  processoId: string;
  tipo: GkitJurTarefaTipo;
  titulo: string;
  descricao: string | null;
  status: GkitJurTarefaStatus;
  prioridade: GkitJurInboxPrioridade;
  prazoAt: string | null;
  origem: string;
  carteiraId: string | null;
  carteiraNome: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type GkitJurProcessStatusSuggestion = {
  tarefaId: string;
  tarefaTitulo: string;
  status: GkitJurProcessoStatus;
  statusMonitoramento: GkitJurMonitoramentoStatus;
  motivo: string;
};

export type GkitJurDocumento = {
  id: string;
  processoId: string;
  tipo: GkitJurDocumentoTipo;
  titulo: string;
  descricao: string | null;
  status: GkitJurDocumentoStatus;
  dataDocumento: string | null;
  urlExterna: string | null;
  storagePath: string | null;
  origem: string;
  carteiraId: string | null;
  carteiraNome: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  createdAt: string;
};

export type GkitJurEventoProcesso = {
  id: string;
  processoId: string;
  tipo: GkitJurEventoTipo;
  titulo: string;
  descricao: string | null;
  dataEvento: string;
  origem: string;
  carteiraId: string | null;
  carteiraNome: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  createdAt: string;
};

export type GkitJurTimelineItem = {
  id: string;
  tipo: 'evento' | 'documento' | 'tarefa' | 'movimentacao';
  sourceId: string;
  processoId: string;
  titulo: string;
  descricao: string | null;
  dataReferencia: string | null;
  status: string;
  origem: string;
  prioridade: GkitJurInboxPrioridade;
  href: string | null;
};

export type GkitJurProcessDetailData = {
  acordos: GkitJurAcordoJudicial[];
  documentos: GkitJurDocumento[];
  eventos: GkitJurEventoProcesso[];
  formData: GkitJurFormData;
  movimentacoes: GkitJurMovimentacao[];
  processo: GkitJurProcessDetail;
  resumo: GkitJurProcessSummary | null;
  statusSuggestion: GkitJurProcessStatusSuggestion | null;
  tarefas: GkitJurTarefa[];
  timeline: GkitJurTimelineItem[];
};

export type GkitJurAcordosData = {
  acordos: GkitJurAcordoJudicial[];
  metrics: {
    ativos: number;
    atrasados: number;
    lembretesAtrasados: number;
    lembretesHoje: number;
    lembretesPendentes: number;
    quebrados: number;
    total: number;
    valorAberto: number;
  };
};

export type GkitJurPendenciaGroup = {
  description: string;
  href: string;
  items: GkitJurProcessListItem[];
  total: number;
  title: string;
};

export type GkitJurSaneamentoSuggestion = {
  processo: GkitJurProcessListItem;
  clienteId: string | null;
  clienteNome: string | null;
  clienteCandidato: string | null;
  clienteConfianca: 'alta' | 'media' | null;
  clienteFonte: string | null;
  carteiraId: string | null;
  carteiraNome: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  motivo: string;
};

export type GkitJurPendenciasData = {
  groups: GkitJurPendenciaGroup[];
  metrics: GkitJurDashboardMetrics;
  suggestions: GkitJurSaneamentoSuggestion[];
  suggestionTotals: {
    cliente: number;
    clienteAltaConfianca: number;
    clienteMediaConfianca: number;
    carteira: number;
    responsavel: number;
    total: number;
  };
};

export type GkitJurMovimentacoesData = {
  filterOptions: GkitJurMovimentacaoFilterOptions;
  filters: GkitJurMovimentacaoFilters;
  metrics: GkitJurDashboardMetrics;
  movimentacoes: GkitJurMovimentacao[];
  pagination: {
    currentPage: number;
    from: number;
    pageSize: number;
    to: number;
    total: number;
    totalPages: number;
  };
};

export type GkitJurAuditoriaItem = {
  id: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  numeroCnj: string;
  tribunalAlias: string;
  totalMovimentacoes: number;
  totalNovas: number;
  erroMensagem: string | null;
};

export type GkitJurAuditoriaData = {
  importados: number;
  sincronizacoes: GkitJurAuditoriaItem[];
};

export type GkitJurEmailMonitorItem = {
  id: string;
  origem: 'acordo' | 'pre_juridico';
  tipo: string;
  destinatario: string | null;
  assunto: string | null;
  status: string;
  agendadoPara: string | null;
  enviadoEm: string | null;
  referencia: string;
  href: string;
  erroMensagem: string | null;
};

export type GkitJurEmailsData = {
  items: GkitJurEmailMonitorItem[];
  metrics: {
    enviados: number;
    erros: number;
    manuais: number;
    pendentes: number;
    total: number;
  };
};

export type GkitJurInboxItem = {
  id: string;
  tipo: string;
  origem: string;
  titulo: string;
  subtitulo: string;
  status: string;
  prioridade: GkitJurInboxPrioridade;
  score: number;
  dataReferencia: string | null;
  prazoAt: string | null;
  processoId: string | null;
  carteiraId: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  carteiraNome: string | null;
  entidadeTipo: string;
  entidadeId: string | null;
  acaoLabel: string;
  acaoUrl: string;
  motivo: string;
};

export type GkitJurInboxFilters = {
  carteiraId: string;
  ordenacao: GkitJurInboxOrdenacao;
  responsavelId: string;
};

export type GkitJurInboxFila = {
  id: GkitJurInboxFilaId;
  title: string;
  description: string;
  count: number;
};

export type GkitJurInboxData = {
  selected: GkitJurInboxFilaId;
  filters: GkitJurInboxFilters;
  filterOptions: {
    carteiras: GkitJurSelectOption[];
    responsaveis: GkitJurSelectOption[];
  };
  filas: GkitJurInboxFila[];
  metrics: {
    hoje: number;
    criticos: number;
    prazos: number;
    automacoes: number;
    pendencias: number;
    publicacoes: number;
  };
  items: GkitJurInboxItem[];
  proximasAcoes: Array<{
    title: string;
    description: string;
    href: string;
    label: string;
    priority: GkitJurInboxPrioridade;
    count: number;
  }>;
};

export type GkitJurLabBriefing = {
  processoId: string;
  numeroCnj: string;
  clienteNome: string | null;
  faseProcessual: string | null;
  nivelProntidao: GkitJurNivelProntidao;
  resumoOperacional: string | null;
  riscosAlertas: string[];
  proximasAcoesSugeridas: string[];
  updatedAt: string | null;
};

export type GkitJurLabData = {
  inbox: GkitJurInboxData;
  metrics: GkitJurDashboardMetrics;
  readiness: Record<GkitJurNivelProntidao, number>;
  smartSummary: {
    coberturaPercentual: number;
    pendentesResumo: number;
    precisaRevisaoHumana: number;
    resumosInteligentes: number;
    totalAtivos: number;
    ultimaGeracaoEm: string | null;
  };
  briefings: GkitJurLabBriefing[];
};

export type GkitJurCockpitArea = 'processos' | 'pre_juridico' | 'tarefas' | 'publicacoes' | 'acordos' | 'agenda';

export type GkitJurCockpitBar = {
  label: string;
  value: number;
  tone: 'blue' | 'green' | 'red' | 'yellow';
};

export type GkitJurCockpitRow = {
  id: string;
  title: string;
  subtitle: string;
  owner: string;
  status: string;
  due: string;
  tone: 'critical' | 'medium' | 'ok';
  href: string;
};

export type GkitJurCockpitAreaData = {
  action: string;
  count: number;
  description: string;
  filters: string[];
  bars: GkitJurCockpitBar[];
  trend: number[];
  rows: GkitJurCockpitRow[];
};

export type GkitJurCockpitUnicoData = Record<GkitJurCockpitArea, GkitJurCockpitAreaData>;

export type GkitJurAgenteFonte = {
  id: string;
  nome: string;
  tipo: string;
  urlBase: string | null;
  carteiraNome: string | null;
  exigeCaptcha: boolean;
  exige2fa: boolean;
  ativo: boolean;
};

export type GkitJurAgenteReceita = {
  id: string;
  fonteId: string | null;
  fonteNome: string | null;
  carteiraId: string | null;
  carteiraNome: string | null;
  nome: string;
  descricao: string | null;
  tipoColeta: string;
  periodicidade: string;
  scriptKey: string | null;
  tipoArquivoEsperado: string;
  ativo: boolean;
};

export type GkitJurAgenteExecucao = {
  id: string;
  receitaNome: string;
  fonteNome: string | null;
  carteiraNome: string | null;
  status: GkitJurAgenteExecucaoStatus;
  iniciadoEm: string | null;
  finalizadoEm: string | null;
  erroMensagem: string | null;
  tentativas: number;
  createdAt: string;
};

export type GkitJurAgenteMonitoramentoItem = {
  processoId: string;
  numeroCnj: string;
  titulo: string | null;
  clienteNome: string | null;
  faseAtual: string | null;
  fonte: string | null;
  nivelConfianca: 'alto' | 'medio' | 'baixo' | null;
  precisaRevisaoHumana: boolean;
  motivo: string;
  resumoUpdatedAt: string | null;
  processoUpdatedAt: string | null;
};

export type GkitJurAgenteData = {
  carteiras: GkitJurSelectOption[];
  fontes: GkitJurAgenteFonte[];
  receitas: GkitJurAgenteReceita[];
  execucoes: GkitJurAgenteExecucao[];
  metrics: {
    fontesAtivas: number;
    receitasAtivas: number;
    pendentes: number;
    falhas: number;
  };
  monitoramento: {
    coberturaPercentual: number;
    erroGeracaoIa: number;
    fonteLocal: number;
    fonteOpenAi: number;
    modeloConfigurado: string;
    openAiConfigurado: boolean;
    pendentesResumo: number;
    precisaRevisaoHumana: number;
    resumosInteligentes: number;
    totalAtivos: number;
    baixaConfianca: number;
    desatualizados: number;
    fila: GkitJurAgenteMonitoramentoItem[];
    ultimaGeracaoEm: string | null;
  };
};

export type GkitJurMonitoramentoNivel = 'verde' | 'amarelo' | 'vermelho' | 'cinza';

export type GkitJurNivelProntidao = 'sem_base' | 'capa' | 'parcial' | 'pronto' | 'desatualizado' | 'erro';

export type GkitJurIntegracaoTribunal = {
  alias: string | null;
  atrasados: number;
  erro: number;
  monitorando: number;
  naoMonitorar: number;
  nivel: GkitJurMonitoramentoNivel;
  nome: string;
  pausado: number;
  semCarteira: number;
  semResponsavel: number;
  saneamentoProcessos: number;
  semSincronizacao: number;
  status: string;
  totalAtivos: number;
  tribunal: string;
};

export type GkitJurIntegracaoData = {
  cron: {
    ativo: boolean;
    batchLimit: number;
    horarioLocal: string;
    lastError: string | null;
    lastFinishedAt: string | null;
    lastResult: {
      erros: number;
      movimentosNovos: number;
      processos: number;
      tarefasGeradas: number;
    } | null;
    lastStartedAt: string | null;
    maxBatches: number;
    nextRunAt: string | null;
    provider: string;
    running: boolean;
    schedule: string;
    status: 'ativo' | 'em_execucao' | 'erro' | 'nunca_executado';
    timeBudgetMs: number;
    timezone: string;
  };
  metrics: {
    atrasados: number;
    configurados: number;
    criticos: number;
    semMapeamento: number;
    semSincronizacao: number;
    totalAtivos: number;
  };
  prontidao: {
    aceitaveis: number;
    capa: number;
    desatualizado: number;
    erro: number;
    naoProntos: number;
    parcial: number;
    pronto: number;
    semBase: number;
    semResumo: number;
  };
  tribunais: GkitJurIntegracaoTribunal[];
};

export type GkitJurIntegracaoSyncFeedback = {
  erros: number;
  novas: number;
  processos: number;
  semResultado: number;
  tarefas: number;
} | null;

export type GkitJurProcessSyncFeedback = {
  erros: number;
  mensagem: string | null;
  novas: number;
  processos: number;
  semResultado: number;
  status: 'ok' | 'erro';
  tarefas: number;
} | null;

export type GkitJurMovimentacaoTarefaRegra = {
  id: string;
  nome: string;
  descricao: string | null;
  codigoMovimento: number | null;
  termos: string[];
  tipoTarefa: GkitJurTarefaTipo;
  prioridade: GkitJurInboxPrioridade;
  tituloTemplate: string;
  descricaoTemplate: string | null;
  prazoDias: number | null;
  gerarAutomaticamente: boolean;
  ativo: boolean;
  updatedAt: string;
};

export type GkitJurMovimentacaoTarefaData = {
  regras: GkitJurMovimentacaoTarefaRegra[];
  metrics: {
    ativas: number;
    automaticas: number;
    total: number;
  };
};

export type GkitJurEtiquetasData = {
  etiquetas: GkitJurEtiqueta[];
  metrics: {
    ativas: number;
    inativas: number;
    total: number;
  };
};
