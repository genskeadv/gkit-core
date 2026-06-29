'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireModuleAccess } from '@/lib/auth/platform';
import { canAccess } from '@/lib/auth/permissions';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

function admin() {
  return createSupabaseAdminClient() as any;
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value.length ? value : null;
}

function nullableDate(formData: FormData, key: string) {
  const value = text(formData, key);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function required(value: string, label: string) {
  if (!value) throw new Error(`${label} e obrigatorio.`);
  return value;
}

function uuid(value: string, label: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${label} invalido.`);
  }
  return value;
}

function nullableUuid(formData: FormData, key: string, label: string) {
  const value = text(formData, key);
  return value ? uuid(value, label) : null;
}

function money(formData: FormData, key: string) {
  const value = text(formData, key).replace(/\./g, '').replace(',', '.');
  if (!value) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Valor invalido em ${key}.`);
  return parsed;
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === 'on';
}

async function requireWrite() {
  const context = await requireModuleAccess('gkit-flex', '/modulos/gkit-flex/colaboradores');
  if (!canAccess(context.permissions, 'gkit_flex.colaboradores.write')) {
    throw new Error('Voce nao tem permissao para gerenciar colaboradores do GKIT Flex.');
  }
  return context;
}

function payload(formData: FormData) {
  return {
    usuario_id: uuid(required(text(formData, 'usuario_id'), 'Usuario'), 'Usuario'),
    carteira_id: nullableUuid(formData, 'carteira_id', 'Carteira'),
    gestor_usuario_id: nullableUuid(formData, 'gestor_usuario_id', 'Gestor'),
    cargo_operacional: nullableText(formData, 'cargo_operacional'),
    documento: nullableText(formData, 'documento'),
    telefone: nullableText(formData, 'telefone'),
    chave_pix: nullableText(formData, 'chave_pix'),
    banco: nullableText(formData, 'banco'),
    agencia: nullableText(formData, 'agencia'),
    conta: nullableText(formData, 'conta'),
    tipo_conta: nullableText(formData, 'tipo_conta'),
    data_inicio: nullableDate(formData, 'data_inicio'),
    status: text(formData, 'status') || 'ativo',
    salario: money(formData, 'salario'),
    participacao_honorarios: money(formData, 'participacao_honorarios'),
    pro_labore: money(formData, 'pro_labore'),
    ajuda_custo: money(formData, 'ajuda_custo'),
    outros_vencimentos: money(formData, 'outros_vencimentos'),
    beneficio_descricao: nullableText(formData, 'beneficio_descricao'),
    beneficio_valor: money(formData, 'beneficio_valor'),
    recebe_salario: bool(formData, 'recebe_salario'),
    recebe_participacao_honorarios: bool(formData, 'recebe_participacao_honorarios'),
    recebe_pro_labore: bool(formData, 'recebe_pro_labore'),
    recebe_beneficios: bool(formData, 'recebe_beneficios'),
    recebe_outros: bool(formData, 'recebe_outros'),
    recebe_comissoes: bool(formData, 'recebe_comissoes'),
    observacoes: nullableText(formData, 'observacoes'),
    updated_at: new Date().toISOString(),
  };
}

async function syncCoreCarteira(usuarioId: string, carteiraId: string | null) {
  const supabase = admin();

  const { error: deleteError } = await supabase
    .schema('core')
    .from('carteira_colaboradores')
    .delete()
    .eq('usuario_id', usuarioId);
  if (deleteError) throw new Error(deleteError.message);

  if (!carteiraId) return;

  const { error } = await supabase
    .schema('core')
    .from('carteira_colaboradores')
    .insert({
      usuario_id: usuarioId,
      carteira_id: carteiraId,
      principal: true,
      ativo: true,
      metadata: { origem: 'gkit_flex_colaboradores' },
    });
  if (error) throw new Error(error.message);
}

export async function createGkitFlexColaboradorAction(formData: FormData) {
  const { authUser } = await requireWrite();
  const data = {
    ...payload(formData),
    created_by: authUser.id,
  };

  const { error } = await admin().from('gkit_flex_colaboradores').insert(data);
  if (error) throw new Error(error.message);

  await syncCoreCarteira(data.usuario_id, data.carteira_id);

  revalidatePath('/modulos/gkit-flex');
  revalidatePath('/modulos/gkit-flex/colaboradores');
  redirect('/modulos/gkit-flex/colaboradores');
}

export async function updateGkitFlexColaboradorAction(formData: FormData) {
  await requireWrite();
  const id = uuid(required(text(formData, 'id'), 'Colaborador'), 'Colaborador');
  const data = payload(formData);

  const { error } = await admin().from('gkit_flex_colaboradores').update(data).eq('id', id);
  if (error) throw new Error(error.message);

  await syncCoreCarteira(data.usuario_id, data.carteira_id);

  revalidatePath('/modulos/gkit-flex');
  revalidatePath('/modulos/gkit-flex/colaboradores');
  revalidatePath(`/modulos/gkit-flex/colaboradores/${id}`);
  redirect('/modulos/gkit-flex/colaboradores');
}
