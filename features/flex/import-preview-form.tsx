'use client'

import { useActionState } from 'react'
import type { FlexImportPreviewState } from '@/features/flex/actions'

type PreviewAction = (previousState: FlexImportPreviewState, formData: FormData) => Promise<FlexImportPreviewState>
type ImportAction = (formData: FormData) => void | Promise<void>

const initialState: FlexImportPreviewState = { ok: false }

export function FlexImportPreviewForm({
  accept,
  description,
  importAction,
  importLabel,
  inputLabel,
  previewAction,
  title,
}: {
  accept: string
  description: string
  importAction: ImportAction
  importLabel: string
  inputLabel: string
  previewAction: PreviewAction
  title: string
}) {
  const [state, formAction, isPending] = useActionState(previewAction, initialState)
  const preview = state.preview

  return (
    <form action={formAction} className="card module-form flex-import-preview-form">
      <div className="suite-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="module-form-grid">
        <label className="module-field">
          <span>{inputLabel}</span>
          <input className="input" name="arquivo" type="file" accept={accept} required />
        </label>
      </div>
      <div className="module-inline-actions">
        <button className="button secondary" disabled={isPending} type="submit">
          {isPending ? 'Gerando prévia...' : 'Pré-visualizar'}
        </button>
        <button className="button" formAction={importAction} type="submit">
          {importLabel}
        </button>
      </div>

      {state.error ? <p className="flex-import-error">{state.error}</p> : null}

      {preview ? (
        <section className="flex-import-preview" aria-label={preview.title}>
          <div className="suite-panel-heading">
            <div>
              <h3>{preview.title}</h3>
              <p>{preview.arquivo}</p>
            </div>
          </div>
          <div className="flex-import-summary">
            {preview.summary.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                {item.hint ? <small>{item.hint}</small> : null}
              </article>
            ))}
          </div>
          <div className="flex-import-preview-table">
            <table>
              <thead>
                <tr>
                  {preview.columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, index) => (
                  <tr key={`${preview.kind}-${index}`}>
                    {preview.columns.map((column) => (
                      <td key={column}>{row[column] ?? '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </form>
  )
}
