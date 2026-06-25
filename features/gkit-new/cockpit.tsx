'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { GkitNewSubmitButton } from '@/features/gkit-new/submit-button'
import type { GkitNewFormData, GkitNewListRow, GkitNewOportunidade } from '@/features/gkit-new/types'

type CockpitPanel = 'contato' | 'cliente' | 'proposta' | 'acompanhamento'
type CockpitAction = (formData: FormData) => Promise<void>

const panels: Array<{
  id: CockpitPanel
  label: string
  title: string
  description: string
}> = [
  {
    id: 'contato',
    label: '1. Contato',
    title: 'Novo contato',
    description: 'Cadastre a pessoa de relacionamento.',
  },
  {
    id: 'cliente',
    label: '2. Cliente',
    title: 'Novo cliente',
    description: 'Inclua o cliente ou prospecto.',
  },
  {
    id: 'proposta',
    label: '3. Proposta',
    title: 'Nova proposta',
    description: 'Selecione contato, cliente, tipo e valor.',
  },
  {
    id: 'acompanhamento',
    label: '4. Acompanhamento',
    title: 'Acompanhar proposta',
    description: 'Atualize o status da proposta.',
  },
]

const statusOptions = [
  { label: 'Enviada', value: 'proposta_enviada' },
  { label: 'Em negociacao', value: 'em_negociacao' },
  { label: 'Aprovada', value: 'aprovada' },
  { label: 'Rejeitada', value: 'rejeitada' },
  { label: 'Cancelada', value: 'cancelada' },
]

function panelTitle(panel: CockpitPanel) {
  return panels.find((item) => item.id === panel)?.title ?? 'Cockpit'
}

function panelDescription(panel: CockpitPanel) {
  return panels.find((item) => item.id === panel)?.description ?? ''
}

function orderedOportunidades(oportunidades: GkitNewOportunidade[]) {
  return [...oportunidades].sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'))
}

function PendingTaskList({ rows }: { rows: GkitNewListRow[] }) {
  if (!rows.length) {
    return <div className="suite-empty-block success">Nenhuma tarefa pendente para este contexto.</div>
  }

  return (
    <div className="suite-table-list compact gkit-new-table-list" role="list">
      {rows.map((row) => {
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
          <Link className="suite-row-link" href={row.detailHref} key={row.id} role="listitem">
            {content}
          </Link>
        ) : (
          <article key={row.id} role="listitem">{content}</article>
        )
      })}
    </div>
  )
}

