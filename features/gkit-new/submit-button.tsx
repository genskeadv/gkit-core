'use client'

import { useFormStatus } from 'react-dom'

export function GkitNewSubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus()

  return (
    <button aria-busy={pending} className="button gkit-new-submit" disabled={pending} type="submit">
      <span>{pending ? 'Salvando...' : children}</span>
    </button>
  )
}
