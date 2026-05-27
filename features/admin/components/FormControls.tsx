export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={['input', className].filter(Boolean).join(' ')} />
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={['select', className].filter(Boolean).join(' ')} />
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={['textarea', className].filter(Boolean).join(' ')} />
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  return <button type="submit" className="button">{children}</button>
}
