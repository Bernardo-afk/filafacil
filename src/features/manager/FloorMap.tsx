import { CheckCircle2, Users, CalendarClock, Bell, CreditCard, Ban } from 'lucide-react'
import type { DiningTable, TableStatus } from '../../mock/types'

// FloorMap (spec história 20): componente compartilhado, só leitura — usado
// na Planta do gestor e, na Sprint 2, no mapa do atendente. Nunca depende só
// da cor: sempre ícone + texto (spec §7 acessibilidade).
const STATUS_META: Record<TableStatus, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  AVAILABLE: { label: 'Livre', tone: 'border-success bg-success-bg text-success', icon: CheckCircle2 },
  OCCUPIED: { label: 'Ocupada', tone: 'border-error bg-error-bg text-error', icon: Users },
  RESERVED: { label: 'Reservada', tone: 'border-warning bg-warning-bg text-warning', icon: CalendarClock },
  CALLING: { label: 'Chamado', tone: 'border-secondary bg-secondary/10 text-secondary', icon: Bell },
  AWAITING_PAYMENT: { label: 'Aguard. pgto', tone: 'border-warning bg-warning-bg text-warning', icon: CreditCard },
  UNAVAILABLE: { label: 'Indisp.', tone: 'border-muted-foreground bg-muted text-muted-foreground', icon: Ban },
}

export { STATUS_META as FLOOR_MAP_STATUS_META }

interface FloorMapProps {
  gridCols: number
  gridRows: number
  tables: DiningTable[]
  selectedTableId?: string | null
  highlightCellForSelection?: boolean
  onTableClick?: (table: DiningTable) => void
  onCellClick?: (x: number, y: number) => void
}

export function FloorMap({ gridCols, gridRows, tables, selectedTableId, highlightCellForSelection, onTableClick, onCellClick }: FloorMapProps) {
  const cells = Array.from({ length: gridCols * gridRows }, (_, i) => ({ x: i % gridCols, y: Math.floor(i / gridCols) }))
  const tableAt = (x: number, y: number) => tables.find((t) => x >= t.gridX && x < t.gridX + t.gridW && y >= t.gridY && y < t.gridY + t.gridH)

  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(64px, 1fr))`, gridTemplateRows: `repeat(${gridRows}, 64px)` }}
    >
      {cells.map(({ x, y }) => {
        const table = tableAt(x, y)
        // só desenha a célula "âncora" (canto superior-esquerdo) de mesas maiores que 1 célula
        if (table && (table.gridX !== x || table.gridY !== y)) return null

        if (!table) {
          return (
            <button
              key={`${x}-${y}`}
              type="button"
              onClick={() => onCellClick?.(x, y)}
              disabled={!onCellClick}
              className={`rounded-[var(--radius-sm)] border border-dashed ${highlightCellForSelection ? 'border-primary' : 'border-border'}`}
              style={{ gridColumn: `${x + 1} / span 1`, gridRow: `${y + 1} / span 1` }}
              aria-label={`Célula vazia (${x}, ${y})`}
            />
          )
        }

        const meta = STATUS_META[table.status]
        const Icon = meta.icon
        return (
          <button
            key={table.id}
            type="button"
            onClick={() => onTableClick?.(table)}
            style={{ gridColumn: `${table.gridX + 1} / span ${table.gridW}`, gridRow: `${table.gridY + 1} / span ${table.gridH}` }}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] border-2 text-xs font-semibold ${meta.tone} ${
              selectedTableId === table.id ? 'ring-2 ring-primary' : ''
            }`}
          >
            <Icon size={16} />
            <span>{table.label}</span>
            <span className="text-[10px] font-normal">{meta.label}</span>
          </button>
        )
      })}
    </div>
  )
}
