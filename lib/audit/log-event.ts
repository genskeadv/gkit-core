import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type LogEventInput = {
  acao: string
  descricao?: string
  appCodigo?: string | null
  carteiraId?: string | null
  entidadeSchema?: string | null
  entidadeTabela?: string | null
  entidadeId?: string | null
  metadata?: Record<string, unknown>
}

export async function logAdminEvent(input: LogEventInput) {
  const supabase = createSupabaseAdminClient()

  await supabase.schema('audit').from('eventos').insert({
    acao: input.acao,
    descricao: input.descricao ?? null,
    app_codigo: input.appCodigo ?? null,
    carteira_id: input.carteiraId ?? null,
    entidade_schema: input.entidadeSchema ?? null,
    entidade_tabela: input.entidadeTabela ?? null,
    entidade_id: input.entidadeId ?? null,
    metadata: input.metadata ?? {},
  })
}
