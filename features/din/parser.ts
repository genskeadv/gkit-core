import * as XLSX from "xlsx";
import { excelDateToText, formatCnpj, isValidCnpj, normalizeCnpj, normalizeText, onlyDigits, parseMoney } from "./normalizar";
import type { ClienteCnpj, FechamentoLinha, TipoFaturamento } from "./tipos";

function sheetToRows(workbook: XLSX.WorkBook, sheetName?: string): unknown[][] {
  const name = sheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[name];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true }) as unknown[][];
}

function normalizeHeader(value: unknown): string {
  // Cabeçalho precisa de normalização própria.
  // Não podemos usar normalizeText aqui, porque ele remove termos como
  // CONDOMINIO/EDIFICIO/RESIDENCIAL para comparar nomes de clientes.
  // Em headers, esses termos são justamente o que precisamos encontrar.
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[º°]/g, "")
    .replace(/&/g, " E ")
    .replace(/[^A-Z0-9]+/gi, " ")
    .toUpperCase()
    .replace(/\b(DA|DO|DE|DOS|DAS)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findHeaderRow(rows: unknown[][], required: string[]): number {
  let best = 0;
  let bestScore = -1;
  rows.slice(0, 35).forEach((row, idx) => {
    const headers = row.map(normalizeHeader).join(" | ");
    const score = required.reduce((acc, term) => acc + (headers.includes(normalizeHeader(term)) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = idx;
    }
  });
  return best;
}

function makeIndex(headers: unknown[]): Record<string, number> {
  return headers.reduce<Record<string, number>>((acc, header, idx) => {
    const normalized = normalizeHeader(header);
    if (normalized) acc[normalized] = idx;
    return acc;
  }, {} as Record<string, number>);
}

function findColumn(index: Record<string, number>, candidates: string[]): number | undefined {
  const normalizedCandidates = candidates.map(normalizeHeader);
  for (const candidate of normalizedCandidates) {
    if (index[candidate] !== undefined) return index[candidate];
  }
  const entries = Object.entries(index);
  for (const candidate of normalizedCandidates) {
    const found = entries.find(([key]) => key.includes(candidate) || candidate.includes(key));
    if (found) return found[1];
  }
  return undefined;
}

function get(row: unknown[], col?: number): unknown {
  return col === undefined ? "" : row[col];
}

function pushUnique(values: string[], value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return;
  const normalized = normalizeText(text);
  if (!normalized) return;
  if (!values.some((v) => normalizeText(v) === normalized)) values.push(text);
}

function inferTipoFromSheet(sheetName: string): TipoFaturamento | undefined {
  const normalized = normalizeText(sheetName);
  if (normalized.includes("EXTRAJUDICIAL") || normalized.includes("GEKALI")) return "extrajudicial";
  if (normalized.includes("JURIDICO") || normalized.includes("JUDICIAL")) return "judicial";
  return undefined;
}

function inferTipoFromValue(value: unknown): { tipo?: TipoFaturamento; aproximado: boolean } {
  const raw = String(value ?? "").trim();
  const normalized = normalizeText(raw);
  if (!normalized) return { aproximado: false };

  if (normalized.includes("EXTRAJUDICIAL")) return { tipo: "extrajudicial", aproximado: false };
  if (normalized.includes("EXTRAJUD") || normalized.includes("EXTRAJUDCIAL") || normalized.includes("EXTRAJUDUICIAL")) {
    return { tipo: "extrajudicial", aproximado: true };
  }
  if (normalized.includes("JUDICIAL") || normalized.includes("JURIDICO")) return { tipo: "judicial", aproximado: false };
  return { aproximado: false };
}

function isTotalOrResumoRow(condominio: string, row: unknown[]): boolean {
  const normalized = normalizeText(condominio);
  if (!normalized) return true;
  if (normalized === "TOTAL" || normalized.startsWith("TOTAL ") || normalized.includes(" TOTAL")) return true;

  const rowText = row.map(normalizeText).filter(Boolean).join(" ");
  if (/^TOTAL(\s|$)/.test(rowText)) return true;
  if (normalized.includes("GENSKE") && rowText.includes("TOTAL")) return true;

  return false;
}

function isLikelyFechamentoSheet(rows: unknown[][]): boolean {
  const headerRow = findHeaderRow(rows, ["CONDOMINIO", "REPASSE"]);
  const headerText = (rows[headerRow] || []).map(normalizeHeader).join(" | ");
  return headerText.includes("CONDOMINIO") && headerText.includes("REPASSE");
}

export async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: "array", cellDates: true });
}

