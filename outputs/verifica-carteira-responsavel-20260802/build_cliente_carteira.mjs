import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/Genske/Documents/gkit-core/outputs/verifica-carteira-responsavel-20260802";
const outputPath = `${outputDir}/lista_cliente_carteira.xlsx`;
const processoPath = "C:/Users/Genske/Downloads/Processo.xlsx";
const carteirasPath = "C:/Users/Genske/Downloads/Carteiras 022026.xlsx";

const genericTokens = new Set([
  "CONDOMINIO",
  "CONDOMINIOS",
  "EDIFICIO",
  "EDIFICIOS",
  "RESIDENCIAL",
  "SUBCONDOMINIO",
  "SETOR",
  "TORRE",
  "APARTAMENTO",
  "APARTAMENTOS",
  "COMERCIAL",
]);

const manualCarteiras = new Map([
  ["CONDOMINIO EDIFICIO L AVANCE MORUMBI", "Carteira Fabia_Caio"],
  ["CONDOMINIO IN JARDIM SUL GALLERY", "Carteira Denys_Juliana"],
  ["CONDOMINIO FABBRICA MOOCA", "Carteira Vania_Lidiane"],
  ["LAAGER TECNOLOGIAS SUSTENTAVEIS LTDA", "Carteira Denys_Juliana"],
  ["LAAGER TECNOLOGIAS SUSTENTAVEIS", "Carteira Denys_Juliana"],
  ["NATALI CATARINA CARVALHO FERREYRA", "Carteira Aline_Lidiane"],
]);

const carteiraPorResponsavel = new Map([
  ["FABIA DAVID", "Carteira Fabia_Caio"],
  ["CAIO GIL", "Carteira Fabia_Caio"],
  ["DENYS VALINHOS", "Carteira Denys_Juliana"],
  ["JULIANA LIMA", "Carteira Denys_Juliana"],
  ["SILENE SANTOS", "Carteira Silene_Silmara"],
  ["SILMARA MENEZES", "Carteira Silene_Silmara"],
  ["VANIA SCHUTZ", "Carteira Vania_Lidiane"],
  ["VANIA SCHULZ", "Carteira Vania_Lidiane"],
]);

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/CPF\s*:\s*[\d.-]+/gi, "")
    .replace(/CNPJ\s*:\s*[\d./-]+/gi, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b([A-Z])\s+(\d{2,})\b/g, "$1$2")
    .toUpperCase();
}

function alias(value) {
  return normalize(value)
    .split(" ")
    .filter((token) => token && !genericTokens.has(token))
    .join(" ");
}

function idxByHeader(headers) {
  return Object.fromEntries(headers.map((header, index) => [String(header ?? "").trim(), index]));
}

