import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const outputDir = "C:/Users/Genske/Documents/gkit-core/outputs/verifica-carteira-responsavel-20260802";
const listaPath = `${outputDir}/lista_cliente_carteira.xlsx`;
const processoPath = "C:/Users/Genske/Downloads/Processo.xlsx";
const carteirasPath = "C:/Users/Genske/Downloads/Carteiras 022026.xlsx";
const envPath = "C:/Users/Genske/Documents/gkit-core/.env.local";

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

function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b([A-Z])\s+(\d{2,})\b/g, "$1$2")
    .toUpperCase();
}

function carteiraKey(value) {
  return normalize(String(value ?? "").replace(/^Carteira\s+/i, ""));
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

async function readWorkbookRows() {
  try {
    await fs.access(listaPath);
  } catch {
    return buildRowsFromSources();
  }
  const input = await FileBlob.load(listaPath);
  const workbook = await SpreadsheetFile.importXlsx(input);
  const values = workbook.worksheets.getItem("Cliente Carteira").getRange("A1:E40").values;
  const idx = idxByHeader(values[0]);
  return values.slice(1).filter((row) => row.some(Boolean)).map((row) => ({
    cliente: String(row[idx.Cliente] ?? "").trim(),
    carteira: String(row[idx.Carteira] ?? "").trim(),
    responsavelProcesso: String(row[idx["Responsavel no Processo"]] ?? "").trim(),
    qtdProcessos: Number(row[idx["Qtde processos"]] ?? 0),
    metodo: String(row[idx.Metodo] ?? "").trim(),
  }));
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
    const distinctWallets = new Set(bucket.map((item) => carteiraKey(item.carteira)));
    if (distinctWallets.size === 1) unique.set(key, bucket[0]);
  }
  return unique;
}

function resolveSourceClient(client, responsaveis, exactMap, aliasMap, walletEntries) {
  const normalized = normalize(client);
  const aliased = alias(client);
  if (manualCarteiras.has(normalized)) return { carteira: manualCarteiras.get(normalized), metodo: "Ajuste manual" };
  if (exactMap.has(normalized)) return { carteira: exactMap.get(normalized).carteira, metodo: "Base de carteiras" };
  if (aliasMap.has(aliased)) return { carteira: aliasMap.get(aliased).carteira, metodo: "Base de carteiras - alias" };
  const matches = walletEntries.filter((entry) => {
    if (!aliased || !entry.alias || aliased.length < 8 || entry.alias.length < 8) return false;
    return aliased.includes(entry.alias) || entry.alias.includes(aliased);
  });
  const distinctWallets = new Set(matches.map((item) => carteiraKey(item.carteira)));
  if (distinctWallets.size === 1) return { carteira: matches[0].carteira, metodo: "Base de carteiras - alias contido" };
  const inferred = [...new Set(responsaveis.map((nome) => carteiraPorResponsavel.get(normalize(nome))).filter(Boolean))];
  if (inferred.length === 1) return { carteira: inferred[0], metodo: "Inferido pelo responsavel" };
  if (inferred.length > 1) return { carteira: inferred.join(" / "), metodo: "Responsaveis com carteiras diferentes" };
  return { carteira: "Sem carteira", metodo: "Sem responsavel mapeado" };
}

async function buildRowsFromSources() {
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
      processoByClient.set(key, { cliente: key, rows: [], responsaveis: new Set(), manualOnly: true, manualCarteira: carteira });
    }
  }
  return [...processoByClient.values()].map((entry) => {
    const resolved = entry.manualOnly
      ? { carteira: entry.manualCarteira, metodo: "Ajuste manual fora do Processo.xlsx" }
      : resolveSourceClient(entry.cliente, [...entry.responsaveis], exactMap, aliasMap, walletEntries);
    return {
      cliente: String(entry.cliente),
      carteira: resolved.carteira,
      responsavelProcesso: [...entry.responsaveis].join(", "),
      qtdProcessos: entry.rows.length,
      metodo: resolved.metodo,
    };
  });
}

function uniqueById(rows) {
  const map = new Map();
  for (const row of rows ?? []) map.set(String(row.id), row);
  return [...map.values()];
}