export function parseFechamento(workbook: XLSX.WorkBook): FechamentoLinha[] {
  const linhas: FechamentoLinha[] = [];

  for (const sheetName of workbook.SheetNames) {
    const rows = sheetToRows(workbook, sheetName);
    if (!rows.length || !isLikelyFechamentoSheet(rows)) continue;

    const headerRow = findHeaderRow(rows, ["CONDOMINIO", "REPASSE"]);
    const headers = rows[headerRow] || [];
    const index = makeIndex(headers);

    const colCondominio = findColumn(index, ["CONDOMINIO", "CLIENTE", "NOME CONDOMINIO", "RAZAO SOCIAL", "NOME FANTASIA"]);
    const colRepasse = findColumn(index, ["REPASSE PARCELA", "VALOR REPASSE", "REPASSE DA PARCELA", "REPASSE"]);
    const colUnidade = findColumn(index, ["UNIDADE", "UNID", "APTO", "APARTAMENTO"]);
    const colBloco = findColumn(index, ["BLOCO", "TORRE"]);
    const colResponsavel = findColumn(index, ["RESPONSAVEL", "PROPRIETARIO", "PROPRIETARIO INQUILINO", "DEVEDOR"]);
    const colParcela = findColumn(index, ["PARCELA", "PARC"]);
    const colPeriodo = findColumn(index, ["PERIODO NEGOCIADO", "PERIODO", "COMPETENCIA", "REFERENCIA", "MES"]);
    const colDataPgto = findColumn(index, ["DATA PAGAMENTO", "PAGAMENTO", "DATA PGTO", "VENCIMENTO DO BOLETO"]);
    const colReferencia = findColumn(index, ["PROCESSO", "REFERENCIA", "ACORDO", "NUMERO ACORDO"]);
    const colCategoria = findColumn(index, ["CATEGORIA", "TIPO", "TIPO FATURAMENTO"]);
    const colCnpj = findColumn(index, ["CNPJ", "CNPJ CPF", "CPF CNPJ", "CPF/CNPJ"]);

    if (colCondominio === undefined || colRepasse === undefined) continue;

    const sheetFallbackTipo = inferTipoFromSheet(sheetName);

    rows.slice(headerRow + 1).forEach((row) => {
      const condominio = String(get(row, colCondominio) ?? "").trim();
      const valorRepasse = parseMoney(get(row, colRepasse));
      if (!condominio || valorRepasse === 0) return;
      if (isTotalOrResumoRow(condominio, row)) return;

      const cnpjInfo = normalizeCnpj(get(row, colCnpj));
      const categoriaOriginal = String(get(row, colCategoria) ?? "").trim();
      const tipoInfo = inferTipoFromValue(categoriaOriginal);
      const tipoOrigem = tipoInfo.tipo || sheetFallbackTipo;

      linhas.push({
        condominio,
        cnpj: cnpjInfo.cnpj,
        unidade: String(get(row, colUnidade) ?? "").trim(),
        bloco: String(get(row, colBloco) ?? "").trim(),
        responsavel: String(get(row, colResponsavel) ?? "").trim(),
        parcela: String(get(row, colParcela) ?? "").trim(),
        periodo: String(get(row, colPeriodo) ?? "").trim(),
        dataPagamento: excelDateToText(get(row, colDataPgto)),
        valorRepasse,
        referencia: String(get(row, colReferencia) ?? "").trim(),
        tipoOrigem,
        categoriaOriginal,
        categoriaReconhecidaPorAproximacao: tipoInfo.aproximado,
        origemAba: sheetName,
        cnpjOriginal: cnpjInfo.original,
        cnpjStatus: cnpjInfo.status,
        cnpjAlerta: cnpjInfo.alerta,
      });
    });
  }

  if (!linhas.length) {
    throw new Error("Não encontrei linhas válidas na planilha de fechamento. Procurei abas com colunas Condomínio e Repasse da Parcela.");
  }

  return linhas;
}

export function parseClientes(workbook: XLSX.WorkBook): ClienteCnpj[] {
  const all: ClienteCnpj[] = [];

  for (const sheetName of workbook.SheetNames) {
    const rows = sheetToRows(workbook, sheetName);
    const headerRow = findHeaderRow(rows, ["CNPJ", "RAZAO SOCIAL"]);
    const headers = rows[headerRow] || [];
    const index = makeIndex(headers);

    const colCnpj = findColumn(index, ["CNPJ", "CNPJ CPF", "CPF CNPJ", "CPF", "DOCUMENTO"]);
    const colRazao = findColumn(index, ["RAZAO SOCIAL", "RAZAO SOCIAL NOME COMPLETO", "NOME COMPLETO", "CLIENTE", "CONDOMINIO", "NOME"]);
    const colFantasia = findColumn(index, ["NOME FANTASIA", "NOME ABREVIADO", "NOME FANTASIA NOME ABREVIADO", "APELIDO"]);
    const colSituacao = findColumn(index, ["SITUACAO", "STATUS"]);
    const colTags = findColumn(index, ["TAGS", "TAG"]);

    if (colCnpj === undefined || (colRazao === undefined && colFantasia === undefined)) continue;

    rows.slice(headerRow + 1).forEach((row) => {
      const cnpjRaw = get(row, colCnpj);
      const cnpj = formatCnpj(cnpjRaw);
      if (onlyDigits(cnpj).length !== 14 || !isValidCnpj(cnpj)) return;

      const aliases: string[] = [];
      pushUnique(aliases, get(row, colRazao));
      pushUnique(aliases, get(row, colFantasia));

      if (!aliases.length) return;

      const nome = aliases[0];
      all.push({
        nome,
        nomeNormalizado: normalizeText(nome),
        cnpj,
        origem: sheetName,
        situacao: String(get(row, colSituacao) ?? "").trim(),
        tags: String(get(row, colTags) ?? "").trim(),
        aliases,
      });
    });
  }

  const seen = new Set<string>();
  return all.filter((c) => {
    const key = `${c.cnpj}|${(c.aliases || [c.nome]).map(normalizeText).join("|")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
