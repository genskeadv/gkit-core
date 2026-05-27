import { ListToolbar, PageHeader, StatusBadge } from '@/features/admin/components/Ui'
import { listPermissoes } from '@/features/admin/queries'
import { requireAdminPermission } from '@/lib/auth/permissions'

type PermissoesPageProps = {
  searchParams?: Promise<{ q?: string; status?: string }>
}

export default async function PermissoesPage({ searchParams }: PermissoesPageProps) {
  await requireAdminPermission('admin.permissoes.read')
  const params = await searchParams
  const query = params?.q?.trim().toLowerCase() ?? ''
  const status = params?.status ?? ''
  const permissoes = await listPermissoes()
  const filtradas = permissoes.filter((p: any) => {
    const matchesQuery = !query || [p.codigo, p.app_codigo, p.recurso, p.acao].some((value) => String(value ?? '').toLowerCase().includes(query))
    const matchesStatus = !status || p.status === status
    return matchesQuery && matchesStatus
  })

  return (
    <>
      <PageHeader title="Permissões" subtitle="Permissões estruturais cadastradas por seed SQL." />
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
              <th>App</th>
              <th>Recurso</th>
              <th>Ação</th>
              <th>Status</th>
              <th>Perfis</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((p: any) => (
              <tr key={p.id}>
                <td>{p.codigo}</td>
                <td>{p.app_codigo || 'admin'}</td>
                <td>{p.recurso}</td>
                <td>{p.acao}</td>
                <td><StatusBadge value={p.status} /></td>
                <td>{p.total_perfis ?? 0}</td>
              </tr>
            ))}
            {!filtradas.length ? (
              <tr><td colSpan={6}>Nenhuma permissão encontrada.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}
