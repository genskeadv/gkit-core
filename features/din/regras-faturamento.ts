import type { TipoFaturamento } from "./tipos";

export const REGRAS_FATURAMENTO: Record<TipoFaturamento, {
  titulo: string;
  categoria: string;
  descricaoServico: string;
  prefixoNota: string;
  contaCorrente: string;
  codigoServicoMunicipio: string;
  codigoLc116: string;
  tributacaoServico: string;
  enviarRecibo: string;
  enviarLinkNfse: string;
  enviarBoleto: string;
  enviarLinkCobranca: string;
  enviarPix: string;
}> = {
  extrajudicial: {
    titulo: "Repasse de Cobrança Extrajudicial",
    categoria: "Repasse de Cobrança Extrajudicial",
    descricaoServico: "Repasse de cobrança extrajudicial",
    prefixoNota: "Repasse de cobrança extrajudicial",
    contaCorrente: "Omie.CASH",
    codigoServicoMunicipio: "03220",
    codigoLc116: "17.14",
    tributacaoServico: "Operação tributável / Tributado no município",
    enviarRecibo: "Não",
    enviarLinkNfse: "Sim",
    enviarBoleto: "Sim",
    enviarLinkCobranca: "Não",
    enviarPix: "Não",
  },
  judicial: {
    titulo: "Repasse de Acordos Judiciais",
    categoria: "Repasse de Acordos Judiciais",
    descricaoServico: "Repasse de acordos judiciais",
    prefixoNota: "Repasse de acordos judiciais",
    contaCorrente: "Omie.CASH",
    codigoServicoMunicipio: "03220",
    codigoLc116: "17.14",
    tributacaoServico: "Operação tributável / Tributado no município",
    enviarRecibo: "Não",
    enviarLinkNfse: "Sim",
    enviarBoleto: "Sim",
    enviarLinkCobranca: "Não",
    enviarPix: "Não",
  },
};
