import type { ReactNode } from 'react'

interface TermsCheckboxProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  error?: string
}

// TermsCheckbox (spec §7 e história 01): usado tanto para o aceite obrigatório
// dos termos quanto para o opt-in de marketing — SEMPRE em checkbox separado.
export function TermsCheckbox({ id, checked, onChange, children, error }: TermsCheckboxProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
          aria-invalid={Boolean(error)}
        />
        <span className="font-body text-sm text-foreground">{children}</span>
      </label>
      {error && <span className="pl-7 text-sm text-error">{error}</span>}
    </div>
  )
}
