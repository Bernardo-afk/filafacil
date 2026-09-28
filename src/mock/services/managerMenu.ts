// Gestor · Cardápio (história 28) + disponibilidade (história 19, mesmo
// endpoint). Toda mudança incrementa `menuVersion` e, só depois de gravar,
// emite `menu.updated` (spec história 28: "toda mudança... e só depois de
// gravar no localStorage, emite menu.updated").

import { z } from 'zod'
import { findAll, findById, upsert } from '../storage'
import { apiError } from '../errors'
import { assertEstablishmentAccess, requireSession } from '../guard'
import { useSessionStore } from '../session'
import { audit } from './audit'
import { emit } from '../events'
import { newId, nowISO } from '../../lib/id'
import { centsFromReais } from '../../lib/money'
import type { AuditLog, Establishment, MembershipRole, MenuCategory, MenuItem, Session } from '../types'

const MANAGER_ONLY: MembershipRole[] = ['MANAGER']
/** "Deixe a permissão configurável" (spec história 19) — quem pode marcar item indisponível. */
export const AVAILABILITY_ROLES: MembershipRole[] = ['ATTENDANT', 'SUPERVISOR', 'MANAGER']

function currentSession(): Session {
  return requireSession(useSessionStore.getState().session)
}

function requireManager(establishmentId: string): { session: Session; establishment: Establishment } {
  const session = currentSession()
  const establishment = assertEstablishmentAccess(session, establishmentId, MANAGER_ONLY)
  return { session, establishment }
}

function bumpMenuVersionAndEmit(establishment: Establishment): void {
  const updated: Establishment = { ...establishment, menuVersion: establishment.menuVersion + 1, updatedAt: nowISO() }
  upsert('establishments', updated)
  emit('menu.updated', { establishmentId: establishment.id, menuVersion: updated.menuVersion })
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(60),
  sortOrder: z.number().int().min(0).optional(),
})
export type CategoryInput = z.infer<typeof categorySchema>

