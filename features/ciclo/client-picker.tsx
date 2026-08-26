'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { startCicloOnboardingAction } from '@/features/ciclo/actions'
import { CicloSubmitButton } from '@/features/ciclo/submit-button'
import type { CicloDocumentoFormData } from '@/features/ciclo/types'

type ClienteOption = CicloDocumentoFormData['clientes'][number]

function searchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function SearchableClienteField({
  clientes,
  name = 'cliente_id',
  onSelect,
  placeholder = 'Digite o cliente',
  required = false,
  selectedId,
}: {
  clientes: ClienteOption[]
  name?: string
  onSelect: (id: string) => void
  placeholder?: string
  required?: boolean
  selectedId: string
}) {
  const inputId = useId()
  const selectedCliente = useMemo(
    () => clientes.find((cliente) => cliente.id === selectedId),
    [clientes, selectedId],
  )
  const [query, setQuery] = useState(selectedCliente?.label ?? '')
  const [open, setOpen] = useState(false)
  const normalizedQuery = searchText(query)
  const visibleClientes = useMemo(() => {
    const source = normalizedQuery
      ? clientes.filter((cliente) => searchText(`${cliente.label} ${cliente.shortLabel ?? ''} ${cliente.meta ?? ''}`).includes(normalizedQuery))
      : clientes
    return source.slice(0, 10)
  }, [clientes, normalizedQuery])

  useEffect(() => {
    if (selectedCliente) setQuery(selectedCliente.label)
    if (!selectedId && !query) setQuery('')
  }, [query, selectedCliente, selectedId])

  function updateQuery(value: string) {
    setQuery(value)
    const normalizedValue = searchText(value)
    const exact = clientes.find((cliente) => (
      searchText(cliente.label) === normalizedValue ||
      searchText(cliente.shortLabel ?? '') === normalizedValue
    ))
    onSelect(exact?.id ?? '')
    setOpen(true)
  }

  function selectCliente(cliente: ClienteOption) {
    setQuery(cliente.label)
    onSelect(cliente.id)
    setOpen(false)
  }

  return (
    <div className="ciclo-client-picker">
      <label htmlFor={inputId}>Cliente</label>
      <div className="ciclo-client-picker-control">
        <input
          aria-autocomplete="list"
          aria-controls={`${inputId}-options`}
          aria-expanded={open}
          aria-label="Buscar cliente"
          autoComplete="off"
          id={inputId}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => updateQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          pattern={required && !selectedId ? '[^\\s\\S]' : undefined}
          placeholder={placeholder}
          required={required}
          title="Selecione um cliente da lista."
          type="search"
          value={query}
        />
        <input name={name} type="hidden" value={selectedId} />
        {open ? (
          <div className="ciclo-client-picker-options" id={`${inputId}-options`} role="listbox">
            {visibleClientes.length ? visibleClientes.map((cliente) => (
              <button
                aria-selected={cliente.id === selectedId}
                key={cliente.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectCliente(cliente)}
                role="option"
                type="button"
              >
                <strong>{cliente.shortLabel ?? cliente.label}</strong>
                <span>{cliente.meta ?? 'Sem carteira'}</span>
              </button>
            )) : <span>Nenhum cliente encontrado</span>}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function CicloStartOnboardingForm({ clientes }: { clientes: ClienteOption[] }) {
  const [clienteId, setClienteId] = useState('')

  return (
    <form action={startCicloOnboardingAction} className="card module-form module-form-grid">
      <input name="return_to" type="hidden" value="onboarding" />
      <div className="module-form-wide">
        <SearchableClienteField
          clientes={clientes}
          onSelect={setClienteId}
          required
          selectedId={clienteId}
        />
      </div>
      <div className="suite-empty-block module-form-wide">O onboarding cria o checklist documental e o workflow operacional padrão.</div>
      <div className="form-actions module-form-wide">
        <CicloSubmitButton>Iniciar onboarding</CicloSubmitButton>
      </div>
    </form>
  )
}
