'use client'

import { useFormStatus } from 'react-dom'

export function CicloSubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus()

  return (
    <button aria-busy={pending} className="button ciclo-submit" disabled={pending} type="submit">
      <span>{pending ? 'Salvando...' : children}</span>
    </button>
  )
}
