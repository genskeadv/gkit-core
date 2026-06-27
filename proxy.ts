import { NextResponse, type NextRequest } from 'next/server'
import { isRetiredModulePath } from '@/lib/auth/retired-modules'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionResponse = await updateSession(request)

  if (isRetiredModulePath(pathname)) {
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
