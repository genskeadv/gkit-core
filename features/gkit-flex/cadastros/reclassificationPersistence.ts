import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, logEvent } from '../audit';
import { buildSlug, type CadastroTipo } from './normalization';

export type ReclassificationRequest = {
  tipo: CadastroTipo;
  origemCadastroId: string;
  destinoCadastroId: string;
  motivo?: string;
};

export type ReclassificationImpact = {
  tipo: CadastroTipo;
  origem: { id: string; nome: string; aliases: string[] };
  destino: { id: string; nome: string; aliases: string[] };
  nomesAfetados: string[];
  impacto: {
    contasPagarCategoria: number;
    contasPagarCentro: number;
    comissaoResumoCategoria: number;
    comissaoResumoCarteira: number;
    comissaoLancamentoCategoria: number;
    comissaoLancamentoCarteira: number;
    comissaoAuditoriaCategoria: number;
    comissaoAuditoriaCarteira: number;
    total: number;
  };
  bloqueios: string[];
  avisos: string[];
};

function assertConfigured(supabase: SupabaseClient | null): asserts supabase is SupabaseClient {
  if (!supabase) throw new Error('Supabase nao configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

async function loadCadastroWithAliases(supabase: SupabaseClient, id: string) {
  const { data: cadastro, error } = await supabase
    .from('gkit_cadastros')
    .select('id, tipo, nome, status, metadata')
    .eq('id', id)
    .single();
  if (error) throw new Error(`Cadastro nao encontrado: ${error.message}`);

  const { data: aliases, error: aliasError } = await supabase
    .from('gkit_cadastro_aliases')
    .select('alias')
    .eq('cadastro_id', id)
    .order('alias', { ascending: true });
  if (aliasError) throw new Error(`Erro ao consultar aliases: ${aliasError.message}`);

  return {
    id: cadastro.id as string,
    tipo: cadastro.tipo as CadastroTipo,
    nome: cadastro.nome as string,
    status: cadastro.status as string,
    aliases: (aliases || []).map((alias) => alias.alias as string),
    metadata: cadastro.metadata as Record<string, unknown> | null,
  };
}

async function exactCount(supabase: SupabaseClient, table: string, column: string, values: string[]) {
  if (!values.length) return 0;
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .in(column, values);
  if (error) throw new Error(`Erro ao contar ${table}.${column}: ${error.message}`);
  return count || 0;
}

export async function previewReclassification(input: ReclassificationRequest): Promise<ReclassificationImpact> {
  const supabase = getSupabaseAdmin();
  assertConfigured(supabase);

  if (!input.origemCadastroId || !input.destinoCadastroId) throw new Error('Informe cadastro de origem e destino.');
  if (input.origemCadastroId === input.destinoCadastroId) throw new Error('Origem e destino precisam ser cadastros diferentes.');

  const origem = await loadCadastroWithAliases(supabase, input.origemCadastroId);
  const destino = await loadCadastroWithAliases(supabase, input.destinoCadastroId);

  const bloqueios: string[] = [];
  const avisos: string[] = [];

  if (origem.tipo !== destino.tipo) bloqueios.push('Origem e destino precisam ser do mesmo tipo.');
  if (origem.tipo !== input.tipo) bloqueios.push('O tipo informado nao confere com o cadastro de origem.');
  if (destino.status !== 'ativo') avisos.push('O destino esta inativo. A reclassificacao ainda pode ser feita, mas o ideal e usar destino ativo.');
  if (origem.status === 'inativo') avisos.push('A origem ja esta inativa. Talvez ela ja tenha sido fundida antes.');

  const nomesAfetados = uniq([origem.nome, ...origem.aliases]);

  const impacto = {
    contasPagarCategoria: input.tipo === 'categoria' ? await exactCount(supabase, 'contas_pagar_itens', 'categoria', nomesAfetados) : 0,
    contasPagarCentro: input.tipo === 'centro' ? await exactCount(supabase, 'contas_pagar_itens', 'centro', nomesAfetados) : 0,
    comissaoResumoCategoria: input.tipo === 'categoria' ? await exactCount(supabase, 'comissao_resumos', 'categoria', nomesAfetados) : 0,
    comissaoResumoCarteira: input.tipo === 'carteira' ? await exactCount(supabase, 'comissao_resumos', 'carteira', nomesAfetados) : 0,
    comissaoLancamentoCategoria: input.tipo === 'categoria' ? await exactCount(supabase, 'comissao_lancamentos', 'categoria', nomesAfetados) : 0,
    comissaoLancamentoCarteira: input.tipo === 'carteira' ? await exactCount(supabase, 'comissao_lancamentos', 'carteira', nomesAfetados) : 0,
    comissaoAuditoriaCategoria: input.tipo === 'categoria' ? await exactCount(supabase, 'comissao_auditoria', 'categoria', nomesAfetados) : 0,
    comissaoAuditoriaCarteira: input.tipo === 'carteira' ? await exactCount(supabase, 'comissao_auditoria', 'carteira', nomesAfetados) : 0,
    total: 0,
  };
  impacto.total = Object.entries(impacto).filter(([key]) => key !== 'total').reduce((acc, [, value]) => acc + Number(value || 0), 0);

  const payload: ReclassificationImpact = {
    tipo: input.tipo,
    origem: { id: origem.id, nome: origem.nome, aliases: origem.aliases },
    destino: { id: destino.id, nome: destino.nome, aliases: destino.aliases },
    nomesAfetados,
    impacto,
    bloqueios,
    avisos,
  };

  const { error: logError } = await supabase.from('gkit_reclassificacoes').insert({
    tipo: input.tipo,
    origem_cadastro_id: origem.id,
    destino_cadastro_id: destino.id,
    origem_nome: origem.nome,
    destino_nome: destino.nome,
    modo: 'preview',
    motivo: input.motivo || null,
    impacto,
    nomes_afetados: nomesAfetados,
    bloqueios,
    avisos,
  });
  if (logError) console.warn('[gkit_reclassificacoes] falha ao gravar preview:', logError.message);

  await logEvent({
    supabase,
    modulo: 'cadastros',
    action: 'preview_reclassificacao',
    entidadeTipo: 'gkit_cadastro',
    entidadeId: origem.id,
    detalhe: payload,
  });

  return payload;
}

async function updateStringColumn(supabase: SupabaseClient, table: string, column: string, fromValues: string[], toValue: string) {
  if (!fromValues.length) return 0;
  const affected = await exactCount(supabase, table, column, fromValues);
  if (!affected) return 0;
  const { error } = await supabase
    .from(table)
    .update({ [column]: toValue })
    .in(column, fromValues);
  if (error) throw new Error(`Erro ao atualizar ${table}.${column}: ${error.message}`);
  return affected;
}

async function ensureDestinationAliases(supabase: SupabaseClient, destinoId: string, tipo: CadastroTipo, names: string[]) {
  for (const alias of names) {
    const aliasSlug = buildSlug(alias);
    if (!aliasSlug) continue;
    const { error } = await supabase.from('gkit_cadastro_aliases').upsert({
      cadastro_id: destinoId,
      tipo,
      alias,
      alias_slug: aliasSlug,
      origem: 'fusao_reclassificacao',
    }, { onConflict: 'tipo,alias_slug' });
    if (error) throw new Error(`Erro ao salvar alias ${alias}: ${error.message}`);
  }
}

export async function confirmReclassification(input: ReclassificationRequest) {
  const supabase = getSupabaseAdmin();
  assertConfigured(supabase);

  const preview = await previewReclassification(input);
  if (preview.bloqueios.length) {
    throw new Error(`Reclassificacao bloqueada: ${preview.bloqueios.join(' ')}`);
  }

  const motivo = String(input.motivo || '').trim() || 'Reclassificacao manual v14';
  const nomesAfetados = preview.nomesAfetados;
  const destinoNome = preview.destino.nome;

  const updates = {
    contasPagarCategoria: input.tipo === 'categoria' ? await updateStringColumn(supabase, 'contas_pagar_itens', 'categoria', nomesAfetados, destinoNome) : 0,
    contasPagarCentro: input.tipo === 'centro' ? await updateStringColumn(supabase, 'contas_pagar_itens', 'centro', nomesAfetados, destinoNome) : 0,
    comissaoResumoCategoria: input.tipo === 'categoria' ? await updateStringColumn(supabase, 'comissao_resumos', 'categoria', nomesAfetados, destinoNome) : 0,
    comissaoResumoCarteira: input.tipo === 'carteira' ? await updateStringColumn(supabase, 'comissao_resumos', 'carteira', nomesAfetados, destinoNome) : 0,
    comissaoLancamentoCategoria: input.tipo === 'categoria' ? await updateStringColumn(supabase, 'comissao_lancamentos', 'categoria', nomesAfetados, destinoNome) : 0,
    comissaoLancamentoCarteira: input.tipo === 'carteira' ? await updateStringColumn(supabase, 'comissao_lancamentos', 'carteira', nomesAfetados, destinoNome) : 0,
    comissaoAuditoriaCategoria: input.tipo === 'categoria' ? await updateStringColumn(supabase, 'comissao_auditoria', 'categoria', nomesAfetados, destinoNome) : 0,
    comissaoAuditoriaCarteira: input.tipo === 'carteira' ? await updateStringColumn(supabase, 'comissao_auditoria', 'carteira', nomesAfetados, destinoNome) : 0,
  };
  const totalAtualizado = Object.values(updates).reduce((acc, value) => acc + Number(value || 0), 0);

  await ensureDestinationAliases(supabase, preview.destino.id, input.tipo, nomesAfetados);

  const { error: originError } = await supabase
    .from('gkit_cadastros')
    .update({
      status: 'inativo',
      updated_at: new Date().toISOString(),
      metadata: {
        merged_into: preview.destino.id,
        merged_into_nome: preview.destino.nome,
        motivo,
        merged_at: new Date().toISOString(),
      },
    })
    .eq('id', preview.origem.id);
  if (originError) throw new Error(`Erro ao inativar origem: ${originError.message}`);

  const { error: destinationError } = await supabase
    .from('gkit_cadastros')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', preview.destino.id);
  if (destinationError) throw new Error(`Erro ao atualizar destino: ${destinationError.message}`);

  const payload = {
    ...preview,
    modo: 'confirmado',
    motivo,
    updates,
    totalAtualizado,
  };

  const { error: logError } = await supabase.from('gkit_reclassificacoes').insert({
    tipo: input.tipo,
    origem_cadastro_id: preview.origem.id,
    destino_cadastro_id: preview.destino.id,
    origem_nome: preview.origem.nome,
    destino_nome: preview.destino.nome,
    modo: 'confirmado',
    motivo,
    impacto: { ...preview.impacto, atualizados: updates, totalAtualizado },
    nomes_afetados: nomesAfetados,
    bloqueios: preview.bloqueios,
    avisos: preview.avisos,
  });
  if (logError) throw new Error(`Erro ao gravar historico da reclassificacao: ${logError.message}`);

  await logEvent({
    supabase,
    modulo: 'cadastros',
    action: 'confirmar_reclassificacao',
    entidadeTipo: 'gkit_cadastro',
    entidadeId: preview.origem.id,
    detalhe: payload,
  });

  return payload;
}
