export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field-shell">
      <span className="label">{label}</span>
      {children}
    </label>
  )
}

export const inputClass = 'input'
export const buttonClass = 'button'
export const secondaryButtonClass = 'button secondary'
