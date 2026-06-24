import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const LEGACY_MODULE_PREFIXES = ['/modulos/intr', '/modulos/fix', '/modulos/flex']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isLegacyModule = LEGACY_MODULE_PREFIXES.some((prefix) => (
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  ))

  if (isLegacyModule) {
    return NextResponse.redirect(new URL('/modulos/din', request.url))
  }

  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
