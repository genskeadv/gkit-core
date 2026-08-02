import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const envPath = "C:/Users/Genske/Documents/gkit-core/.env.local";

const missingClients = [
  { nome: "BIOMA ITAIM", carteira: "Carteira Denys_Juliana", tipoPessoa: "condominio" },
  { nome: "CONDOMÍNIO EDIFÍCIO FOLLOW THE EUREKA BUILDING", carteira: "Carteira Denys_Juliana", tipoPessoa: "condominio" },
  { nome: "CONDOMÍNIO HAUS MITRE RESERVA VILA MARIANA - LOJAS", carteira: "Carteira Denys_Juliana", tipoPessoa: "condominio" },
  { nome: "HI VIEW ALTO DA BOA VISTA - HW STYLE - TORRE 2", carteira: "Carteira Fabia_Caio", tipoPessoa: "condominio" },
  { nome: "LAAGER SISTEMAS LTDA", carteira: "Carteira Denys_Juliana", tipoPessoa: "pessoa_juridica" },
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

function candidateNames(row) {
  return [row.nome, row.nome_fantasia, row.razao_social].filter(Boolean).map(String);
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
const carteiraByKey = new Map(carteiras.map((row) => [carteiraKey(row.nome), row]));
const existingByName = new Map();
for (const cliente of clientes) {
  for (const name of candidateNames(cliente)) {
    existingByName.set(normalize(name), cliente);
  }
}

const result = [];
for (const item of missingClients) {
  const existing = existingByName.get(normalize(item.nome));
  if (existing) {
    result.push({ nome: item.nome, status: "ja_existia", id: existing.id });
    continue;
  }
  const carteira = carteiraByKey.get(carteiraKey(item.carteira));
  if (!carteira) {
    result.push({ nome: item.nome, status: "carteira_nao_encontrada", carteira: item.carteira });
    continue;
  }
  const payload = {
    carteira_id: carteira.id,
    administradora_id: null,
    nome: item.nome,
    nome_fantasia: item.nome,
    razao_social: item.nome,
    documento: null,
    email: null,
    telefone: null,
    cidade: null,
    estado: null,
    pasta_url: null,
    observacoes: "Cadastro criado para alinhar carteira/responsavel a partir de Processo.xlsx.",
    tipo_cliente: "mensal",
    tipo_pessoa: item.tipoPessoa,
    status_operacional: "ativo",
    score_atual: 75,
    risco_atual: "medio",
    temperatura: "neutro",
    ativo: true,
    ultimo_movimento_em: new Date().toISOString(),
    metadata: {
      origem: "ajuste_manual_processo_xlsx",
      script: "outputs/verifica-carteira-responsavel-20260802/create_missing_ciclo_clients.mjs",
      carteira_inferida: item.carteira,
    },
  };
  const { data, error } = await supabase.schema("ciclo").from("clientes").insert(payload).select("id,nome,carteira_id").single();
  if (error) throw new Error(`${item.nome}: ${error.message}`);
  result.push({ nome: item.nome, status: "criado", id: data.id, carteira: carteira.nome });
}

console.log(JSON.stringify({ ok: true, result }, null, 2));
