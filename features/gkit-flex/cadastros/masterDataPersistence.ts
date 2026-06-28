import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, logEvent } from '../audit';
import { buildSlug, normalizeText, suggestCanonicalName, type CadastroTipo } from './normalization';

export type CadastroItem = {
  id: string;
  tipo: CadastroTipo;
  nome: string;
  slug: string;
  status: 'ativo' | 'inativo';
  origem: string;
  usos: number;
  aliases: string[];
  created_at?: string;
  updated_at?: string;
};

type DiscoveredValue = {
  tipo: CadastroTipo;
  nomeOriginal: string;
  nomeSugerido: string;
  slug: string;
  usos: number;
  origem: string;
};

function assertConfigured(supabase: SupabaseClient | null): asserts supabase is SupabaseClient {
  if (!supabase) throw new Error('Supabase nao configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
}

async function upsertCadastro(supabase: SupabaseClient, item: DiscoveredValue) {
  const { data: existing, error: existingError } = await supabase
    .from('gkit_cadastros')
    .select('id, usos, origem')
    .eq('tipo', item.tipo)
    .eq('slug', item.slug)
    .maybeSingle();

  if (existingError) throw new Error(`Erro ao consultar cadastro ${item.nomeSugerido}: ${existingError.message}`);

  if (existing?.id) {
    const { error } = await supabase
      .from('gkit_cadastros')
      .update({
        usos: Math.max(Number(existing.usos || 0), item.usos),
        origem: existing.origem || item.origem,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) throw new Error(`Erro ao atualizar cadastro ${item.nomeSugerido}: ${error.message}`);
    await ensureAlias(supabase, existing.id as string, item.tipo, item.nomeOriginal, item.origem);
    return { id: existing.id as string, created: false };
  }

  const { data, error } = await supabase
    .from('gkit_cadastros')
    .insert({
      tipo: item.tipo,
      nome: item.nomeSugerido,
      slug: item.slug,
      status: 'ativo',
      origem: item.origem,
      usos: item.usos,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Erro ao criar cadastro ${item.nomeSugerido}: ${error.message}`);
  await ensureAlias(supabase, data.id as string, item.tipo, item.nomeOriginal, item.origem);
  return { id: data.id as string, created: true };
}

async function ensureAlias(supabase: SupabaseClient, cadastroId: string, tipo: CadastroTipo, alias: string, origem: string) {
  const aliasSlug = buildSlug(alias);
  if (!aliasSlug) return;
  const { error } = await supabase.from('gkit_cadastro_aliases').upsert({
    cadastro_id: cadastroId,
    tipo,
    alias,
    alias_slug: aliasSlug,
    origem,
  }, { onConflict: 'tipo,alias_slug' });
  if (error) throw new Error(`Erro ao salvar alias ${alias}: ${error.message}`);
}

function countValues(rows: Array<Record<string, unknown>>, key: string, tipo: CadastroTipo, origem: string): DiscoveredValue[] {
  const map = new Map<string, { original: string; count: number }>();
  for (const row of rows) {
    const raw = String(row[key] || '').trim();
    if (!raw) continue;
    const slug = buildSlug(raw);
    const current = map.get(slug) || { original: raw, count: 0 };
    current.count += 1;
    map.set(slug, current);
  }
  return Array.from(map.entries()).map(([slug, data]) => ({
    tipo,
    nomeOriginal: data.original,
    nomeSugerido: suggestCanonicalName(tipo, data.original),
    slug,
    usos: data.count,
    origem,
  }));
}

export async function getCadastrosResumo() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { configured: false, categorias: [], centros: [], carteiras: [], totais: { categorias: 0, centros: 0, carteiras: 0, aliases: 0 } };

  const { data: cadastros, error } = await supabase
    .from('gkit_cadastros')
    .select('id, tipo, nome, slug, status, origem, usos, created_at, updated_at')
    .order('tipo', { ascending: true })
    .order('nome', { ascending: true });
  if (error) throw new Error(`Erro ao listar cadastros: ${error.message}`);

  const { data: aliases, error: aliasError } = await supabase
    .from('gkit_cadastro_aliases')
    .select('cadastro_id, alias')
    .order('alias', { ascending: true });
  if (aliasError) throw new Error(`Erro ao listar aliases: ${aliasError.message}`);

  const aliasMap = new Map<string, string[]>();
  for (const alias of aliases || []) {
    const arr = aliasMap.get(alias.cadastro_id as string) || [];
    arr.push(alias.alias as string);
    aliasMap.set(alias.cadastro_id as string, arr);
  }

  const items: CadastroItem[] = (cadastros || []).map((item) => ({
    id: item.id as string,
    tipo: item.tipo as CadastroTipo,
    nome: item.nome as string,
    slug: item.slug as string,
    status: item.status as 'ativo' | 'inativo',
    origem: String(item.origem || 'manual'),
    usos: Number(item.usos || 0),
    aliases: aliasMap.get(item.id as string) || [],
    created_at: item.created_at as string,
    updated_at: item.updated_at as string,
  }));

  return {
    configured: true,
    categorias: items.filter((item) => item.tipo === 'categoria'),
    centros: items.filter((item) => item.tipo === 'centro'),
    carteiras: items.filter((item) => item.tipo === 'carteira'),
    totais: {
      categorias: items.filter((item) => item.tipo === 'categoria').length,
      centros: items.filter((item) => item.tipo === 'centro').length,
      carteiras: items.filter((item) => item.tipo === 'carteira').length,
      aliases: aliases?.length || 0,
    },
  };
}

export async function extractCadastrosFromOperationalData() {
  const supabase = getSupabaseAdmin();
  assertConfigured(supabase);

  const discovered: DiscoveredValue[] = [];

  const { data: payables, error: payableError } = await supabase
    .from('contas_pagar_itens')
    .select('categoria, centro')
    .limit(5000);
  if (payableError) throw new Error(`Erro ao ler pagamentos: ${payableError.message}`);

  discovered.push(...countValues((payables || []) as Array<Record<string, unknown>>, 'categoria', 'categoria', 'contas_pagar'));
  discovered.push(...countValues((payables || []) as Array<Record<string, unknown>>, 'centro', 'centro', 'contas_pagar'));

  const { data: commissionRows, error: commissionError } = await supabase
    .from('comissao_resumos')
    .select('carteira, categoria')
    .limit(5000);
  if (commissionError) throw new Error(`Erro ao ler comissoes: ${commissionError.message}`);

  discovered.push(...countValues((commissionRows || []) as Array<Record<string, unknown>>, 'carteira', 'carteira', 'comissoes'));
  discovered.push(...countValues((commissionRows || []) as Array<Record<string, unknown>>, 'categoria', 'categoria', 'comissoes'));

  const unique = new Map<string, DiscoveredValue>();
  for (const item of discovered) {
    if (!normalizeText(item.nomeOriginal)) continue;
    const key = `${item.tipo}:${item.slug}`;
    const current = unique.get(key);
    if (current) {
      current.usos += item.usos;
      current.origem = current.origem === item.origem ? current.origem : 'mista';
    } else {
      unique.set(key, { ...item });
    }
  }

  let created = 0;
  let updated = 0;
  for (const item of unique.values()) {
    const result = await upsertCadastro(supabase, item);
    if (result.created) created += 1;
    else updated += 1;
  }

  await logEvent({
    supabase,
    modulo: 'dashboard',
    action: 'extrair_cadastros',
    detalhe: { encontrados: unique.size, criados: created, atualizados: updated },
  });

  return { encontrados: unique.size, criados: created, atualizados: updated, resumo: await getCadastrosResumo() };
}
