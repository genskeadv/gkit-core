import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, logEvent } from '../audit';
import { COMMISSION_RULES } from '../comissoes/commissionProcessor';
import type { CommissionRule } from '../comissoes/types';
import { buildSlug, normalizeText, suggestCanonicalName, type CadastroTipo } from './normalization';

export type CommissionRuleConfig = {
  ativa: boolean;
  label: string;
  matchers: string[];
  reductionRate: number;
  commissionRate: number;
  splitBy: number;
};

export type CadastroItem = {
  id: string;
  tipo: CadastroTipo;
  nome: string;
  slug: string;
  status: 'ativo' | 'inativo';
  origem: string;
  usos: number;
  aliases: string[];
  naoGerarAutomaticamenteNaPrevia: boolean;
  comissao?: CommissionRuleConfig | null;
  created_at?: string;
  updated_at?: string;
};

export type CadastroSaveInput = {
  id?: string;
  tipo: CadastroTipo;
  nome: string;
  status?: 'ativo' | 'inativo';
  aliases?: string[];
};

export type CommissionRuleSaveInput = {
  cadastroId: string;
  ativa: boolean;
  matchers: string[];
  reductionPercent: number;
  commissionPercent: number;
  splitBy: number;
};

type DiscoveredValue = {
  tipo: CadastroTipo;
  nomeOriginal: string;
  nomeSugerido: string;
  slug: string;
  usos: number;
  origem: string;
};

