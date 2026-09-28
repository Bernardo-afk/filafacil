import type { ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  variant?: 'primary' | 'secondary'
}

// LoadingButton (spec §7): botão primário laranja em pílula / secundário branco com borda.
export function LoadingButton({ loading, variant = 'primary', disabled, className = '', children, ...props }: LoadingButtonProps) {
  const base = 'flex items-center justify-center gap-2 rounded-full px-6 py-3 font-body font-semibold transition-opacity disabled:opacity-50'
  const variantClass =
    variant === 'primary'
      ? 'bg-primary text-primary-foreground'
      : 'border border-border bg-card text-foreground'

  return (
    <button className={`${base} ${variantClass} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  )
}
