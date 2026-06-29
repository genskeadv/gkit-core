import Link from 'next/link'
import { ListToolbar, PageHeader, StatusBadge } from '@/features/admin/components/Ui'
import { listTimes } from '@/features/admin/queries'
import { canAccess, requireAdminPermission } from '@/lib/auth/permissions'

type TimesPageProps = {
  searchParams?: Promise<{ q?: string; status?: string }>
}

export default async function TimesPage({ searchParams }: TimesPageProps) {
  const { permissions } = await requireAdminPermission('admin.times.read')
  const canWrite = canAccess(permissions, 'admin.times.write')
  const params = await searchParams
  const query = params?.q?.trim().toLowerCase() ?? ''
  const status = params?.status ?? ''
  const times = await listTimes()
  const filtrados = times.filter((time: any) => {
    const matchesQuery = !query || [time.nome, time.descricao, time.area].some((value) => String(value ?? '').toLowerCase().includes(query))
    const matchesStatus = !status || time.status === status
    return matchesQuery && matchesStatus
  })

  return (
    <>
      <PageHeader
        title="Times"
        subtitle="Grupos organizacionais de colaboradores, independentes das carteiras de clientes."
        actionHref={canWrite ? '/admin/times/novo' : undefined}
        actionLabel={canWrite ? 'Novo time' : undefined}
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
              <th>Nome</th>
              <th>Area</th>
              <th>Status</th>
              <th>Colaboradores</th>
              {canWrite ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((time: any) => (
              <tr key={time.id}>
                <td>{time.nome}</td>
                <td>{time.area || '-'}</td>
                <td><StatusBadge value={time.status} /></td>
                <td>{time.total_colaboradores ?? 0}</td>
                {canWrite ? <td><Link href={`/admin/times/${time.id}`}>Editar</Link></td> : null}
              </tr>
            ))}
            {!filtrados.length ? (
              <tr><td colSpan={canWrite ? 5 : 4}>Nenhum time encontrado.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}
