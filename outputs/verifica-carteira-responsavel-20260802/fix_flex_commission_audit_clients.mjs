import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const envPath = "C:/Users/Genske/Documents/gkit-core/.env.local";

const clientsToCreate = [
  {
    nome: "CONDOMINIO EDIFICIO JOHANNES BRAHMS",
    documento: "54960836000167",
    carteira: "Carteira Silene_Silmara",
    tipoCliente: "cobranca",
  },
  {
    nome: "CONDOMÍNIO K360° HUMBERTO I - Residencial",
    documento: "50887640000214",
    carteira: "Carteira Silene_Silmara",
    tipoCliente: "mensal",
  },
  {
    nome: "GIRO TATUAPÉ",
    documento: "30088899000107",
    carteira: "Carteira Fabia_Caio",
    tipoCliente: "pontual",
  },
  {
    nome: "PRIVATE BELA VISTA",
    documento: "37983337000176",
    carteira: "Carteira Silene_Silmara",
    tipoCliente: "cobranca",
  },
  {
    nome: "CONDOMÍNIO EXTENSION BERRINI",
    documento: "55211616000101",
    carteira: "Carteira Silene_Silmara",
    tipoCliente: "cobranca",
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
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("Env ausente: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.");

const supabase = createClient(supabaseUrl, serviceRoleKey, {
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

for (const item of clientsToCreate) {
  const { data: existing, error: existingError } = await supabase
    .schema("ciclo")
    .from("clientes")
    .select("id,nome,documento,cnpj_normalizado,carteira_id,ativo")
    .or(`documento.eq.${item.documento},cnpj_normalizado.eq.${item.documento}`)
    .maybeSingle();
  if (existingError) throw new Error(`${item.nome}: ${existingError.message}`);

  const carteira = carteiraByKey.get(carteiraKey(item.carteira));
  if (!carteira) {
    result.push({ nome: item.nome, status: "carteira_nao_encontrada", carteira: item.carteira });
    continue;
  }

  if (existing?.id) {
    const { error } = await supabase
      .schema("ciclo")
      .from("clientes")
      .update({
        carteira_id: carteira.id,
        ativo: true,
        updated_at: new Date().toISOString(),
        metadata: {
          origem: "ajuste_manual_apuracao_flex",
          script: "outputs/verifica-carteira-responsavel-20260802/fix_flex_commission_audit_clients.mjs",
          carteira_inferida: item.carteira,
        },
      })
      .eq("id", existing.id);
    if (error) throw new Error(`${item.nome}: ${error.message}`);
    result.push({ nome: item.nome, documento: item.documento, status: "atualizado", id: existing.id, carteira: carteira.nome });
    continue;
  }

  const payload = {
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
    observacoes: "Cadastro criado para reduzir auditoria da apuração de comissões do Flex a partir de Carteiras 022026.xlsx/planilha de receitas.",
    tipo_cliente: item.tipoCliente,
    tipo_pessoa: "condominio",
    status_operacional: "ativo",
    score_atual: 75,
    risco_atual: "medio",
    temperatura: "neutro",
    ativo: true,
    ultimo_movimento_em: new Date().toISOString(),
    metadata: {
      origem: "ajuste_manual_apuracao_flex",
      script: "outputs/verifica-carteira-responsavel-20260802/fix_flex_commission_audit_clients.mjs",
      carteira_inferida: item.carteira,
    },
  };

  const { data, error } = await supabase
    .schema("ciclo")
    .from("clientes")
    .insert(payload)
    .select("id,nome,documento,carteira_id")
    .single();
  if (error) throw new Error(`${item.nome}: ${error.message}`);
  result.push({ nome: item.nome, documento: item.documento, status: "criado", id: data.id, carteira: carteira.nome });
}

console.log(JSON.stringify({ ok: true, result }, null, 2));
