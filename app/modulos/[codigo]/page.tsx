import Link from 'next/link'
import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/auth/permissions'
import { requireModuleAccess } from '@/lib/auth/platform'
import { isRetiredModuleCode } from '@/lib/auth/retired-modules'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const moduleArea: Record<string, string> = {
  ciclo: 'Governança',
  colab: 'Portal do colaborador',
  sind: 'Portal do síndico',
}

export default async function ModuloPage({
  params,
}: {
  params: Promise<{ codigo: string }>
}) {
  const { codigo } = await params
  if (codigo === 'ciclo' || codigo === 'gkit_ciclo') {
    redirect('/modulos/gkit-ciclo')
  }

  if (codigo === 'gkit_new') {
    redirect('/modulos/gkit-new')
  }

  if (codigo === 'gkit_ate') {
    redirect('/modulos/gkit-ate')
  }

  if (codigo === 'gkit_dir') {
    redirect('/modulos/gkit-dir')
  }

  if (codigo === 'gkit_fat') {
    redirect('/modulos/gkit-fat')
  }

  if (codigo === 'gkit_flex') {
    redirect('/modulos/gkit-flex')
  }

  if (codigo === 'gkit_jur') {
    redirect('/modulos/gkit-jur')
  }

  if (codigo === 'gkit_performa') {
    redirect('/modulos/gkit-performa')
  }

  if (isRetiredModuleCode(codigo)) {
    redirect('/plataforma')
  }

  const context = await requireModuleAccess(codigo)
  const lookupCodigo = codigo
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
            <a className="button secondary" href="/logout">Sair</a>
          </div>
        </section>
      </div>
    </main>
  )
}
