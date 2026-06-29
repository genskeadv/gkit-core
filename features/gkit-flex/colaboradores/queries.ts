import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type {
  GkitFlexColaborador,
  GkitFlexColaboradorFormData,
  GkitFlexColaboradoresData,
  GkitFlexOption,
} from './types';

function admin() {
  return createSupabaseAdminClient() as any;
}

function money(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.trim() || fallback;
}

function totalMensal(row: Record<string, unknown>) {
  return (
    money(row.salario) +
    money(row.participacao_honorarios) +
    money(row.pro_labore) +
    money(row.ajuda_custo) +
    money(row.outros_vencimentos) +
    money(row.beneficio_valor)
  );
}

function mapColaborador(
  row: Record<string, unknown>,
  usuarios: Map<string, Record<string, unknown>>,
  carteiras: Map<string, Record<string, unknown>>,
  carteiraPorUsuario: Map<string, string>
): GkitFlexColaborador {
  const usuario = usuarios.get(String(row.usuario_id)) ?? {};
  const gestor = row.gestor_usuario_id ? usuarios.get(String(row.gestor_usuario_id)) : null;
  const carteiraId = carteiraPorUsuario.get(String(row.usuario_id)) || (row.carteira_id ? String(row.carteira_id) : '');
  const carteira = carteiraId ? carteiras.get(carteiraId) : null;

  return {
    id: String(row.id),
    usuario_id: String(row.usuario_id),
    carteira_id: carteiraId || null,
    gestor_usuario_id: row.gestor_usuario_id ? String(row.gestor_usuario_id) : null,
    cargo_operacional: text(row.cargo_operacional, '') || null,
    documento: text(row.documento, '') || null,
    telefone: text(row.telefone, '') || null,
    chave_pix: text(row.chave_pix, '') || null,
    banco: text(row.banco, '') || null,
    agencia: text(row.agencia, '') || null,
    conta: text(row.conta, '') || null,
    tipo_conta: text(row.tipo_conta, '') || null,
    data_inicio: text(row.data_inicio, '') || null,
    status: (text(row.status, 'ativo') as GkitFlexColaborador['status']),
    salario: money(row.salario),
    participacao_honorarios: money(row.participacao_honorarios),
    pro_labore: money(row.pro_labore),
    ajuda_custo: money(row.ajuda_custo),
    outros_vencimentos: money(row.outros_vencimentos),
    beneficio_descricao: text(row.beneficio_descricao, '') || null,
    beneficio_valor: money(row.beneficio_valor),
    recebe_salario: Boolean(row.recebe_salario),
    recebe_participacao_honorarios: Boolean(row.recebe_participacao_honorarios),
    recebe_pro_labore: Boolean(row.recebe_pro_labore),
    recebe_beneficios: Boolean(row.recebe_beneficios),
    recebe_outros: Boolean(row.recebe_outros),
    recebe_comissoes: Boolean(row.recebe_comissoes),
    observacoes: text(row.observacoes, '') || null,
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
    usuario_nome: text(usuario.nome, 'Usuario sem nome'),
    usuario_email: text(usuario.email, ''),
    carteira_nome: carteira ? text(carteira.nome, '') || null : null,
    gestor_nome: gestor ? text(gestor.nome, '') || null : null,
    total_mensal: totalMensal(row),
  };
}

