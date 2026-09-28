import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

// PasswordInput (spec §7): mostrar/ocultar senha.
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { label, error, id, className = '', ...props },
  ref,
) {
  const [visible, setVisible] = useState(false)
  const inputId = id ?? props.name

  return (
    <label className="flex flex-col gap-1.5" htmlFor={inputId}>
      <span className="font-body text-sm font-medium text-foreground">{label}</span>
      <span className="relative flex items-center">
        <input
          ref={ref}
          id={inputId}
          type={visible ? 'text' : 'password'}
          className={`w-full rounded-[var(--radius-md)] border px-4 py-3 pr-11 font-body text-base text-foreground outline-none transition-colors focus:border-primary ${
            error ? 'border-error' : 'border-border'
          } ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 text-muted-foreground"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          tabIndex={-1}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      {error && (
        <span id={`${inputId}-error`} className="text-sm text-error">
          {error}
        </span>
      )}
    </label>
  )
})
