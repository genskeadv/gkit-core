'use client'

import Link from 'next/link'
import { useState } from 'react'
import { GkitAteSubmitButton } from '@/features/gkit-ate/submit-button'
import type { GkitAteFormData, GkitAteListRow } from '@/features/gkit-ate/types'

type CockpitPanel = 'atendimento' | 'tarefa' | 'tipo-atendimento' | 'tipo-tarefa'
type CockpitAction = (formData: FormData) => Promise<void>
const atendimentoPageSize = 10

const panels: Array<{
  id: CockpitPanel
  label: string
  title: string
  description: string
}> = [
  {
    id: 'atendimento',
    label: '1. Atendimento',
    title: 'Criar atendimento',
    description: 'Registre atendimento e tarefa inicial.',
  },
  {
    id: 'tarefa',
    label: '2. Tarefa',
    title: 'Adicionar tarefa',
    description: 'Inclua a próxima pendência.',
  },
  {
    id: 'tipo-atendimento',
    label: '3. Tipo',
    title: 'Tipo de atendimento',
    description: 'Cadastre a classificação.',
  },
  {
    id: 'tipo-tarefa',
    label: '4. Tarefa padrão',
    title: 'Criar tarefa padrão',
    description: 'Cadastre o modelo do fluxo.',
  },
]

function panelTitle(panel: CockpitPanel) {
  return panels.find((item) => item.id === panel)?.title ?? 'Cockpit'
}

function panelDescription(panel: CockpitPanel) {
  return panels.find((item) => item.id === panel)?.description ?? ''
}

function normalizeFilter(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function dateKey(value: string | null | undefined) {
  return value?.slice(0, 10) ?? ''
}

function uniqueRowOptions(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

function OpenAtendimentoRow({ row }: { row: GkitAteListRow }) {
  const content = (
    <>
      <div>
        <h3>{row.title}</h3>
        <p>{row.subtitle}</p>
      </div>
      <span className={`suite-pill ${row.tone ?? 'primary'}`}>{row.status}</span>
      <strong>{row.value}</strong>
      <small>{row.meta}</small>
    </>
  )

  return row.detailHref ? (
    <Link className="suite-row-link" href={row.detailHref} role="listitem">
      {content}
    </Link>
  ) : (
    <article role="listitem">{content}</article>
  )
}

function OpenAtendimentoList({ rows }: { rows: GkitAteListRow[] }) {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ ate: '', de: '', q: '', responsavel: '', tipo: '' })
  const typeOptions = uniqueRowOptions(rows.map((row) => row.filterTipo))
  const responsavelOptions = uniqueRowOptions(rows.map((row) => row.filterResponsavel))
  const filteredRows = rows.filter((row) => {
    const search = normalizeFilter(filters.q)
    const rowDate = dateKey(row.filterDate)
    const matchesSearch = !search || normalizeFilter(row.filterText ?? `${row.title} ${row.subtitle} ${row.meta} ${row.status}`).includes(search)
    const matchesTipo = !filters.tipo || row.filterTipo === filters.tipo
    const matchesResponsavel = !filters.responsavel || row.filterResponsavel === filters.responsavel
    const matchesStart = !filters.de || (rowDate && rowDate >= filters.de)
    const matchesEnd = !filters.ate || (rowDate && rowDate <= filters.ate)

    return matchesSearch && matchesTipo && matchesResponsavel && matchesStart && matchesEnd
  })
  const hasFilters = Boolean(filters.q || filters.tipo || filters.responsavel || filters.de || filters.ate)
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / atendimentoPageSize))
  const safePage = Math.min(page, totalPages)
  const visibleRows = filteredRows.slice((safePage - 1) * atendimentoPageSize, safePage * atendimentoPageSize)

  function updateFilter(name: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }))
    setPage(1)
  }

  function clearFilters() {
    setFilters({ ate: '', de: '', q: '', responsavel: '', tipo: '' })
    setPage(1)
  }

  if (!rows.length) {
    return <div className="suite-empty-block success">Nenhum atendimento aberto no momento.</div>
  }

  const pagination = totalPages > 1 ? (
    <div className="gkit-ate-group-pagination">
      <span>Página {safePage} de {totalPages}</span>
      <div>
        <button className="button secondary" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">
          Anterior
        </button>
        <button className="button secondary" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">
          Próxima
        </button>
      </div>
    </div>
  ) : null

  return (
    <div className="gkit-ate-grouped-list">
      <form className="ciclo-list-filter-bar gkit-ate-open-filter-bar" onSubmit={(event) => event.preventDefault()}>
        <label className="ciclo-list-search">
          <span>Busca</span>
          <input
            className="input"
            name="q"
            onChange={(event) => updateFilter('q', event.target.value)}
            placeholder="Cliente, atendimento, código..."
            value={filters.q}
          />
        </label>
        <label>
          <span>Tipo</span>
          <select className="select" name="tipo" onChange={(event) => updateFilter('tipo', event.target.value)} value={filters.tipo}>
            <option value="">Todos</option>
            {typeOptions.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
          </select>
        </label>
        <label>
          <span>Responsável</span>
          <select className="select" name="responsavel" onChange={(event) => updateFilter('responsavel', event.target.value)} value={filters.responsavel}>
            <option value="">Todos</option>
            {responsavelOptions.map((responsavel) => <option key={responsavel} value={responsavel}>{responsavel}</option>)}
          </select>
        </label>
        <label>
          <span>Criação de</span>
          <input className="input" name="de" onChange={(event) => updateFilter('de', event.target.value)} type="date" value={filters.de} />
        </label>
        <label>
          <span>Criação até</span>
          <input className="input" name="ate" onChange={(event) => updateFilter('ate', event.target.value)} type="date" value={filters.ate} />
        </label>
        <button className="button secondary" type="submit">Filtrar</button>
        {hasFilters ? <button className="button secondary" onClick={clearFilters} type="button">Limpar</button> : null}
        <span className="ciclo-list-count">{filteredRows.length} de {rows.length}</span>
      </form>
      {pagination}
      {visibleRows.length ? (
        <div className="suite-table-list compact gkit-ate-table-list" role="list">
          {visibleRows.map((row) => <OpenAtendimentoRow key={row.id} row={row} />)}
        </div>
      ) : (
        <div className="suite-empty-block">Nenhum atendimento aberto encontrado com os filtros atuais.</div>
      )}
      {pagination}
    </div>
  )
}

