import Link from 'next/link'
import { ListToolbar, PageHeader, StatusBadge } from '@/features/admin/components/Ui'
import { listApps } from '@/features/admin/queries'
import { canAccess, requireAdminPermission } from '@/lib/auth/permissions'

type AppsPageProps = {
  searchParams?: Promise<{ q?: string; status?: string }>
}

export default async function AppsPage({ searchParams }: AppsPageProps) {
  const { permissions } = await requireAdminPermission('admin.apps.read')
  const canWrite = canAccess(permissions, 'admin.apps.write')
  const params = await searchParams
  const query = params?.q?.trim().toLowerCase() ?? ''
  const status = params?.status ?? ''
  const apps = await listApps()
  const filtrados = apps.filter((app: any) => {
    const matchesQuery = !query || [app.codigo, app.nome, app.descricao].some((value) => String(value ?? '').toLowerCase().includes(query))
    const matchesStatus = !status || app.status === status
    return matchesQuery && matchesStatus
  })

  return (
    <>
      <PageHeader title="Módulos" subtitle="Módulos disponíveis na plataforma GKIT." />
      <ListToolbar
        query={params?.q}
        status={status}
        statusOptions={[
          { value: 'ativo', label: 'Ativo' },
          { value: 'inativo', label: 'Inativo' },
          { value: 'arquivado', label: 'Arquivado' },
        ]}
      />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>Status</th>
              <th>Usuários</th>
              <th>Permissões</th>
              {canWrite ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((app: any) => (
              <tr key={app.id}>
                <td>{app.codigo}</td>
                <td>{app.nome}</td>
                <td><StatusBadge value={app.status} /></td>
                <td>{app.total_usuarios_ativos ?? 0}</td>
                <td>{app.total_permissoes ?? 0}</td>
                {canWrite ? <td><Link href={`/admin/apps/${app.id}`}>Editar</Link></td> : null}
              </tr>
            ))}
            {!filtrados.length ? (
              <tr><td colSpan={canWrite ? 6 : 5}>Nenhum módulo encontrado.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}
