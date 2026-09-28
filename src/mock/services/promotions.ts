// Promoções e descontos (história 29). Resolução de preço promocional é lida
// por qualquer um (cardápio do cliente); CRUD é do gestor.

import { z } from 'zod'
import { findAll, findById, upsert, removeById } from '../storage'
import { apiError } from '../errors'
import { assertEstablishmentAccess, requireSession } from '../guard'
import { useSessionStore } from '../session'
import { entitlements } from '../entitlements'
import { audit } from './audit'
import { newId, nowISO } from '../../lib/id'
import { isWithinWindow, partsInTimezone } from '../../lib/hours'
import { applyPercentDiscount } from '../../lib/money'
import type { MenuItem, Promotion, PromotionTarget, Session } from '../types'

// ---------------------------------------------------------------------------
// Vigência e resolução de preço (usado pelo cardápio do cliente, história 03)
// ---------------------------------------------------------------------------

/** "Vigente agora" (spec história 29): ativo, dia da semana e horário local batem. Calculado a cada leitura, sem job. */
export function isPromotionActiveNow(promotion: Promotion, timezone: string, now: Date = new Date()): boolean {
  if (!promotion.isActive) return false

  const { weekday, time, date } = partsInTimezone(now, timezone)
  if (promotion.validFrom && date < promotion.validFrom) return false
  if (promotion.validUntil && date > promotion.validUntil) return false

  const crossesMidnight = promotion.endTime < promotion.startTime
  if (promotion.weekdays.includes(weekday)) {
    return isWithinWindow(time, promotion.startTime, promotion.endTime)
  }
  // janela que cruza a meia-noite também vale na madrugada do dia seguinte (spec história 29)
  if (crossesMidnight) {
    const yesterday = (weekday + 6) % 7
    if (promotion.weekdays.includes(yesterday)) return time < promotion.endTime
  }
  return false
}

function applyDiscount(priceCents: number, promotion: Promotion): number {
  if (promotion.discountType === 'PERCENT') return applyPercentDiscount(priceCents, promotion.discountValue)
  return promotion.discountValue // FIXED_PRICE_CENTS
}

function targetsItem(promotion: Promotion, targets: PromotionTarget[], item: MenuItem): boolean {
  if (promotion.scope === 'ALL') return true
  const own = targets.filter((t) => t.promotionId === promotion.id)
  if (promotion.scope === 'CATEGORIES') return own.some((t) => t.categoryId === item.categoryId)
  return own.some((t) => t.menuItemId === item.id) // ITEMS
}

/** Escolhe a promoção vigente que dá o **menor preço final** pro item — nunca acumula (spec história 29). */
export function resolvePromoForItem(
  establishmentId: string,
  item: MenuItem,
  timezone: string,
  now: Date = new Date(),
): { priceCents: number; label: string } | null {
  if (!item.isActive) return null
  if (!entitlements.hasFeature(establishmentId, 'PROMOTIONS')) return null

  const targets = findAll<PromotionTarget>('promotionTargets')
  const candidates = findAll<Promotion>('promotions').filter(
    (p) => p.establishmentId === establishmentId && isPromotionActiveNow(p, timezone, now) && targetsItem(p, targets, item),
  )
  if (candidates.length === 0) return null

  let best: { priceCents: number; label: string } | null = null
  for (const promotion of candidates) {
    const priceCents = applyDiscount(item.priceCents, promotion)
    if (!best || priceCents < best.priceCents) best = { priceCents, label: promotion.label }
  }
  return best
}

// ---------------------------------------------------------------------------
// CRUD do gestor
// ---------------------------------------------------------------------------

function currentSession(): Session {
  return requireSession(useSessionStore.getState().session)
}

function requireManagerWithFeature(establishmentId: string): Session {
  const session = currentSession()
  assertEstablishmentAccess(session, establishmentId, ['MANAGER'])
  entitlements.assertFeature(establishmentId, 'PROMOTIONS')
  return session
}

const promotionSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome é obrigatório.').max(80),
    scope: z.enum(['ALL', 'CATEGORIES', 'ITEMS']),
    discountType: z.enum(['PERCENT', 'FIXED_PRICE_CENTS']),
    discountValue: z.number().int(),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1, 'Selecione ao menos 1 dia.'),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    validFrom: z.string().trim().optional(),
    validUntil: z.string().trim().optional(),
    label: z.string().trim().min(1, 'Selo é obrigatório.').max(40),
    isActive: z.boolean(),
    categoryIds: z.array(z.string()).optional(),
    menuItemIds: z.array(z.string()).optional(),
  })
  .refine((d) => d.discountType !== 'PERCENT' || (d.discountValue >= 1 && d.discountValue <= 95), {
    message: 'Desconto percentual deve ser de 1 a 95.',
    path: ['discountValue'],
  })
  .refine((d) => d.scope !== 'CATEGORIES' || (d.categoryIds && d.categoryIds.length > 0), {
    message: 'Selecione ao menos 1 categoria.',
    path: ['categoryIds'],
  })
  .refine((d) => d.scope !== 'ITEMS' || (d.menuItemIds && d.menuItemIds.length > 0), {
    message: 'Selecione ao menos 1 item.',
    path: ['menuItemIds'],
  })
  // preço fixo só faz sentido apontado a itens específicos, cada um com seu próprio preço-base
  .refine((d) => d.discountType !== 'FIXED_PRICE_CENTS' || d.scope === 'ITEMS', {
    message: 'Preço fixo exige escopo "Itens".',
    path: ['discountType'],
  })

