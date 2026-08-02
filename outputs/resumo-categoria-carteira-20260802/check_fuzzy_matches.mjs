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

function lev(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

async function importValues(path, sheetName, range) {
  const input = await FileBlob.load(path);
  const workbook = await SpreadsheetFile.importXlsx(input);
  return workbook.worksheets.getItem(sheetName).getRange(range).values;
}

const financasRows = await importValues(financasPath, "financas", "A1:AE193");
const cartRows = await importValues(carteirasPath, "Cart", "A1:C183");
const financeHeaders = financasRows[2].map((h) => String(h ?? "").trim());
const idx = Object.fromEntries(financeHeaders.map((h, i) => [h, i]));
const cartHeaders = cartRows[0].map((h) => String(h ?? "").trim());
const cidx = Object.fromEntries(cartHeaders.map((h, i) => [h, i]));

const walletEntries = cartRows.slice(1).map((row) => ({
  cliente: row[cidx.Cliente],
  carteira: row[cidx.Carteira],
  tipo: row[cidx.Tipo],
  key: normalizeName(row[cidx.Cliente]),
}));
const walletMap = new Map(walletEntries.map((entry) => [entry.key, entry]));

const uniqueUnmatched = [
  ...new Set(
    financasRows
      .slice(3)
      .map((row) => row[idx["Cliente (Nome Fantasia)"]])
      .filter((name) => !walletMap.has(normalizeName(name))),
  ),
];

const suggestions = uniqueUnmatched.map((name) => {
  const key = normalizeName(name);
  const ranked = walletEntries
    .map((entry) => {
      const d = lev(key, entry.key);
      const score = 1 - d / Math.max(key.length, entry.key.length, 1);
      const contains = key.includes(entry.key) || entry.key.includes(key);
      return { ...entry, score, contains };
    })
    .sort((a, b) => Number(b.contains) - Number(a.contains) || b.score - a.score)
    .slice(0, 3);
  return { name, key, best: ranked };
});

console.log(JSON.stringify(suggestions, null, 2));
