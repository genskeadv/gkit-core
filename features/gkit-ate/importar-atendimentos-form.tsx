'use client'

import { useRef, useState, useTransition } from 'react'
import { importarGkitAteAstreaXlsx, previewGkitAteAstreaXlsx } from '@/features/gkit-ate/actions'

type ImportResult = Awaited<ReturnType<typeof importarGkitAteAstreaXlsx>>
type PreviewResult = Awaited<ReturnType<typeof previewGkitAteAstreaXlsx>>

export function ImportarGkitAteAstreaForm() {
  const [pending, startTransition] = useTransition()
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewedFile, setPreviewedFile] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function getFormData() {
    const file = fileRef.current?.files?.[0]
    if (!file) throw new Error('Selecione um arquivo XLSX.')
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
        setPreview(await previewGkitAteAstreaXlsx(formData))
        setPreviewedFile(fileKey)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nao foi possivel pre-visualizar o arquivo.')
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
        setResult(await importarGkitAteAstreaXlsx(formData))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nao foi possivel importar o arquivo.')
      }
    })
  }

  return (
    <div className="gkit-ate-import-box">
      <input
        ref={fileRef}
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="input"
        name="arquivo"
        onChange={onFileChange}
        type="file"
      />

      <div className="form-actions">
        <button className="button secondary" disabled={pending} onClick={onPreview} type="button">
          {pending ? 'Validando...' : 'Pre-visualizar'}
        </button>
        <button className="button" disabled={pending || !preview || preview.validas === 0} onClick={onConfirm} type="button">
          {pending ? 'Importando...' : 'Confirmar importacao'}
        </button>
      </div>

      {error ? <div className="suite-empty-block danger">{error}</div> : null}

      {preview ? (
        <section className="gkit-ate-import-preview">
          <div className="gkit-ate-panel-heading">
            <div>
              <h2>Preview ASTREA</h2>
              <p>Confira os atendimentos antes de gravar no GKIT ATE.</p>
            </div>
          </div>

          <div className="gkit-ate-import-stats">
            <span>Linhas <strong>{preview.total}</strong></span>
            <span>Validas <strong>{preview.validas}</strong></span>
            <span>Criar <strong>{preview.criar}</strong></span>
            <span>Atualizar <strong>{preview.atualizar}</strong></span>
            <span>Abertos <strong>{preview.abertos}</strong></span>
            <span>Encerrados <strong>{preview.encerrados}</strong></span>
            <span>Clientes <strong>{preview.clientes}</strong></span>
            <span>Tarefas <strong>{preview.validas}</strong></span>
          </div>

          {preview.amostras.length ? (
            <div className="suite-table-list compact">
              {preview.amostras.map((item) => (
                <article key={`${item.linha}-${item.sourceKey}`}>
                  <div>
                    <h3>{item.titulo}</h3>
                    <p>{item.cliente} - {item.atendimentoTipo}</p>
                  </div>
                  <span className={`suite-pill ${item.status === 'aberto' ? 'warning' : 'success'}`}>{item.status}</span>
                  <strong>{item.acao}</strong>
                  <small>{item.codigoPublico ?? item.tarefaTipo}</small>
                </article>
              ))}
            </div>
          ) : null}

          {preview.ignorados.length ? (
            <div className="suite-empty-block warning">
              <strong>Linhas que serao ignoradas</strong>
              <ul>
                {preview.ignorados.slice(0, 12).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {result ? (
        <section className="suite-empty-block success">
          <strong>{result.gravados} atendimento(s) importado(s)</strong>
          <span>{result.criados} novo(s), {result.atualizados} atualizado(s), {result.ignorados.length} ignorado(s).</span>
        </section>
      ) : null}
    </div>
  )
}
