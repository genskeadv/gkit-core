import { ListToolbar, PageHeader } from '@/features/admin/components/Ui'
import { listEventos } from '@/features/admin/queries'
import { requireAdminPermission } from '@/lib/auth/permissions'

type AuditoriaPageProps = {
  searchParams?: Promise<{ q?: string }>
}

export default async function AuditoriaPage({ searchParams }: AuditoriaPageProps) {
  await requireAdminPermission('admin.auditoria.read')
  const params = await searchParams
  const query = params?.q?.trim().toLowerCase() ?? ''
  const eventos = await listEventos()
  const filtrados = eventos.filter((e: any) => (
    !query || [e.acao, e.descricao, e.usuario_email, e.entidade_tabela].some((value) => String(value ?? '').toLowerCase().includes(query))
  ))

  return (
    <>
      <PageHeader title="Auditoria" subtitle="Últimos eventos administrativos." />
      <ListToolbar query={params?.q} />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Ação</th>
              <th>Descrição</th>
              <th>Usuário</th>
              <th>Entidade</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((e: any) => (
              <tr key={e.id}>
                <td>{new Date(e.created_at).toLocaleString('pt-BR')}</td>
                <td>{e.acao}</td>
                <td>{e.descricao || '—'}</td>
                <td>{e.usuario_email || '—'}</td>
                <td>{e.entidade_tabela || '—'}</td>
              </tr>
            ))}
            {!filtrados.length ? (
              <tr><td colSpan={5}>Nenhum evento registrado ainda.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}
