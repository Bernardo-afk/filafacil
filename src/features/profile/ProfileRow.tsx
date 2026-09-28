import type { ComponentType, ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

interface ProfileRowProps {
  icon: ComponentType<{ size?: number; className?: string }>
  label: string
  onClick?: () => void
  disabled?: boolean
  hint?: string
  tone?: 'default' | 'danger'
}

// Linha de lista do Perfil (spec §7, ProfileFullScreen): ícone + rótulo + seta.
// Indisponível na Sprint 1 -> desabilitada com "Em breve" (spec história 13).
export function ProfileRow({ icon: Icon, label, onClick, disabled, hint = 'Em breve', tone = 'default' }: ProfileRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      title={disabled ? hint : undefined}
      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left font-body disabled:opacity-40 ${
        tone === 'danger' ? 'text-error' : 'text-foreground'
      }`}
    >
      <Icon size={20} className={tone === 'danger' ? 'text-error' : 'text-muted-foreground'} />
      <span className="flex-1 text-sm font-medium">{label}</span>
      {onClick && !disabled && <ChevronRight size={18} className="text-muted-foreground" />}
    </button>
  )
}

export function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col">
      <h2 className="px-4 pb-1 pt-5 font-body text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="flex flex-col divide-y divide-border rounded-[var(--radius-md)] border border-border bg-card">
        {children}
      </div>
    </section>
  )
}
