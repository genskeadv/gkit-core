import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUsuarioPermissionCodes } from '@/lib/auth/permissions'

export type PlatformUsuario = {
  id: string
  nome: string
  email: string
  tipo: string
  status: string
}

export type PlatformModule = {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  status: string
  href: string
}

const MODULE_PATHS: Record<string, string> = {
  ciclo: '/modulos/ciclo',
  core: '/admin',
  crm: '/modulos/crm',
  fix: '/modulos/din',
  'gkit-ate': '/modulos/gkit-ate',
  'gkit-dir': '/modulos/gkit-dir',
  'gkit-flex': '/modulos/gkit-flex',
  'gkit-new': '/modulos/gkit-new',
  gkit_ate: '/modulos/gkit-ate',
  gkit_dir: '/modulos/gkit-dir',
  gkit_flex: '/modulos/gkit-flex',
  gkit_new: '/modulos/gkit-new',
  intr: '/modulos/din',
  colab: '/modulos/colab',
  din: '/modulos/din',
  flex: '/modulos/din',
  painel: '/modulos/painel',
  sind: '/modulos/sind',
}

const LEGACY_MODULE_CODES = new Set(['intr', 'fix', 'flex'])

function admin() {
  return createSupabaseAdminClient() as any
}

function safeNext(next: string) {
  return next.startsWith('/') && !next.startsWith('//') ? next : '/plataforma'
}

function moduleHref(app: any, codigo: string) {
  const knownPath = MODULE_PATHS[codigo] ?? MODULE_PATHS[String(app.codigo)]
  if (knownPath) return knownPath

  if (typeof app.url_path === 'string' && app.url_path.startsWith('/') && !app.url_path.startsWith('//')) {
    return app.url_path
  }

  return `/modulos/${codigo}`
}

function moduleCode(codigo: unknown) {
  const value = String(codigo)
  if (value === 'gkit_ate') return 'gkit-ate'
  if (value === 'gkit_dir') return 'gkit-dir'
  if (value === 'gkit_flex') return 'gkit-flex'
  return value === 'gkit_new' ? 'gkit-new' : value
}

function normalizeModule(app: any): PlatformModule {
  const codigo = moduleCode(app.codigo)

  return {
    id: app.id,
    codigo,
    nome: app.nome,
    descricao: app.descricao,
    status: app.status,
    href: moduleHref(app, codigo),
  }
}

function activePlatformModules(data: any[] | null): PlatformModule[] {
  return (data ?? [])
    .map(normalizeModule)
    .filter((module) => !LEGACY_MODULE_CODES.has(module.codigo))
}

async function listActiveModulesFor(usuario: PlatformUsuario, permissions: string[]): Promise<PlatformModule[]> {
  const supabase = admin()

  if (usuario.tipo === 'admin_global' || permissions.includes('*')) {
    const { data, error } = await supabase
      .schema('core')
      .from('apps')
      .select('*')
      .eq('status', 'ativo')
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true })

    if (error) throw new Error(error.message)
    return activePlatformModules(data)
  }

  const { data: accessRows, error: accessError } = await supabase
    .schema('security')
    .from('usuario_app_acessos')
    .select('app_id')
    .eq('usuario_id', usuario.id)
    .eq('ativo', true)

  if (accessError) throw new Error(accessError.message)

  const appIds = [...new Set((accessRows ?? []).map((row: any) => row.app_id))]
  if (!appIds.length) return []

  const { data, error } = await supabase
    .schema('core')
    .from('apps')
    .select('*')
    .in('id', appIds)
    .eq('status', 'ativo')
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })

  if (error) throw new Error(error.message)
  return activePlatformModules(data)
}

export async function requirePlatformContext(next = '/plataforma'): Promise<{
  authUser: User
  usuario: PlatformUsuario
  permissions: string[]
  modules: PlatformModule[]
}> {
  const target = safeNext(next)
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect(`/login?next=${encodeURIComponent(target)}`)
  }

  const { data: usuario, error } = await admin()
    .schema('security')
    .from('usuarios')
    .select('id, nome, email, tipo, status')
    .eq('id', user.id)
    .single()

  if (error || !usuario || usuario.status !== 'ativo') {
    redirect(`/logout?next=${encodeURIComponent(target)}&error=${encodeURIComponent('Sessão sem acesso ativo.')}`)
  }

  const typedUsuario = usuario as PlatformUsuario
  const permissions = await getUsuarioPermissionCodes(typedUsuario)
  const modules = await listActiveModulesFor(typedUsuario, permissions)

  return {
    authUser: user,
    usuario: typedUsuario,
    permissions,
    modules,
  }
}

export type ModuleSearchParams = Record<string, string | string[] | undefined>

export function moduleTarget(path: string, searchParams?: ModuleSearchParams | null) {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item) query.append(key, item)
      })
    } else if (value) {
      query.set(key, value)
    }
  }

  const suffix = query.toString()
  return suffix ? `${path}?${suffix}` : path
}

export async function requireModuleAccess(codigo: string, target = `/modulos/${codigo}`) {
  const context = await requirePlatformContext(target)

  if (context.usuario.tipo === 'admin_global' || context.permissions.includes('*')) {
    return context
  }

  if (!context.modules.some((modulo: PlatformModule) => modulo.codigo === codigo)) {
    redirect('/plataforma')
  }

  return context
}
