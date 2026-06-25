import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function safeCookieName(name: string) {
  if (name.startsWith('sb-')) return name.replace(/auth-token.*/, 'auth-token')
  return name
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  const cookies = request.cookies.getAll()
  const supabaseCookies = cookies
    .map((cookie) => cookie.name)
    .filter((name) => name.startsWith('sb-') || name.includes('supabase'))
    .map(safeCookieName)

  return NextResponse.json({
    host: request.nextUrl.host,
    path: request.nextUrl.pathname,
    hasSupabaseCookies: supabaseCookies.length > 0,
    supabaseCookieNames: [...new Set(supabaseCookies)].sort(),
    cookieCount: cookies.length,
    hasLoginProbe: cookies.some((cookie) => cookie.name === 'gkit_login_probe'),
    loginAttempt: cookies.find((cookie) => cookie.name === 'gkit_login_attempt')?.value ?? null,
    hasUser: Boolean(user),
    userEmail: user?.email ?? null,
    userId: user?.id ? `${user.id.slice(0, 8)}...` : null,
    authError: error?.message ?? null,
    env: {
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasPublishableKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
  })
}
