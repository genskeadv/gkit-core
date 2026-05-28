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
  const fileRef = useRef<HTMLInputElement>(null)

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
  }

  function onPreview() {
    setError(null)
    setResult(null)
    setPreview(null)
    startTransition(async () => {
      try {
        const { fileKey, formData } = getFormData()
        setPreview(await previewConciliacaoExtratoOfx(formData))
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
          setError('O arquivo mudou depois do preview. Gere a pre-visualizacao novamente.')
          return
        }
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
        <button className="button" disabled={pending || !preview || preview.conciliados.length === 0} onClick={onConfirm} type="button">
          {pending ? 'Conciliando...' : 'Confirmar conciliação'}
        </button>
      </div>

      {error ? <div className="suite-empty-block danger">{error}</div> : null}

      {result ? (
        <section className="card ciclo-panel">
          <div className="ciclo-panel-heading">
            <div>
              <h2>Conciliação concluída</h2>
              <p>Arquivo {result.arquivo} processado e pagamentos previstos marcados como pagos.</p>
            </div>
          </div>

          <div className="suite-import-stats">
            <span>Conciliados <strong>{result.conciliados}</strong></span>
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
              <h2>Preview da conciliação</h2>
              <p>Confira os lançamentos do extrato que bateram com pagamentos previstos.</p>
            </div>
          </div>

          <div className="suite-import-stats">
            <span>Saídas no extrato <strong>{preview.totalExtrato}</strong></span>
            <span>Pagamentos previstos <strong>{preview.totalPagamentosPrevistos}</strong></span>
            <span>Conciliar <strong>{preview.conciliados.length}</strong></span>
            <span>Valor <strong>{moneyFormatter.format(preview.valorConciliado)}</strong></span>
            <span>Sem par <strong>{preview.semCorrespondencia.length}</strong></span>
          </div>

          <div className="suite-table-list suite-import-table">
            {preview.conciliados.map((item) => (
              <article key={`${item.fitId}-${item.pagamentoId}`}>
                <div>
                  <h3>{item.pagamentoColaborador}</h3>
                  <p>{item.pagamentoTipo} - {item.descricaoExtrato}</p>
                </div>
                <span className="suite-pill success">conciliar</span>
                <strong>{moneyFormatter.format(item.valor)}</strong>
                <small>{dateLabel(item.dataExtrato)}</small>
              </article>
            ))}
          </div>

          {preview.semCorrespondencia.length ? (
            <div className="suite-empty-block warning">
              <strong>Lançamentos sem pagamento previsto correspondente</strong>
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
