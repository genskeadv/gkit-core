export type PayableMonthStatus = 'aberto' | 'fechado' | 'nao_aberto';

export type PayableImportRow = {
  linha: number;
  descricao: string;
  vencimentoDia: number | null;
  vencimentoTexto: string;
  valorPrevisto: number;
  categoria: string;
  centro: string;
  pago: boolean;
  raw: Record<string, unknown>;
};

export type PayableItem = {
  id: string;
  competencia_id: string;
  competencia: string;
  descricao: string;
  vencimento_dia: number | null;
  vencimento_texto: string | null;
  valor_previsto: number;
  categoria: string;
  centro: string | null;
  pago: boolean;
  origem_tipo?: 'manual' | 'importacao' | 'recorrencia' | 'comissao' | string | null;
  origem_execucao_id?: string | null;
  origem_resumo_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PayableSummary = {
  total: number;
  totalPago: number;
  totalAberto: number;
  quantidade: number;
  quantidadePaga: number;
};


export type PayableImportIssue = {
  linha: number;
  severidade: 'erro' | 'aviso';
  campo?: string;
  mensagem: string;
};

export type PayableImportPreview = {
  competencia: string;
  arquivo: string;
  linhasLidas: number;
  linhasValidas: number;
  linhasComErro: number;
  itensAtuais: number;
  itensAtuaisManuais: number;
  itensAtuaisComissao: number;
  itensNovos: number;
  itensAlterados: number;
  itensRemovidos: number;
  valorAtualManual: number;
  valorImportadoManual: number;
  diferencaValorManual: number;
  issues: PayableImportIssue[];
  sample: PayableImportRow[];
};