type CoreCarteiraRow = {
  id: string;
  nome: string;
  status: string | null;
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

function uniqText(values: string[]) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asPositiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseCommissionRule(metadata: Record<string, unknown>, fallbackLabel: string): CommissionRuleConfig | null {
  const raw = asRecord(metadata.gkit_flex_comissao);
  if (!Object.keys(raw).length) return null;
  const matchers = Array.isArray(raw.matchers) ? uniqText(raw.matchers.map(String)) : [];
  return {
    ativa: raw.ativa !== false,
    label: String(raw.label || fallbackLabel),
    matchers: matchers.length ? matchers : [fallbackLabel],
    reductionRate: asPositiveNumber(raw.reductionRate, 0),
    commissionRate: asPositiveNumber(raw.commissionRate, 0),
    splitBy: Math.max(1, Math.trunc(asPositiveNumber(raw.splitBy, 1))),
  };
}

function commissionRuleToMetadata(rule: CommissionRule, ativa = true): CommissionRuleConfig {
  return {
    ativa,
    label: rule.label,
    matchers: uniqText(rule.categoryMatchers),
    reductionRate: rule.reductionRate,
    commissionRate: rule.commissionRate,
    splitBy: rule.splitBy,
  };
}

async function ensureDefaultCommissionRules(supabase: SupabaseClient) {
  for (const rule of COMMISSION_RULES) {
    const slug = buildSlug(rule.label);
    const { data: existing, error: existingError } = await supabase
      .from('gkit_cadastros')
      .select('id, metadata, origem')
      .eq('tipo', 'categoria')
      .eq('slug', slug)
      .maybeSingle();
    if (existingError) throw new Error(`Erro ao consultar regra de comissao ${rule.label}: ${existingError.message}`);

    const nextRule = commissionRuleToMetadata(rule, true);
    if (existing?.id) {
      const metadata = asRecord(existing.metadata);
      const current = parseCommissionRule(metadata, rule.label);
      if (current) continue;
      const { error } = await supabase
        .from('gkit_cadastros')
        .update({
          metadata: { ...metadata, gkit_flex_comissao: nextRule },
          origem: existing.origem || 'comissoes',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) throw new Error(`Erro ao atualizar regra de comissao ${rule.label}: ${error.message}`);
      continue;
    }

    const { data: created, error: insertError } = await supabase
      .from('gkit_cadastros')
      .insert({
        tipo: 'categoria',
        nome: rule.label,
        slug,
        status: 'ativo',
        origem: 'comissoes',
        usos: 0,
        metadata: { gkit_flex_comissao: nextRule },
      })
      .select('id')
      .single();
    if (insertError) throw new Error(`Erro ao criar regra de comissao ${rule.label}: ${insertError.message}`);
    await ensureAlias(supabase, created.id as string, 'categoria', rule.label, 'comissoes');
    for (const matcher of rule.categoryMatchers) await ensureAlias(supabase, created.id as string, 'categoria', matcher, 'comissoes');
  }
}

async function syncCoreCarteirasToCadastros(supabase: SupabaseClient) {
  const { data: carteiras, error } = await supabase
    .schema('core')
    .from('carteiras')
    .select('id,nome,status')
    .order('nome', { ascending: true })
    .limit(1000);
  if (error) throw new Error(`Erro ao carregar carteiras do Core: ${error.message}`);

  for (const carteira of (carteiras || []) as CoreCarteiraRow[]) {
    const nome = String(carteira.nome || '').trim();
    if (!nome) continue;

    const slug = buildSlug(nome);
    const status = carteira.status === 'inativo' ? 'inativo' : 'ativo';
    const metadata = { core: { carteira_id: carteira.id, fonte: 'core.carteiras' } };

    const { data: existing, error: existingError } = await supabase
      .from('gkit_cadastros')
      .select('id, nome, status, origem, metadata')
      .eq('tipo', 'carteira')
      .eq('slug', slug)
      .maybeSingle();
    if (existingError) throw new Error(`Erro ao consultar carteira ${nome}: ${existingError.message}`);

    if (existing?.id) {
      const existingMetadata = ((existing.metadata || {}) as Record<string, unknown>);
      const existingCore = ((existingMetadata.core || {}) as Record<string, unknown>);
      const nextMetadata = { ...existingMetadata, ...metadata };
      const shouldUpdate =
        existing.nome !== nome ||
        existing.status !== status ||
        existing.origem !== 'core' ||
        existingCore.carteira_id !== carteira.id ||
        existingCore.fonte !== 'core.carteiras';

      if (shouldUpdate) {
        const { error: updateError } = await supabase
          .from('gkit_cadastros')
          .update({
            nome,
            status,
            origem: 'core',
            metadata: nextMetadata,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (updateError) throw new Error(`Erro ao sincronizar carteira ${nome}: ${updateError.message}`);
      }
      await ensureAlias(supabase, existing.id as string, 'carteira', nome, 'core');
      continue;
    }

    const { data: created, error: insertError } = await supabase
      .from('gkit_cadastros')
      .insert({
        tipo: 'carteira',
        nome,
        slug,
        status,
        origem: 'core',
        usos: 0,
        metadata,
      })
      .select('id')
      .single();
    if (insertError) throw new Error(`Erro ao criar carteira ${nome} no Flex: ${insertError.message}`);
    await ensureAlias(supabase, created.id as string, 'carteira', nome, 'core');
  }
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
  if (!supabase) return { configured: false, categorias: [], centros: [], carteiras: [], totais: { categorias: 0, centros: 0, carteiras: 0, aliases: 0, regrasComissao: 0 } };

  await syncCoreCarteirasToCadastros(supabase);
  await ensureDefaultCommissionRules(supabase);

  const { data: cadastros, error } = await supabase
    .from('gkit_cadastros')
    .select('id, tipo, nome, slug, status, origem, usos, metadata, created_at, updated_at')
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

  const items: CadastroItem[] = (cadastros || []).map((item) => {
    const metadata = (item.metadata || {}) as Record<string, unknown>;
    const previsoes = (metadata.gkit_flex_previsoes || {}) as Record<string, unknown>;
    const comissao = parseCommissionRule(metadata, item.nome as string);
    return {
      id: item.id as string,
      tipo: item.tipo as CadastroTipo,
      nome: item.nome as string,
      slug: item.slug as string,
      status: item.status as 'ativo' | 'inativo',
      origem: String(item.origem || 'manual'),
      usos: Number(item.usos || 0),
      aliases: aliasMap.get(item.id as string) || [],
      naoGerarAutomaticamenteNaPrevia: Boolean(previsoes.nao_gerar_automaticamente),
      comissao,
      created_at: item.created_at as string,
      updated_at: item.updated_at as string,
    };
  });

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
      regrasComissao: items.filter((item) => item.tipo === 'categoria' && item.comissao?.ativa).length,
    },
  };
}

export async function saveCadastroItem(input: CadastroSaveInput) {
  const supabase = getSupabaseAdmin();
  assertConfigured(supabase);

  const tipo = input.tipo;
  if (!['categoria', 'centro', 'carteira'].includes(tipo)) throw new Error('Tipo de cadastro invalido.');
  const nome = String(input.nome || '').trim();
  if (!nome) throw new Error('Informe o nome do cadastro.');
  const status = input.status === 'inativo' ? 'inativo' : 'ativo';
  const slug = buildSlug(nome);
  const aliases = uniqText(input.aliases || []);

  if (input.id) {
    const { data: existing, error: existingError } = await supabase
      .from('gkit_cadastros')
      .select('id, tipo, nome, metadata, origem')
      .eq('id', input.id)
      .maybeSingle();
    if (existingError) throw new Error(`Erro ao consultar cadastro: ${existingError.message}`);
    if (!existing?.id) throw new Error('Cadastro nao encontrado.');
    if (existing.tipo !== tipo) throw new Error('Tipo do cadastro nao pode ser alterado.');

    const metadata = asRecord(existing.metadata);
    const { error } = await supabase
      .from('gkit_cadastros')
      .update({
        nome,
        slug,
        status,
        origem: existing.origem || 'manual',
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id);
    if (error) throw new Error(`Erro ao atualizar cadastro ${nome}: ${error.message}`);

    const coreCarteiraId = String(asRecord(metadata.core).carteira_id || '');
    if (tipo === 'carteira' && coreCarteiraId) {
      const { error: coreError } = await supabase
        .schema('core')
        .from('carteiras')
        .update({ nome, status, updated_at: new Date().toISOString() })
        .eq('id', coreCarteiraId);
      if (coreError) throw new Error(`Erro ao atualizar carteira no Core: ${coreError.message}`);
    }

    const { error: deleteAliasError } = await supabase.from('gkit_cadastro_aliases').delete().eq('cadastro_id', input.id);
    if (deleteAliasError) throw new Error(`Erro ao limpar aliases: ${deleteAliasError.message}`);
    await ensureAlias(supabase, input.id, tipo, nome, 'manual');
    for (const alias of aliases) await ensureAlias(supabase, input.id, tipo, alias, 'manual');

    await logEvent({ supabase, modulo: 'cadastros', action: 'editar_cadastro', entidadeTipo: 'gkit_cadastros', entidadeId: input.id, detalhe: { tipo, nome, status, aliases } });
    return { ok: true, resumo: await getCadastrosResumo() };
  }

  const { data, error } = await supabase
    .from('gkit_cadastros')
    .insert({ tipo, nome, slug, status, origem: 'manual', usos: 0, metadata: {} })
    .select('id')
    .single();
  if (error) throw new Error(`Erro ao criar cadastro ${nome}: ${error.message}`);
  await ensureAlias(supabase, data.id as string, tipo, nome, 'manual');
  for (const alias of aliases) await ensureAlias(supabase, data.id as string, tipo, alias, 'manual');

  await logEvent({ supabase, modulo: 'cadastros', action: 'criar_cadastro', entidadeTipo: 'gkit_cadastros', entidadeId: data.id as string, detalhe: { tipo, nome, status, aliases } });
  return { ok: true, resumo: await getCadastrosResumo() };
}

export async function updateCategoriaCommissionRule(input: CommissionRuleSaveInput) {
  const supabase = getSupabaseAdmin();
  assertConfigured(supabase);

  const { data: cadastro, error: cadastroError } = await supabase
    .from('gkit_cadastros')
    .select('id, tipo, nome, slug, metadata')
    .eq('id', input.cadastroId)
    .maybeSingle();
  if (cadastroError) throw new Error(`Erro ao consultar categoria: ${cadastroError.message}`);
  if (!cadastro?.id) throw new Error('Categoria nao encontrada.');
  if (cadastro.tipo !== 'categoria') throw new Error('Regra de comissao so pode ser vinculada a categoria.');

  const matchers = uniqText(input.matchers);
  if (input.ativa && !matchers.length) throw new Error('Informe pelo menos um termo de correspondencia.');
  const splitBy = Math.max(1, Math.trunc(Number(input.splitBy || 1)));
  const rule: CommissionRuleConfig = {
    ativa: Boolean(input.ativa),
    label: cadastro.nome as string,
    matchers: matchers.length ? matchers : [cadastro.nome as string],
    reductionRate: asPositiveNumber(input.reductionPercent, 0) / 100,
    commissionRate: asPositiveNumber(input.commissionPercent, 0) / 100,
    splitBy,
  };

  const metadata = asRecord(cadastro.metadata);
  const { error: updateError } = await supabase
    .from('gkit_cadastros')
    .update({
      metadata: { ...metadata, gkit_flex_comissao: rule },
      updated_at: new Date().toISOString(),
    })
    .eq('id', cadastro.id);
  if (updateError) throw new Error(`Erro ao atualizar regra de comissao: ${updateError.message}`);

  await logEvent({
    supabase,
    modulo: 'cadastros',
    action: 'atualizar_regra_comissao_categoria',
    entidadeTipo: 'gkit_cadastros',
    entidadeId: String(cadastro.id),
    detalhe: { categoria: cadastro.nome, regra: rule },
  });

  return { ok: true, resumo: await getCadastrosResumo() };
}

export async function getCommissionRulesForProcessing(): Promise<CommissionRule[]> {
  const supabase = getSupabaseAdmin();
  assertConfigured(supabase);
  await ensureDefaultCommissionRules(supabase);

  const { data, error } = await supabase
    .from('gkit_cadastros')
    .select('nome, slug, status, metadata')
    .eq('tipo', 'categoria')
    .eq('status', 'ativo')
    .order('nome', { ascending: true });
  if (error) throw new Error(`Erro ao carregar regras de comissao: ${error.message}`);

  const rules = (data || [])
    .map((row) => {
      const parsed = parseCommissionRule(asRecord(row.metadata), row.nome as string);
      if (!parsed?.ativa) return null;
      return {
        key: String(row.slug || buildSlug(row.nome as string)),
        label: parsed.label || String(row.nome || ''),
        categoryMatchers: parsed.matchers.length ? parsed.matchers : [String(row.nome || '')],
        reductionRate: parsed.reductionRate,
        commissionRate: parsed.commissionRate,
        splitBy: parsed.splitBy,
      } satisfies CommissionRule;
    })
    .filter((rule): rule is CommissionRule => Boolean(rule));

  return rules.length ? rules : COMMISSION_RULES;
}

export async function extractCadastrosFromOperationalData() {
  const supabase = getSupabaseAdmin();
  assertConfigured(supabase);

  await syncCoreCarteirasToCadastros(supabase);

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

export async function updateCategoriaForecastAutomationRule(cadastroId: string, naoGerarAutomaticamente: boolean) {
  const supabase = getSupabaseAdmin();
  assertConfigured(supabase);

  const { data: cadastro, error: cadastroError } = await supabase
    .from('gkit_cadastros')
    .select('id, tipo, nome, metadata')
    .eq('id', cadastroId)
    .maybeSingle();
  if (cadastroError) throw new Error(`Erro ao consultar categoria: ${cadastroError.message}`);
  if (!cadastro?.id) throw new Error('Categoria nao encontrada.');
  if (cadastro.tipo !== 'categoria') throw new Error('Essa regra so pode ser aplicada a categorias.');

  const metadata = ((cadastro.metadata || {}) as Record<string, unknown>);
  const previsoes = ((metadata.gkit_flex_previsoes || {}) as Record<string, unknown>);
  const nextMetadata = {
    ...metadata,
    gkit_flex_previsoes: {
      ...previsoes,
      nao_gerar_automaticamente: naoGerarAutomaticamente,
    },
  };

  const { error: updateError } = await supabase
    .from('gkit_cadastros')
    .update({ metadata: nextMetadata, updated_at: new Date().toISOString() })
    .eq('id', cadastro.id);
  if (updateError) throw new Error(`Erro ao atualizar regra da categoria: ${updateError.message}`);

  await logEvent({
    supabase,
    modulo: 'cadastros',
    action: 'atualizar_regra_previsao_categoria',
    entidadeTipo: 'gkit_cadastros',
    entidadeId: String(cadastro.id),
    detalhe: { categoria: cadastro.nome, naoGerarAutomaticamente },
  });

  return { ok: true, cadastroId: String(cadastro.id), naoGerarAutomaticamente, resumo: await getCadastrosResumo() };
}
