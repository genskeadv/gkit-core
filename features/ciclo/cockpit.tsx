'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { SearchableClienteField } from '@/features/ciclo/client-picker'
import type { CicloListFilters } from '@/features/ciclo/components'
import { formatDate, riskTone } from '@/features/ciclo/scoring'
import type { CicloAlerta, CicloCockpitData } from '@/features/ciclo/types'
import { CicloSubmitButton } from '@/features/ciclo/submit-button'

type CockpitPanel = 'cliente' | 'onboarding' | 'documentacao' | 'ocorrencia'
type CockpitPermissions = Record<CockpitPanel, boolean>

const panels: Array<{ description: string; href?: string; id: CockpitPanel; label: string; title: string }> = [
  { id: 'cliente', label: '1. Cliente', title: 'Criar cliente', description: 'Cadastre a entrada operacional.' },
  { id: 'onboarding', href: '/modulos/gkit-ciclo/onboarding/iniciar', label: '2. Onboarding', title: 'Iniciar onboarding', description: 'Crie checklist e workflow.' },
  { id: 'documentacao', label: '3. Documentação', title: 'Atualizar documentos', description: 'Marque checklist e datas.' },
  { id: 'ocorrencia', label: '4. Ocorrência', title: 'Criar ocorrência', description: 'Registre evento e alerta.' },
]

const tipoClienteOptions = [
  ['mensal', 'Mensal'],
  ['pontual', 'Pontual'],
  ['cobranca', 'Cobranca'],
]

const documentoStatusLabel: Record<string, string> = {
  dispensado: 'Dispensado',
  pendente: 'Pendente',
  recebido: 'Recebido',
  validado: 'Validado',
  vencido: 'Vencido',
}

const alertasPageSize = 20

function panelTitle(panel: CockpitPanel) {
  return panels.find((item) => item.id === panel)?.title ?? 'Cockpit'
}

function panelDescription(panel: CockpitPanel) {
  return panels.find((item) => item.id === panel)?.description ?? ''
}

function searchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function listDateKey(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : ''
}

function uniqueListOptions(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

function filterCockpitAlertas(alertas: CicloAlerta[], filters: CicloListFilters) {
  const search = searchText(filters.q)
  const hasDateFilter = Boolean(filters.de || filters.ate)

  return alertas.filter((alerta) => {
    if (filters.status && alerta.status !== filters.status) return false
    if (filters.categoria && alerta.tipo !== filters.categoria) return false

    if (search) {
      const haystack = searchText([
        alerta.titulo,
        alerta.cliente,
        alerta.descricao,
        alerta.tipo,
        alerta.status,
        alerta.severidade,
      ].join(' '))
      if (!haystack.includes(search)) return false
    }

    if (hasDateFilter) {
      const date = listDateKey(alerta.vencimentoEm)
      if (!date) return false
      if (filters.de && date < filters.de) return false
      if (filters.ate && date > filters.ate) return false
    }

    return true
  })
}

function cockpitAlertHref(page: number, filters: CicloListFilters) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.status) params.set('status', filters.status)
  if (filters.categoria) params.set('categoria', filters.categoria)
  if (filters.de) params.set('de', filters.de)
  if (filters.ate) params.set('ate', filters.ate)
  if (page > 1) params.set('pagina', String(page))
  const query = params.toString()
  return query ? `?${query}` : '?'
}

