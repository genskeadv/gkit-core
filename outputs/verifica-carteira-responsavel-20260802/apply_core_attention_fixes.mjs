import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const envPath = "C:/Users/Genske/Documents/gkit-core/.env.local";

const fixes = [
  {
    label: "L Avance Morumbi",
    targetCliente: "CONDOMINIO EDIFICIO L AVANCE MORUMBI",
    targetCarteira: "Carteira Fabia_Caio",
  },
  {
    label: "Haus Mitre Studios",
    targetCliente: "HAUS MITRE RESERVA VILA MARIANA SETOR STUDIOS",
    targetCarteira: "Carteira Denys_Juliana",
  },
  {
    label: "Fabbrica Mooca",
    targetCliente: "CONDOMINIO FABBRICA MOOCA",
    targetCarteira: "Carteira Vania_Lidiane",
  },
];

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

function namesForCliente(row) {
  return [row.nome, row.nome_fantasia, row.razao_social].filter(Boolean).map(String);
}

function findCliente(clientes, target) {
  const targetKey = normalize(target);
  const exact = clientes.filter((row) => namesForCliente(row).some((name) => normalize(name) === targetKey));
  if (exact.length) return exact;
  return clientes.filter((row) => namesForCliente(row).some((name) => {
    const key = normalize(name);
    return key.includes(targetKey) || targetKey.includes(key);
  }));
}

const env = parseEnv(await fs.readFile(envPath, "utf8"));
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("Env ausente: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const [carteirasResult, clientesResult] = await Promise.all([
  supabase.schema("core").from("carteiras").select("id,nome,status").limit(1000),
  supabase.schema("ciclo").from("clientes").select("id,nome,nome_fantasia,razao_social,carteira_id,ativo").limit(5000),
]);

if (carteirasResult.error) throw new Error(carteirasResult.error.message);
if (clientesResult.error) throw new Error(clientesResult.error.message);

const carteiras = carteirasResult.data ?? [];
const clientes = clientesResult.data ?? [];
const carteiraById = new Map(carteiras.map((row) => [String(row.id), row]));
const carteiraByKey = new Map(carteiras.map((row) => [carteiraKey(row.nome), row]));

const result = [];

for (const fix of fixes) {
  const carteira = carteiraByKey.get(carteiraKey(fix.targetCarteira));
  if (!carteira) {
    result.push({ ...fix, status: "carteira_nao_encontrada" });
    continue;
  }

  const matches = findCliente(clientes, fix.targetCliente);
  if (!matches.length) {
    result.push({ ...fix, status: "cliente_nao_encontrado" });
    continue;
  }
  if (matches.length > 1) {
    result.push({
      ...fix,
      status: "cliente_ambiguo",
      matches: matches.map((row) => ({ id: row.id, nomes: namesForCliente(row), carteiraAtual: carteiraById.get(String(row.carteira_id))?.nome ?? null })),
    });
    continue;
  }

  const cliente = matches[0];
  const carteiraAtual = carteiraById.get(String(cliente.carteira_id));
  if (String(cliente.carteira_id ?? "") === String(carteira.id)) {
    result.push({
      ...fix,
      status: "ja_estava_correto",
      clienteId: cliente.id,
      clienteNome: namesForCliente(cliente)[0],
      carteiraAtual: carteiraAtual?.nome ?? null,
      carteiraFinal: carteira.nome,
    });
    continue;
  }

  const { data, error } = await supabase
    .schema("ciclo")
    .from("clientes")
    .update({
      carteira_id: carteira.id,
      metadata: {
        ajuste_carteira: {
          origem: "outputs/verifica-carteira-responsavel-20260802/apply_core_attention_fixes.mjs",
          data: new Date().toISOString(),
          carteira_anterior: carteiraAtual?.nome ?? null,
          carteira_nova: carteira.nome,
        },
      },
    })
    .eq("id", cliente.id)
    .select("id,nome,nome_fantasia,razao_social,carteira_id")
    .single();

  if (error) throw new Error(`${fix.label}: ${error.message}`);

  result.push({
    ...fix,
    status: "atualizado",
    clienteId: data.id,
    clienteNome: namesForCliente(data)[0],
    carteiraAnterior: carteiraAtual?.nome ?? null,
    carteiraFinal: carteira.nome,
  });
}

console.log(JSON.stringify({ ok: true, result }, null, 2));
