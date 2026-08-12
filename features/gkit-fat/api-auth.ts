import { NextResponse } from 'next/server'
import { getUsuarioPermissionCodes } from '@/lib/auth/permissions'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function admin() {
  return createSupabaseAdminClient() as any
}

export async function requireGkitFatApiAccess(requiredPermission?: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Sessao expirada ou nao autenticada.' }, { status: 401 })
  }

  const { data: usuario, error: usuarioError } = await admin()
    .schema('security')
    .from('usuarios')
    .select('id, nome, email, tipo, status')
    .eq('id', user.id)
    .single()

  if (usuarioError || !usuario || usuario.status !== 'ativo') {
    return NextResponse.json({ error: 'Usuario sem acesso ativo.' }, { status: 403 })
  }

  const permissions = await getUsuarioPermissionCodes(usuario)
  const hasGlobalAccess = usuario.tipo === 'admin_global' || permissions.includes('*') || permissions.includes('gkit_fat.*')
  const hasRequiredPermission = requiredPermission
    ? permissions.includes(requiredPermission) ||
      (requiredPermission.endsWith('.read') && permissions.includes(requiredPermission.replace(/\.read$/, '.write')))
    : false

  if (requiredPermission) {
    return hasGlobalAccess || hasRequiredPermission
      ? null
      : NextResponse.json({ error: 'Sem permissao para esta acao do GKIT FAT.' }, { status: 403 })
  }

  return hasGlobalAccess || permissions.some((code: string) => code === 'gkit_fat.*' || code.startsWith('gkit_fat.'))
    ? null
    : NextResponse.json({ error: 'Sem acesso ao modulo GKIT FAT.' }, { status: 403 })
}
