import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronDown } from 'lucide-react'
import { RestaurantCard } from './RestaurantCard'
import { searchEstablishments } from '../../mock/services/discovery'
import { usersService } from '../../mock/services/users'
import { getClientLocation } from '../../lib/clientLocation'

const NEARBY_LIMIT = 6

// Home global (spec história 11): saudação, seletor de cidade, busca e
// "Perto de você". Sem produtos de cardápio nem os cartões fora da Sprint 1
// (QR, visitados recentemente, últimos pedidos).
export function HomeScreen() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const user = useMemo(() => usersService.meOrNull(), [])
  const location = useMemo(() => getClientLocation(), [])
  const nearby = useMemo(
    () => searchEstablishments({ lat: location.lat ?? undefined, lng: location.lng ?? undefined, sort: 'recommended', pageSize: NEARBY_LIMIT }),
    [location],
  )

  function goSearch() {
    navigate(`/app/restaurantes${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
  }

  return (
    <div className="flex flex-col gap-5 px-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold text-foreground">Olá{user ? `, ${user.firstName}` : ''} 👋</h1>
        <button type="button" onClick={() => navigate('/app/localizacao')} className="flex items-center gap-1 text-sm font-semibold text-foreground">
          {location.cityLabel}
          <ChevronDown size={16} />
        </button>
      </div>

      <button
        type="button"
        onClick={goSearch}
        className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-card px-4 py-3 text-left"
      >
        <Search size={18} className="text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.key === 'Enter' && goSearch()}
          placeholder="Buscar restaurante, tipo, prato…"
          className="w-full bg-transparent font-body text-sm text-foreground outline-none"
        />
      </button>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-foreground">Perto de você</h2>
          <button type="button" onClick={() => navigate('/app/restaurantes')} className="text-sm font-semibold text-primary">
            Ver todos
          </button>
        </div>
        {nearby.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum estabelecimento encontrado perto de você ainda.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {nearby.items.map((item) => (
              <RestaurantCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
