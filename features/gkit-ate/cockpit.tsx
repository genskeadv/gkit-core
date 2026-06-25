'use client'

import Link from 'next/link'
import { GkitAteSubmitButton } from '@/features/gkit-ate/submit-button'
import type { GkitAteFormData, GkitAteListRow } from '@/features/gkit-ate/types'

type CockpitPanel = 'atendimento' | 'tarefa' | 'tipo-atendimento' | 'tipo-tarefa'
type CockpitAction = (formData: FormData) => Promise<void>

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
    description: 'Inclua a proxima pendencia.',
  },
  {
    id: 'tipo-atendimento',
    label: '3. Tipo',
    title: 'Tipo de atendimento',
    description: 'Cadastre a classificacao.',
  },
  {
    id: 'tipo-tarefa',
    label: '4. Tarefa padrao',
    title: 'Criar tarefa padrao',
    description: 'Cadastre o modelo do fluxo.',
  },
]

function panelTitle(panel: CockpitPanel) {
  return panels.find((item) => item.id === panel)?.title ?? 'Cockpit'
}

function panelDescription(panel: CockpitPanel) {
  return panels.find((item) => item.id === panel)?.description ?? ''
}

function PendingTaskList({ rows }: { rows: GkitAteListRow[] }) {
  if (!rows.length) {
    return <div className="suite-empty-block success">Nenhuma tarefa pendente para o ATE.</div>
  }

  return (
    <div className="suite-table-list compact gkit-ate-table-list" role="list">
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

export function GkitAteCockpit({
  createAtendimentoAction,
  createAtendimentoTipoAction,
  createTarefaAction,
  createTarefaTipoAction,
  formData,
  initialPanel = null,
  tarefasPendentes,
}: {
  createAtendimentoAction: CockpitAction
  createAtendimentoTipoAction: CockpitAction
  createTarefaAction: CockpitAction
  createTarefaTipoAction: CockpitAction
  formData: GkitAteFormData
  initialPanel?: CockpitPanel | null
  tarefasPendentes: GkitAteListRow[]
}) {
  const activePanel = initialPanel

  return (
    <>
      <section className="suite-panel gkit-ate-command-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>Ordem do fluxo</h2>
            <p>Escolha uma etapa para abrir o formulario; por padrao, o cockpit mostra a fila pendente.</p>
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
            <h2>{activePanel ? panelTitle(activePanel) : 'Tarefas pendentes'}</h2>
            <p>{activePanel ? panelDescription(activePanel) : 'Pendencias abertas dos atendimentos consultivos.'}</p>
          </div>
        </div>

        {!activePanel ? <PendingTaskList rows={tarefasPendentes} /> : null}

        {activePanel === 'atendimento' ? (
          <form action={createAtendimentoAction} className="card module-form module-form-grid">
            <label>
              <span>Titulo</span>
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
              <span>Classificacao avulsa</span>
              <input name="tipo_atendimento" placeholder="Opcional" />
            </label>
            <label>
              <span>Responsavel</span>
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
              <span>Nova tarefa padrao</span>
              <input name="tipo_tarefa" placeholder="Opcional" />
            </label>
            <label className="module-form-wide">
              <span>Tarefa inicial</span>
              <input name="descricao_tarefa" required />
            </label>
            <label>
              <span>Responsavel da tarefa</span>
              <input name="responsavel_tarefa" />
            </label>
            <label>
              <span>Prazo da tarefa</span>
              <input name="data_prevista" type="date" />
            </label>
            <div className="module-form-wide">
              <label>
                <span>Observacoes</span>
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
              <span>Nova tarefa padrao</span>
              <input name="tipo_tarefa" placeholder="Opcional" />
            </label>
            <label className="module-form-wide">
              <span>Descricao</span>
              <input name="descricao" required />
            </label>
            <label>
              <span>Responsavel</span>
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
              <span>Tarefa padrao</span>
              <select name="tarefa_tipo_id" defaultValue="">
                <option value="">Sem tarefa padrao</option>
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
                <span>Descricao padrao</span>
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
