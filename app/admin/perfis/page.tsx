import Link from 'next/link'
import { ListToolbar, PageHeader, StatusBadge } from '@/features/admin/components/Ui'
import { listPerfis } from '@/features/admin/queries'
import { canAccess, requireAdminPermission } from '@/lib/auth/permissions'

type PerfisPageProps = {
  searchParams?: Promise<{ q?: string; status?: string }>
}

export default async function PerfisPage({ searchParams }: PerfisPageProps) {
  const { permissions } = await requireAdminPermission('admin.perfis.read')
  const canWrite = canAccess(permissions, 'admin.perfis.write')
  const params = await searchParams
  const query = params?.q?.trim().toLowerCase() ?? ''
  const status = params?.status ?? ''
  const perfis = await listPerfis()
  const filtrados = perfis.filter((p: any) => {
    const matchesQuery = !query || [p.codigo, p.nome, p.app_nome].some((value) => String(value ?? '').toLowerCase().includes(query))
    const matchesStatus = !status || p.status === status
    return matchesQuery && matchesStatus
  })

  return (
    <>
      <PageHeader
        title="Perfis"
        subtitle="Perfis de acesso do ecossistema."
        actionHref={canWrite ? '/admin/perfis/novo' : undefined}
        actionLabel={canWrite ? 'Novo perfil' : undefined}
      />
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
              <th>Nível</th>
              <th>App</th>
              <th>Sistema</th>
              <th>Status</th>
              <th>Permissões</th>
              {canWrite ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p: any) => (
              <tr key={p.id}>
                <td>{p.codigo}</td>
                <td>{p.nome}</td>
                <td>{p.nivel}</td>
                <td>{p.app_nome || 'Global'}</td>
                <td>{p.sistema ? 'Sim' : 'Não'}</td>
                <td><StatusBadge value={p.status} /></td>
                <td>{p.total_permissoes ?? 0}</td>
                {canWrite ? <td><Link href={`/admin/perfis/${p.id}`}>Editar</Link></td> : null}
              </tr>
            ))}
            {!filtrados.length ? (
              <tr><td colSpan={canWrite ? 8 : 7}>Nenhum perfil encontrado.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}
