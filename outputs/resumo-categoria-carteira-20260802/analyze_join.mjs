import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const financasPath = "C:/Users/Genske/Downloads/financas_511214782009144.xlsx";
const carteirasPath = "C:/Users/Genske/Downloads/Carteiras 022026.xlsx";

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/CPF\s*:\s*[\d.-]+/gi, "")
    .replace(/CNPJ\s*:\s*[\d./-]+/gi, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

async function importSheet(path, sheetName, range) {
  const input = await FileBlob.load(path);
  const workbook = await SpreadsheetFile.importXlsx(input);
  const sheet = workbook.worksheets.getItem(sheetName);
  return sheet.getRange(range).values;
}

const financasRows = await importSheet(financasPath, "financas", "A1:AE193");
const cartRows = await importSheet(carteirasPath, "Cart", "A1:C183");

const financeHeaders = financasRows[2].map((h) => String(h ?? "").trim());
const idx = Object.fromEntries(financeHeaders.map((h, i) => [h, i]));
const cartHeaders = cartRows[0].map((h) => String(h ?? "").trim());
const cidx = Object.fromEntries(cartHeaders.map((h, i) => [h, i]));

const walletMap = new Map();
const duplicateKeys = new Set();
for (const row of cartRows.slice(1)) {
  const key = normalizeName(row[cidx.Cliente]);
  if (!key) continue;
  if (walletMap.has(key)) duplicateKeys.add(key);
  walletMap.set(key, {
    clienteCarteira: row[cidx.Cliente],
    carteira: row[cidx.Carteira],
    tipo: row[cidx.Tipo],
  });
}

const records = financasRows.slice(3).filter((row) => row.some((cell) => cell !== null && cell !== ""));
const unmatched = [];
const matched = [];
for (const row of records) {
  const key = normalizeName(row[idx["Cliente (Nome Fantasia)"]]);
  const match = walletMap.get(key);
  const out = {
    cliente: row[idx["Cliente (Nome Fantasia)"]],
    categoria: row[idx.Categoria],
    valorLiquido: Number(row[idx["Valor Líquido"]] ?? 0),
    valorRecebido: Number(row[idx["Valor Recebido"]] ?? 0),
    valorAReceber: Number(row[idx["Valor a Receber"]] ?? 0),
    carteira: match?.carteira ?? "",
    tipo: match?.tipo ?? "",
    key,
  };
  if (match) matched.push(out);
  else unmatched.push(out);
}

const totals = records.reduce(
  (acc, row) => {
    acc.liquido += Number(row[idx["Valor Líquido"]] ?? 0);
    acc.recebido += Number(row[idx["Valor Recebido"]] ?? 0);
    acc.aReceber += Number(row[idx["Valor a Receber"]] ?? 0);
    return acc;
  },
  { liquido: 0, recebido: 0, aReceber: 0 },
);

console.log(
  JSON.stringify(
    {
      financeRows: records.length,
      carteiraRows: cartRows.length - 1,
      matchedRows: matched.length,
      unmatchedRows: unmatched.length,
      duplicateCarteiraKeys: duplicateKeys.size,
      totals,
      unmatchedClients: [...new Set(unmatched.map((r) => r.cliente))].slice(0, 50),
    },
    null,
    2,
  ),
);
