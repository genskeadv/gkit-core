'use client'

import { useFormStatus } from 'react-dom'

export function GkitJurSyncSubmitButton({
  idleLabel = 'Sincronizar fontes',
  pendingHint = 'Consultando fontes, gravando movimentacoes e gerando tarefas.',
  pendingLabel = 'Sincronizando...',
}: {
  idleLabel?: string
  pendingHint?: string
  pendingLabel?: string
}) {
  const { pending } = useFormStatus()

  return (
    <div className="gkit-jur-sync-submit">
      <button aria-busy={pending} className="button primary-button" disabled={pending} type="submit">
        <span aria-hidden="true" className="gkit-jur-sync-spinner" />
        <span>{pending ? pendingLabel : idleLabel}</span>
      </button>
      {pending ? <small>{pendingHint}</small> : null}
    </div>
  )
}
