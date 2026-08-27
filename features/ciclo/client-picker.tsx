'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { completeCicloOnboardingAction, startCicloOnboardingAction, updateCicloOnboardingMonitorAction } from '@/features/ciclo/actions'
import { cicloOnboardingDocumentos, cicloOnboardingEtapas, cicloOnboardingWorkflowEtapa, type CicloOnboardingEtapaId } from '@/features/ciclo/onboarding-defaults'
import { CicloSubmitButton } from '@/features/ciclo/submit-button'
import type { CicloDocumentoFormData, CicloOnboardingDetail, CicloOnboardingWorkflowAtividade } from '@/features/ciclo/types'

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
  initialClienteId = '',
  lockSelected = false,
  workflow,
}: {
  clientes: ClienteOption[]
  initialClienteId?: string
  lockSelected?: boolean
  workflow: CicloOnboardingWorkflowAtividade[]
}) {
  const [clienteId, setClienteId] = useState(initialClienteId)
  const selectedCliente = clientes.find((cliente) => cliente.id === clienteId)
  const activeWorkflow = workflow.filter((atividade) => atividade.ativo)
  const tarefasPorEtapa = cicloOnboardingEtapas.map((etapa) => {
    const workflowTasks = activeWorkflow
      .filter((atividade) => cicloOnboardingWorkflowEtapa(atividade.descricao, atividade.ordem) === etapa.id)
      .map((atividade) => ({
        id: `workflow_${atividade.id}`,
        meta: atividade.responsavel_padrao || 'Responsável a definir',
        tag: atividade.obrigatoria ? 'Obrigatória' : 'Opcional',
        title: atividade.descricao,
      }))
    const documentTasks = etapa.id === 'documentacao'
      ? cicloOnboardingDocumentos.map((documento) => ({
        id: `documento_${documento.tipo_documento}`,
        meta: 'Documento obrigatório',
        tag: 'Checklist',
        title: documento.titulo,
      }))
      : []

    return {
      ...etapa,
      tarefas: [...workflowTasks, ...documentTasks],
    }
  })
  const totalTarefas = tarefasPorEtapa.reduce((total, etapa) => total + etapa.tarefas.length, 0)

  return (
    <form action={startCicloOnboardingAction} className="ciclo-onboarding-start-form">
      <input name="return_to" type="hidden" value="onboarding" />
      <div className="ciclo-onboarding-start-main">
        {lockSelected && selectedCliente ? (
          <input name="cliente_id" type="hidden" value={selectedCliente.id} />
        ) : (
          <SearchableClienteField
            clientes={clientes}
            onSelect={setClienteId}
            required
            selectedId={clienteId}
          />
        )}
        <div className="ciclo-onboarding-start-selected">
          <span>{selectedCliente ? 'Cliente selecionado' : 'Aguardando cliente'}</span>
          <strong>{selectedCliente?.shortLabel ?? 'Selecione para iniciar'}</strong>
          <small>{selectedCliente?.meta ?? `${totalTarefas} tarefa(s) serão preparadas no checklist.`}</small>
        </div>
      </div>
      <div className="ciclo-onboarding-stage-list">
        {tarefasPorEtapa.map((etapa, etapaIndex) => (
          <fieldset className="ciclo-onboarding-stage" key={etapa.id}>
            <legend>
              <span>{etapaIndex + 1}</span>
              <div>
                <strong>{etapa.titulo}</strong>
                <small>{etapa.descricao}</small>
              </div>
              <em>{etapa.tarefas.length} tarefa(s)</em>
            </legend>
            {etapa.tarefas.length ? (
              <div className="ciclo-onboarding-task-list">
                {etapa.tarefas.map((tarefa) => (
                  <label className="ciclo-onboarding-task" key={tarefa.id}>
                    <input name={`check_${etapa.id as CicloOnboardingEtapaId}[]`} type="checkbox" value={tarefa.id} />
                    <span>
                      <strong>{tarefa.title}</strong>
                      <small>{tarefa.meta}</small>
                    </span>
                    <em>{tarefa.tag}</em>
                  </label>
                ))}
              </div>
            ) : (
              <div className="ciclo-onboarding-start-empty">Nenhuma tarefa configurada para esta etapa.</div>
            )}
          </fieldset>
        ))}
      </div>
      <div className="form-actions ciclo-onboarding-start-actions">
        <CicloSubmitButton>Iniciar onboarding</CicloSubmitButton>
      </div>
    </form>
  )
}

function tarefaStatusLabel(status: string) {
  if (status === 'validado' || status === 'concluido') return 'Concluído'
  if (status === 'dispensado') return 'Dispensado'
  if (status === 'recebido' || status === 'em_andamento') return 'Em andamento'
  if (status === 'vencido') return 'Vencido'
  return 'Pendente'
}

