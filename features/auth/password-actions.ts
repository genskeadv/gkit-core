'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseActionClient } from '@/lib/supabase/action'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function getOriginFromHeaders(headersList: Headers) {
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  if (!host) return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3005'

  const proto = headersList.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

function safeNext(value: string) {
  if (!value.startsWith('/') || value.startsWith('//')) return '/login'
  return value
}

function passwordPageError(message: string, recovery: boolean, next: string) {
  const params = new URLSearchParams({ error: message })
  if (recovery) params.set('recovery', '1')
  if (next !== '/plataforma') params.set('next', next)
  return `/alterar-senha?${params.toString()}`
}

function passwordPageSuccess(next: string) {
  const params = new URLSearchParams({ success: '1' })
  if (next !== '/plataforma') params.set('next', next)
  return `/alterar-senha?${params.toString()}`
}

async function logPasswordEvent(params: {
  usuarioId?: string | null
  acao: string
  descricao: string
  metadata?: Record<string, unknown>
}) {
  try {
    await createSupabaseAdminClient().schema('audit').from('eventos').insert({
      usuario_id: params.usuarioId ?? null,
      acao: params.acao,
      descricao: params.descricao,
      metadata: params.metadata ?? {},
      app_codigo: 'core',
      entidade_schema: 'auth',
      entidade_tabela: 'users',
      entidade_id: params.usuarioId ?? null,
    })
  } catch {
    // Auditoria nao deve impedir o fluxo de senha.
  }
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = text(formData, 'email').toLowerCase()

  if (!email) {
    redirect(`/recuperar-senha?error=${encodeURIComponent('Informe seu e-mail.')}`)
  }

  const supabase = await createSupabaseActionClient()
  const origin = getOriginFromHeaders(await headers())
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent('/alterar-senha?recovery=1')}`

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  if (error) {
    await logPasswordEvent({
      acao: 'senha.recuperacao_falhou',
      descricao: 'Falha ao solicitar recuperacao de senha.',
      metadata: { email, error: error.message },
    })
    redirect(`/recuperar-senha?error=${encodeURIComponent('Nao foi possivel enviar o e-mail agora. Tente novamente em instantes.')}`)
  }

  await logPasswordEvent({
    acao: 'senha.recuperacao_solicitada',
    descricao: 'Recuperacao de senha solicitada.',
    metadata: { email },
  })

  redirect(`/recuperar-senha?sent=1&email=${encodeURIComponent(email)}`)
}

export async function updatePasswordAction(formData: FormData) {
  const currentPassword = text(formData, 'current_password')
  const password = text(formData, 'password')
  const confirmation = text(formData, 'password_confirmation')
  const recovery = text(formData, 'recovery') === '1'
  const next = safeNext(text(formData, 'next') || '/plataforma')

  if (password.length < 8) {
    redirect(passwordPageError('A nova senha deve ter pelo menos 8 caracteres.', recovery, next))
  }

  if (password !== confirmation) {
    redirect(passwordPageError('A confirmacao da senha nao confere.', recovery, next))
  }

  if (!recovery && !currentPassword) {
    redirect(passwordPageError('Informe a senha atual para alterar sua senha.', recovery, next))
  }

  const supabase = await createSupabaseActionClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect(`/login?next=${encodeURIComponent('/alterar-senha')}&error=${encodeURIComponent('Abra novamente o link de recuperacao ou entre na plataforma.')}`)
  }

  const { error } = await supabase.auth.updateUser({
    password,
    ...(currentPassword ? { current_password: currentPassword } : {}),
  } as any)

  if (error) {
    await logPasswordEvent({
      usuarioId: user.id,
      acao: 'senha.alteracao_falhou',
      descricao: 'Falha ao alterar senha.',
      metadata: { error: error.message },
    })
    redirect(passwordPageError('Nao foi possivel alterar a senha. Confira os dados e tente novamente.', recovery, next))
  }

  await logPasswordEvent({
    usuarioId: user.id,
    acao: 'senha.alterada',
    descricao: 'Senha alterada pelo usuario.',
  })

  redirect(passwordPageSuccess(next))
}
