import Link from 'next/link'
import type { ReactNode } from 'react'
import { ModuleShell, type ModuleNavGroup } from '@/features/shared/module-shell'
import type { PlatformUsuario } from '@/lib/auth/platform'
import type { CicloCliente } from '@/features/ciclo/types'
import type { GkitDirSearchParams } from './queries'

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
  filters: Required<Pick<GkitDirSearchParams, 'q'>> & {
    carteira: string
    dir: 'asc' | 'desc'
    sort: 'cliente' | 'tipo' | 'carteira' | 'regularidade' | 'risco'
    tipo: '' | 'mensal' | 'pontual' | 'cobranca'
  }
  options: { carteiras: string[] }
  resumo: {
    ativos: number
    carteiras: number
    filtrados: number
    implantacao: number
    total: number
  }
}) {
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
            <p>Dados cadastrais vindos do Ciclo, com busca por nome, documento, carteira e administradora.</p>
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
            <Link className="button secondary" href="/modulos/gkit-dir">Limpar</Link>
          </div>
        </form>

        {clientes.length ? (
          <div className="gkit-dir-list" role="list">
            {clientes.map((cliente) => (
              <article className="gkit-dir-row" key={cliente.id} role="listitem">
                <div className="gkit-dir-client">
                  <h3>{cliente.nome}</h3>
                  <p>{cliente.razaoSocial || cliente.nome}</p>
                  <small>{cliente.documento || 'Documento não informado'}</small>
                </div>
                <div>
                  <span>Carteira</span>
                  <strong>{cliente.carteira}</strong>
                  <small>{cliente.administradora}</small>
                </div>
                <div>
                  <span>Contato</span>
                  <strong>{cliente.contatoPrincipal || 'Sem contato'}</strong>
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
              </article>
            ))}
          </div>
        ) : (
          <div className="suite-empty-block">Nenhum cliente encontrado para os filtros informados.</div>
        )}
      </section>
    </>
  )
}
