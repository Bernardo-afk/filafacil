import type { DisplayStatus } from '../../mock/services/adminUsers'

const LABELS: Record<DisplayStatus, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  SUSPENDED: 'Suspenso',
}

const TONES: Record<DisplayStatus, string> = {
  ACTIVE: 'bg-success-bg text-success',
  INACTIVE: 'bg-muted text-muted-foreground',
  SUSPENDED: 'bg-error-bg text-error',
}

export function UserStatusBadge({ status }: { status: DisplayStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TONES[status]}`}>{LABELS[status]}</span>
}
