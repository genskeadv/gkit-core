export type GkitJurProcessoStatus = 'ativo' | 'arquivado' | 'suspenso' | 'encerrado' | 'erro';

export type GkitJurMonitoramentoStatus = 'monitorando' | 'pausado' | 'erro' | 'nao_monitorar';

export type GkitJurSyncStatus = 'sucesso' | 'erro' | 'sem_resultado' | 'parcial' | 'timeout';

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
};

export type GkitJurProcessFilters = {
  carteiraId: string;
  dir: 'asc' | 'desc';
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

export type GkitJurFormData = {
  carteiras: GkitJurSelectOption[];
  clientes: GkitJurSelectOption[];
  responsaveis: GkitJurSelectOption[];
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

export type GkitJurProcessDetailData = {
  formData: GkitJurFormData;
  movimentacoes: GkitJurMovimentacao[];
  processo: GkitJurProcessDetail;
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
    carteira: number;
    responsavel: number;
    total: number;
  };
};

export type GkitJurMovimentacoesData = {
  metrics: GkitJurDashboardMetrics;
  movimentacoes: GkitJurMovimentacao[];
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
