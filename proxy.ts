import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const RETIRED_MODULE_PREFIXES = ['/modulos/crm', '/modulos/din', '/modulos/fix', '/modulos/flex', '/modulos/intr']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionResponse = await updateSession(request)
  const isRetiredModule = RETIRED_MODULE_PREFIXES.some((prefix) => (
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  ))

  if (isRetiredModule) {
    const response = NextResponse.redirect(new URL('/plataforma', request.url))
    sessionResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })
    return response
  }

  return sessionResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
