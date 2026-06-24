'use client'

import { useActionState, useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'
import type { FlexComissaoPreviewRow, FlexComissaoPreviewState } from '@/features/flex/actions'
import type { FlexOption } from '@/features/flex/types'

type PreviewAction = (previousState: FlexComissaoPreviewState, formData: FormData) => Promise<FlexComissaoPreviewState>
type ConfirmAction = (formData: FormData) => void | Promise<void>

const initialState: FlexComissaoPreviewState = { ok: false }

type PreviewFilter = 'prontas' | 'todas' | 'sem_regra' | 'sem_colaborador' | 'sem_time'
type SortKey = 'gerar' | 'receita' | 'colaborador' | 'regra' | 'base' | 'percentual' | 'comissao' | 'observacao'
type SortDirection = 'asc' | 'desc'

const filterLabels: Record<PreviewFilter, string> = {
  prontas: 'Prontas',
  todas: 'Todas',
  sem_regra: 'Sem regra',
  sem_colaborador: 'Sem colaborador',
  sem_time: 'Sem time',
}

const diagnosticFilterMap: Record<string, PreviewFilter | null> = {
  'Receitas analisadas': 'todas',
  'Sem regra': 'sem_regra',
  'Sem colaborador': 'sem_colaborador',
  'Sem time': 'sem_time',
}

function numberInputValue(value: number) {
  return Number(value || 0).toFixed(2)
}

function percentInputValue(value: number) {
  return Number(value || 0).toFixed(4)
}

function isGeneratable(row: FlexComissaoPreviewRow) {
  return row.geravel !== false && Boolean(row.colaborador_id && row.tipo_comissao_id)
}

function rowMatchesFilter(row: FlexComissaoPreviewRow, filter: PreviewFilter) {
  if (filter === 'todas') return true
  if (filter === 'prontas') return isGeneratable(row)
  return row.diagnostico === filter
}

function sortValue(row: FlexComissaoPreviewRow, key: SortKey) {
  switch (key) {
    case 'gerar':
      return isGeneratable(row) ? 1 : 0
    case 'receita':
      return `${row.cliente} ${row.categoria}`.toLowerCase()
    case 'colaborador':
      return `${row.colaborador} ${row.escopo}`.toLowerCase()
    case 'regra':
      return `${row.tipo} ${row.escopo}`.toLowerCase()
    case 'base':
      return Number(row.valor_base || 0)
    case 'percentual':
      return Number(row.percentual || 0)
    case 'comissao':
      return Number(row.valor_comissao || 0)
    case 'observacao':
      return row.observacao.toLowerCase()
    default:
      return ''
  }
}

function compareRows(a: FlexComissaoPreviewRow, b: FlexComissaoPreviewRow, key: SortKey, direction: SortDirection) {
  const aValue = sortValue(a, key)
  const bValue = sortValue(b, key)
  const modifier = direction === 'asc' ? 1 : -1

  if (typeof aValue === 'number' && typeof bValue === 'number') {
    return (aValue - bValue) * modifier
  }

  return String(aValue).localeCompare(String(bValue), 'pt-BR', { numeric: true, sensitivity: 'base' }) * modifier
}

function SortHeader({
  active,
  children,
  direction,
  onSort,
  sortKey,
}: {
  active: boolean
  children: string
  direction: SortDirection
  onSort: (key: SortKey) => void
  sortKey: SortKey
}) {
  return (
    <button
      className={`flex-sort-header${active ? ' active' : ''}`}
      onClick={() => onSort(sortKey)}
      type="button"
    >
      <span>{children}</span>
      <small>{active ? (direction === 'asc' ? 'Asc' : 'Desc') : 'Ord'}</small>
    </button>
  )
}

function ConfirmButton() {
  const { pending } = useFormStatus()
  return (
    <button className="button" disabled={pending} type="submit">
      {pending ? 'Gerando...' : 'Confirmar geração'}
    </button>
  )
}

export function FlexComissoesPreviewForm({
  competencias,
  confirmAction,
  defaultCompetencia,
  previewAction,
}: {
  competencias: FlexOption[]
  confirmAction: ConfirmAction
  defaultCompetencia: string
  previewAction: PreviewAction
}) {
  const [state, formAction, isPending] = useActionState(previewAction, initialState)
  const [activeFilter, setActiveFilter] = useState<PreviewFilter>('prontas')
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'receita', direction: 'asc' })
  const competencia = state.competencia ?? defaultCompetencia
  const impostoPercentual = state.impostoPercentual ?? 0
  const rows = state.rows ?? []
  const diagnosticRows = state.diagnosticRows ?? []
  const allRows = useMemo(() => [...rows, ...diagnosticRows], [rows, diagnosticRows])
  const visibleRows = useMemo(() => {
    return allRows
      .filter((row) => rowMatchesFilter(row, activeFilter))
      .sort((a, b) => compareRows(a, b, sort.key, sort.direction))
  }, [activeFilter, allRows, sort])
  const rowCount = visibleRows.length
  const generatableVisibleRows = visibleRows.filter(isGeneratable)
  const filterButtons = useMemo(() => {
    const diagnostics = state.diagnostics ?? []
    const items = diagnostics
      .map((item) => ({ ...item, filter: diagnosticFilterMap[item.label] }))
      .filter((item): item is { label: string; value: string; filter: PreviewFilter } => Boolean(item.filter))

    if (rows.length && !items.some((item) => item.filter === 'prontas')) {
      items.unshift({ label: filterLabels.prontas, value: String(rows.length), filter: 'prontas' })
    }

    return items
  }, [rows.length, state.diagnostics])

  function handleSort(key: SortKey) {
    setSort((current) => {
      if (current.key !== key) return { key, direction: 'asc' }
      return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    })
  }

  return (
    <div className="card module-form flex-comissoes-preview-form">
      <form action={formAction} className="flex-comissoes-preview-controls">
        <label>
          <span>Competência</span>
          <select name="competencia" defaultValue={competencia} required>
            <option value="">Selecione uma competência</option>
            {competencia && !competencias.some((item) => item.id === competencia) ? <option value={competencia}>{competencia}</option> : null}
            {competencias.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}{item.meta ? ` - ${item.meta}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Imposto (%)</span>
          <input
            className="input"
            defaultValue={percentInputValue(impostoPercentual)}
            max="100"
            min="0"
            name="imposto_percentual"
            step="0.0001"
            type="number"
          />
        </label>
        <button className="button flex-comissoes-preview-button" disabled={isPending} type="submit">
          {isPending ? 'Calculando...' : 'Gerar prévia'}
        </button>
      </form>

      {state.error ? <p className="flex-import-error">{state.error}</p> : null}

      {state.summary?.length ? (
        <div className="flex-import-summary">
          {state.summary.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              {item.hint ? <small>{item.hint}</small> : null}
            </article>
          ))}
        </div>
      ) : null}

      {filterButtons.length ? (
        <div className="flex-comissoes-diagnostics">
          {filterButtons.map((item) => (
            <button
              className={activeFilter === item.filter ? 'active' : ''}
              key={item.label}
              onClick={() => setActiveFilter(item.filter)}
              type="button"
            >
              {item.label}: {item.value}
            </button>
          ))}
        </div>
      ) : null}

      {rowCount ? (
        <form action={confirmAction} className="flex-comissoes-preview-table">
          <input type="hidden" name="competencia" value={competencia} />
          <input type="hidden" name="imposto_percentual" value={percentInputValue(impostoPercentual)} />
          <input type="hidden" name="row_count" value={rowCount} />
          <table>
            <thead>
              <tr>
                <th><SortHeader active={sort.key === 'gerar'} direction={sort.direction} onSort={handleSort} sortKey="gerar">Gerar</SortHeader></th>
                <th><SortHeader active={sort.key === 'receita'} direction={sort.direction} onSort={handleSort} sortKey="receita">Receita</SortHeader></th>
                <th><SortHeader active={sort.key === 'colaborador'} direction={sort.direction} onSort={handleSort} sortKey="colaborador">Colaborador</SortHeader></th>
                <th><SortHeader active={sort.key === 'regra'} direction={sort.direction} onSort={handleSort} sortKey="regra">Regra</SortHeader></th>
                <th><SortHeader active={sort.key === 'base'} direction={sort.direction} onSort={handleSort} sortKey="base">Base</SortHeader></th>
                <th><SortHeader active={sort.key === 'percentual'} direction={sort.direction} onSort={handleSort} sortKey="percentual">%</SortHeader></th>
                <th><SortHeader active={sort.key === 'comissao'} direction={sort.direction} onSort={handleSort} sortKey="comissao">Comissão</SortHeader></th>
                <th><SortHeader active={sort.key === 'observacao'} direction={sort.direction} onSort={handleSort} sortKey="observacao">Observação</SortHeader></th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => {
                const geravel = isGeneratable(row)

                return (
                  <tr className={geravel ? '' : 'diagnostic'} key={row.key}>
                    <td>
                      <input name={`incluir_${index}`} type="checkbox" defaultChecked={geravel} disabled={!geravel} />
                      <input type="hidden" name={`receita_id_${index}`} value={row.receita_id} />
                      <input type="hidden" name={`colaborador_id_${index}`} value={row.colaborador_id} />
                      <input type="hidden" name={`tipo_comissao_id_${index}`} value={row.tipo_comissao_id} />
                    </td>
                    <td>
                      <strong>{row.cliente}</strong>
                      <small>{row.categoria}</small>
                    </td>
                    <td>
                      <strong>{row.colaborador}</strong>
                      <small>{row.escopo === 'time' ? 'rateio por time' : 'individual'}</small>
                    </td>
                    <td>
                      <strong>{row.tipo}</strong>
                      <small>{row.escopo}</small>
                    </td>
                    <td>
                      <input className="input" name={`valor_base_${index}`} type="number" step="0.01" min="0" defaultValue={numberInputValue(row.valor_base)} />
                    </td>
                    <td>
                      <input className="input" name={`percentual_${index}`} type="number" step="0.0001" min="0" defaultValue={percentInputValue(row.percentual)} />
                    </td>
                    <td>
                      <input className="input" name={`valor_comissao_${index}`} type="number" step="0.01" min="0" defaultValue={numberInputValue(row.valor_comissao)} />
                    </td>
                    <td>
                      <input className="input" name={`observacao_${index}`} defaultValue={row.observacao} placeholder="Opcional" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="module-inline-actions">
            {generatableVisibleRows.length ? <ConfirmButton /> : <span className="flex-preview-help">Filtro sem linhas prontas para gerar.</span>}
          </div>
        </form>
      ) : (
        state.ok || state.error ? <div className="suite-empty-block">Nenhuma linha encontrada para este filtro.</div> : null
      )}
    </div>
  )
}
