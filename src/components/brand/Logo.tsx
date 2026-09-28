// Marca FilaZero (spec §7): 3 barras horizontais decrescentes (a fila
// diminuindo) + um chevron ">" (movimento). currentColor para variantes
// light/dark/color via className. Nunca usar o placeholder "FZ" (spec).

interface MarkProps {
  size?: number
  className?: string
}

export function FilaZeroMark({ size = 24, className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="FilaZero"
    >
      <rect x="2" y="7" width="16" height="3.2" rx="1.6" fill="currentColor" />
      <rect x="2" y="14.4" width="11" height="3.2" rx="1.6" fill="currentColor" opacity="0.75" />
      <rect x="2" y="21.8" width="6" height="3.2" rx="1.6" fill="currentColor" opacity="0.5" />
      <path d="M22 8L29 16L22 24" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface LogoProps extends MarkProps {
  variant?: 'light' | 'dark' | 'color'
  wordmarkSize?: 'sm' | 'md' | 'lg'
}

const WORDMARK_TEXT_SIZE: Record<NonNullable<LogoProps['wordmarkSize']>, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
}

const VARIANT_CLASS: Record<NonNullable<LogoProps['variant']>, string> = {
  light: 'text-white',
  dark: 'text-foreground',
  color: 'text-primary',
}

export function FilaZeroLogo({ size = 28, variant = 'color', wordmarkSize = 'md', className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${VARIANT_CLASS[variant]} ${className}`}>
      <FilaZeroMark size={size} />
      <span className={`font-display font-extrabold tracking-tight ${WORDMARK_TEXT_SIZE[wordmarkSize]}`}>
        FilaZero
      </span>
    </div>
  )
}
