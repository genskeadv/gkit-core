'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { CicloCockpitData, CicloListRow } from '@/features/ciclo/types'
import { CicloSubmitButton } from '@/features/ciclo/submit-button'

type CockpitPanel = 'cliente' | 'onboarding' | 'documentacao' | 'ocorrencia'

const panels: Array<{ description: string; id: CockpitPanel; label: string; title: string }> = [
  { id: 'cliente', label: '1. Cliente', title: 'Criar cliente', description: 'Cadastre a entrada operacional.' },
  { id: 'onboarding', label: '2. Onboarding', title: 'Iniciar onboarding', description: 'Crie checklist e workflow.' },
  { id: 'documentacao', label: '3. Documentacao', title: 'Atualizar documentos', description: 'Marque checklist e datas.' },
  { id: 'ocorrencia', label: '4. Ocorrencia', title: 'Criar ocorrencia', description: 'Registre evento e alerta.' },
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

const clientesDocumentacaoPageSize = 5

function panelTitle(panel: CockpitPanel) {
  return panels.find((item) => item.id === panel)?.title ?? 'Cockpit'
}

function panelDescription(panel: CockpitPanel) {
  return panels.find((item) => item.id === panel)?.description ?? ''
}

function PendingDocumentClientList({ rows }: { rows: CicloListRow[] }) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(rows.length / clientesDocumentacaoPageSize))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * clientesDocumentacaoPageSize
  const visibleRows = rows.slice(start, start + clientesDocumentacaoPageSize)

  if (!rows.length) return <div className="suite-empty-block">Nenhum cliente com documentacao pendente no momento.</div>

  return (
    <>
      <div className="suite-table-list compact ciclo-cockpit-table-list" role="list">
        {visibleRows.map((row) => {
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
            <Link href={row.detailHref} key={row.id} role="listitem">
              {content}
            </Link>
          ) : (
            <article key={row.id} role="listitem">
              {content}
            </article>
          )
        })}
      </div>
      {pageCount > 1 ? (
        <div className="ciclo-cockpit-pagination">
          <span>{start + 1}-{Math.min(start + clientesDocumentacaoPageSize, rows.length)} de {rows.length}</span>
          <div>
            <button disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">
              Anterior
            </button>
            <button disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} type="button">
              Proxima
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export function CicloCockpit({
  createClienteAction,
  createOcorrenciaAction,
  data,
  initialPanel = null,
  startOnboardingAction,
  updateDocumentacaoAction,
}: {
  createClienteAction: (formData: FormData) => Promise<void>
  createOcorrenciaAction: (formData: FormData) => Promise<void>
  data: CicloCockpitData
  initialPanel?: CockpitPanel | null
  startOnboardingAction: (formData: FormData) => Promise<void>
  updateDocumentacaoAction: (formData: FormData) => Promise<void>
}) {
  const activePanel = initialPanel
  const [documentacaoClienteId, setDocumentacaoClienteId] = useState('')
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
            <p>Escolha uma etapa para abrir o formulario; por padrao, o cockpit mostra clientes com documentacao pendente.</p>
          </div>
        </div>

        <div className="ciclo-quick-grid ciclo-cockpit-flow">
          {panels.map((panel) => (
            <Link
              aria-current={activePanel === panel.id ? 'page' : undefined}
              className={activePanel === panel.id ? 'ciclo-quick-card active' : 'ciclo-quick-card'}
              href={`/modulos/ciclo?panel=${panel.id}`}
              key={panel.id}
            >
              <span>{panel.label}</span>
              <h3>{panel.title}</h3>
              <p>{panel.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="suite-panel ciclo-cockpit-form-panel">
        <div className="suite-panel-heading">
          <div>
            <h2>{activePanel ? panelTitle(activePanel) : 'Clientes com documentacao pendente'}</h2>
            <p>{activePanel ? panelDescription(activePanel) : 'Clientes com checklist documental pendente ou vencido.'}</p>
          </div>
        </div>

        {!activePanel ? <PendingDocumentClientList rows={data.clientesDocumentacaoPendente} /> : null}

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
                <span>Observacoes</span>
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
              <label>
                <span>Cliente</span>
                <select name="cliente_id" required defaultValue="">
                  <option value="">Selecione</option>
                  {data.documentoFormData.clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>{cliente.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="suite-empty-block module-form-wide">O onboarding cria o checklist documental e o workflow operacional padrao.</div>
            <div className="form-actions module-form-wide">
              <CicloSubmitButton>Iniciar onboarding</CicloSubmitButton>
            </div>
          </form>
        ) : null}

        {activePanel === 'documentacao' ? (
          <form action={updateDocumentacaoAction} className="card module-form module-form-grid">
            <div className="module-form-wide">
              <label>
                <span>Cliente</span>
                <select
                  name="cliente_id"
                  onChange={(event) => setDocumentacaoClienteId(event.target.value)}
                  required
                  value={documentacaoClienteId}
                >
                  <option value="">Selecione</option>
                  {data.documentoFormData.clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>{cliente.label}</option>
                  ))}
                </select>
              </label>
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
              )) : <div className="suite-empty-block">Selecione um cliente para carregar os documentos padrao.</div>}
            </div>

            <div className="module-form-wide">
              <label>
                <span>Descricao da alteracao</span>
                <textarea name="descricao_alteracao" required />
              </label>
            </div>
            <div className="form-actions module-form-wide">
              <CicloSubmitButton>Atualizar documentacao</CicloSubmitButton>
            </div>
          </form>
        ) : null}

        {activePanel === 'ocorrencia' ? (
          <form action={createOcorrenciaAction} className="card module-form module-form-grid">
            <input name="return_to" type="hidden" value="cockpit" />
            <div className="module-form-wide">
              <label>
                <span>Cliente</span>
                <select name="cliente_id" defaultValue="">
                  <option value="">Sem cliente vinculado</option>
                  {data.documentoFormData.clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>{cliente.label}</option>
                  ))}
                </select>
              </label>
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
              <span>Responsavel</span>
              <input name="responsavel" />
            </label>
            <label>
              <span>Peso</span>
              <input name="peso" type="number" min={1} max={10} defaultValue={1} />
            </label>
            <label className="module-form-wide">
              <span>Titulo</span>
              <input name="titulo" required />
            </label>
            <div className="module-form-wide">
              <label>
                <span>Descricao</span>
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
              <CicloSubmitButton>Salvar ocorrencia</CicloSubmitButton>
            </div>
          </form>
        ) : null}
      </section>
    </>
  )
}
