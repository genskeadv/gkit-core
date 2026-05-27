'use server'

import { redirect } from 'next/navigation'
import { createSupabaseActionClient } from '@/lib/supabase/action'

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

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')
  const next = safeRedirectPath(formData.get('next'))

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent('Informe e-mail e senha.')}&next=${encodeURIComponent(next)}`)
  }

  const supabase = await createSupabaseActionClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    if (error.message.toLowerCase().includes('fetch failed')) {
      redirect(`/login?error=${encodeURIComponent('Não foi possível conectar ao serviço de login. Tente novamente em instantes.')}&next=${encodeURIComponent(next)}`)
    }

    redirect(`/login?error=${encodeURIComponent('E-mail ou senha inválidos.')}&next=${encodeURIComponent(next)}`)
  }

  redirect(next)
}

export async function logoutAction() {
  const supabase = await createSupabaseActionClient()
  await supabase.auth.signOut()

  redirect('/login?next=/plataforma')
}