export function GkitAteCockpit({
  createAtendimentoAction,
  createAtendimentoTipoAction,
  createTarefaAction,
  createTarefaTipoAction,
  formData,
  initialPanel = null,
  atendimentosAbertos,
}: {
  createAtendimentoAction: CockpitAction
  createAtendimentoTipoAction: CockpitAction
  createTarefaAction: CockpitAction
  createTarefaTipoAction: CockpitAction
  formData: GkitAteFormData
  initialPanel?: CockpitPanel | null
  atendimentosAbertos: GkitAteListRow[]
}) {
  const activePanel = initialPanel

  return (
    <>
      <section className="suite-panel gkit-ate-command-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Ordem do fluxo</h2>
            <p>Escolha uma etapa para abrir o formulario; por padrão, o cockpit mostra os atendimentos abertos.</p>
          </div>
        </div>

        <div className="gkit-ate-quick-grid gkit-ate-cockpit-flow">
          {panels.map((panel) => (
            <Link
              aria-current={activePanel === panel.id ? 'page' : undefined}
              className={activePanel === panel.id ? 'gkit-ate-quick-card active' : 'gkit-ate-quick-card'}
              href={`/modulos/gkit-ate?panel=${panel.id}`}
              key={panel.id}
            >
              <span>{panel.label}</span>
              <h3>{panel.title}</h3>
              <p>{panel.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="suite-panel gkit-ate-cockpit-form-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>{activePanel ? panelTitle(activePanel) : 'Atendimentos abertos mais antigos'}</h2>
            <p>{activePanel ? panelDescription(activePanel) : `${atendimentosAbertos.length} atendimento(s) em aberto`}</p>
          </div>
        </div>

        {!activePanel ? <OpenAtendimentoList rows={atendimentosAbertos} /> : null}

        {activePanel === 'atendimento' ? (
          <form action={createAtendimentoAction} className="card module-form module-form-grid">
            <label>
              <span>Título</span>
              <input name="titulo" required />
            </label>
            <label>
              <span>Cliente</span>
              <input name="cliente_nome" required />
            </label>
            <label>
              <span>Tipo de atendimento</span>
              <select name="atendimento_tipo_id" defaultValue="">
                <option value="">Selecione</option>
                {formData.atendimentoTipos.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>{tipo.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Classificação avulsa</span>
              <input name="tipo_atendimento" placeholder="Opcional" />
            </label>
            <label>
              <span>Responsável</span>
              <input name="responsavel" />
            </label>
            <label>
              <span>Prazo do atendimento</span>
              <input name="prazo_finalizacao" type="date" />
            </label>
            <div className="module-form-wide">
              <label>
                <span>Objeto</span>
                <textarea name="objeto" />
              </label>
            </div>
            <label>
              <span>Tipo da tarefa inicial</span>
              <select name="tarefa_tipo_id" defaultValue="">
                <option value="">Selecione</option>
                {formData.tarefaTipos.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>{tipo.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Nova tarefa padrão</span>
              <input name="tipo_tarefa" placeholder="Opcional" />
            </label>
            <label className="module-form-wide">
              <span>Tarefa inicial</span>
              <input name="descricao_tarefa" required />
            </label>
            <label>
              <span>Responsável da tarefa</span>
              <input name="responsavel_tarefa" />
            </label>
            <label>
              <span>Prazo da tarefa</span>
              <input name="data_prevista" type="date" />
            </label>
            <div className="module-form-wide">
              <label>
                <span>Observações</span>
                <textarea name="observacoes" />
              </label>
            </div>
            <div className="form-actions module-form-wide">
              <GkitAteSubmitButton>Salvar atendimento</GkitAteSubmitButton>
            </div>
          </form>
        ) : null}

        {activePanel === 'tarefa' ? (
          <form action={createTarefaAction} className="card module-form module-form-grid">
            <input name="return_to" type="hidden" value="cockpit" />
            <div className="module-form-wide">
              <label>
                <span>Atendimento</span>
                <select name="atendimento_id" required defaultValue="">
                  <option value="">Selecione</option>
                  {formData.atendimentos.map((atendimento) => (
                    <option key={atendimento.id} value={atendimento.id}>{atendimento.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span>Tipo de tarefa</span>
              <select name="tarefa_tipo_id" defaultValue="">
                <option value="">Selecione</option>
                {formData.tarefaTipos.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>{tipo.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Nova tarefa padrão</span>
              <input name="tipo_tarefa" placeholder="Opcional" />
            </label>
            <label className="module-form-wide">
              <span>Descrição</span>
              <input name="descricao" required />
            </label>
            <label>
              <span>Responsável</span>
              <input name="responsavel" />
            </label>
            <label>
              <span>Prazo</span>
              <input name="data_prevista" type="date" />
            </label>
            <div className="form-actions module-form-wide">
              <GkitAteSubmitButton>Adicionar tarefa</GkitAteSubmitButton>
            </div>
          </form>
        ) : null}

        {activePanel === 'tipo-atendimento' ? (
          <form action={createAtendimentoTipoAction} className="card module-form module-form-grid">
            <label>
              <span>Nome</span>
              <input name="nome" required />
            </label>
            <label>
              <span>Tarefa padrão</span>
              <select name="tarefa_tipo_id" defaultValue="">
                <option value="">Sem tarefa padrão</option>
                {formData.tarefaTipos.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>{tipo.label}</option>
                ))}
              </select>
            </label>
            <div className="form-actions module-form-wide">
              <GkitAteSubmitButton>Salvar tipo</GkitAteSubmitButton>
            </div>
          </form>
        ) : null}

        {activePanel === 'tipo-tarefa' ? (
          <form action={createTarefaTipoAction} className="card module-form module-form-grid">
            <label>
              <span>Nome</span>
              <input name="nome" required />
            </label>
            <div className="module-form-wide">
              <label>
                <span>Descrição padrão</span>
                <textarea name="descricao_padrao" />
              </label>
            </div>
            <div className="form-actions module-form-wide">
              <GkitAteSubmitButton>Salvar tarefa</GkitAteSubmitButton>
            </div>
          </form>
        ) : null}
      </section>
    </>
  )
}
