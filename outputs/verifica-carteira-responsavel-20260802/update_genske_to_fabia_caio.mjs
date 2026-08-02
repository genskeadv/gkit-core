import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const envPath = "C:/Users/Genske/Documents/gkit-core/.env.local";

const updates = [
  {
    nome: "CONDOMÍNIO CO. NEXT LIBERDADE",
    documento: "55597288000115",
    carteira: "Carteira Fabia_Caio",
  },
  {
    nome: "HI VIEW ALTO DA BOA VISTA SETOR HW STYLE",
    documento: "63744144000334",
    carteira: "Carteira Fabia_Caio",
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
    .toUpperCase();
}

function carteiraKey(value) {
  return normalize(String(value ?? "").replace(/^Carteira\s+/i, ""));
}

const env = parseEnv(await fs.readFile(envPath, "utf8"));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: carteiras, error: carteirasError } = await supabase
  .schema("core")
  .from("carteiras")
  .select("id,nome,status")
  .limit(1000);
if (carteirasError) throw new Error(carteirasError.message);

const carteiraByKey = new Map((carteiras ?? []).map((row) => [carteiraKey(row.nome), row]));
const result = [];

for (const item of updates) {
  const carteira = carteiraByKey.get(carteiraKey(item.carteira));
  if (!carteira) {
    result.push({ ...item, status: "carteira_nao_encontrada" });
    continue;
  }

  const { data: existing, error: existingError } = await supabase
    .schema("ciclo")
    .from("clientes")
    .select("id,nome,documento,cnpj_normalizado,carteira_id,ativo,metadata")
    .or(`documento.eq.${item.documento},cnpj_normalizado.eq.${item.documento}`)
    .maybeSingle();
  if (existingError) throw new Error(`${item.nome}: ${existingError.message}`);

  const metadata = {
    ...((existing?.metadata && typeof existing.metadata === "object") ? existing.metadata : {}),
    ajuste_carteira_comissoes_flex: {
      origem: "solicitacao_usuario",
      script: "outputs/verifica-carteira-responsavel-20260802/update_genske_to_fabia_caio.mjs",
      carteira_informada: item.carteira,
      atualizado_em: new Date().toISOString(),
    },
  };

  if (existing?.id) {
    const { error } = await supabase
      .schema("ciclo")
      .from("clientes")
      .update({
        carteira_id: carteira.id,
        ativo: true,
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(`${item.nome}: ${error.message}`);
    result.push({ nome: item.nome, documento: item.documento, status: "atualizado", id: existing.id, carteira: carteira.nome });
    continue;
  }

  const { data, error } = await supabase
    .schema("ciclo")
    .from("clientes")
    .insert({
      carteira_id: carteira.id,
      administradora_id: null,
      nome: item.nome,
      nome_fantasia: item.nome,
      razao_social: item.nome,
      documento: item.documento,
      email: null,
      telefone: null,
      cidade: null,
      estado: null,
      pasta_url: null,
      observacoes: "Cadastro criado para alinhar a apuração de comissões do Flex.",
      tipo_cliente: "mensal",
      tipo_pessoa: "condominio",
      status_operacional: "ativo",
      score_atual: 75,
      risco_atual: "medio",
      temperatura: "neutro",
      ativo: true,
      ultimo_movimento_em: new Date().toISOString(),
      metadata,
    })
    .select("id,nome,documento,carteira_id")
    .single();
  if (error) throw new Error(`${item.nome}: ${error.message}`);
  result.push({ nome: item.nome, documento: item.documento, status: "criado", id: data.id, carteira: carteira.nome });
}

const verifyDocs = updates.map((item) => item.documento);
const { data: verify, error: verifyError } = await supabase
  .schema("ciclo")
  .from("clientes")
  .select("id,nome,documento,cnpj_normalizado,carteira_id,ativo")
  .or(verifyDocs.map((doc) => `documento.eq.${doc},cnpj_normalizado.eq.${doc}`).join(","));
if (verifyError) throw new Error(verifyError.message);

const carteiraNameById = new Map((carteiras ?? []).map((row) => [row.id, row.nome]));
console.log(JSON.stringify({
  ok: true,
  result,
  verify: (verify ?? []).map((row) => ({ ...row, carteira: carteiraNameById.get(row.carteira_id) || null })),
}, null, 2));
