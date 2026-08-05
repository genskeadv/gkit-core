import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublicEnv } from '@/lib/supabase/env'

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/plataforma'
  return value
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = safeRedirectPath(requestUrl.searchParams.get('next'))

  if (!code) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'Link de autenticacao invalido ou expirado.')
    return NextResponse.redirect(loginUrl, { status: 303 })
  }

  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 })

  let supabaseEnv: ReturnType<typeof getSupabasePublicEnv>
  try {
    supabaseEnv = getSupabasePublicEnv()
  } catch {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'Configuracao de login ausente no servidor.')
    return NextResponse.redirect(loginUrl, { status: 303 })
  }

  const supabase = createServerClient(supabaseEnv.supabaseUrl, supabaseEnv.supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'Link de autenticacao invalido ou expirado.')
    return NextResponse.redirect(loginUrl, { status: 303 })
  }

  return response
}
