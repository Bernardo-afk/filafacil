import { useEffect, useState } from 'react'
import { managerMenuService } from '../../mock/services/managerMenu'
import { usersService } from '../../mock/services/users'
import { isMockApiError } from '../../mock/errors'
import { useSessionStore } from '../../mock/session'
import type { Establishment, MenuCategory, MenuItem } from '../../mock/types'

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

// MenuToggleSection do atendente (spec história 19): toggle otimista, com
// reversão se a chamada falhar. ATTENDANT/SUPERVISOR/MANAGER podem alternar
// (default desta versão — spec RF19/decisão do grupo).
export function MenuAvailabilityScreen() {
  const establishmentId = useSessionStore((s) => s.session?.activeEstablishmentId ?? null)
  const [establishment, setEstablishment] = useState<Establishment | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const attendantName = usersService.meOrNull()?.firstName ?? ''

  function reload() {
    if (!establishmentId) return
    try {
      const view = managerMenuService.listItemsForAvailability(establishmentId)
      setEstablishment(view.establishment)
      setCategories(view.categories)
      setItems(view.items)
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(reload, [establishmentId])

  function categoryName(categoryId: string): string {
    return categories.find((c) => c.id === categoryId)?.name ?? '—'
  }

  async function toggle(item: MenuItem) {
    if (!establishmentId) return
    const optimistic = !item.isAvailable
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isAvailable: optimistic } : i)))
    try {
      managerMenuService.setAvailability(establishmentId, item.id, optimistic)
    } catch (err) {
      // reverte em caso de falha (spec história 19: "toggle otimista, com reversão se a API falhar")
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i)))
      setError(errorMessage(err))
    }
  }

  if (!establishmentId) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <p className="text-sm text-muted-foreground">Selecione um estabelecimento para continuar.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Disponibilidade do cardápio</h1>
        <p className="text-sm text-muted-foreground">
          {establishment?.name} · {attendantName}
        </p>
      </div>

      <p className="rounded-[var(--radius-md)] bg-muted px-4 py-3 text-sm text-foreground">
        Alterações refletem imediatamente no cardápio do cliente.
      </p>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-card p-4">
            <div>
              <p className="font-body font-semibold text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground">{categoryName(item.categoryId)}</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${item.isAvailable ? 'bg-success-bg text-success' : 'bg-muted text-muted-foreground'}`}>
                {item.isAvailable ? 'Disponível' : 'Esgotado'}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={item.isAvailable}
              aria-label={`Alternar disponibilidade de ${item.name}`}
              onClick={() => toggle(item)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${item.isAvailable ? 'bg-success' : 'bg-muted'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${item.isAvailable ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
