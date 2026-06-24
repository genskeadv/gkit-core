import * as XLSX from "xlsx";
import { REGRAS_FATURAMENTO } from "./regras-faturamento";
import { moneyBR } from "./normalizar";
import type { GrupoFaturamento } from "./tipos";

const FALLBACK_ROW_START = 7;
const HEADER_ROW = 5;

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function findCol(sheet: XLSX.WorkSheet, candidates: string[], fallback?: string): string | undefined {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:BK10");
  const normalizedCandidates = candidates.map(normalizeHeader);

  for (let c = range.s.c; c <= range.e.c; c += 1) {
    const address = XLSX.utils.encode_cell({ r: HEADER_ROW - 1, c });
    const value = normalizeHeader(sheet[address]?.v);
    if (!value) continue;
    if (normalizedCandidates.some((candidate) => value.includes(candidate) || candidate.includes(value))) {
      return XLSX.utils.encode_col(c);
    }
  }
  return fallback;
}

function setCell(sheet: XLSX.WorkSheet, address: string, value: unknown): void {
  sheet[address] = typeof value === "number"
    ? { t: "n", v: value }
    : { t: "s", v: String(value ?? "") };
}

function setByCol(sheet: XLSX.WorkSheet, col: string | undefined, row: number, value: unknown): void {
  if (!col) return;
  setCell(sheet, `${col}${row}`, value);
}

function updateRange(sheet: XLSX.WorkSheet, lastRow: number): void {
  const current = XLSX.utils.decode_range(sheet["!ref"] || "A1:BK7");
  current.e.r = Math.max(current.e.r, lastRow - 1);
  current.e.c = Math.max(current.e.c, XLSX.utils.decode_col("BK"));
  sheet["!ref"] = XLSX.utils.encode_range(current);
}