export function CicloOnboardingFlowMonitor({ detail }: { detail: CicloOnboardingDetail }) {
  const { atividades, cliente, documentos, progresso, workflow } = detail
  const canConcluir = progresso.total > 0 && workflow.total > 0 && progresso.pendentes === 0 && workflow.pendentes === 0
  const tarefasPorEtapa = cicloOnboardingEtapas.map((etapa) => {
    const workflowTasks = atividades
      .filter((atividade) => cicloOnboardingWorkflowEtapa(atividade.descricao, atividade.ordem) === etapa.id)
      .map((atividade) => ({
        checked: atividade.status === 'concluido',
        id: atividade.id,
        inputName: 'atividades_concluidas',
        kindName: 'atividade_id',
        meta: atividade.responsavel || 'Responsável a definir',
        status: tarefaStatusLabel(atividade.status),
        title: atividade.descricao,
      }))
    const documentTasks = etapa.id === 'documentacao'
      ? documentos.map((documento) => ({
        checked: documento.validado || documento.status === 'validado',
        id: documento.id,
        inputName: 'documentos_concluidos',
        kindName: 'documento_id',
        meta: documento.tipo_documento,
        status: tarefaStatusLabel(documento.status),
        title: documento.titulo ?? documento.tipo_documento,
      }))
      : []

    return {
      ...etapa,
      tarefas: [...workflowTasks, ...documentTasks],
    }
  })
  const totalTarefas = tarefasPorEtapa.reduce((total, etapa) => total + etapa.tarefas.length, 0)
  const concluidas = tarefasPorEtapa.reduce((total, etapa) => total + etapa.tarefas.filter((tarefa) => tarefa.checked).length, 0)

  return (
    <div className="ciclo-onboarding-monitor">
      <section className="ciclo-onboarding-monitor-head">
        <div>
          <span>Cliente</span>
          <strong>{cliente.nome}</strong>
          <small>{cliente.documento || 'sem documento'} · {cliente.status_operacional}</small>
        </div>
        <div>
          <span>Progresso</span>
          <strong>{totalTarefas ? Math.round((concluidas / totalTarefas) * 100) : 0}%</strong>
          <small>{concluidas}/{totalTarefas} tarefa(s)</small>
        </div>
        <div>
          <span>Documentos</span>
          <strong>{progresso.percentual}%</strong>
          <small>{progresso.concluidos}/{progresso.total} validado(s)</small>
        </div>
        <div>
          <span>Workflow</span>
          <strong>{workflow.percentual}%</strong>
          <small>{workflow.concluidas}/{workflow.total} concluída(s)</small>
        </div>
      </section>

      <form action={updateCicloOnboardingMonitorAction} className="ciclo-onboarding-monitor-form">
        <input name="cliente_id" type="hidden" value={cliente.id} />
        <div className="ciclo-onboarding-stage-list">
          {tarefasPorEtapa.map((etapa, etapaIndex) => (
            <fieldset className="ciclo-onboarding-stage" key={etapa.id}>
              <legend>
                <span>{etapaIndex + 1}</span>
                <div>
                  <strong>{etapa.titulo}</strong>
                  <small>{etapa.descricao}</small>
                </div>
                <em>{etapa.tarefas.length} tarefa(s)</em>
              </legend>
              {etapa.tarefas.length ? (
                <div className="ciclo-onboarding-task-list">
                  {etapa.tarefas.map((tarefa) => (
                    <label className="ciclo-onboarding-task" key={`${tarefa.kindName}_${tarefa.id}`}>
                      <input name={tarefa.kindName} type="hidden" value={tarefa.id} />
                      <input defaultChecked={tarefa.checked} name={tarefa.inputName} type="checkbox" value={tarefa.id} />
                      <span>
                        <strong>{tarefa.title}</strong>
                        <small>{tarefa.meta}</small>
                      </span>
                      <em>{tarefa.status}</em>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="ciclo-onboarding-start-empty">Nenhuma tarefa configurada para esta etapa.</div>
              )}
            </fieldset>
          ))}
        </div>
        <div className="form-actions ciclo-onboarding-start-actions">
          <CicloSubmitButton>Salvar checklist</CicloSubmitButton>
        </div>
      </form>

      <form action={completeCicloOnboardingAction} className="ciclo-onboarding-complete-form">
        <input name="cliente_id" type="hidden" value={cliente.id} />
        <button className="button" disabled={!canConcluir} type="submit">Concluir onboarding</button>
      </form>
    </div>
  )
}
