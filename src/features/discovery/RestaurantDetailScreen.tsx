import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Star, MapPin, Navigation, Clock, QrCode } from 'lucide-react'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { establishmentsService, type RestaurantDetailView } from '../../mock/services/establishments'
import { isMockApiError } from '../../mock/errors'
import { formatDistance, googleMapsDirectionsUrl } from '../../lib/geo'
import { flags } from '../../lib/flags'
import type { OperationalStatus } from '../../mock/types'

const STATUS_META: Record<OperationalStatus, { label: string; dot: string; text: string }> = {
  OPEN: { label: 'Aceitando pedidos', dot: 'bg-success', text: 'text-success' },
  BUSY: { label: 'Alta demanda', dot: 'bg-warning', text: 'text-warning' },
  PAUSED: { label: 'Pedidos temporariamente pausados', dot: 'bg-secondary', text: 'text-secondary' },
  CLOSED: { label: 'Fechado', dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
}

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Não foi possível carregar este restaurante.'
}

function formatPausedUntil(pausedUntil: string, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(new Date(pausedUntil))
}

// RestaurantDetailScreen (spec história 12): capa, nota, distância, espera,
// status derivado, endereço + "Como chegar", horário de hoje, tags, fotos.
export function RestaurantDetailScreen() {
  const navigate = useNavigate()
  const { establishmentId } = useParams()
  const [detail, setDetail] = useState<RestaurantDetailView | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!establishmentId) return
    try {
      setDetail(establishmentsService.getRestaurantDetail(establishmentId))
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [establishmentId])

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="font-display text-lg font-semibold text-foreground">Restaurante não encontrado</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }
  if (!detail) return null

  const status = STATUS_META[detail.operationalStatus]
  const canOrder = detail.operationalStatus === 'OPEN' || detail.operationalStatus === 'BUSY'

  return (
    <div className="flex flex-col pb-6">
      <div className="flex h-40 items-end bg-muted">
        {detail.photos[0] ? (
          <img src={detail.photos[0]} alt={detail.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">Sem foto de capa</div>
        )}
      </div>

      <div className="flex flex-col gap-4 px-6 py-5">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            {detail.name}
            {detail.unitLabel ? ` · ${detail.unitLabel}` : ''}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 text-foreground">
              <Star size={14} className="fill-primary text-primary" />
              {detail.ratingAvg.toFixed(1)} ({detail.ratingCount})
            </span>
            {detail.distanceMeters != null && <span>· {formatDistance(detail.distanceMeters)}</span>}
            {detail.waitTime.minMinutes != null && detail.waitTime.maxMinutes != null && (
              <span>
                · Espera: {detail.waitTime.minMinutes}–{detail.waitTime.maxMinutes} min
              </span>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 font-body text-sm font-semibold">
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            <span className={status.text}>{status.label}</span>
          </div>
          {detail.operationalStatus === 'PAUSED' && (
            <p className="mt-1 text-sm text-muted-foreground">
              Este restaurante pausou novos pedidos temporariamente.
              {detail.pausedUntil && ` Pedidos devem retornar às ${formatPausedUntil(detail.pausedUntil, detail.timezone)}.`}
            </p>
          )}
        </div>

        {detail.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {detail.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <MapPin size={18} className="mt-0.5 text-muted-foreground" />
              <span className="text-sm text-foreground">{detail.address}</span>
            </div>
            {detail.lat != null && detail.lng != null && (
              <a
                href={googleMapsDirectionsUrl(detail.lat, detail.lng)}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary"
              >
                <Navigation size={14} /> Como chegar
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock size={16} />
            Hoje: {detail.todayHours}
          </div>
        </div>

        {flags.ORDERING_ENABLED && (
          <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-muted p-4">
            <p className="text-sm text-foreground">
              Você pode consultar o cardápio. Para fazer um pedido, confirme sua presença pelo QR Code do estabelecimento.
            </p>
            <LoadingButton variant="secondary" className="w-fit">
              <QrCode size={16} />
              Escanear QR para pedir
            </LoadingButton>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <LoadingButton className="w-full" onClick={() => navigate(`/app/r/${detail.id}/cardapio`)} title={canOrder ? undefined : 'Modo consulta'}>
            Ver cardápio
          </LoadingButton>
          {flags.RESERVATIONS_ENABLED && (
            <LoadingButton variant="secondary" className="w-full">
              Reservar
            </LoadingButton>
          )}
        </div>

        {detail.photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pt-2">
            {detail.photos.slice(1).map((url) => (
              <img key={url} src={url} alt={detail.name} className="h-24 w-32 shrink-0 rounded-[var(--radius-md)] object-cover" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