export const managerMenuService = {
  listCategories(establishmentId: string): MenuCategory[] {
    const { establishment } = requireManager(establishmentId)
    return findAll<MenuCategory>('menuCategories')
      .filter((c) => c.establishmentId === establishment.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  },

  createCategory(establishmentId: string, input: CategoryInput): MenuCategory {
    const { establishment } = requireManager(establishmentId)
    const parsed = categorySchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })

    const existing = findAll<MenuCategory>('menuCategories').filter((c) => c.establishmentId === establishment.id)
    const now = nowISO()
    const category: MenuCategory = {
      id: newId(),
      establishmentId: establishment.id,
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder ?? existing.length,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }
    upsert('menuCategories', category)
    bumpMenuVersionAndEmit(establishment)
    audit.log({
      actorUserId: currentSession().userId,
      establishmentId,
      entity: 'MenuCategory',
      entityId: category.id,
      action: 'CREATED',
      before: null,
      after: { name: category.name },
    })
    return category
  },

  updateCategory(establishmentId: string, categoryId: string, input: CategoryInput): MenuCategory {
    const { establishment } = requireManager(establishmentId)
    const current = findById<MenuCategory>('menuCategories', categoryId)
    if (!current || current.establishmentId !== establishment.id) throw apiError('NOT_FOUND', 404)

    const parsed = categorySchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })

    const updated: MenuCategory = { ...current, name: parsed.data.name, sortOrder: parsed.data.sortOrder ?? current.sortOrder, updatedAt: nowISO() }
    upsert('menuCategories', updated)
    bumpMenuVersionAndEmit(establishment)
    audit.log({
      actorUserId: currentSession().userId,
      establishmentId,
      entity: 'MenuCategory',
      entityId: categoryId,
      action: 'UPDATED',
      before: { name: current.name },
      after: { name: updated.name },
    })
    return updated
  },

  /** Só exclui categoria vazia (spec: "422 CATEGORY_NOT_EMPTY"). */
  deleteCategory(establishmentId: string, categoryId: string): void {
    const { establishment } = requireManager(establishmentId)
    const current = findById<MenuCategory>('menuCategories', categoryId)
    if (!current || current.establishmentId !== establishment.id) throw apiError('NOT_FOUND', 404)

    const hasItems = findAll<MenuItem>('menuItems').some((i) => i.categoryId === categoryId && !i.deletedAt)
    if (hasItems) throw apiError('CATEGORY_NOT_EMPTY', 422)

    upsert('menuCategories', { ...current, isActive: false, updatedAt: nowISO() })
    bumpMenuVersionAndEmit(establishment)
    audit.log({
      actorUserId: currentSession().userId,
      establishmentId,
      entity: 'MenuCategory',
      entityId: categoryId,
      action: 'DELETED',
      before: { name: current.name },
      after: null,
    })
  },

  // -------------------------------------------------------------------------
  // Itens
  // -------------------------------------------------------------------------

  /** GET /establishments/:id/menu-items (gestão) — exclui os removidos (deleted_at). */
  listItems(establishmentId: string): MenuItem[] {
    const { establishment } = requireManager(establishmentId)
    return findAll<MenuItem>('menuItems')
      .filter((i) => i.establishmentId === establishment.id && !i.deletedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  },

  /** Mesma listagem, mas pra quem só pode alternar disponibilidade (história 19: ATTENDANT/SUPERVISOR/MANAGER). */
  listItemsForAvailability(establishmentId: string): { establishment: Establishment; items: MenuItem[]; categories: MenuCategory[] } {
    const session = currentSession()
    const establishment = assertEstablishmentAccess(session, establishmentId, AVAILABILITY_ROLES)
    return {
      establishment,
      items: findAll<MenuItem>('menuItems')
        .filter((i) => i.establishmentId === establishment.id && !i.deletedAt)
        .sort((a, b) => a.sortOrder - b.sortOrder),
      categories: findAll<MenuCategory>('menuCategories').filter((c) => c.establishmentId === establishment.id),
    }
  },

  createItem(establishmentId: string, input: ItemInput): MenuItem {
    const { establishment } = requireManager(establishmentId)
    const data = parseItemInput(establishment.id, input)

    const now = nowISO()
    const item: MenuItem = {
      id: newId(),
      establishmentId: establishment.id,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      priceCents: data.priceCents,
      photoUrl: data.photoUrl,
      isAvailable: data.isAvailable,
      isFeatured: data.isFeatured,
      isActive: true,
      sortOrder: data.sortOrder,
      prepStation: null,
      prepTimeMin: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    upsert('menuItems', item)
    bumpMenuVersionAndEmit(establishment)
    audit.log({
      actorUserId: currentSession().userId,
      establishmentId,
      entity: 'MenuItem',
      entityId: item.id,
      action: 'CREATED',
      before: null,
      after: { name: item.name, priceCents: item.priceCents },
    })
    return item
  },

  updateItem(establishmentId: string, itemId: string, input: ItemInput): MenuItem {
    const { establishment } = requireManager(establishmentId)
    const current = findById<MenuItem>('menuItems', itemId)
    if (!current || current.establishmentId !== establishment.id || current.deletedAt) throw apiError('NOT_FOUND', 404)

    const data = parseItemInput(establishment.id, input)
    const updated: MenuItem = {
      ...current,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      priceCents: data.priceCents,
      photoUrl: data.photoUrl,
      isAvailable: data.isAvailable,
      isFeatured: data.isFeatured,
      sortOrder: data.sortOrder,
      updatedAt: nowISO(),
    }
    upsert('menuItems', updated)
    bumpMenuVersionAndEmit(establishment)
    audit.log({
      actorUserId: currentSession().userId,
      establishmentId,
      entity: 'MenuItem',
      entityId: itemId,
      action: 'UPDATED',
      before: { priceCents: current.priceCents },
      after: { priceCents: updated.priceCents },
    })
    return updated
  },

  /** Exclusão lógica — continua existindo com `deletedAt` preenchido (spec história 28). */
  deleteItem(establishmentId: string, itemId: string): void {
    const { establishment } = requireManager(establishmentId)
    const current = findById<MenuItem>('menuItems', itemId)
    if (!current || current.establishmentId !== establishment.id || current.deletedAt) throw apiError('NOT_FOUND', 404)

    const now = nowISO()
    upsert('menuItems', { ...current, isActive: false, deletedAt: now, updatedAt: now })
    bumpMenuVersionAndEmit(establishment)
    audit.log({
      actorUserId: currentSession().userId,
      establishmentId,
      entity: 'MenuItem',
      entityId: itemId,
      action: 'DELETED',
      before: { name: current.name },
      after: null,
    })
  },

  /** PATCH .../:itemId/availability — mesmo endpoint da história 19 (gestor também pode, spec). */
  setAvailability(establishmentId: string, itemId: string, isAvailable: boolean): MenuItem {
    const session = currentSession()
    const establishment = assertEstablishmentAccess(session, establishmentId, AVAILABILITY_ROLES)
    const current = findById<MenuItem>('menuItems', itemId)
    if (!current || current.establishmentId !== establishment.id || current.deletedAt) throw apiError('NOT_FOUND', 404)

    const updated: MenuItem = { ...current, isAvailable, updatedAt: nowISO() }
    upsert('menuItems', updated)
    bumpMenuVersionAndEmit(establishment)
    audit.log({
      actorUserId: session.userId,
      establishmentId,
      entity: 'MenuItem',
      entityId: itemId,
      action: 'AVAILABILITY_CHANGED',
      before: { isAvailable: current.isAvailable },
      after: { isAvailable },
    })
    return updated
  },

  /** GET .../:itemId/history — lê o AuditLog do item (spec história 19: quem alterna também pode ver o histórico). */
  listItemHistory(establishmentId: string, itemId: string) {
    assertEstablishmentAccess(currentSession(), establishmentId, AVAILABILITY_ROLES)
    return findAll<AuditLog>('auditLogs')
      .filter((l) => l.entity === 'MenuItem' && l.entityId === itemId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  /** POST .../:itemId/photo — JPEG/PNG/WebP até 5 MB (spec história 28). Sem storage real: usa object URL. */
  validatePhoto(file: { type: string; size: number }): void {
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
    const MAX_BYTES = 5 * 1024 * 1024
    if (!ALLOWED.includes(file.type) || file.size > MAX_BYTES) {
      throw apiError('INVALID_IMAGE', 400)
    }
  },
}

// ---------------------------------------------------------------------------
// Validação de item
// ---------------------------------------------------------------------------

const itemSchema = z.object({
  categoryId: z.string().trim().min(1, 'Categoria é obrigatória.'),
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(120),
  description: z.string().trim().max(400).optional(),
  priceCents: z.number().int('Preço deve ser em centavos inteiros.').min(1, 'Preço mínimo de R$ 0,01.'),
  photoUrl: z.string().trim().nullable().optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})
export type ItemInput = z.input<typeof itemSchema>

function parseItemInput(establishmentId: string, input: ItemInput) {
  const parsed = itemSchema.safeParse(input)
  if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
  const data = parsed.data

  const category = findById<MenuCategory>('menuCategories', data.categoryId)
  if (!category || category.establishmentId !== establishmentId) throw apiError('NOT_FOUND', 404, { field: 'categoryId' })

  const existingCount = findAll<MenuItem>('menuItems').filter((i) => i.establishmentId === establishmentId).length
  return {
    categoryId: data.categoryId,
    name: data.name,
    description: data.description ?? '',
    priceCents: data.priceCents,
    photoUrl: data.photoUrl ?? null,
    isAvailable: data.isAvailable ?? true,
    isFeatured: data.isFeatured ?? false,
    sortOrder: data.sortOrder ?? existingCount,
  }
}

/** Preço com vírgula na UI → centavos inteiros sem erro de arredondamento (spec história 28). */
export function priceCentsFromBRLInput(value: string): number {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.')
  return centsFromReais(Number(normalized) || 0)
}