export function GkitNewCockpit({
  createClienteAction,
  createContatoAction,
  createPropostaAction,
  formData,
  initialPanel = null,
  oportunidades,
  tarefasPendentes,
  tarefasPendentesScope,
  updateAcompanhamentoAction,
}: {
  createClienteAction: CockpitAction
  createContatoAction: CockpitAction
  createPropostaAction: CockpitAction
  formData: GkitNewFormData
  initialPanel?: CockpitPanel | null
  oportunidades: GkitNewOportunidade[]
  tarefasPendentes: GkitNewListRow[]
  tarefasPendentesScope: string
  updateAcompanhamentoAction: CockpitAction
}) {
  const activePanel = initialPanel
  const [status, setStatus] = useState('proposta_enviada')
  const propostaOptions = useMemo(() => orderedOportunidades(oportunidades), [oportunidades])
  const requiresDescription = status !== 'proposta_enviada'

  return (
    <>
      <section className="suite-panel gkit-new-command-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Ordem do fluxo</h2>
            <p>Escolha uma etapa para abrir o formulario; por padrao, o cockpit mostra a fila pendente.</p>
          </div>
        </div>

        <div className="gkit-new-quick-grid gkit-new-cockpit-flow">
          {panels.map((panel) => (
            <Link
              aria-current={activePanel === panel.id ? 'page' : undefined}
              className={activePanel === panel.id ? 'gkit-new-quick-card active' : 'gkit-new-quick-card'}
              href={`/modulos/gkit-new?panel=${panel.id}`}
              key={panel.id}
            >
              <span>{panel.label}</span>
              <h3>{panel.title}</h3>
              <p>{panel.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="suite-panel gkit-new-cockpit-form-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>{activePanel ? panelTitle(activePanel) : 'Tarefas pendentes'}</h2>
            <p>{activePanel ? panelDescription(activePanel) : tarefasPendentesScope}</p>
          </div>
        </div>

        {!activePanel ? <PendingTaskList rows={tarefasPendentes} /> : null}

        {activePanel === 'contato' ? (
          <form action={createContatoAction} className="card module-form module-form-grid">
            <label>
              <span>Nome</span>
              <input name="nome" required />
            </label>
            <label>
              <span>E-mail</span>
              <input name="email" type="email" />
            </label>
            <label>
              <span>Celular</span>
              <input name="celular" />
            </label>
            <div className="module-form-wide">
              <label>
                <span>Descricao</span>
                <textarea name="descricao" />
              </label>
            </div>
            <div className="form-actions module-form-wide">
              <GkitNewSubmitButton>Salvar contato</GkitNewSubmitButton>
            </div>
          </form>
        ) : null}

        {activePanel === 'cliente' ? (
          <form action={createClienteAction} className="card module-form module-form-grid">
            <label>
              <span>Nome</span>
              <input name="nome" required />
            </label>
            <label>
              <span>CPF ou CNPJ</span>
              <input inputMode="numeric" name="documento" required />
            </label>
            <div className="module-form-wide">
              <label>
                <span>Observacoes</span>
                <textarea name="observacoes" />
              </label>
            </div>
            <div className="form-actions module-form-wide">
              <GkitNewSubmitButton>Salvar cliente</GkitNewSubmitButton>
            </div>
          </form>
        ) : null}

        {activePanel === 'proposta' ? (
          <form action={createPropostaAction} className="card module-form module-form-grid">
            <label>
              <span>Contato</span>
              <select name="contato_id" required defaultValue="">
                <option value="">Selecione</option>
                {formData.contatos.map((contato) => (
                  <option key={contato.id} value={contato.id}>{contato.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Cliente</span>
              <select name="cliente_id" required defaultValue="">
                <option value="">Selecione</option>
                {formData.clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>{cliente.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Tipo de proposta</span>
              <select name="tipo" defaultValue="mensal">
                <option value="mensal">Mensal</option>
                <option value="pontual">Pontual</option>
              </select>
            </label>
            <label>
              <span>Valor</span>
              <input inputMode="decimal" name="valor" required />
            </label>
            <div className="module-form-wide">
              <label>
                <span>Escopo</span>
                <textarea name="escopo" />
              </label>
            </div>
            <div className="form-actions module-form-wide">
              <GkitNewSubmitButton>Salvar proposta</GkitNewSubmitButton>
            </div>
          </form>
        ) : null}

        {activePanel === 'acompanhamento' ? (
          <form action={updateAcompanhamentoAction} className="card module-form module-form-grid">
            <div className="module-form-wide">
              <label>
                <span>Proposta</span>
                <select name="oportunidade_id" required defaultValue="">
                  <option value="">Selecione</option>
                  {propostaOptions.map((oportunidade) => (
                    <option key={oportunidade.id} value={oportunidade.id}>
                      {oportunidade.descricao} - {oportunidade.cliente_nome} - {oportunidade.contato_nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset className="module-form-wide gkit-new-radio-group">
              <legend>Status</legend>
              {statusOptions.map((option) => (
                <label className="checkbox-row" key={option.value}>
                  <input
                    checked={status === option.value}
                    name="status"
                    onChange={() => setStatus(option.value)}
                    type="radio"
                    value={option.value}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>
            <div className="module-form-wide">
              <label>
                <span>Descricao{requiresDescription ? ' obrigatoria' : ''}</span>
                <textarea
                  name="descricao"
                  placeholder={requiresDescription ? 'Explique a alteracao de status.' : 'Opcional enquanto a proposta estiver enviada.'}
                  required={requiresDescription}
                />
              </label>
            </div>
            <div className="form-actions module-form-wide">
              <GkitNewSubmitButton>Atualizar acompanhamento</GkitNewSubmitButton>
            </div>
          </form>
        ) : null}
      </section>
    </>
  )
}
