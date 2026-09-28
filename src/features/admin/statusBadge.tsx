import type { Establishment } from '../../mock/types'

// Selos de status/plano reaproveitados pela lista e pelo painel de detalhe
// (spec história 34, EstablishmentsSection).
const STATUS_LABELS: Record<Establishment['status'], string> = {
  ACTIVE: 'Ativo',
  SETUP: 'Em configuração',
  SUSPENDED: 'Suspenso',
  DEACTIVATED: 'Desativado',
}

const STATUS_TONES: Record<Establishment['status'], string> = {
  ACTIVE: 'bg-success-bg text-success',
  SETUP: 'bg-warning-bg text-warning',
  SUSPENDED: 'bg-error-bg text-error',
  DEACTIVATED: 'bg-muted text-muted-foreground',
}

export function StatusBadge({ status }: { status: Establishment['status'] }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

export function statusLabel(status: Establishment['status']): string {
  return STATUS_LABELS[status]
}

export function PlanBadge({ code }: { code: string | null }) {
  if (!code) return <span className="text-sm text-muted-foreground">—</span>
  return <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">{code}</span>
}
