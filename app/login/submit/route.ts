import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function safeRedirectPath(value: FormDataEntryValue | null) {
  const fallback = '/plataforma'

  if (typeof value !== 'string') {
    return fallback
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return fallback
  }

  if (value === '/app' || value === '/admin/login') {
    return fallback
  }

  return value
}

function redirectTo(request: NextRequest, path: string, init?: ResponseInit) {
  return NextResponse.redirect(new URL(path, request.url), init)
}

function loginUrl(request: NextRequest, next: string, error: string) {
  const url = new URL('/login', request.url)
  url.searchParams.set('next', next)
  url.searchParams.set('error', error)
  return url
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')
  const next = safeRedirectPath(formData.get('next'))

  if (!email || !password) {
    return redirectTo(request, loginUrl(request, next, 'Informe e-mail e senha.').toString(), { status: 303 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return redirectTo(request, loginUrl(request, next, 'Configuração de login ausente no servidor.').toString(), { status: 303 })
  }

  const response = redirectTo(request, next, { status: 303 })
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
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

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const message = error.message.toLowerCase().includes('fetch failed')
      ? 'Não foi possível conectar ao serviço de login. Tente novamente em instantes.'
      : 'E-mail ou senha inválidos.'

    return redirectTo(request, loginUrl(request, next, message).toString(), { status: 303 })
  }

  return response
}
