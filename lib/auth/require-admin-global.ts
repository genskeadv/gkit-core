import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getAdminContext } from '@/lib/auth/permissions'

export async function requireAdminCore() {
  return getAdminContext()
}

export async function requireAdminGlobal() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login?next=/admin')
  }

  const admin = createSupabaseAdminClient() as any

  const { data: usuario, error } = await admin
    .schema('security')
    .from('usuarios')
    .select('id, nome, email, tipo, status')
    .eq('id', user.id)
    .single()

  if (error || !usuario || usuario.status !== 'ativo' || usuario.tipo !== 'admin_global') {
    redirect('/login?next=/admin')
  }

  return {
    authUser: user,
    usuario,
  }
}
