import Link from 'next/link'
import { ListToolbar, PageHeader, StatusBadge } from '@/features/admin/components/Ui'
import { listCarteiras } from '@/features/admin/queries'
import { canAccess, requireAdminPermission } from '@/lib/auth/permissions'

type CarteirasPageProps = {
  searchParams?: Promise<{ q?: string; status?: string }>
}

export default async function CarteirasPage({ searchParams }: CarteirasPageProps) {
  const { permissions } = await requireAdminPermission('admin.carteiras.read')
  const canWrite = canAccess(permissions, 'admin.carteiras.write')
  const params = await searchParams
  const query = params?.q?.trim().toLowerCase() ?? ''
  const status = params?.status ?? ''
  const carteiras = await listCarteiras()
  const filtradas = carteiras.filter((c: any) => {
    const matchesQuery = !query || [c.nome, c.descricao].some((value) => String(value ?? '').toLowerCase().includes(query))
    const matchesStatus = !status || c.status === status
    return matchesQuery && matchesStatus
  })

  return (
    <>
      <PageHeader
        title="Carteiras"
        subtitle="Controle dos escopos operacionais."
        actionHref={canWrite ? '/admin/carteiras/nova' : undefined}
        actionLabel={canWrite ? 'Nova carteira' : undefined}
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
              <th>Status</th>
              <th>Cor</th>
              <th>Usuários</th>
              {canWrite ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {filtradas.map((c: any) => (
              <tr key={c.id}>
                <td>{c.nome}</td>
                <td><StatusBadge value={c.status} /></td>
                <td>{c.cor_primaria || '—'}</td>
                <td>{c.total_usuarios_ativos ?? 0}</td>
                {canWrite ? <td><Link href={`/admin/carteiras/${c.id}`}>Editar</Link></td> : null}
              </tr>
            ))}
            {!filtradas.length ? (
              <tr><td colSpan={canWrite ? 5 : 4}>Nenhuma carteira encontrada.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}