export function gerarWorkbookOmie(
  template: XLSX.WorkBook | null,
  grupos: GrupoFaturamento[],
  dataFaturamento?: string,
  usuarioCore?: string,
): XLSX.WorkBook {
  const dataPrevistaFaturamento = dataFaturamento?.trim() || new Date().toLocaleDateString("pt-BR");
  const wb = template ? XLSX.utils.book_new() : XLSX.utils.book_new();

  if (template) {
    template.SheetNames.forEach((name) => {
      wb.SheetNames.push(name);
      wb.Sheets[name] = JSON.parse(JSON.stringify(template.Sheets[name]));
    });
  }

  const sheetName = wb.SheetNames.find((name) => name.toLowerCase().includes("omie")) || wb.SheetNames[0] || "Omie_Ordens_Servico";
  if (!wb.Sheets[sheetName]) {
    wb.SheetNames.push(sheetName);
    wb.Sheets[sheetName] = XLSX.utils.aoa_to_sheet([
      [], [], [], [], [],
      ["", "Cliente", "Previsão de Faturamento", "Categoria", "Conta Corrente", "Dados Adicionais para a Nota Fiscal", "Enviar Recibo", "Enviar Link NFS-e", "Enviar Boleto", "Enviar Pix", "Descrição Detalhada do Serviço", "Código do Serviço do Município", "Código LC116", "Valor"],
    ]);
  }

  const sheet = wb.Sheets[sheetName];
  const colCliente = findCol(sheet, ["CLIENTE", "CNPJ"], "C");
  const colPrevisao = findCol(sheet, ["PREVISAO FATURAMENTO", "DATA PREVISAO", "DATA FATURAMENTO"], "D");
  const colNumeroParcelas = findCol(sheet, ["NUMERO DE PARCELAS"], "E");
  const colCategoria = findCol(sheet, ["CATEGORIA"], "H");
  const colConta = findCol(sheet, ["CONTA CORRENTE"], "I");
  const colDadosNota = findCol(sheet, ["DADOS ADICIONAIS", "NOTA FISCAL"], "Q");
  const colRecibo = findCol(sheet, ["RECIBO"], "R");
  const colLinkNf = findCol(sheet, ["LINK NFS", "PREFEITURA"], "S");
  const colBoleto = findCol(sheet, ["BOLETO"], "T");
  const colLinkCobranca = findCol(sheet, ["LINK COBRANCA"], "U");
  const colPix = findCol(sheet, ["PIX"], "V");
  const colDescricao = findCol(sheet, ["DESCRICAO DO SERVICO", "DESCRICAO SERVICO", "SERVICO PRESTADO"], "AK");
  const colTributacao = findCol(sheet, ["TRIBUTACAO SERVICO"], "AC");
  const colServicoMunicipio = findCol(sheet, ["CODIGO SERVICO MUNICIPIO", "SERVICO MUNICIPIO"], "AD");
  const colLc116 = findCol(sheet, ["LC116", "LC 116"], "AE");
  const colQuantidade = findCol(sheet, ["QUANTIDADE", "QTDE"], "AG");
  const colValorUnitario = findCol(sheet, ["VALOR UNITARIO", "VL UNITARIO", "VALOR SERVICO"], "AH");
  const colObservacao = findCol(sheet, ["OBSERVACAO", "OBSERVACOES"], "X");

  grupos.forEach((grupo, idx) => {
    const row = FALLBACK_ROW_START + idx;
    const regra = REGRAS_FATURAMENTO[grupo.tipo];
    const cliente = grupo.cnpj || grupo.condominio;

    setByCol(sheet, colCliente, row, cliente);
    setByCol(sheet, colPrevisao, row, dataPrevistaFaturamento);
    setByCol(sheet, colNumeroParcelas, row, "A vista");
    setByCol(sheet, colCategoria, row, regra.categoria);
    setByCol(sheet, colConta, row, regra.contaCorrente);
    // A composição detalhada dos acordos/parcelas deve ir na descrição do serviço,
    // pois é este campo que o Omie usa como descrição principal da NFS-e.
    setByCol(sheet, colDadosNota, row, "");
    setByCol(sheet, colRecibo, row, regra.enviarRecibo);
    setByCol(sheet, colLinkNf, row, regra.enviarLinkNfse);
    setByCol(sheet, colBoleto, row, regra.enviarBoleto);
    setByCol(sheet, colLinkCobranca, row, regra.enviarLinkCobranca);
    setByCol(sheet, colPix, row, regra.enviarPix);
    setByCol(sheet, colDescricao, row, grupo.dadosNota || regra.descricaoServico);
    setByCol(sheet, colTributacao, row, regra.tributacaoServico);
    setByCol(sheet, colServicoMunicipio, row, regra.codigoServicoMunicipio);
    setByCol(sheet, colLc116, row, regra.codigoLc116);
    setByCol(sheet, colQuantidade, row, 1);
    setByCol(sheet, colValorUnitario, row, grupo.total);
    setByCol(sheet, colObservacao, row, grupo.observacao);
  });

  updateRange(sheet, FALLBACK_ROW_START + grupos.length + 2);

  const conferencia = grupos.map((g) => ({
    Status: g.status,
    Condomínio: g.condominio,
    CNPJ: g.cnpj || "",
    "Status CNPJ": g.cnpjStatus,
    "Origem CNPJ": g.origemCnpj,
    "Cliente no core": g.clienteNomeBase || "",
    "Situacao no core": g.clienteSituacao || "",
    "Tags no core": g.clienteTags || "",
    "Cliente do ciclo": g.clienteDoCiclo ? "Sim" : "Nao",
    Tipo: REGRAS_FATURAMENTO[g.tipo].categoria,
    Competência: g.competencia,
    "Qtde acordos/parcelas": g.linhas.length,
    Total: g.total,
    Alertas: g.alertas.join("; "),
  }));

  const detalhes = grupos.flatMap((g) => g.linhas.map((l) => ({
    Condomínio: g.condominio,
    CNPJ: g.cnpj || "",
    Tipo: REGRAS_FATURAMENTO[g.tipo].categoria,
    Unidade: l.unidade || "",
    Bloco: l.bloco || "",
    Responsável: l.responsavel || "",
    Parcela: l.parcela || "",
    Período: l.periodo || "",
    "Data/Vencimento": l.dataPagamento || "",
    Referência: l.referencia || "",
    "CNPJ no fechamento": l.cnpj || "",
    "CNPJ original": l.cnpjOriginal || "",
    "Status CNPJ fechamento": l.cnpjStatus || "",
    "Alerta CNPJ": l.cnpjAlerta || "",
    "Origem CNPJ final": g.origemCnpj,
    "Cliente no core": g.clienteNomeBase || "",
    "Tags no core": g.clienteTags || "",
    "Categoria na origem": l.tipoOrigem || "",
    "Categoria original": l.categoriaOriginal || "",
    "Categoria por aproximação": l.categoriaReconhecidaPorAproximacao ? "Sim" : "Não",
    "Aba origem": l.origemAba || "",
    Repasse: l.valorRepasse,
  })));

  const semCnpj = grupos.filter((g) => !g.cnpj).map((g) => ({
    Condomínio: g.condominio,
    Tipo: REGRAS_FATURAMENTO[g.tipo].categoria,
    Total: g.total,
    "Qtde acordos/parcelas": g.linhas.length,
  }));

  const log = [{
    "Gerado em": new Date().toLocaleString("pt-BR"),
    "Usuario core": usuarioCore?.trim() || "",
    "Data de faturamento": dataPrevistaFaturamento,
    "OS geradas": grupos.length,
    "Total faturamento": moneyBR(grupos.reduce((sum, g) => sum + g.total, 0)),
    "Sem CNPJ": semCnpj.length,
    "Clientes localizados no core": grupos.filter((g) => !!g.clienteNomeBase).length,
    "Clientes do ciclo": grupos.filter((g) => g.clienteDoCiclo).length,
    "Prontos para core": grupos.filter((g) => g.status === "ok" && g.clienteDoCiclo).length,
    "OS com alertas": grupos.filter((g) => g.alertas.length > 0).length,
    "Alertas únicos": [...new Set(grupos.flatMap((g) => g.alertas))].join("; "),
    "Abas de origem": [...new Set(grupos.flatMap((g) => g.linhas.map((l) => l.origemAba).filter(Boolean)))].join(", "),
  }];

  wb.Sheets.Conferencia_Faturamento = XLSX.utils.json_to_sheet(conferencia);
  wb.Sheets.Detalhes_Acordos_NF = XLSX.utils.json_to_sheet(detalhes);
  wb.Sheets.CNPJs_Nao_Encontrados = XLSX.utils.json_to_sheet(semCnpj);
  wb.Sheets.Log_Processamento = XLSX.utils.json_to_sheet(log);
  ["Conferencia_Faturamento", "Detalhes_Acordos_NF", "CNPJs_Nao_Encontrados", "Log_Processamento"].forEach((name) => {
    if (!wb.SheetNames.includes(name)) wb.SheetNames.push(name);
  });

  return wb;
}

export function downloadWorkbook(wb: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(wb, filename, { bookType: "xlsx" });
}
