// Cardápio do cliente (história 03). GET /establishments/:id/menu — não
// exige sessão (modo consulta sem QR). Estabelecimento não ACTIVE → 404.

import { findAll } from '../storage'
import { apiError } from '../errors'
import { establishmentsService, deriveOperationalStatus } from './establishments'
import { resolvePromoForItem } from './promotions'
import { matchesSearch } from '../../lib/text'
import type { EstablishmentHours, EstablishmentSpecialHours, MenuCategory, MenuItem, OperationalStatus } from '../types'

export interface MenuItemView {
  id: string
  name: string
  description: string
  priceCents: number
  promoPriceCents: number | null
  promoLabel: string | null
  photoUrl: string | null
  isFeatured: boolean
  isAvailable: boolean
}

export interface MenuCategoryView {
  id: string
  name: string
  items: MenuItemView[]
}

export interface MenuView {
  establishmentId: string
  menuVersion: number
  operationalStatus: OperationalStatus
  categories: MenuCategoryView[]
}

export interface GetMenuParams {
  q?: string
  categoryId?: string
}

function matchesItemQuery(item: MenuItem, q: string): boolean {
  if (!q.trim()) return true
  return matchesSearch(item.name, q) || matchesSearch(item.description, q)
}

export function getMenu(establishmentId: string, params: GetMenuParams = {}): MenuView {
  const establishment = establishmentsService.getPublic(establishmentId)

  const hours = findAll<EstablishmentHours>('establishmentHours').filter((h) => h.establishmentId === establishmentId)
  const specialHours = findAll<EstablishmentSpecialHours>('establishmentSpecialHours').filter((h) => h.establishmentId === establishmentId)
  const { status } = deriveOperationalStatus(establishment, hours, specialHours)

  const categories = findAll<MenuCategory>('menuCategories')
    .filter((c) => c.establishmentId === establishmentId && c.isActive)
    .filter((c) => !params.categoryId || c.id === params.categoryId)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const allItems = findAll<MenuItem>('menuItems').filter((i) => i.establishmentId === establishmentId && i.isActive && !i.deletedAt)

  const categoryViews: MenuCategoryView[] = categories
    .map((category) => {
      const items = allItems
        .filter((item) => item.categoryId === category.id)
        .filter((item) => matchesItemQuery(item, params.q ?? ''))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => toItemView(establishment.id, item, establishment.timezone))
      return { id: category.id, name: category.name, items }
    })
    // "categoria sem itens não aparece" (spec história 03, caso de borda)
    .filter((category) => category.items.length > 0)

  return { establishmentId, menuVersion: establishment.menuVersion, operationalStatus: status, categories: categoryViews }
}

function toItemView(establishmentId: string, item: MenuItem, timezone: string): MenuItemView {
  const promo = resolvePromoForItem(establishmentId, item, timezone)
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    priceCents: item.priceCents,
    promoPriceCents: promo?.priceCents ?? null,
    promoLabel: promo?.label ?? null,
    photoUrl: item.photoUrl,
    isFeatured: item.isFeatured,
    isAvailable: item.isAvailable,
  }
}

/** Helper de preparação pro carrinho (Sprint 2, spec história 19): nunca deixa pedir item indisponível/excluído. */
export function assertItemOrderable(itemId: string): void {
  const item = findAll<MenuItem>('menuItems').find((i) => i.id === itemId)
  if (!item || item.deletedAt || !item.isAvailable) {
    throw apiError('ITEM_UNAVAILABLE', 422)
  }
}
