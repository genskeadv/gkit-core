import Link from 'next/link'
import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'

const moduleArea: Record<string, string> = {
  ciclo: 'Governança',
  crm: 'Novos negócios',
  intr: 'Financial Xperience',
  fix: 'Financial Xperience',
  flex: 'Financial Xperience',
  colab: 'Portal do colaborador',
  sind: 'Portal do síndico',
}

export default async function ModuloPage({
  params,
}: {
  params: Promise<{ codigo: string }>
}) {
  const { codigo } = await params
  if (codigo === 'gkit_new') {
    redirect('/modulos/gkit-new')
  }

  if (codigo === 'gkit_ate') {
    redirect('/modulos/gkit-ate')
  }

  if (codigo === 'gkit_dir') {
    redirect('/modulos/gkit-dir')
  }

  if (codigo === 'gkit_flex') {
    redirect('/modulos/gkit-flex')
  }

  if (codigo === 'intr' || codigo === 'fix' || codigo === 'flex') {
    redirect('/modulos/din')
  }

  const context = await requireModuleAccess(codigo === 'fix' ? 'intr' : codigo)
  const lookupCodigo = codigo === 'fix' ? 'intr' : codigo
  const modulo = context.modules.find((item) => item.codigo === lookupCodigo)

  if (!modulo) {
    notFound()
  }

  const canOpenAdmin = canAccess(context.permissions, 'admin.dashboard.read')

  return (
    <main className="module-page">
      <div className="platform-bg" />
      <div className="module-wrap">
        <section className="module-entry">
          <p className="platform-kicker">Módulo integrado</p>
          <h1>{modulo.nome}</h1>
          <p>{modulo.descricao}</p>

          <dl className="module-facts">
            <div>
              <dt>Área</dt>
              <dd>{moduleArea[modulo.codigo] ?? 'Módulo GKIT'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{modulo.status}</dd>
            </div>
            <div>
              <dt>Acesso</dt>
              <dd>{context.usuario.tipo.replace('_', ' ')}</dd>
            </div>
          </dl>

          <div className="module-actions">
            {canOpenAdmin ? <Link className="button" href="/admin">Admin Core</Link> : null}
            <Link className="button secondary" href="/logout">Sair</Link>
          </div>
        </section>
      </div>
    </main>
  )
}
