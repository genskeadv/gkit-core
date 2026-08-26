'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { startCicloOnboardingAction } from '@/features/ciclo/actions'
import { cicloOnboardingDocumentos } from '@/features/ciclo/onboarding-defaults'
import { CicloSubmitButton } from '@/features/ciclo/submit-button'
import type { CicloDocumentoFormData, CicloOnboardingWorkflowAtividade } from '@/features/ciclo/types'

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

export function CicloStartOnboardingForm({
  clientes,
  workflow,
}: {
  clientes: ClienteOption[]
  workflow: CicloOnboardingWorkflowAtividade[]
}) {
  const [clienteId, setClienteId] = useState('')
  const selectedCliente = clientes.find((cliente) => cliente.id === clienteId)
  const activeWorkflow = workflow.filter((atividade) => atividade.ativo)

  return (
    <form action={startCicloOnboardingAction} className="ciclo-onboarding-start-form">
      <input name="return_to" type="hidden" value="onboarding" />
      <div className="ciclo-onboarding-start-main">
        <SearchableClienteField
          clientes={clientes}
          onSelect={setClienteId}
          required
          selectedId={clienteId}
        />
        <div className="ciclo-onboarding-start-selected">
          <span>{selectedCliente ? 'Cliente selecionado' : 'Aguardando cliente'}</span>
          <strong>{selectedCliente?.shortLabel ?? 'Selecione para iniciar'}</strong>
          <small>{selectedCliente?.meta ?? 'Checklist e workflow serão preparados em conjunto.'}</small>
        </div>
      </div>
      <div className="ciclo-onboarding-start-groups">
        <details className="ciclo-onboarding-start-group" open>
          <summary>
            <span aria-hidden="true">+</span>
            <div>
              <strong>Checklist documental</strong>
              <small>{cicloOnboardingDocumentos.length} documento(s) obrigatórios</small>
            </div>
          </summary>
          <div className="ciclo-onboarding-start-list">
            {cicloOnboardingDocumentos.map((documento, index) => (
              <article key={documento.tipo_documento}>
                <div>
                  <strong>{documento.titulo}</strong>
                  <small>Item {index + 1} do checklist</small>
                </div>
                <span>Obrigatório</span>
              </article>
            ))}
          </div>
        </details>
        <details className="ciclo-onboarding-start-group" open>
          <summary>
            <span aria-hidden="true">+</span>
            <div>
              <strong>Workflow operacional</strong>
              <small>{activeWorkflow.length || 0} etapa(s) padrão</small>
            </div>
          </summary>
          <div className="ciclo-onboarding-start-list">
            {activeWorkflow.length ? activeWorkflow.map((atividade) => (
              <article key={atividade.id}>
                <div>
                  <strong>{atividade.ordem}. {atividade.descricao}</strong>
                  <small>{atividade.responsavel_padrao || 'Responsável a definir'}</small>
                </div>
                <span>{atividade.obrigatoria ? 'Obrigatória' : 'Opcional'}</span>
              </article>
            )) : (
              <div className="ciclo-onboarding-start-empty">Workflow padrão ainda não configurado.</div>
            )}
          </div>
        </details>
      </div>
      <div className="form-actions ciclo-onboarding-start-actions">
        <CicloSubmitButton>Iniciar onboarding</CicloSubmitButton>
      </div>
    </form>
  )
}
