import { redirect } from 'next/navigation'
import { BrandLogo } from '@/features/shared/brand-logo'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string
    next?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const next = params?.next && params.next.startsWith('/') && !params.next.startsWith('//')
    ? params.next
    : '/plataforma'

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const admin = createSupabaseAdminClient()
    const { data: usuario } = await admin
      .schema('security')
      .from('usuarios')
      .select('id, nome, email, tipo, status')
      .eq('id', user.id)
      .maybeSingle()

    if (usuario?.status === 'ativo') {
      redirect(next)
    }

    redirect(`/logout?next=${encodeURIComponent(next)}&error=${encodeURIComponent('Sessão sem acesso ativo. Entre com uma conta autorizada.')}`)
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

        <h1>Acesso à plataforma</h1>
        <p className="login-copy">
          Entre com sua conta para acessar os módulos liberados para você.
        </p>

        {params?.error ? (
          <div className="alert danger login-alert">
            {params.error}
          </div>
        ) : null}

        <form action="/login/submit" className="grid" method="post">
          <input type="hidden" name="next" value={next} />

          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="email" />
          </div>

          <div>
            <label className="label" htmlFor="password">Senha</label>
            <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
          </div>

          <button className="button" type="submit">Entrar</button>
        </form>
      </section>
    </main>
  )
}