function CockpitAlertList({ alertas, filters }: { alertas: CicloAlerta[]; filters: CicloListFilters }) {
  const rows = filterCockpitAlertas(alertas, filters)
  const grouped = [...rows.reduce((acc, alerta) => {
    const cliente = alerta.cliente || 'Cliente não vinculado'
    acc.set(cliente, [...(acc.get(cliente) ?? []), alerta])
    return acc
  }, new Map<string, CicloAlerta[]>())]
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([cliente, items]) => ({
      cliente,
      items: items.sort((a, b) => (listDateKey(a.vencimentoEm) || '9999-12-31').localeCompare(listDateKey(b.vencimentoEm) || '9999-12-31') || a.titulo.localeCompare(b.titulo, 'pt-BR')),
    }))
  const totalPages = Math.max(1, Math.ceil(grouped.length / alertasPageSize))
  const currentPage = Math.min(Math.max(filters.pagina, 1), totalPages)
  const visibleGroups = grouped.slice((currentPage - 1) * alertasPageSize, currentPage * alertasPageSize)
  const statusOptions = uniqueListOptions(alertas.map((alerta) => alerta.status))
  const categoryOptions = uniqueListOptions(alertas.map((alerta) => alerta.tipo))
  const hasFilters = Boolean(filters.q || filters.status || filters.categoria || filters.de || filters.ate)

  return (
    <section className="card ciclo-panel">
      <form className="ciclo-list-filter-bar" method="get">
        <label className="ciclo-list-search">
          <span>Busca</span>
          <input className="input" name="q" placeholder="Cliente, alerta, descricao..." defaultValue={filters.q} />
        </label>
        <label>
          <span>Status</span>
          <select className="select" name="status" defaultValue={filters.status}>
            <option value="">Todos</option>
            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label>
          <span>Tipo</span>
          <select className="select" name="categoria" defaultValue={filters.categoria}>
            <option value="">Todos</option>
            {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label>
          <span>Vencimento de</span>
          <input className="input" name="de" type="date" defaultValue={filters.de} />
        </label>
        <label>
          <span>Vencimento ate</span>
          <input className="input" name="ate" type="date" defaultValue={filters.ate} />
        </label>
        <button className="button secondary" type="submit">Filtrar</button>
        {hasFilters ? <Link className="button secondary" href="?">Limpar</Link> : null}
      </form>

      {visibleGroups.length ? (
        <div className="ciclo-client-group-list">
          <div className="ciclo-list-pagination">
            <span>{grouped.length} cliente(s) · página {currentPage} de {totalPages}</span>
            <div>
              <Link aria-disabled={currentPage === 1} className="button secondary" href={cockpitAlertHref(currentPage - 1, filters)}>
                Anterior
              </Link>
              <Link aria-disabled={currentPage === totalPages} className="button secondary" href={cockpitAlertHref(currentPage + 1, filters)}>
                Próxima
              </Link>
            </div>
          </div>
          {visibleGroups.map((group) => (
            <details className="ciclo-client-group" key={group.cliente}>
              <summary>
                <span aria-hidden="true">+</span>
                <strong>{group.cliente}</strong>
                <small>{group.items.length} alerta(s)</small>
              </summary>
              <div className="ciclo-alert-list">
                {group.items.map((alerta) => (
                  <article key={alerta.id}>
                    <span className={`ciclo-pill ${riskTone(alerta.severidade)}`}>{alerta.severidade}</span>
                    <div className="ciclo-clientes-main">
                      <h3>{alerta.titulo}</h3>
                      <p>{alerta.descricao || alerta.tipo}</p>
                    </div>
                    <small>{formatDate(alerta.vencimentoEm)}</small>
                  </article>
                ))}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="suite-empty-block">Nenhum alerta encontrado.</div>
      )}
    </section>
  )
}

export function CicloCockpit({
  createClienteAction,
  createOcorrenciaAction,
  data,
  filters,
  initialPanel = null,
  permissions,
  startOnboardingAction,
  updateDocumentacaoAction,
}: {
  createClienteAction: (formData: FormData) => Promise<void>
  createOcorrenciaAction: (formData: FormData) => Promise<void>
  data: CicloCockpitData
  filters: CicloListFilters
  initialPanel?: CockpitPanel | null
  permissions: CockpitPermissions
  startOnboardingAction: (formData: FormData) => Promise<void>
  updateDocumentacaoAction: (formData: FormData) => Promise<void>
}) {
  const activePanel = initialPanel
  const availablePanels = panels.filter((panel) => permissions[panel.id])
  const [onboardingClienteId, setOnboardingClienteId] = useState('')
  const [documentacaoClienteId, setDocumentacaoClienteId] = useState('')
  const [ocorrenciaClienteId, setOcorrenciaClienteId] = useState('')
  const documentos = useMemo(
    () => data.documentos.filter((documento) => documento.clienteId === documentacaoClienteId),
    [data.documentos, documentacaoClienteId],
  )

  return (
    <>
      <section className="suite-panel ciclo-command-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Ordem do fluxo</h2>
            <p>Escolha uma etapa para abrir o formulario; por padrão, o cockpit mostra a fila de alertas por cliente.</p>
          </div>
        </div>

        <div className="ciclo-quick-grid ciclo-cockpit-flow">
          {availablePanels.map((panel) => (
            <Link
              aria-current={activePanel === panel.id ? 'page' : undefined}
              className={activePanel === panel.id ? 'ciclo-quick-card active' : 'ciclo-quick-card'}
              href={panel.href ?? `/modulos/gkit-ciclo?panel=${panel.id}`}
              key={panel.id}
            >
              <span>{panel.label}</span>
              <h3>{panel.title}</h3>
              <p>{panel.description}</p>
            </Link>
          ))}
          {!availablePanels.length ? <div className="suite-empty-block">Seu perfil tem acesso de consulta ao Ciclo.</div> : null}
        </div>
      </section>

      <section className="suite-panel ciclo-cockpit-form-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>{activePanel ? panelTitle(activePanel) : 'Alertas recentes'}</h2>
            <p>{activePanel ? panelDescription(activePanel) : 'Fila operacional agrupada por cliente.'}</p>
          </div>
        </div>

        {!activePanel ? <CockpitAlertList alertas={data.alertas} filters={filters} /> : null}

        {activePanel === 'cliente' ? (
          <form action={createClienteAction} className="card module-form module-form-grid">
            <input name="return_to" type="hidden" value="cockpit" />
            <label>
              <span>Nome operacional</span>
              <input name="nome" required />
            </label>
            <label>
              <span>Documento</span>
              <input name="documento" />
            </label>
            <label>
              <span>Carteira</span>
              <select name="carteira_id" defaultValue="">
                <option value="">Sem carteira</option>
                {data.clienteFormData.carteiras.map((carteira) => (
                  <option key={carteira.id} value={carteira.id}>{carteira.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Administradora</span>
              <select name="administradora_id" defaultValue="">
                <option value="">Sem administradora</option>
                {data.clienteFormData.administradoras.map((administradora) => (
                  <option key={administradora.id} value={administradora.id}>{administradora.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Tipo de cliente</span>
              <select name="tipo_cliente" defaultValue="mensal">
                {tipoClienteOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Risco</span>
              <select name="risco_atual" defaultValue="medio">
                <option value="baixo">Baixo</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto</option>
                <option value="critico">Critico</option>
              </select>
            </label>
            <label>
              <span>E-mail</span>
              <input name="email" type="email" />
            </label>
            <label>
              <span>Telefone</span>
              <input name="telefone" />
            </label>
            <input name="status_operacional" type="hidden" value="novo" />
            <input name="score_atual" type="hidden" value="75" />
            <input name="temperatura" type="hidden" value="neutro" />
            <div className="module-form-wide">
              <label>
                <span>Observações</span>
                <textarea name="observacoes" />
              </label>
            </div>
            <div className="form-actions module-form-wide">
              <CicloSubmitButton>Salvar cliente</CicloSubmitButton>
            </div>
          </form>
        ) : null}

        {activePanel === 'onboarding' ? (
          <form action={startOnboardingAction} className="card module-form module-form-grid">
            <input name="return_to" type="hidden" value="cockpit" />
            <div className="module-form-wide">
              <SearchableClienteField
                clientes={data.documentoFormData.clientes}
                onSelect={setOnboardingClienteId}
                required
                selectedId={onboardingClienteId}
              />
            </div>
            <div className="suite-empty-block module-form-wide">O onboarding cria o checklist documental e o workflow operacional padrão.</div>
            <div className="form-actions module-form-wide">
              <CicloSubmitButton>Iniciar onboarding</CicloSubmitButton>
            </div>
          </form>
        ) : null}

        {activePanel === 'documentacao' ? (
          <form action={updateDocumentacaoAction} className="card module-form module-form-grid">
            <div className="module-form-wide">
              <SearchableClienteField
                clientes={data.documentoFormData.clientes}
                onSelect={setDocumentacaoClienteId}
                required
                selectedId={documentacaoClienteId}
              />
            </div>

            <div className="module-form-wide ciclo-document-checklist">
              {documentacaoClienteId ? documentos.map((documento) => (
                <article key={documento.tipoDocumento}>
                  <div>
                    <strong>{documento.titulo}</strong>
                    <span>{documentoStatusLabel[documento.status] ?? documento.status}</span>
                  </div>
                  <label className="checkbox-row">
                    <input name={`aplicavel_${documento.tipoDocumento}`} type="checkbox" defaultChecked={documento.status !== 'dispensado'} />
                    <span>Aplicavel</span>
                  </label>
                  <label className="checkbox-row">
                    <input name={`validado_${documento.tipoDocumento}`} type="checkbox" defaultChecked={documento.validado || documento.status === 'validado'} />
                    <span>Validado</span>
                  </label>
                  <label>
                    <span>Data</span>
                    <input name={`data_renovacao_${documento.tipoDocumento}`} type="date" defaultValue={documento.dataRenovacao ?? ''} />
                  </label>
                </article>
              )) : <div className="suite-empty-block">Selecione um cliente para carregar os documentos padrão.</div>}
            </div>

            <div className="module-form-wide">
              <label>
                <span>Descrição da alteração</span>
                <textarea name="descricao_alteracao" required />
              </label>
            </div>
            <div className="form-actions module-form-wide">
              <CicloSubmitButton>Atualizar documentação</CicloSubmitButton>
            </div>
          </form>
        ) : null}

        {activePanel === 'ocorrencia' ? (
          <form action={createOcorrenciaAction} className="card module-form module-form-grid">
            <input name="return_to" type="hidden" value="cockpit" />
            <div className="module-form-wide">
              <SearchableClienteField
                clientes={data.documentoFormData.clientes}
                onSelect={setOcorrenciaClienteId}
                placeholder="Digite o cliente ou deixe sem vínculo"
                selectedId={ocorrenciaClienteId}
              />
            </div>
            <label>
              <span>Tipo</span>
              <select name="tipo" defaultValue="operacional">
                <option value="operacional">Operacional</option>
                <option value="documental">Documental</option>
                <option value="financeiro">Financeiro</option>
                <option value="relacionamento">Relacionamento</option>
              </select>
            </label>
            <label>
              <span>Impacto</span>
              <select name="impacto" defaultValue="neutro">
                <option value="baixo">Baixo</option>
                <option value="neutro">Neutro</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto</option>
                <option value="critico">Critico</option>
              </select>
            </label>
            <label>
              <span>Data</span>
              <input name="data_ocorrencia" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </label>
            <label>
              <span>Prazo</span>
              <input name="prazo" type="date" />
            </label>
            <label>
              <span>Responsável</span>
              <input name="responsavel" />
            </label>
            <label>
              <span>Peso</span>
              <input name="peso" type="number" min={1} max={10} defaultValue={1} />
            </label>
            <label className="module-form-wide">
              <span>Título</span>
              <input name="titulo" required />
            </label>
            <div className="module-form-wide">
              <label>
                <span>Descrição</span>
                <textarea name="descricao" />
              </label>
            </div>
            <input name="status" type="hidden" value="aberta" />
            <input name="impacto_score" type="hidden" value="0" />
            <label className="checkbox-row module-form-wide">
              <input name="criar_alerta" type="checkbox" value="on" defaultChecked />
              <span>Criar alerta para acompanhamento</span>
            </label>
            <div className="form-actions module-form-wide">
              <CicloSubmitButton>Salvar ocorrência</CicloSubmitButton>
            </div>
          </form>
        ) : null}
      </section>
    </>
  )
}
