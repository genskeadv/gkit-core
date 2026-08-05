import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BrandLogo } from '@/features/shared/brand-logo'
import { updatePasswordAction } from '@/features/auth/password-actions'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type AlterarSenhaPageProps = {
  searchParams?: Promise<{
    error?: string
    recovery?: string
    success?: string
    next?: string
  }>
}

function safeNext(value?: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/plataforma'
  return value
}

export default async function AlterarSenhaPage({ searchParams }: AlterarSenhaPageProps) {
  const params = await searchParams
  const next = safeNext(params?.next)
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent('/alterar-senha')}&error=${encodeURIComponent('Entre ou abra novamente o link de recuperacao para alterar a senha.')}`)
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <BrandLogo className="login-mark" label="GKIT Core" />
          <div>
            <p className="login-kicker">GKIT Core</p>
            <span className="login-subtitle">Genske Advogados</span>
          </div>
        </div>

        <h1>Alterar senha</h1>
        <p className="login-copy">
          Defina uma senha com pelo menos 8 caracteres.
        </p>

        {params?.error ? <div className="alert danger login-alert">{params.error}</div> : null}
        {params?.success === '1' ? (
          <div className="alert success login-alert">
            Senha alterada com sucesso.
          </div>
        ) : null}

        {params?.success === '1' ? null : (
          <form action={updatePasswordAction} className="grid">
            <input type="hidden" name="next" value={next} />
            <input type="hidden" name="recovery" value={params?.recovery === '1' ? '1' : '0'} />

            {params?.recovery === '1' ? null : (
            <div>
              <label className="label" htmlFor="current_password">Senha atual</label>
              <input className="input" id="current_password" name="current_password" type="password" required autoComplete="current-password" />
            </div>
            )}

            <div>
              <label className="label" htmlFor="password">Nova senha</label>
              <input className="input" id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
            </div>

            <div>
              <label className="label" htmlFor="password_confirmation">Confirmar nova senha</label>
              <input className="input" id="password_confirmation" name="password_confirmation" type="password" minLength={8} required autoComplete="new-password" />
            </div>

            <button className="button" type="submit">Salvar nova senha</button>
          </form>
        )}

        <div className="login-form-footer">
          <Link href={next}>Voltar</Link>
        </div>
      </section>
    </main>
  )
}
