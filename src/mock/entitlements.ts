// entitlements.assert/limit (spec §4 decisão 4, história 37). Resolvem
// estabelecimento → organização → assinatura ativa lendo a coleção a cada
// chamada (sem cache): trocar de plano vale na hora, mesmo sem recarregar.

import { findAll, findById } from './storage'
import { apiError } from './errors'
import type { Establishment, Plan, PlanFeature, PlanFeatureKey, Subscription } from './types'

function activeSubscriptionFor(organizationId: string): Subscription | null {
  const subs = findAll<Subscription>('subscriptions').filter((s) => s.organizationId === organizationId)
  return subs.find((s) => s.status === 'ACTIVE' || s.status === 'TRIAL') ?? null
}

function planFor(organizationId: string): Plan | null {
  const subscription = activeSubscriptionFor(organizationId)
  if (!subscription) return null
  return findById<Plan>('plans', subscription.planId)
}

function feature(planId: string, key: PlanFeatureKey): PlanFeature | null {
  return findAll<PlanFeature>('planFeatures').find((f) => f.planId === planId && f.key === key) ?? null
}

function organizationIdForEstablishment(establishmentId: string): string {
  const establishment = findById<Establishment>('establishments', establishmentId)
  if (!establishment) throw apiError('NOT_FOUND', 404)
  return establishment.organizationId
}

export const entitlements = {
  /** Lança FEATURE_NOT_IN_PLAN se o recurso liga/desliga (boolValue) não está no plano ativo. */
  assertFeature(establishmentId: string, key: PlanFeatureKey): void {
    const organizationId = organizationIdForEstablishment(establishmentId)
    const plan = planFor(organizationId)
    if (!plan) throw apiError('FEATURE_NOT_IN_PLAN', 403)
    if (!feature(plan.id, key)?.boolValue) throw apiError('FEATURE_NOT_IN_PLAN', 403)
  },

  hasFeature(establishmentId: string, key: PlanFeatureKey): boolean {
    try {
      entitlements.assertFeature(establishmentId, key)
      return true
    } catch {
      return false
    }
  },

  /** Lança PLAN_LIMIT_REACHED se currentCount já atingiu o limite intValue (null = ilimitado). */
  assertUnitLimit(organizationId: string, currentCount: number): void {
    const plan = planFor(organizationId)
    if (!plan) throw apiError('PLAN_LIMIT_REACHED', 403)
    const maxUnits = feature(plan.id, 'MAX_UNITS')
    if (maxUnits?.intValue != null && currentCount >= maxUnits.intValue) {
      throw apiError('PLAN_LIMIT_REACHED', 403)
    }
  },
}
