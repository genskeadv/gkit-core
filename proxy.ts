import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const LEGACY_MODULE_PREFIXES = ['/modulos/intr', '/modulos/fix', '/modulos/flex']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionResponse = await updateSession(request)
  const isLegacyModule = LEGACY_MODULE_PREFIXES.some((prefix) => (
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  ))

  if (isLegacyModule) {
    const response = NextResponse.redirect(new URL('/modulos/din', request.url))
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
