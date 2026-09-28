import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
import { getMenu, type MenuItemView, type MenuView } from '../../mock/services/menu'
import { establishmentsService } from '../../mock/services/establishments'
import { subscribe } from '../../mock/events'
import { isMockApiError } from '../../mock/errors'
import { formatCents } from '../../lib/money'
import { flags } from '../../lib/flags'

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Não foi possível carregar o cardápio.'
}

function MenuItemCard({ item }: { item: MenuItemView }) {
  return (
    <div className={`flex gap-3 rounded-[var(--radius-md)] border border-border bg-card p-3 ${!item.isAvailable ? 'opacity-60' : ''}`}>
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] bg-muted">
        {item.photoUrl ? (
          <img src={item.photoUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] text-muted-foreground">Sem foto</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <span className="font-body font-semibold text-foreground">{item.name}</span>
          {item.isFeatured && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">+ pedido</span>}
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex flex-col">
            {item.promoPriceCents != null ? (
              <>
                <span className="text-xs text-muted-foreground line-through">{formatCents(item.priceCents)}</span>
                <span className="font-body font-semibold text-foreground">{formatCents(item.promoPriceCents)}</span>
              </>
            ) : (
              <span className="font-body font-semibold text-foreground">{formatCents(item.priceCents)}</span>
            )}
            {item.promoLabel && <span className="w-fit rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-medium text-secondary">{item.promoLabel}</span>}
            {!item.isAvailable && <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Esgotado</span>}
          </div>
          {flags.ORDERING_ENABLED && (
            <button
              type="button"
              disabled={!item.isAvailable}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
              aria-label={`Adicionar ${item.name}`}
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Cardápio do cliente (história 03): busca, chips de categoria ("Mais
// pedidos" é derivado de isFeatured, não uma categoria cadastrada — spec),
// cards com promoção/esgotado. Assina `menu.updated` (história 28/19/29)
// pra refazer a consulta sem recarregar.
export function MenuScreen() {
  const { establishmentId } = useParams()
  const [establishmentName, setEstablishmentName] = useState('')
  const [q, setQ] = useState('')
  const [activeCategory, setActiveCategory] = useState<'featured' | string | null>(null)
  const [menu, setMenu] = useState<MenuView | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reload() {
    if (!establishmentId) return
    try {
      setEstablishmentName(establishmentsService.getPublic(establishmentId).name)
      setMenu(getMenu(establishmentId, { q, categoryId: activeCategory && activeCategory !== 'featured' ? activeCategory : undefined }))
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(reload, [establishmentId, q, activeCategory])

  useEffect(() => {
    if (!establishmentId) return
    return subscribe<{ establishmentId: string }>('menu.updated', (event) => {
      if (event.payload.establishmentId === establishmentId) reload()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId, q, activeCategory])

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="font-display text-lg font-semibold text-foreground">Cardápio indisponível</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }
  if (!menu) return null

  const consultOnly = !flags.ORDERING_ENABLED || menu.operationalStatus === 'PAUSED' || menu.operationalStatus === 'CLOSED'
  const featuredItems = menu.categories.flatMap((c) => c.items).filter((i) => i.isFeatured)
  const displayCategories =
    activeCategory === 'featured' ? [{ id: 'featured', name: 'Mais pedidos', items: featuredItems }] : menu.categories

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div>
        <h1 className="font-display text-lg font-bold text-foreground">{establishmentName}</h1>
      </div>

      {consultOnly && (
        <p className="rounded-[var(--radius-md)] bg-muted px-4 py-3 text-sm text-foreground">
          Você pode consultar o cardápio. Para fazer um pedido, confirme sua presença pelo QR Code do estabelecimento.
        </p>
      )}

      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-card px-3 py-2">
        <Search size={16} className="text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar no cardápio…"
          className="w-full bg-transparent font-body text-sm text-foreground outline-none"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
            activeCategory === null ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground'
          }`}
        >
          Todas
        </button>
        {featuredItems.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveCategory('featured')}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
              activeCategory === 'featured' ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground'
            }`}
          >
            Mais pedidos
          </button>
        )}
        {menu.categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveCategory(c.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
              activeCategory === c.id ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {displayCategories.map((category) => (
          <div key={category.id} className="flex flex-col gap-2">
            {activeCategory === null && <h2 className="font-display text-base font-bold text-foreground">{category.name}</h2>}
            {category.items.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        ))}
        {displayCategories.every((c) => c.items.length === 0) && (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item encontrado.</p>
        )}
      </div>
    </div>
  )
}
