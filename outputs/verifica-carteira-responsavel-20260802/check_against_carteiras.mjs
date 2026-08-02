import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

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

const carteiraResponsaveis = new Map([
  ["CARTEIRA FABIA CAIO", ["FABIA DAVID", "CAIO GIL"]],
  ["CARTEIRA DENYS JULIANA", ["DENYS VALINHOS", "JULIANA LIMA"]],
  ["CARTEIRA SILENE SILMARA", ["SILENE SANTOS", "SILMARA MENEZES"]],
  ["CARTEIRA VANIA LIDIANE", ["VANIA SCHUTZ", "LIDIANE"]],
  ["CARTEIRA ALINE LIDIANE", ["ALINE", "LIDIANE"]],
]);

const manualCarteiras = new Map([
  ["CONDOMINIO EDIFICIO L AVANCE MORUMBI", "Carteira Fabia_Caio"],
  ["CONDOMINIO FABBRICA MOOCA", "Carteira Vania_Lidiane"],
  ["LAAGER TECNOLOGIAS SUSTENTAVEIS LTDA", "Carteira Denys_Juliana"],
  ["LAAGER TECNOLOGIAS SUSTENTAVEIS", "Carteira Denys_Juliana"],
  ["NATALI CATARINA CARVALHO FERREYRA", "Carteira Aline_Lidiane"],
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

function resolveClient(client, exactMap, aliasMap, walletEntries) {
  const normalized = normalize(client);
  const aliased = alias(client);
  if (manualCarteiras.has(normalized)) {
    return {
      carteira: manualCarteiras.get(normalized),
      tipo: "manual",
      clienteCarteira: client,
      matchStatus: "Manual",
    };
  }
  if (exactMap.has(normalized)) return { ...exactMap.get(normalized), matchStatus: "Exato" };
  if (aliasMap.has(aliased)) return { ...aliasMap.get(aliased), matchStatus: "Alias unico" };
  const matches = walletEntries.filter((entry) => {
    if (!aliased || !entry.alias || aliased.length < 8 || entry.alias.length < 8) return false;
    return aliased.includes(entry.alias) || entry.alias.includes(aliased);
  });
  const distinctWallets = new Set(matches.map((item) => normalize(item.carteira)));
  if (distinctWallets.size === 1) return { ...matches[0], matchStatus: "Alias contido" };
  return { carteira: "", tipo: "", clienteCarteira: "", matchStatus: "Sem carteira encontrada" };
}

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

const results = processoRows.slice(1).map((row, offset) => {
  const excelRow = offset + 2;
  const cliente = row[processoIdx.Cliente] ?? "";
  const responsavel = row[processoIdx["Responsável"]] ?? "";
  const title = row[processoIdx["Título"]] ?? "";
  const match = resolveClient(cliente, exactMap, aliasMap, walletEntries);
  const allowed = carteiraResponsaveis.get(normalize(match.carteira)) ?? [];
  const normalizedResp = normalize(responsavel);
  let status = "Sem carteira encontrada";
  if (match.carteira) status = allowed.includes(normalizedResp) ? "Consistente" : "Inconsistente";
  return {
    row: excelRow,
    cliente,
    titulo: title,
    responsavel,
    carteira: match.carteira || "Sem carteira encontrada",
    responsaveisEsperados: allowed,
    matchStatus: match.matchStatus,
    clienteCarteira: match.clienteCarteira,
    status,
  };
});

const counts = results.reduce((acc, item) => {
  acc[item.status] = (acc[item.status] ?? 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({
  total: results.length,
  counts,
  byStatus: {
    inconsistentes: results.filter((item) => item.status === "Inconsistente"),
    semCarteiraEncontrada: results.filter((item) => item.status === "Sem carteira encontrada"),
  },
  all: results,
}, null, 2));
