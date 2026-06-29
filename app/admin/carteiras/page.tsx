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
  const filtradas = carteiras.filter((carteira: any) => {
    const matchesQuery = !query || [carteira.nome, carteira.descricao].some((value) => String(value ?? '').toLowerCase().includes(query))
    const matchesStatus = !status || carteira.status === status
    return matchesQuery && matchesStatus
  })

  return (
    <>
      <PageHeader
        title="Carteiras"
        subtitle="Grupos de clientes e receita, com colaboradores vinculados sem interferir nos times."
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
              <th>Colaboradores</th>
              <th>Permissoes</th>
              {canWrite ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {filtradas.map((carteira: any) => (
              <tr key={carteira.id}>
                <td>{carteira.nome}</td>
                <td><StatusBadge value={carteira.status} /></td>
                <td>{carteira.cor_primaria || '-'}</td>
                <td>{carteira.total_colaboradores ?? 0}</td>
                <td>{carteira.total_usuarios_ativos ?? 0}</td>
                {canWrite ? <td><Link href={`/admin/carteiras/${carteira.id}`}>Editar</Link></td> : null}
              </tr>
            ))}
            {!filtradas.length ? (
              <tr><td colSpan={canWrite ? 6 : 5}>Nenhuma carteira encontrada.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}