const env = parseEnv(await fs.readFile(envPath, "utf8"));
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("Env ausente: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const lista = await readWorkbookRows();

const [carteirasResult, usuariosResult, carteiraColabResult, clientesResult] = await Promise.all([
  supabase.schema("core").from("carteiras").select("id,nome,status").limit(1000),
  supabase.schema("security").from("usuarios").select("id,nome,email,status").limit(1000),
  supabase.schema("core").from("carteira_colaboradores").select("carteira_id,usuario_id,principal,ativo").eq("ativo", true).limit(2000),
  supabase.schema("ciclo").from("clientes").select("id,nome,nome_fantasia,razao_social,carteira_id,ativo").limit(5000),
]);

for (const result of [carteirasResult, usuariosResult, carteiraColabResult, clientesResult]) {
  if (result.error) throw new Error(result.error.message);
}

const carteiras = carteirasResult.data ?? [];
const usuarios = usuariosResult.data ?? [];
const carteiraColabs = carteiraColabResult.data ?? [];
const clientes = clientesResult.data ?? [];

const carteiraById = new Map(carteiras.map((row) => [String(row.id), row]));
const carteiraByKey = new Map();
for (const row of carteiras) {
  carteiraByKey.set(carteiraKey(row.nome), row);
  carteiraByKey.set(carteiraKey(`Carteira ${row.nome}`), row);
}

const usuarioById = new Map(usuarios.map((row) => [String(row.id), row]));
const colaboradoresByCarteira = new Map();
for (const rel of carteiraColabs) {
  const carteiraId = String(rel.carteira_id ?? "");
  if (!carteiraId) continue;
  if (!colaboradoresByCarteira.has(carteiraId)) colaboradoresByCarteira.set(carteiraId, []);
  const usuario = usuarioById.get(String(rel.usuario_id));
  if (usuario) colaboradoresByCarteira.get(carteiraId).push(String(usuario.nome ?? ""));
}

const clienteIndex = new Map();
for (const cliente of clientes) {
  const names = [cliente.nome, cliente.nome_fantasia, cliente.razao_social].filter(Boolean);
  for (const name of names) {
    const key = normalize(name);
    if (!key) continue;
    if (!clienteIndex.has(key)) clienteIndex.set(key, []);
    clienteIndex.get(key).push(cliente);
  }
}

function findCliente(nome) {
  const key = normalize(nome);
  const exact = uniqueById(clienteIndex.get(key) ?? []);
  if (exact.length) return { matches: exact, match: "exato" };

  const tokens = key.split(" ").filter((token) => token.length > 2);
  const candidates = [];
  for (const cliente of clientes) {
    const candidateName = normalize(cliente.nome_fantasia || cliente.nome || cliente.razao_social);
    if (!candidateName) continue;
    if (candidateName.includes(key) || key.includes(candidateName)) {
      candidates.push(cliente);
      continue;
    }
    const candidateTokens = new Set(candidateName.split(" ").filter((token) => token.length > 2));
    const overlap = tokens.filter((token) => candidateTokens.has(token)).length;
    if (tokens.length >= 3 && overlap / tokens.length >= 0.85) candidates.push(cliente);
  }
  return { matches: uniqueById(candidates), match: "aproximado" };
}

const comparisons = lista.map((item) => {
  const carteiraCore = carteiraByKey.get(carteiraKey(item.carteira));
  const clientLookup = findCliente(item.cliente);
  const clientMatches = clientLookup.matches;
  const carteirasClienteCore = uniqueById(clientMatches.map((cliente) => carteiraById.get(String(cliente.carteira_id))).filter(Boolean));
  const carteiraClienteNomes = carteirasClienteCore.map((row) => String(row.nome));
  const carteiraListaKey = carteiraKey(item.carteira);
  const carteiraClienteKeys = new Set(carteiraClienteNomes.map(carteiraKey));
  const existeCarteira = Boolean(carteiraCore);
  const clienteEncontrado = clientMatches.length > 0;
  const clienteCarteiraConfere = !clienteEncontrado
    ? null
    : carteiraClienteKeys.size === 0
      ? false
      : carteiraClienteKeys.has(carteiraListaKey);
  return {
    ...item,
    carteiraCore: carteiraCore?.nome ?? "",
    carteiraCoreStatus: carteiraCore?.status ?? "",
    colaboradoresCore: carteiraCore ? (colaboradoresByCarteira.get(String(carteiraCore.id)) ?? []).join(", ") : "",
    clienteEncontrado,
    clienteMatch: clienteEncontrado ? clientLookup.match : "",
    clienteCoreNomes: clientMatches.map((cliente) => String(cliente.nome_fantasia || cliente.nome || cliente.razao_social || "")).join(" | "),
    carteiraClienteCore: carteiraClienteNomes.join(" | "),
    existeCarteira,
    clienteCarteiraConfere,
    statusComparacao: !existeCarteira
      ? "Carteira nao existe no core"
      : !clienteEncontrado
        ? "Cliente nao encontrado no ciclo"
        : clienteCarteiraConfere
          ? "Confere"
          : "Diverge do ciclo",
  };
});

const counts = comparisons.reduce((acc, row) => {
  acc[row.statusComparacao] = (acc[row.statusComparacao] ?? 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({
  core: {
    carteiras: carteiras.map((row) => ({
      nome: row.nome,
      status: row.status,
      colaboradores: colaboradoresByCarteira.get(String(row.id)) ?? [],
    })).sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR")),
    totalClientesCiclo: clientes.length,
  },
  counts,
  divergencias: comparisons.filter((row) => row.statusComparacao !== "Confere"),
  all: comparisons,
}, null, 2));