function colName(indexZeroBased) {
  let n = indexZeroBased + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function rangeAddress(startRow, startCol, rowCount, colCount) {
  const start = `${colName(startCol)}${startRow}`;
  const end = `${colName(startCol + colCount - 1)}${startRow + rowCount - 1}`;
  return `${start}:${end}`;
}

async function importValues(path, sheetName, range) {
  const input = await FileBlob.load(path);
  const workbook = await SpreadsheetFile.importXlsx(input);
  return workbook.worksheets.getItem(sheetName).getRange(range).values;
}

function buildUniqueMap(entries, keyGetter) {
  const buckets = new Map();
  for (const entry of entries) {
    const key = keyGetter(entry);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(entry);
  }
  const unique = new Map();
  for (const [key, bucket] of buckets) {
    const distinctWallets = new Set(bucket.map((item) => normalize(item.carteira)));
    if (distinctWallets.size === 1) unique.set(key, bucket[0]);
  }
  return unique;
}

function resolveClient(client, responsaveis, exactMap, aliasMap, walletEntries) {
  const normalized = normalize(client);
  const aliased = alias(client);
  if (manualCarteiras.has(normalized)) {
    return { carteira: manualCarteiras.get(normalized), metodo: "Ajuste manual" };
  }
  if (exactMap.has(normalized)) {
    return { carteira: exactMap.get(normalized).carteira, metodo: "Base de carteiras" };
  }
  if (aliasMap.has(aliased)) {
    return { carteira: aliasMap.get(aliased).carteira, metodo: "Base de carteiras - alias" };
  }
  const matches = walletEntries.filter((entry) => {
    if (!aliased || !entry.alias || aliased.length < 8 || entry.alias.length < 8) return false;
    return aliased.includes(entry.alias) || entry.alias.includes(aliased);
  });
  const distinctWallets = new Set(matches.map((item) => normalize(item.carteira)));
  if (distinctWallets.size === 1) {
    return { carteira: matches[0].carteira, metodo: "Base de carteiras - alias contido" };
  }

  const inferred = [...new Set(responsaveis.map((nome) => carteiraPorResponsavel.get(normalize(nome))).filter(Boolean))];
  if (inferred.length === 1) return { carteira: inferred[0], metodo: "Inferido pelo responsavel" };
  if (inferred.length > 1) return { carteira: inferred.join(" / "), metodo: "Responsaveis com carteiras diferentes" };
  return { carteira: "Sem carteira", metodo: "Sem responsavel mapeado" };
}

function applyHeader(range) {
  range.format = {
    fill: "#14532D",
    font: { bold: true, color: "#FFFFFF" },
    borders: { preset: "outside", style: "thin", color: "#14532D" },
  };
}

await fs.mkdir(outputDir, { recursive: true });
const processoRows = await importValues(processoPath, "Processos", "A1:AH70");
const carteiraRows = await importValues(carteirasPath, "Cart", "A1:C183");
const processoIdx = idxByHeader(processoRows[0]);
const carteiraIdx = idxByHeader(carteiraRows[0]);

const walletEntries = carteiraRows.slice(1).filter((row) => row.some(Boolean)).map((row) => ({
  clienteCarteira: row[carteiraIdx.Cliente],
  carteira: row[carteiraIdx.Carteira],
  tipo: row[carteiraIdx.Tipo],
  normalized: normalize(row[carteiraIdx.Cliente]),
  alias: alias(row[carteiraIdx.Cliente]),
}));
const exactMap = new Map();
for (const entry of walletEntries) {
  if (entry.normalized && !exactMap.has(entry.normalized)) exactMap.set(entry.normalized, entry);
}
const aliasMap = buildUniqueMap(walletEntries, (entry) => entry.alias);

const processoByClient = new Map();
for (const row of processoRows.slice(1)) {
  const cliente = row[processoIdx.Cliente];
  if (!cliente) continue;
  const key = normalize(cliente);
  if (!processoByClient.has(key)) processoByClient.set(key, { cliente, rows: [], responsaveis: new Set() });
  processoByClient.get(key).rows.push(row);
  const responsavel = row[processoIdx["Responsável"]];
  if (responsavel) processoByClient.get(key).responsaveis.add(responsavel);
}

for (const [key, carteira] of manualCarteiras) {
  if (!processoByClient.has(key)) {
    processoByClient.set(key, {
      cliente: key.replace(/\s+/g, " "),
      rows: [],
      responsaveis: new Set(),
      manualOnly: true,
      manualCarteira: carteira,
    });
  }
}

const outputRows = [...processoByClient.values()]
  .map((entry) => {
    const resolved = entry.manualOnly
      ? { carteira: entry.manualCarteira, metodo: "Ajuste manual fora do Processo.xlsx" }
      : resolveClient(entry.cliente, [...entry.responsaveis], exactMap, aliasMap, walletEntries);
    return [
      entry.cliente,
      resolved.carteira,
      [...entry.responsaveis].join(", "),
      entry.rows.length,
      resolved.metodo,
    ];
  })
  .sort((a, b) => String(a[0]).localeCompare(String(b[0]), "pt-BR"));

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Cliente Carteira");
sheet.showGridLines = false;
const headers = ["Cliente", "Carteira", "Responsavel no Processo", "Qtde processos", "Metodo"];
sheet.getRangeByIndexes(0, 0, outputRows.length + 1, headers.length).values = [headers, ...outputRows];
sheet.tables.add(rangeAddress(1, 0, outputRows.length + 1, headers.length), true, "ClienteCarteiraTable");
applyHeader(sheet.getRange("A1:E1"));
sheet.getRange(`D2:D${outputRows.length + 1}`).format.numberFormat = "#,##0";
sheet.getRange("A:E").format.autofitColumns();
sheet.getRange("A:A").format.columnWidth = 56;
sheet.getRange("B:B").format.columnWidth = 28;
sheet.getRange("C:C").format.columnWidth = 38;
sheet.getRange("E:E").format.columnWidth = 34;
sheet.freezePanes.freezeRows(1);

const metodologia = workbook.worksheets.add("Metodologia");
metodologia.showGridLines = false;
metodologia.getRange("A1:C9").values = [
  ["Item", "Valor", "Observacao"],
  ["Fonte processos", processoPath, "Clientes e responsaveis"],
  ["Fonte carteiras", carteirasPath, "Base cliente/carteira"],
  ["Ajustes manuais", manualCarteiras.size, "Inclui L Avance, In Jardim Sul, Laager, Natali e Fabbrica"],
  ["Regra Fabia_Caio", "Fabia David; Caio Gil", ""],
  ["Regra Denys_Juliana", "Denys Valinhos; Juliana Lima", ""],
  ["Regra Silene_Silmara", "Silene Santos; Silmara Menezes", ""],
  ["Regra Carteira Vania_Lidiane", "Vania Schutz / Vania Schulz + Lidiane", ""],
  ["Total clientes listados", outputRows.length, ""],
];
applyHeader(metodologia.getRange("A1:C1"));
metodologia.getRange("A:C").format.autofitColumns();
metodologia.getRange("B:B").format.columnWidth = 60;
metodologia.freezePanes.freezeRows(1);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "formula error scan",
});
console.log(errors.ndjson);

const check = await workbook.inspect({
  kind: "table",
  sheetId: "Cliente Carteira",
  range: `A1:E${Math.min(outputRows.length + 1, 20)}`,
  include: "values",
  tableMaxRows: 20,
  tableMaxCols: 5,
  maxChars: 10000,
});
console.log(check.ndjson);

const preview = await workbook.render({ sheetName: "Cliente Carteira", autoCrop: "all", scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/preview_lista_cliente_carteira.png`, new Uint8Array(await preview.arrayBuffer()));

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(JSON.stringify({ outputPath, rows: outputRows.length }, null, 2));
