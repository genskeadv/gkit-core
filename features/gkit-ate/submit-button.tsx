'use client'

import { useFormStatus } from 'react-dom'

export function GkitAteSubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus()

  return (
    <button aria-busy={pending} className="button gkit-ate-submit" disabled={pending} type="submit">
      <span>{pending ? 'Salvando...' : children}</span>
    </button>
  )
}
