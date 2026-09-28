// Planos de assinatura (spec §8, história 37). 🔶 preços tratados como seed editável.

import type { Plan, PlanFeature } from '../types'
import { PlanFeatureKey } from '../types'
import { PLAN_IDS } from './ids'

const NOW = new Date().toISOString()

export function buildPlans(): Plan[] {
  return [
    {
      id: PLAN_IDS.START,
      code: 'START',
      name: 'FilaZero Start',
      priceCents: 9900,
      billingPeriod: 'MONTHLY',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: PLAN_IDS.PRO,
      code: 'PRO',
      name: 'FilaZero Pro',
      priceCents: 29900,
      billingPeriod: 'MONTHLY',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: PLAN_IDS.BUSINESS,
      code: 'BUSINESS',
      name: 'FilaZero Business',
      priceCents: 79900,
      billingPeriod: 'MONTHLY',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]
}

function feature(id: string, planId: string, key: PlanFeatureKey, intValue: number | null, boolValue: boolean | null): PlanFeature {
  return { id, planId, key, intValue, boolValue, createdAt: NOW, updatedAt: NOW }
}

/** spec §8 tabela "Planos de seed". WAITLIST/RECIPE_SHEETS/PROMOTIONS: decisão 10.1 #15. */
export function buildPlanFeatures(): PlanFeature[] {
  const rows: Array<[PlanFeatureKey, number | null, boolean, boolean, boolean]> = [
    // key,                       MAX_UNITS(intValue ignorado aqui), start, pro, business
    [PlanFeatureKey.KDS, null, false, true, true],
    [PlanFeatureKey.LOYALTY, null, false, true, true],
    [PlanFeatureKey.ADVANCED_REPORTS, null, false, true, true],
    [PlanFeatureKey.API_ACCESS, null, false, true, true],
    [PlanFeatureKey.MULTI_UNIT, null, false, false, true],
    [PlanFeatureKey.DEDICATED_SLA, null, false, false, true],
    [PlanFeatureKey.ACCOUNT_MANAGER, null, false, false, true],
    [PlanFeatureKey.WHITE_LABEL, null, false, false, true],
    [PlanFeatureKey.PROMOTIONS, null, true, true, true],
    [PlanFeatureKey.RECIPE_SHEETS, null, false, true, true],
    [PlanFeatureKey.WAITLIST, null, false, true, true],
  ]

  const features: PlanFeature[] = [
    feature('feat-start-max-units', PLAN_IDS.START, PlanFeatureKey.MAX_UNITS, 1, null),
    feature('feat-pro-max-units', PLAN_IDS.PRO, PlanFeatureKey.MAX_UNITS, 3, null),
    feature('feat-business-max-units', PLAN_IDS.BUSINESS, PlanFeatureKey.MAX_UNITS, null, null),
  ]

  for (const [key, , start, pro, business] of rows) {
    features.push(feature(`feat-start-${key}`, PLAN_IDS.START, key, null, start))
    features.push(feature(`feat-pro-${key}`, PLAN_IDS.PRO, key, null, pro))
    features.push(feature(`feat-business-${key}`, PLAN_IDS.BUSINESS, key, null, business))
  }

  return features
}
