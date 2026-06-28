import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type AuditAction =
  | 'abrir_mes'
  | 'reabrir_mes'
  | 'fechar_mes'
  | 'preview_importacao_contas_pagar'
  | 'importar_contas_pagar'
  | 'atualizar_conta_pagar'
  | 'calcular_comissoes'
  | 'snapshot'
  | 'extrair_cadastros'
  | 'preview_reclassificacao'
  | 'confirmar_reclassificacao';

export function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function logEvent(params: {
  supabase: SupabaseClient;
  modulo: 'contas_pagar' | 'comissoes' | 'dashboard' | 'cadastros';
  competencia?: string | null;
  action: AuditAction | string;
  entidadeTipo?: string | null;
  entidadeId?: string | null;
  detalhe?: Record<string, unknown>;
}) {
  const { error } = await params.supabase.from('gkit_eventos').insert({
    modulo: params.modulo,
    competencia: params.competencia || null,
    action: params.action,
    entidade_tipo: params.entidadeTipo || null,
    entidade_id: params.entidadeId || null,
    detalhe: params.detalhe || {},
  });

  if (error) {
    // Nao interrompe a rotina principal por falha no log; registra no console do servidor.
    console.warn('[gkit_eventos] falha ao registrar evento:', error.message);
  }
}
