import Link from 'next/link'
import type { ReactNode } from 'react'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import type { PlatformUsuario } from '@/lib/auth/platform'
import type { CicloCliente } from '@/features/ciclo/types'
import type { GkitDirSearchParams, GkitDirStatusFilter } from './queries'

const navGroups: ModuleNavGroup[] = [
  { href: '/modulos/gkit-dir', title: 'Diretório' },
]

function labelTipo(value: string) {
  if (value === 'cobranca') return 'Cobrança'
  if (value === 'pontual') return 'Pontual'
  return 'Mensal'
}

function labelStatus(value: string) {
  if (value === 'implantacao') return 'Implantação'
  if (value === 'encerrado') return 'Encerrado'
  if (value === 'pausado') return 'Pausado'
  if (value === 'novo') return 'Novo'
  return 'Ativo'
}

function labelRisco(value: string) {
  if (value === 'critico') return 'Crítico'
  if (value === 'medio') return 'Médio'
  return value ? value[0].toUpperCase() + value.slice(1) : '-'
}

function riskTone(value: string) {
  if (value === 'critico' || value === 'alto') return 'danger'
  if (value === 'medio') return 'warning'
  return 'success'
}

const pageSize = 20

function dirHref(page: number, filters: GkitDirPageFilters) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.tipo) params.set('tipo', filters.tipo)
  if (filters.status) params.set('status', filters.status)
  if (filters.carteira) params.set('carteira', filters.carteira)
  if (filters.sort !== 'cliente') params.set('sort', filters.sort)
  if (filters.dir !== 'asc') params.set('dir', filters.dir)
  if (page > 1) params.set('pagina', String(page))
  const query = params.toString()
  return query ? `/modulos/gkit-dir?${query}` : '/modulos/gkit-dir'
}

function groupedByCarteira(clientes: CicloCliente[], pagina: number) {
  const groups = [...clientes.reduce((acc, cliente) => {
    const key = cliente.carteira?.trim() || 'Sem carteira'
    acc.set(key, [...(acc.get(key) ?? []), cliente])
    return acc
  }, new Map<string, CicloCliente[]>())]
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([carteira, items]) => ({ carteira, items }))
  const totalPages = Math.max(1, Math.ceil(groups.length / pageSize))
  const currentPage = Math.min(Math.max(pagina, 1), totalPages)
  const start = (currentPage - 1) * pageSize

  return {
    currentPage,
    groups: groups.slice(start, start + pageSize),
    totalGroups: groups.length,
    totalPages,
  }
}

function DirPagination({
  currentPage,
  filters,
  totalGroups,
  totalPages,
}: {
  currentPage: number
  filters: GkitDirPageFilters
  totalGroups: number
  totalPages: number
}) {
  if (totalPages <= 1) return <span className="ciclo-client-group-count">{totalGroups} carteira(s)</span>

  return (
    <div className="ciclo-client-group-pagination">
      <span>{totalGroups} carteira(s) · página {currentPage} de {totalPages}</span>
      <div>
        <Link aria-disabled={currentPage <= 1} className="button secondary" href={dirHref(Math.max(1, currentPage - 1), filters)}>Anterior</Link>
        <Link aria-disabled={currentPage >= totalPages} className="button secondary" href={dirHref(Math.min(totalPages, currentPage + 1), filters)}>Próxima</Link>
      </div>
    </div>
  )
}

type GkitDirPageFilters = Required<Pick<GkitDirSearchParams, 'q'>> & {
  carteira: string
  dir: 'asc' | 'desc'
  pagina: number
  sort: 'cliente' | 'tipo' | 'carteira' | 'regularidade' | 'risco'
  status: GkitDirStatusFilter
  tipo: '' | 'mensal' | 'pontual' | 'cobranca'
}

export function GkitDirShell({
  children,
  usuario,
}: {
  children: ReactNode
  usuario: PlatformUsuario
}) {
  return (
    <ModuleShell
      activeHref="/modulos/gkit-dir"
      brand="Diretório de clientes"
      description="Consulta única aos dados cadastrais dos clientes mantidos pelo Ciclo."
      eyebrow="GKIT DIR"
      navGroups={navGroups}
      product="GKIT DIR"
      title="Diretório de clientes"
      usuario={usuario}
      variantClassName="gkit-new-shell gkit-dir-shell"
    >
      {children}
    </ModuleShell>
  )
}

