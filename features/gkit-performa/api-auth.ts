import { NextResponse } from 'next/server'
import { canAccess, getUsuarioPermissionCodes } from '@/lib/auth/permissions'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type GkitPerformaApiPermission = 'gkit_performa.dashboard.read' | 'gkit_performa.rankings.write' | 'gkit_performa.rankings.read'

function admin() {
  return createSupabaseAdminClient() as any
}

export async function requireGkitPerformaApiAccess(permission: GkitPerformaApiPermission) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Sessao expirada ou nao autenticada.' }, { status: 401 }) }
  }

  const { data: usuario, error: usuarioError } = await admin()
    .schema('security')
    .from('usuarios')
    .select('id, nome, email, tipo, status')
    .eq('id', user.id)
    .single()

  if (usuarioError || !usuario || usuario.status !== 'ativo') {
    return { error: NextResponse.json({ error: 'Usuario sem acesso ativo.' }, { status: 403 }) }
  }

  const permissions = await getUsuarioPermissionCodes(usuario)
  if (canAccess(permissions, permission)) return { usuario }

  return { error: NextResponse.json({ error: 'Sem permissao para executar esta acao.' }, { status: 403 }) }
}
