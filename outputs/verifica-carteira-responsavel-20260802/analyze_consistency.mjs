import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const path = "C:/Users/Genske/Downloads/Processo.xlsx";

function normalizeHeader(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

const input = await FileBlob.load(path);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("Processos");
const rows = sheet.getRange("A1:AH70").values;
const headers = rows[0].map((value) => String(value ?? "").trim());
const normalizedHeaders = headers.map(normalizeHeader);

const indexes = {
  cliente: normalizedHeaders.indexOf("cliente"),
  carteira: normalizedHeaders.findIndex((header) => header.includes("carteira")),
  responsavel: normalizedHeaders.findIndex((header) => header.includes("responsavel")),
  titulo: normalizedHeaders.indexOf("titulo"),
  numero: normalizedHeaders.indexOf("numero"),
};

const dataRows = rows.slice(1).map((row, offset) => ({ excelRow: offset + 2, row }));

const byCarteira = new Map();
const byResponsavel = new Map();
const pairs = new Map();
const blankIssues = [];

for (const item of dataRows) {
  const carteira = String(item.row[indexes.carteira] ?? "").trim();
  const responsavel = String(item.row[indexes.responsavel] ?? "").trim();
  const cliente = String(item.row[indexes.cliente] ?? "").trim();
  const titulo = String(item.row[indexes.titulo] ?? "").trim();
  if (!carteira || !responsavel) {
    blankIssues.push({ row: item.excelRow, cliente, titulo, carteira, responsavel });
    continue;
  }
  const carteiraKey = normalizeText(carteira);
  const responsavelKey = normalizeText(responsavel);
  if (!byCarteira.has(carteiraKey)) byCarteira.set(carteiraKey, { carteira, responsaveis: new Map(), rows: [] });
  byCarteira.get(carteiraKey).rows.push(item.excelRow);
  byCarteira.get(carteiraKey).responsaveis.set(responsavel, (byCarteira.get(carteiraKey).responsaveis.get(responsavel) ?? 0) + 1);

  if (!byResponsavel.has(responsavelKey)) byResponsavel.set(responsavelKey, { responsavel, carteiras: new Map(), rows: [] });
  byResponsavel.get(responsavelKey).rows.push(item.excelRow);
  byResponsavel.get(responsavelKey).carteiras.set(carteira, (byResponsavel.get(responsavelKey).carteiras.get(carteira) ?? 0) + 1);

  const pairKey = `${carteiraKey}|${responsavelKey}`;
  if (!pairs.has(pairKey)) pairs.set(pairKey, { carteira, responsavel, count: 0, rows: [], examples: [] });
  const pair = pairs.get(pairKey);
  pair.count += 1;
  pair.rows.push(item.excelRow);
  if (pair.examples.length < 5) pair.examples.push({ row: item.excelRow, cliente, titulo });
}

const carteiraSummary = [...byCarteira.values()].map((entry) => ({
  carteira: entry.carteira,
  total: entry.rows.length,
  responsaveis: [...entry.responsaveis.entries()].map(([responsavel, count]) => ({ responsavel, count })),
  rows: entry.rows,
}));

const responsavelSummary = [...byResponsavel.values()].map((entry) => ({
  responsavel: entry.responsavel,
  total: entry.rows.length,
  carteiras: [...entry.carteiras.entries()].map(([carteira, count]) => ({ carteira, count })),
  rows: entry.rows,
}));

const inconsistentCarteiras = carteiraSummary.filter((entry) => entry.responsaveis.length > 1);
const inconsistentResponsaveis = responsavelSummary.filter((entry) => entry.carteiras.length > 1);

console.log(JSON.stringify({
  headers,
  indexes,
  rows: dataRows.length,
  carteiraSummary,
  responsavelSummary,
  pairs: [...pairs.values()].sort((a, b) => a.carteira.localeCompare(b.carteira, "pt-BR") || a.responsavel.localeCompare(b.responsavel, "pt-BR")),
  blankIssues,
  inconsistentCarteiras,
  inconsistentResponsaveis,
}, null, 2));
