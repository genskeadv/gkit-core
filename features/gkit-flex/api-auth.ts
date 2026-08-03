import { NextResponse } from 'next/server'
import { getUsuarioPermissionCodes } from '@/lib/auth/permissions'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function admin() {
  return createSupabaseAdminClient() as any
}

export async function requireGkitFlexApiAccess() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Sessão expirada ou não autenticada.' }, { status: 401 })
  }

  const { data: usuario, error: usuarioError } = await admin()
    .schema('security')
    .from('usuarios')
    .select('id, nome, email, tipo, status')
    .eq('id', user.id)
    .single()

  if (usuarioError || !usuario || usuario.status !== 'ativo') {
    return NextResponse.json({ error: 'Usuário sem acesso ativo.' }, { status: 403 })
  }

  const permissions = await getUsuarioPermissionCodes(usuario)
  if (
    usuario.tipo === 'admin_global' ||
    permissions.includes('*') ||
    permissions.some((code: string) => code === 'gkit_flex.*' || code.startsWith('gkit_flex.'))
  ) {
    return null
  }

  const { data: apps, error: appsError } = await admin()
    .schema('core')
    .from('apps')
    .select('id')
    .in('codigo', ['gkit_flex', 'gkit-flex'])
    .eq('status', 'ativo')

  if (appsError) {
    return NextResponse.json({ error: appsError.message }, { status: 500 })
  }

  const appIds = (apps ?? []).map((app: { id: string }) => app.id)
  if (!appIds.length) {
    return NextResponse.json({ error: 'Módulo GKIT Flex não cadastrado no Core.' }, { status: 403 })
  }

  const { data: accessRows, error: accessError } = await admin()
    .schema('security')
    .from('usuario_app_acessos')
    .select('id')
    .eq('usuario_id', usuario.id)
    .eq('ativo', true)
    .in('app_id', appIds)
    .limit(1)

  if (accessError) {
    return NextResponse.json({ error: accessError.message }, { status: 500 })
  }

  return accessRows?.length ? null : NextResponse.json({ error: 'Sem acesso ao módulo GKIT Flex.' }, { status: 403 })
}
