import type { OperationalStatus } from '../../mock/types'

// Selo de status operacional (spec história 11/12): reaproveitado pelo card
// de busca e pela página do restaurante.
export const STATUS_META: Record<OperationalStatus, { label: string; dot: string; text: string }> = {
  OPEN: { label: 'Aceitando pedidos', dot: 'bg-success', text: 'text-success' },
  BUSY: { label: 'Alta demanda', dot: 'bg-warning', text: 'text-warning' },
  PAUSED: { label: 'Pedidos temporariamente pausados', dot: 'bg-secondary', text: 'text-secondary' },
  CLOSED: { label: 'Fechado', dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
}
