import { forwardRef, type InputHTMLAttributes } from 'react'

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

// Campo com rótulo acima (spec §7 "Padrões visuais"). Erro em texto, não só cor (spec §6 acessibilidade).
export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(function AuthInput(
  { label, error, id, className = '', ...props },
  ref,
) {
  const inputId = id ?? props.name
  return (
    <label className="flex flex-col gap-1.5" htmlFor={inputId}>
      <span className="font-body text-sm font-medium text-foreground">{label}</span>
      <input
        ref={ref}
        id={inputId}
        className={`rounded-[var(--radius-md)] border px-4 py-3 font-body text-base text-foreground outline-none transition-colors focus:border-primary ${
          error ? 'border-error' : 'border-border'
        } ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <span id={`${inputId}-error`} className="text-sm text-error">
          {error}
        </span>
      )}
    </label>
  )
})