async function lookupMaps(rows: Array<Record<string, unknown>>) {
  const usuarioIds = [...new Set(rows.flatMap((row) => [row.usuario_id, row.gestor_usuario_id]).filter(Boolean).map(String))];

  const coreCarteirasResult = usuarioIds.length
    ? await admin()
      .schema('core')
      .from('carteira_colaboradores')
      .select('usuario_id, carteira_id, principal')
      .in('usuario_id', usuarioIds)
      .eq('ativo', true)
    : { data: [], error: null };

  if (coreCarteirasResult.error) throw new Error(coreCarteirasResult.error.message);

  const carteiraPorUsuario = new Map<string, string>();
  for (const rel of ((coreCarteirasResult.data ?? []) as Array<Record<string, unknown>>)) {
    const usuarioId = String(rel.usuario_id ?? '');
    const carteiraId = String(rel.carteira_id ?? '');
    if (!usuarioId || !carteiraId) continue;
    if (Boolean(rel.principal) || !carteiraPorUsuario.has(usuarioId)) {
      carteiraPorUsuario.set(usuarioId, carteiraId);
    }
  }

  const carteiraIds = [
    ...new Set([
      ...rows.map((row) => row.carteira_id).filter(Boolean).map(String),
      ...Array.from(carteiraPorUsuario.values()),
    ]),
  ];

  const [usuariosResult, carteirasResult] = await Promise.all([
    usuarioIds.length
      ? admin().schema('security').from('usuarios').select('id,nome,email,status').in('id', usuarioIds)
      : Promise.resolve({ data: [], error: null }),
    carteiraIds.length
      ? admin().schema('core').from('carteiras').select('id,nome,status').in('id', carteiraIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (usuariosResult.error) throw new Error(usuariosResult.error.message);
  if (carteirasResult.error) throw new Error(carteirasResult.error.message);

  return {
    usuarios: new Map(((usuariosResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.id), row])),
    carteiras: new Map(((carteirasResult.data ?? []) as Array<Record<string, unknown>>).map((row) => [String(row.id), row])),
    carteiraPorUsuario,
  };
}

export async function listGkitFlexColaboradores(): Promise<GkitFlexColaboradoresData> {
  const { data, error } = await admin()
    .from('gkit_flex_colaboradores')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1000);

  if (error) throw new Error(error.message);

  const rawRows = (data ?? []) as Array<Record<string, unknown>>;
  const maps = await lookupMaps(rawRows);
  const colaboradores = rawRows.map((row) => mapColaborador(row, maps.usuarios, maps.carteiras, maps.carteiraPorUsuario));

  return {
    colaboradores,
    resumo: {
      total: colaboradores.length,
      ativos: colaboradores.filter((row) => row.status === 'ativo').length,
      recebemComissao: colaboradores.filter((row) => row.recebe_comissoes).length,
      custoMensal: colaboradores.reduce((sum, row) => sum + row.total_mensal, 0),
    },
  };
}

export async function getGkitFlexColaborador(id: string): Promise<GkitFlexColaborador> {
  const { data, error } = await admin()
    .from('gkit_flex_colaboradores')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);

  const maps = await lookupMaps([data as Record<string, unknown>]);
  return mapColaborador(data as Record<string, unknown>, maps.usuarios, maps.carteiras, maps.carteiraPorUsuario);
}

function option(row: Record<string, unknown>): GkitFlexOption {
  const label = text(row.nome, 'Sem nome');
  const detail = text(row.email || row.status, '');
  return { id: String(row.id), label, detail };
}

export async function getGkitFlexColaboradorFormData(id?: string): Promise<GkitFlexColaboradorFormData> {
  const colaborador = id ? await getGkitFlexColaborador(id) : null;

  const [usuariosResult, carteirasResult, existentesResult] = await Promise.all([
    admin().schema('security').from('usuarios').select('id,nome,email,status').eq('status', 'ativo').order('nome', { ascending: true }).limit(1000),
    admin().schema('core').from('carteiras').select('id,nome,status').eq('status', 'ativo').order('nome', { ascending: true }).limit(500),
    admin().from('gkit_flex_colaboradores').select('usuario_id'),
  ]);

  if (usuariosResult.error) throw new Error(usuariosResult.error.message);
  if (carteirasResult.error) throw new Error(carteirasResult.error.message);
  if (existentesResult.error) throw new Error(existentesResult.error.message);

  const usuarioAtualId = colaborador?.usuario_id ?? '';
  const usados = new Set(((existentesResult.data ?? []) as Array<Record<string, unknown>>).map((row) => String(row.usuario_id)));
  const usuarios = ((usuariosResult.data ?? []) as Array<Record<string, unknown>>)
    .filter((row) => !usados.has(String(row.id)) || String(row.id) === usuarioAtualId)
    .map(option);

  return {
    colaborador,
    usuarios,
    carteiras: ((carteirasResult.data ?? []) as Array<Record<string, unknown>>).map(option),
    gestores: ((usuariosResult.data ?? []) as Array<Record<string, unknown>>).map(option),
  };
}
