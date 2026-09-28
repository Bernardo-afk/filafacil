// Admin · Planos (história 37). Só PLATFORM_ADMIN chama qualquer função
// daqui. Contrato: GET/POST /admin/plans, PATCH /admin/plans/:id, PUT
// /admin/organizations/:id/subscription ({ planId }).

import { z } from 'zod'
import { findAll, findById, upsert } from '../storage'
import { apiError } from '../errors'
import { requireRole, requireSession } from '../guard'
import { useSessionStore } from '../session'
import { audit } from './audit'
import { newId, nowISO } from '../../lib/id'
import { PlanFeatureKey } from '../types'
import type { Organization, Plan, PlanFeature, Subscription } from '../types'

function currentAdminId(): string {
  const session = requireSession(useSessionStore.getState().session)
  return requireRole(session, ['PLATFORM_ADMIN']).id
}

/** Chaves booleanas (tudo, exceto MAX_UNITS, que é numérico — spec §8 tabela de planos). */
const BOOLEAN_FEATURE_KEYS = Object.values(PlanFeatureKey).filter(
  (key) => key !== PlanFeatureKey.MAX_UNITS,
) as Array<Exclude<PlanFeatureKey, 'MAX_UNITS'>>

export interface AdminPlanDetail {
  plan: Plan
  maxUnits: number | null
  features: Record<Exclude<PlanFeatureKey, 'MAX_UNITS'>, boolean>
}

function toDetail(plan: Plan): AdminPlanDetail {
  const rows = findAll<PlanFeature>('planFeatures').filter((f) => f.planId === plan.id)
  const maxUnits = rows.find((f) => f.key === PlanFeatureKey.MAX_UNITS)?.intValue ?? null
  const features = Object.fromEntries(
    BOOLEAN_FEATURE_KEYS.map((key) => [key, Boolean(rows.find((f) => f.key === key)?.boolValue)]),
  ) as AdminPlanDetail['features']
  return { plan, maxUnits, features }
}

const planSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Código é obrigatório.')
    .max(30)
    .regex(/^[A-Z0-9_]+$/, 'Use só letras maiúsculas, números e "_".'),
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(80),
  priceCents: z.number().int('Preço deve ser em centavos inteiros.').min(0),
  billingPeriod: z.enum(['MONTHLY', 'YEARLY']),
  isActive: z.boolean(),
  maxUnits: z.number().int().min(1).nullable(),
  features: z.record(z.string(), z.boolean()),
})

export type AdminPlanInput = z.infer<typeof planSchema>

function assertUniqueCode(code: string, excludingId?: string): void {
  const exists = findAll<Plan>('plans').some((p) => p.code === code && p.id !== excludingId)
  if (exists) throw apiError('CONFLICT', 409, { field: 'code' })
}

function writeFeatures(planId: string, maxUnits: number | null, features: AdminPlanInput['features']): void {
  const now = nowISO()
  const existing = findAll<PlanFeature>('planFeatures').filter((f) => f.planId === planId)

  function upsertFeature(key: PlanFeatureKey, intValue: number | null, boolValue: boolean | null): void {
    const current = existing.find((f) => f.key === key)
    const row: PlanFeature = current
      ? { ...current, intValue, boolValue, updatedAt: now }
      : { id: newId(), planId, key, intValue, boolValue, createdAt: now, updatedAt: now }
    upsert('planFeatures', row)
  }

  upsertFeature(PlanFeatureKey.MAX_UNITS, maxUnits, null)
  for (const key of BOOLEAN_FEATURE_KEYS) {
    upsertFeature(key, null, Boolean(features[key]))
  }
}

export const adminPlansService = {
  list(): AdminPlanDetail[] {
    currentAdminId()
    return findAll<Plan>('plans')
      .sort((a, b) => a.priceCents - b.priceCents)
      .map(toDetail)
  },

  get(id: string): AdminPlanDetail {
    currentAdminId()
    const plan = findById<Plan>('plans', id)
    if (!plan) throw apiError('NOT_FOUND', 404)
    return toDetail(plan)
  },

  create(input: AdminPlanInput): AdminPlanDetail {
    const adminId = currentAdminId()
    const parsed = planSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
    const data = parsed.data

    assertUniqueCode(data.code)

    const now = nowISO()
    const plan: Plan = {
      id: newId(),
      code: data.code,
      name: data.name,
      priceCents: data.priceCents,
      billingPeriod: data.billingPeriod,
      isActive: data.isActive,
      createdAt: now,
      updatedAt: now,
    }
    upsert('plans', plan)
    writeFeatures(plan.id, data.maxUnits, data.features)

    audit.log({
      actorUserId: adminId,
      establishmentId: null,
      entity: 'Plan',
      entityId: plan.id,
      action: 'CREATED',
      before: null,
      after: { code: plan.code, priceCents: plan.priceCents },
    })

    return toDetail(plan)
  },

  update(id: string, input: AdminPlanInput): AdminPlanDetail {
    const adminId = currentAdminId()
    const current = findById<Plan>('plans', id)
    if (!current) throw apiError('NOT_FOUND', 404)

    const parsed = planSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
    const data = parsed.data

    assertUniqueCode(data.code, id)

    const updated: Plan = {
      ...current,
      code: data.code,
      name: data.name,
      priceCents: data.priceCents,
      billingPeriod: data.billingPeriod,
      isActive: data.isActive,
      updatedAt: nowISO(),
    }
    upsert('plans', updated)
    writeFeatures(id, data.maxUnits, data.features)

    audit.log({
      actorUserId: adminId,
      establishmentId: null,
      entity: 'Plan',
      entityId: id,
      action: 'UPDATED',
      before: { priceCents: current.priceCents, isActive: current.isActive },
      after: { priceCents: updated.priceCents, isActive: updated.isActive },
    })

    return toDetail(updated)
  },

  /** PUT /admin/organizations/:id/subscription — troca vale na hora (spec história 37). */
  changeOrganizationPlan(organizationId: string, planId: string): Subscription {
    const adminId = currentAdminId()

    const organization = findById<Organization>('organizations', organizationId)
    if (!organization) throw apiError('NOT_FOUND', 404)

    const plan = findById<Plan>('plans', planId)
    if (!plan) throw apiError('NOT_FOUND', 404)
    if (!plan.isActive) throw apiError('PLAN_INACTIVE', 400)

    const current = findAll<Subscription>('subscriptions').find(
      (s) => s.organizationId === organizationId && (s.status === 'ACTIVE' || s.status === 'TRIAL'),
    )
    if (current && current.planId === planId) return current

    const now = nowISO()
    if (current) {
      upsert('subscriptions', { ...current, status: 'CANCELED', canceledAt: now, updatedAt: now })
    }

    const next: Subscription = {
      id: newId(),
      organizationId,
      planId,
      status: 'ACTIVE',
      startedAt: now,
      endsAt: null,
      canceledAt: null,
      nextBillingAt: null,
      createdAt: now,
      updatedAt: now,
    }
    upsert('subscriptions', next)

    audit.log({
      actorUserId: adminId,
      establishmentId: null,
      entity: 'Subscription',
      entityId: next.id,
      action: 'PLAN_CHANGED',
      before: { planId: current?.planId ?? null },
      after: { planId },
    })

    return next
  },
}