export function GkitDirPage({
  clientes,
  databaseReady,
  filters,
  options,
  resumo,
}: {
  clientes: CicloCliente[]
  databaseReady: boolean
  filters: GkitDirPageFilters
  options: { carteiras: string[]; status: string[] }
  resumo: {
    ativos: number
    carteiras: number
    filtrados: number
    implantacao: number
    total: number
  }
}) {
  const grouped = groupedByCarteira(clientes, filters.pagina)
  const hasFilters = Boolean(filters.q || filters.tipo || filters.status || filters.carteira || filters.sort !== 'cliente' || filters.dir !== 'asc')

  return (
    <>
      {!databaseReady ? (
        <div className="suite-empty-block danger">Não foi possível carregar a base do Ciclo.</div>
      ) : null}

      <section className="suite-kpi-grid compact gkit-dir-kpis">
        <article className="metric-card">
          <span className="metric-label">Clientes</span>
          <strong className="metric-value">{resumo.total}</strong>
          <span className="metric-hint">{resumo.filtrados} na consulta</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Ativos</span>
          <strong className="metric-value">{resumo.ativos}</strong>
          <span className="metric-hint">em operação</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Implantação</span>
          <strong className="metric-value">{resumo.implantacao}</strong>
          <span className="metric-hint">novos ou onboarding</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Carteiras</span>
          <strong className="metric-value">{resumo.carteiras}</strong>
          <span className="metric-hint">no escopo do usuário</span>
        </article>
      </section>

      <section className="suite-panel gkit-dir-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Consulta de clientes</h2>
            <p>{clientes.length} cliente(s) em {grouped.totalGroups} carteira(s).</p>
          </div>
        </div>

        <form className="gkit-new-filter-bar gkit-dir-filter-bar" method="get">
          <div className="gkit-new-filter-fields">
            <label>
              <span>Buscar</span>
              <input name="q" placeholder="Nome, CNPJ, carteira ou administradora" type="search" defaultValue={filters.q} />
            </label>
            <label>
              <span>Tipo</span>
              <select name="tipo" defaultValue={filters.tipo}>
                <option value="">Todos</option>
                <option value="mensal">Mensal</option>
                <option value="pontual">Pontual</option>
                <option value="cobranca">Cobrança</option>
              </select>
            </label>
            <label>
              <span>Carteira</span>
              <select name="carteira" defaultValue={filters.carteira}>
                <option value="">Todas</option>
                {options.carteiras.map((carteira) => (
                  <option key={carteira} value={carteira}>{carteira}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select name="status" defaultValue={filters.status}>
                <option value="">Todos</option>
                {options.status.map((status) => (
                  <option key={status} value={status}>{labelStatus(status)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Ordenar</span>
              <select name="sort" defaultValue={filters.sort}>
                <option value="cliente">Cliente</option>
                <option value="carteira">Carteira</option>
                <option value="tipo">Tipo</option>
                <option value="risco">Risco</option>
                <option value="regularidade">Regularidade</option>
              </select>
            </label>
            <label>
              <span>Direção</span>
              <select name="dir" defaultValue={filters.dir}>
                <option value="asc">Crescente</option>
                <option value="desc">Decrescente</option>
              </select>
            </label>
          </div>
          <div className="gkit-new-filter-actions">
            <span>{clientes.length} de {resumo.total}</span>
            <button className="button" type="submit">Filtrar</button>
            {hasFilters ? <Link className="button secondary" href="/modulos/gkit-dir">Limpar</Link> : null}
          </div>
        </form>

        {grouped.groups.length ? (
          <div className="ciclo-client-group-list">
            <DirPagination currentPage={grouped.currentPage} filters={filters} totalGroups={grouped.totalGroups} totalPages={grouped.totalPages} />
            {grouped.groups.map((group) => (
              <details className="ciclo-client-group" key={group.carteira}>
                <summary>
                  <span aria-hidden="true">+</span>
                  <strong>{group.carteira}</strong>
                  <small>{group.items.length} cliente(s)</small>
                </summary>
                <div className="gkit-dir-list" role="list">
                  {group.items.map((cliente) => (
                    <article className="gkit-dir-row" key={cliente.id} role="listitem">
                      <div className="gkit-dir-client">
                        <h3>{cliente.nome}</h3>
                        <p>{cliente.razaoSocial || cliente.nome}</p>
                        <small>{cliente.documento || 'Documento não informado'}</small>
                      </div>
                      <div>
                        <span>Administradora</span>
                        <strong>{cliente.administradora || 'Sem administradora'}</strong>
                        <small>{[cliente.cidade, cliente.estado].filter(Boolean).join(' / ') || 'Sem localidade'}</small>
                      </div>
                      <div className="gkit-dir-tags">
                        <span className="suite-pill primary">{labelTipo(cliente.tipoCliente)}</span>
                        <span className="suite-pill success">{labelStatus(cliente.status)}</span>
                        <span className={`suite-pill ${riskTone(cliente.risco)}`}>{labelRisco(cliente.risco)}</span>
                      </div>
                      <div className="gkit-dir-score">
                        <span>Regularidade</span>
                        <strong>{cliente.regularidade}%</strong>
                        <small>Score {cliente.score}%</small>
                      </div>
                      <Link className="button secondary" href={`/modulos/gkit-ciclo/clientes/${cliente.id}`}>Abrir</Link>
                    </article>
                  ))}
                </div>
              </details>
            ))}
            <DirPagination currentPage={grouped.currentPage} filters={filters} totalGroups={grouped.totalGroups} totalPages={grouped.totalPages} />
          </div>
        ) : (
          <div className="suite-empty-block">Nenhum cliente encontrado para os filtros informados.</div>
        )}
      </section>
    </>
  )
}
