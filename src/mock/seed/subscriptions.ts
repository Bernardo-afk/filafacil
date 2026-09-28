// Assinaturas por organização (spec §3 Subscription, §8).

import type { Subscription } from '../types'
import { ORG_IDS, PLAN_IDS, SUBSCRIPTION_IDS } from './ids'

const NOW = new Date().toISOString()
const NEXT_BILLING = '2026-10-02T12:00:00.000Z' // "próximo vencimento 02/10/2026" (spec §5, história 37)

function subscription(id: string, organizationId: string, planId: string): Subscription {
  return {
    id,
    organizationId,
    planId,
    status: 'ACTIVE',
    startedAt: NOW,
    endsAt: null,
    canceledAt: null,
    nextBillingAt: NEXT_BILLING,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

export function buildSubscriptions(): Subscription[] {
  return [
    subscription(SUBSCRIPTION_IDS.GRUPO_BAR_DO_ZE, ORG_IDS.GRUPO_BAR_DO_ZE, PLAN_IDS.PRO),
    subscription(SUBSCRIPTION_IDS.BELA_VISTA, ORG_IDS.BELA_VISTA, PLAN_IDS.START),
    subscription(SUBSCRIPTION_IDS.BOTECO_CORP, ORG_IDS.BOTECO_CORP, PLAN_IDS.BUSINESS),
    subscription(SUBSCRIPTION_IDS.BAR_DO_MESTRE, ORG_IDS.BAR_DO_MESTRE, PLAN_IDS.PRO),
    subscription(SUBSCRIPTION_IDS.CANTINA, ORG_IDS.CANTINA, PLAN_IDS.START),
    subscription(SUBSCRIPTION_IDS.LANCHERIA, ORG_IDS.LANCHERIA, PLAN_IDS.START),
  ]
}