export type PromotionInput = z.infer<typeof promotionSchema>

export type PromotionDerivedStatus = 'ACTIVE_NOW' | 'SCHEDULED' | 'INACTIVE'

export interface PromotionView {
  promotion: Promotion
  targets: PromotionTarget[]
  status: PromotionDerivedStatus
}

function deriveStatus(promotion: Promotion, timezone: string): PromotionDerivedStatus {
  if (!promotion.isActive) return 'INACTIVE'
  return isPromotionActiveNow(promotion, timezone) ? 'ACTIVE_NOW' : 'SCHEDULED'
}

function establishmentTimezone(establishmentId: string): string {
  return findById<{ timezone: string }>('establishments', establishmentId)?.timezone ?? 'America/Sao_Paulo'
}

function toView(promotion: Promotion): PromotionView {
  return {
    promotion,
    targets: findAll<PromotionTarget>('promotionTargets').filter((t) => t.promotionId === promotion.id),
    status: deriveStatus(promotion, establishmentTimezone(promotion.establishmentId)),
  }
}

function validatePriceAgainstItems(data: PromotionInput): void {
  if (data.discountType !== 'FIXED_PRICE_CENTS') return
  for (const itemId of data.menuItemIds ?? []) {
    const item = findById<MenuItem>('menuItems', itemId)
    if (item && data.discountValue >= item.priceCents) {
      throw apiError('VALIDATION_ERROR', 400, { field: 'discountValue', reason: 'must be lower than item price' })
    }
  }
}

export const promotionsService = {
  list(establishmentId: string): PromotionView[] {
    requireManagerWithFeature(establishmentId)
    return findAll<Promotion>('promotions')
      .filter((p) => p.establishmentId === establishmentId)
      .map(toView)
  },

  create(establishmentId: string, input: PromotionInput): PromotionView {
    const session = requireManagerWithFeature(establishmentId)
    const parsed = promotionSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
    validatePriceAgainstItems(parsed.data)

    const now = nowISO()
    const promotion: Promotion = {
      id: newId(),
      establishmentId,
      name: parsed.data.name,
      scope: parsed.data.scope,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      weekdays: parsed.data.weekdays,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      validFrom: parsed.data.validFrom || null,
      validUntil: parsed.data.validUntil || null,
      label: parsed.data.label,
      isActive: parsed.data.isActive,
      createdBy: session.userId,
      createdAt: now,
      updatedAt: now,
    }
    upsert('promotions', promotion)
    writeTargets(promotion.id, parsed.data)

    audit.log({
      actorUserId: session.userId,
      establishmentId,
      entity: 'Promotion',
      entityId: promotion.id,
      action: 'CREATED',
      before: null,
      after: { name: promotion.name },
    })
    return toView(promotion)
  },

  update(establishmentId: string, promotionId: string, input: PromotionInput): PromotionView {
    const session = requireManagerWithFeature(establishmentId)
    const current = findById<Promotion>('promotions', promotionId)
    if (!current || current.establishmentId !== establishmentId) throw apiError('NOT_FOUND', 404)

    const parsed = promotionSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
    validatePriceAgainstItems(parsed.data)

    const updated: Promotion = {
      ...current,
      name: parsed.data.name,
      scope: parsed.data.scope,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      weekdays: parsed.data.weekdays,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      validFrom: parsed.data.validFrom || null,
      validUntil: parsed.data.validUntil || null,
      label: parsed.data.label,
      isActive: parsed.data.isActive,
      updatedAt: nowISO(),
    }
    upsert('promotions', updated)
    writeTargets(promotionId, parsed.data)

    audit.log({
      actorUserId: session.userId,
      establishmentId,
      entity: 'Promotion',
      entityId: promotionId,
      action: 'UPDATED',
      before: { name: current.name },
      after: { name: updated.name },
    })
    return toView(updated)
  },

  delete(establishmentId: string, promotionId: string): void {
    const session = requireManagerWithFeature(establishmentId)
    const current = findById<Promotion>('promotions', promotionId)
    if (!current || current.establishmentId !== establishmentId) throw apiError('NOT_FOUND', 404)

    removeById('promotions', promotionId)
    for (const target of findAll<PromotionTarget>('promotionTargets').filter((t) => t.promotionId === promotionId)) {
      removeById('promotionTargets', target.id)
    }

    audit.log({
      actorUserId: session.userId,
      establishmentId,
      entity: 'Promotion',
      entityId: promotionId,
      action: 'DELETED',
      before: { name: current.name },
      after: null,
    })
  },
}

function writeTargets(promotionId: string, data: PromotionInput): void {
  for (const existing of findAll<PromotionTarget>('promotionTargets').filter((t) => t.promotionId === promotionId)) {
    removeById('promotionTargets', existing.id)
  }
  const now = nowISO()
  const ids = data.scope === 'CATEGORIES' ? (data.categoryIds ?? []) : data.scope === 'ITEMS' ? (data.menuItemIds ?? []) : []
  for (const id of ids) {
    const target: PromotionTarget = {
      id: newId(),
      promotionId,
      categoryId: data.scope === 'CATEGORIES' ? id : null,
      menuItemId: data.scope === 'ITEMS' ? id : null,
      createdAt: now,
      updatedAt: now,
    }
    upsert('promotionTargets', target)
  }
}
