import { NextResponse } from 'next/server'
import { createSupabaseActionClient } from '@/lib/supabase/action'

export async function GET(request: Request) {
  const supabase = await createSupabaseActionClient()
  await supabase.auth.signOut()

  const url = new URL(request.url)
  const next = url.searchParams.get('next')
  const error = url.searchParams.get('error')
  const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : '/plataforma'
  const loginUrl = new URL('/login', request.url)

  loginUrl.searchParams.set('next', safeNext)
  if (error) {
    loginUrl.searchParams.set('error', error)
  }

  return NextResponse.redirect(loginUrl)
}
