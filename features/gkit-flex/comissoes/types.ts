export type CommissionCategoryKey = string;

export type CommissionRule = {
  key: CommissionCategoryKey;
  label: string;
  categoryMatchers: string[];
  reductionRate: number;
  commissionRate: number;
  splitBy: number;
};

export type ReceivableInputRow = Record<string, unknown>;
export type ClientInputRow = Record<string, unknown>;

export type EnrichedReceivableRow = {
  linha: number;
  cliente: string;
  documento: string;
  categoria: string;
  situacao: string;
  valorRecebido: number;
  vencimentoEm: string | null;
  recebidoEm: string | null;
  pontualidadeStatus: 'em_dia' | 'atrasado' | 'sem_datas';
  diasAtraso: number;
  vendedor: string;
  criterioMatch: 'cnpj_cpf' | 'nome_cliente' | 'nao_encontrado';
  observacao: string;
  raw: ReceivableInputRow;
};

export type CommissionSummaryRow = {
  categoria: string;
  carteira: string;
  quantidadeLancamentos: number;
  valorRecebido: number;
  reducaoPercentual: number;
  valorReducao: number;
  valorAposReducao: number;
  percentualComissao: number;
  comissaoTotal: number;
  divisor: number;
  comissaoFinal: number;
};

export type CommissionCollaboratorSummaryRow = {
  colaborador: string;
  carteira: string;
  categoria: string;
  quantidadeLancamentos: number;
  valorRecebido: number;
  valorAposReducao: number;
  comissaoCarteira: number;
  percentualRateio: number;
  comissaoFinal: number;
};

export type CommissionAuditRow = {
  linha: number;
  cliente: string;
  documento: string;
  categoria: string;
  valorRecebido: number;
  vendedor: string;
  problema: string;
};

export type CommissionProcessResult = {
  enrichedRows: EnrichedReceivableRow[];
  summaries: CommissionSummaryRow[];
  collaboratorSummaries: CommissionCollaboratorSummaryRow[];
  auditRows: CommissionAuditRow[];
};
