import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const envPath = "C:/Users/Genske/Documents/gkit-core/.env.local";
const oldNames = ["Carteira_Vania", "Carteira Vania"];
const newName = "Carteira Vania_Lidiane";

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

const env = parseEnv(await fs.readFile(envPath, "utf8"));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: wallets, error: walletsError } = await supabase
  .schema("core")
  .from("carteiras")
  .select("id,nome,status,metadata")
  .in("nome", [...oldNames, newName])
  .limit(20);
if (walletsError) throw new Error(walletsError.message);

const target = (wallets ?? []).find((row) => row.nome === newName);
const oldWallets = (wallets ?? []).filter((row) => oldNames.includes(row.nome));
const primaryOld = oldWallets[0] ?? null;
const result = { targetBefore: target ?? null, oldWalletsBefore: oldWallets, actions: [] };

let targetId = target?.id ?? null;

if (!targetId && primaryOld?.id) {
  const metadata = {
    ...((primaryOld.metadata && typeof primaryOld.metadata === "object") ? primaryOld.metadata : {}),
    ajuste_nome_carteira: {
      de: primaryOld.nome,
      para: newName,
      origem: "solicitacao_usuario",
      script: "outputs/verifica-carteira-responsavel-20260802/rename_vania_wallet_to_vania_lidiane.mjs",
      atualizado_em: new Date().toISOString(),
    },
  };
  const { data, error } = await supabase
    .schema("core")
    .from("carteiras")
    .update({ nome: newName, metadata, updated_at: new Date().toISOString() })
    .eq("id", primaryOld.id)
    .select("id,nome,status")
    .single();
  if (error) throw new Error(`Erro ao renomear carteira: ${error.message}`);
  targetId = data.id;
  result.actions.push({ action: "renomeada", id: data.id, de: primaryOld.nome, para: data.nome });
}

if (targetId) {
  for (const oldWallet of oldWallets.filter((row) => row.id !== targetId)) {
    const { error: clientesError } = await supabase
      .schema("ciclo")
      .from("clientes")
      .update({ carteira_id: targetId, updated_at: new Date().toISOString() })
      .eq("carteira_id", oldWallet.id);
    if (clientesError) throw new Error(`Erro ao migrar clientes: ${clientesError.message}`);

    const { error: flexError } = await supabase
      .from("gkit_flex_colaboradores")
      .update({ carteira_id: targetId, updated_at: new Date().toISOString() })
      .eq("carteira_id", oldWallet.id);
    if (flexError) throw new Error(`Erro ao migrar colaboradores Flex: ${flexError.message}`);

    const { error: inactiveError } = await supabase
      .schema("core")
      .from("carteiras")
      .update({
        status: "inativo",
        metadata: {
          ...((oldWallet.metadata && typeof oldWallet.metadata === "object") ? oldWallet.metadata : {}),
          substituida_por: targetId,
          substituida_por_nome: newName,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", oldWallet.id);
    if (inactiveError) throw new Error(`Erro ao inativar carteira antiga: ${inactiveError.message}`);
    result.actions.push({ action: "migrada_e_inativada", id: oldWallet.id, de: oldWallet.nome, para: newName });
  }
}

const { data: verify, error: verifyError } = await supabase
  .schema("core")
  .from("carteiras")
  .select("id,nome,status,metadata")
  .in("nome", [...oldNames, newName])
  .limit(20);
if (verifyError) throw new Error(verifyError.message);

console.log(JSON.stringify({ ok: true, targetId, ...result, verify }, null, 2));
