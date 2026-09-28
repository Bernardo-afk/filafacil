import { useNavigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import { STATUS_META } from './operationalStatusMeta'
import { formatDistance } from '../../lib/geo'
import type { SearchResultItem } from '../../mock/services/discovery'

// RestaurantCard (spec história 11): foto, nome, chip de espera, "Categoria ·
// distância · nota" e status. Coração de favorito fica fora da Sprint 1.
export function RestaurantCard({ item }: { item: SearchResultItem }) {
  const navigate = useNavigate()
  const status = STATUS_META[item.operationalStatus]

  return (
    <button
      type="button"
      onClick={() => navigate(`/app/r/${item.id}`)}
      className="flex w-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-border bg-card text-left"
    >
      <div className="flex h-28 items-center justify-center bg-muted">
        {item.coverPhotoUrl ? (
          <img src={item.coverPhotoUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-muted-foreground">Sem foto</span>
        )}
      </div>
      <div className="flex flex-col gap-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-body font-semibold text-foreground">
            {item.name}
            {item.unitLabel ? ` · ${item.unitLabel}` : ''}
          </span>
          {item.waitTime.minMinutes != null && item.waitTime.maxMinutes != null && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              {item.waitTime.minMinutes}–{item.waitTime.maxMinutes} min
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {item.categoryLabel} · {formatDistance(item.distanceMeters ?? 0)} ·{' '}
          <span className="inline-flex items-center gap-0.5 text-foreground">
            <Star size={12} className="fill-primary text-primary" />
            {item.ratingAvg.toFixed(1)}
          </span>
        </p>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          <span className={status.text}>{status.label}</span>
        </div>
      </div>
    </button>
  )
}
