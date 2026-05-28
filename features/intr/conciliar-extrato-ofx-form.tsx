'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'
import { confirmarConciliacaoExtratoOfx, previewConciliacaoExtratoOfx } from '@/features/intr/actions'

type ConciliationResult = Awaited<ReturnType<typeof confirmarConciliacaoExtratoOfx>>
type PreviewResult = Awaited<ReturnType<typeof previewConciliacaoExtratoOfx>>

const moneyFormatter = new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' })
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' })

function dateLabel(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

export function ConciliarExtratoOfxForm() {
  const [pending, startTransition] = useTransition()
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [result, setResult] = useState<ConciliationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewedFile, setPreviewedFile] = useState<string | null>(null)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const selectedPairs = preview?.lancamentos
    .map((item) => ({ fitId: item.fitId, pagamentoId: selections[item.fitId] }))
    .filter((item): item is { fitId: string; pagamentoId: string } => Boolean(item.pagamentoId)) ?? []

  function getFormData() {
    const file = fileRef.current?.files?.[0]
    if (!file) throw new Error('Selecione um arquivo OFX.')
    const formData = new FormData()
    formData.set('arquivo', file)
    return { fileKey: `${file.name}:${file.size}:${file.lastModified}`, formData }
  }

  function onFileChange() {
    setPreview(null)
    setResult(null)
    setError(null)
    setPreviewedFile(null)
    setSelections({})
  }

  function onPreview() {
    setError(null)
    setResult(null)
    setPreview(null)
    setSelections({})
    startTransition(async () => {
      try {
        const { fileKey, formData } = getFormData()
        const data = await previewConciliacaoExtratoOfx(formData)
        setPreview(data)
        setPreviewedFile(fileKey)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nao foi possivel ler o OFX.')
      }
    })
  }

  function onConfirm() {
    setError(null)
    setResult(null)
    startTransition(async () => {
      try {
        const { fileKey, formData } = getFormData()
        if (fileKey !== previewedFile) {
          setPreview(null)
          setSelections({})
          setError('O arquivo mudou depois do preview. Gere a pre-visualizacao novamente.')
          return
        }
        formData.set('selecoes', JSON.stringify(selectedPairs))
        setResult(await confirmarConciliacaoExtratoOfx(formData))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nao foi possivel conciliar o extrato.')
      }
    })
  }

  return (
    <div className="suite-import-box">
      <input
        ref={fileRef}
        accept=".ofx,application/x-ofx,application/vnd.intu.qfx"
        className="input"
        name="arquivo"
        onChange={onFileChange}
        type="file"
      />

      <div className="form-actions">
        <button className="button secondary" disabled={pending} onClick={onPreview} type="button">
          {pending ? 'Lendo...' : 'Pre-visualizar'}
        </button>
        <button className="button" disabled={pending || selectedPairs.length === 0} onClick={onConfirm} type="button">
          {pending ? 'Conciliando...' : `Confirmar ${selectedPairs.length} conciliacao(oes)`}
        </button>
      </div>

      {error ? <div className="suite-empty-block danger">{error}</div> : null}

      {result ? (
        <section className="card ciclo-panel">
          <div className="ciclo-panel-heading">
            <div>
              <h2>Conciliacao concluida</h2>
              <p>Arquivo {result.arquivo} processado conforme as escolhas da previa.</p>
            </div>
          </div>
          <div className="suite-import-stats">
            <span>Conciliados <strong>{result.conciliados}</strong></span>
            <span>Divergentes <strong>{result.divergentes}</strong></span>
            <span>Valor conciliado <strong>{moneyFormatter.format(result.valorConciliado)}</strong></span>
            <span>Sem par <strong>{result.semCorrespondencia.length}</strong></span>
          </div>
          <div className="form-actions">
            <Link className="button" href="/modulos/intr/pagamentos">Ver pagamentos</Link>
            <Link className="button secondary" href="/modulos/intr/pagamentos/conciliar-extrato">Conciliar novo extrato</Link>
          </div>
        </section>
      ) : null}

      {preview ? (
        <section className="card ciclo-panel">
          <div className="ciclo-panel-heading">
            <div>
              <h2>Preview assistido</h2>
              <p>Escolha manualmente qual pagamento previsto deve ser conciliado com cada lancamento do extrato.</p>
            </div>
          </div>

          <div className="suite-import-stats">
            <span>Saidas no extrato <strong>{preview.totalExtrato}</strong></span>
            <span>Com sugestoes <strong>{preview.lancamentos.length}</strong></span>
            <span>Selecionados <strong>{selectedPairs.length}</strong></span>
            <span>Sem sugestao <strong>{preview.semCorrespondencia.length}</strong></span>
          </div>

          <div className="suite-table-list suite-import-table">
            {preview.lancamentos.map((item) => {
              const exactMatch = item.sugestoes.find((sugestao) => sugestao.diferenca === 0)
              const selected = item.sugestoes.find((sugestao) => sugestao.pagamentoId === selections[item.fitId])
              const selectedExact = selected?.diferenca === 0

              return (
                <article className={selectedExact ? 'ofx-exact-selected' : exactMatch ? 'ofx-exact-ready' : undefined} key={item.fitId}>
                  <div>
                    <h3>{dateLabel(item.data)} - {moneyFormatter.format(item.valor)}</h3>
                    <p>{item.descricao}</p>
                    {exactMatch ? (
                      <div className="ofx-exact-burst">
                        <span>Match exato</span>
                        <small>{exactMatch.pagamentoColaborador}</small>
                      </div>
                    ) : null}
                  </div>
                  <span className={`suite-pill ${exactMatch ? 'success ofx-pulse-pill' : 'primary'}`}>{exactMatch ? 'bateu' : 'extrato'}</span>
                  <div>
                    <label className="label" htmlFor={`match-${item.fitId}`}>Pagamento previsto</label>
                    <select
                      className="select"
                      id={`match-${item.fitId}`}
                      value={selections[item.fitId] ?? ''}
                      onChange={(event) => setSelections((current) => ({ ...current, [item.fitId]: event.target.value }))}
                    >
                      <option value="">Nao conciliar</option>
                      {item.sugestoes.map((sugestao) => (
                        <option key={sugestao.pagamentoId} value={sugestao.pagamentoId}>
                          {sugestao.diferenca === 0 ? 'MATCH EXATO - ' : ''}{sugestao.pagamentoColaborador} - {sugestao.pagamentoTipo} - previsto {moneyFormatter.format(sugestao.valorPrevisto)} - diferenca {moneyFormatter.format(sugestao.diferenca)}
                        </option>
                      ))}
                    </select>
                  </div>
                </article>
              )
            })}
          </div>

          {preview.semCorrespondencia.length ? (
            <div className="suite-empty-block warning">
              <strong>Lancamentos sem sugestao</strong>
              <ul>
                {preview.semCorrespondencia.slice(0, 12).map((item) => (
                  <li key={`${item.data}-${item.valor}-${item.descricao}`}>
                    {dateLabel(item.data)} - {moneyFormatter.format(item.valor)} - {item.descricao}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
