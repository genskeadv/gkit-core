import Link from 'next/link'
import { BrandLogo } from '@/features/shared/brand-logo'
import { requestPasswordResetAction } from '@/features/auth/password-actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type RecuperarSenhaPageProps = {
  searchParams?: Promise<{
    error?: string
    sent?: string
    email?: string
  }>
}

export default async function RecuperarSenhaPage({ searchParams }: RecuperarSenhaPageProps) {
  const params = await searchParams
  const sent = params?.sent === '1'

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

        <h1>Recuperar senha</h1>
        <p className="login-copy">
          Informe seu e-mail para receber o link seguro de redefinicao.
        </p>

        {params?.error ? <div className="alert danger login-alert">{params.error}</div> : null}
        {sent ? (
          <div className="alert success login-alert">
            Se o e-mail estiver cadastrado, enviaremos as instrucoes para {params?.email ?? 'sua caixa de entrada'}.
          </div>
        ) : null}

        <form action={requestPasswordResetAction} className="grid">
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="email" defaultValue={params?.email ?? ''} />
          </div>

          <button className="button" type="submit">Enviar link</button>
        </form>

        <div className="login-form-footer">
          <Link href="/login">Voltar ao login</Link>
        </div>
      </section>
    </main>
  )
}
