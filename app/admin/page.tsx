import { PageHeader, StatusBadge } from '@/features/admin/components/Ui'
import { getDashboardStats } from '@/features/admin/queries'

export default async function AdminPage() {
  const stats = await getDashboardStats()

  const cards = [
    ['Usuários', stats.totalUsuarios],
    ['Usuários ativos', stats.usuariosAtivos],
    ['Carteiras ativas', stats.carteirasAtivas],
    ['Módulos ativos', stats.appsAtivos],
    ['Perfis ativos', stats.perfisAtivos],
  ]

  return (
    <>
      <PageHeader title="Visão geral" subtitle="Administração central da plataforma GKLI." />

      <div className="grid cols-4 dashboard-grid">
        {cards.map(([label, value]) => (
          <div className="card metric-card" key={label}>
            <div className="metric-label">{label}</div>
            <div className="metric-value">{value}</div>
          </div>
        ))}
      </div>

      <section className="card">
        <h2 className="section-title">Últimos eventos</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Ação</th>
                <th>Descrição</th>
                <th>Usuário</th>
              </tr>
            </thead>
            <tbody>
              {stats.eventos.map((evento: any) => (
                <tr key={evento.id}>
                  <td>{new Date(evento.created_at).toLocaleString('pt-BR')}</td>
                  <td><StatusBadge value={evento.acao} /></td>
                  <td>{evento.descricao || '—'}</td>
                  <td>{evento.usuario_email || '—'}</td>
                </tr>
              ))}
              {!stats.eventos.length ? (
                <tr><td colSpan={4}>Nenhum evento registrado ainda.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
