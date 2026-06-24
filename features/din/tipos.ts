export type TipoFaturamento = "extrajudicial" | "judicial";

export type FechamentoLinha = {
  condominio: string;
  unidade?: string;
  bloco?: string;
  responsavel?: string;
  cnpj?: string;
  parcela?: string;
  periodo?: string;
  dataPagamento?: string;
  valorRepasse: number;
  referencia?: string;
  tipoOrigem?: TipoFaturamento;
  categoriaOriginal?: string;
  categoriaReconhecidaPorAproximacao?: boolean;
  origemAba?: string;
  cnpjOriginal?: string;
  cnpjStatus?: "vazio" | "valido" | "corrigido" | "incompleto" | "invalido";
  cnpjAlerta?: string;
};

export type ClienteCnpj = {
  nome: string;
  nomeNormalizado: string;
  cnpj: string;
  origem?: string;
  situacao?: string;
  tags?: string;
  aliases?: string[];
};

export type GrupoFaturamento = {
  id: string;
  condominio: string;
  condominioNormalizado: string;
  cnpj?: string;
  cnpjStatus: "ok" | "nao_encontrado" | "aproximado" | "corrigido_base";
  origemCnpj: "fechamento" | "base_clientes" | "base_clientes_aproximada" | "nao_encontrado";
  clienteNomeBase?: string;
  clienteSituacao?: string;
  clienteTags?: string;
  clienteDoCiclo: boolean;
  tipo: TipoFaturamento;
  competencia: string;
  linhas: FechamentoLinha[];
  total: number;
  dadosNota: string;
  observacao: string;
  status: "ok" | "atencao" | "erro";
  alertas: string[];
};

export type ProcessamentoResultado = {
  grupos: GrupoFaturamento[];
  total: number;
  totalLinhas: number;
  totalSemCnpj: number;
  totalComAlertas: number;
  totalClientesCore: number;
  totalClientesCiclo: number;
  totalProntosCore: number;
  alertas: string[];
};
