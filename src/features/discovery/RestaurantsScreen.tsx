import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Search, SlidersHorizontal, MapPin, List, Map as MapIcon, QrCode } from 'lucide-react'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { RestaurantCard } from './RestaurantCard'
import { searchEstablishments, type SearchEstablishmentsParams, type SortOption } from '../../mock/services/discovery'
import { getClientLocation } from '../../lib/clientLocation'
import { CATEGORY_LABELS } from '../../lib/establishmentCategory'
import type { EstablishmentCategory } from '../../mock/types'

type Chip = 'all' | 'open' | 'nearest' | 'least_wait' | 'bars' | 'restaurants'

const CHIPS: Array<{ id: Chip; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'open', label: 'Aberto agora' },
  { id: 'nearest', label: 'Mais próximos' },
  { id: 'least_wait', label: 'Menor espera' },
  { id: 'bars', label: 'Bares' },
  { id: 'restaurants', label: 'Restaurantes' },
]

const SORT_LABELS: Record<SortOption, string> = {
  recommended: 'Recomendados',
  distance: 'Mais próximos',
  wait: 'Menor espera',
  rating: 'Melhor avaliados',
}

const RADIUS_OPTIONS = [
  { label: 'Qualquer distância', value: undefined },
  { label: 'Até 1 km', value: 1000 },
  { label: 'Até 3 km', value: 3000 },
  { label: 'Até 5 km', value: 5000 },
]

const WAIT_OPTIONS = [
  { label: 'Qualquer espera', value: undefined },
  { label: 'Até 15 min', value: 15 },
  { label: 'Até 30 min', value: 30 },
]

// ExploreScreen (spec história 11): busca, chips, filtros (folha), ordenação
// e lista de RestaurantCard. Mapa fica desabilitado (decisão: sem Leaflet,
// app precisa funcionar offline). Favoritos e pagamento ficam fora da Sprint 1.
export function RestaurantsScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useMemo(() => getClientLocation(), [])

  const [q, setQ] = useState(() => searchParams.get('q') ?? '')
  const [activeChip, setActiveChip] = useState<Chip>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [acceptingOrders, setAcceptingOrders] = useState(false)
  const [radiusMeters, setRadiusMeters] = useState<number | undefined>(undefined)
  const [maxWaitMinutes, setMaxWaitMinutes] = useState<number | undefined>(undefined)
  const [category, setCategory] = useState<EstablishmentCategory | undefined>(undefined)
  const [sort, setSort] = useState<SortOption>('recommended')

  function selectChip(chip: Chip) {
    setActiveChip(chip)
    if (chip === 'all') {
      setCategory(undefined)
      setSort('recommended')
    } else if (chip === 'nearest') {
      setSort('distance')
    } else if (chip === 'least_wait') {
      setSort('wait')
    } else if (chip === 'bars') {
      setCategory('BAR')
    } else if (chip === 'restaurants') {
      setCategory('RESTAURANT')
    }
  }

  const params: SearchEstablishmentsParams = {
    lat: location.lat ?? undefined,
    lng: location.lng ?? undefined,
    q,
    openNow: activeChip === 'open',
    acceptingOrders,
    radiusMeters,
    maxWaitMinutes,
    category,
    sort,
    pageSize: 50,
  }

  const [result, setResult] = useState(() => searchEstablishments(params))
  useEffect(() => {
    setResult(searchEstablishments(params))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, activeChip, acceptingOrders, radiusMeters, maxWaitMinutes, category, sort])

  const activeFilterCount = [acceptingOrders, radiusMeters != null, maxWaitMinutes != null, category != null].filter(Boolean).length

  function clearFilters() {
    setAcceptingOrders(false)
    setRadiusMeters(undefined)
    setMaxWaitMinutes(undefined)
    setCategory(undefined)
  }

  return (
    <div className="flex flex-col pb-6">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button type="button" onClick={() => navigate(-1)} aria-label="Voltar" className="text-foreground">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-card px-3 py-2">
          <Search size={16} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar restaurante, tipo, prato…"
            className="w-full bg-transparent font-body text-sm text-foreground outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className="relative flex items-center gap-1 rounded-full border border-border px-3 py-2 text-sm font-semibold text-foreground"
        >
          <SlidersHorizontal size={16} />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => selectChip(chip.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
              activeChip === chip.id ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 pb-2">
        <p className="text-sm text-muted-foreground">{result.total} estabelecimentos encontrados</p>
        <div className="flex items-center gap-1 rounded-full border border-border p-0.5">
          <button type="button" className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
            <List size={14} /> Lista
          </button>
          <button
            type="button"
            disabled
            title="Em breve — mapa depende de conexão com a internet"
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-muted-foreground"
          >
            <MapIcon size={14} /> Mapa
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4">
        {result.items.map((item) => (
          <RestaurantCard key={item.id} item={item} />
        ))}

        {result.items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <MapPin size={32} className="text-muted-foreground" />
            <h2 className="font-display text-lg font-semibold text-foreground">Ainda não encontramos FilaZero por perto</h2>
            <p className="max-w-xs text-sm text-muted-foreground">Tente aumentar a área de busca ou procurar outra região.</p>
            <div className="flex gap-2">
              <LoadingButton variant="secondary" onClick={() => navigate('/app/localizacao')}>
                Alterar localização
              </LoadingButton>
              <LoadingButton disabled title="Em breve">
                <QrCode size={16} /> Escanear QR Code
              </LoadingButton>
            </div>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40" role="dialog" aria-modal="true">
          <div className="mx-auto max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-t-[var(--radius-xl)] bg-card p-6">
            <h2 className="mb-4 font-display text-lg font-bold text-foreground">Filtros</h2>

            <div className="mb-5">
              <h3 className="mb-2 font-body text-sm font-semibold text-foreground">Ordenar por</h3>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm text-foreground"
              >
                {Object.entries(SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-5">
              <h3 className="mb-2 font-body text-sm font-semibold text-foreground">Funcionamento</h3>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={acceptingOrders} onChange={(e) => setAcceptingOrders(e.target.checked)} className="h-4 w-4 accent-primary" />
                Aceitando pedidos
              </label>
            </div>

            <div className="mb-5">
              <h3 className="mb-2 font-body text-sm font-semibold text-foreground">Distância</h3>
              <div className="flex flex-wrap gap-2">
                {RADIUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setRadiusMeters(opt.value)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                      radiusMeters === opt.value ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <h3 className="mb-2 font-body text-sm font-semibold text-foreground">Espera</h3>
              <div className="flex flex-wrap gap-2">
                {WAIT_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setMaxWaitMinutes(opt.value)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                      maxWaitMinutes === opt.value ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="mb-2 font-body text-sm font-semibold text-foreground">Tipo</h3>
              <select
                value={category ?? ''}
                onChange={(e) => setCategory((e.target.value || undefined) as EstablishmentCategory | undefined)}
                className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm text-foreground"
              >
                <option value="">Todos os tipos</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <LoadingButton variant="secondary" className="flex-1" onClick={clearFilters}>
                Limpar filtros
              </LoadingButton>
              <LoadingButton className="flex-1" onClick={() => setShowFilters(false)}>
                Ver resultados
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
