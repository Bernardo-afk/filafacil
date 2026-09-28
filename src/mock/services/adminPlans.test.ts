// Testes da história 37 (Admin · Planos). Cada `it` espelha um cenário
// Gherkin ou caso de borda da spec.
import { describe, expect, it, beforeEach } from 'vitest'
import { adminPlansService, type AdminPlanInput } from './adminPlans'
import { adminEstablishmentsService } from './adminEstablishments'
import { entitlements } from '../entitlements'
import { resetMockData } from '../reset'
import { USER_IDS, ORG_IDS, PLAN_IDS, ESTABLISHMENT_IDS } from '../seed/ids'
import { createSession, useSessionStore } from '../session'
import { findAll } from '../storage'
import type { AuditLog, Subscription } from '../types'

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
  useSessionStore.getState().setSession(createSession(USER_IDS.ADMIN, 'PLATFORM_ADMIN'))
})

describe('adminPlansService — apenas admin acessa', () => {
  it('STAFF recebe 403 ao listar', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF'))
    expect(() => adminPlansService.list()).toThrowError(expect.objectContaining({ code: 'FORBIDDEN', status: 403 }))
  })
})

describe('adminPlansService.list — planos de seed', () => {
  it('Start/Pro/Business com os recursos da tabela da spec §8', () => {
    const plans = adminPlansService.list()
    const start = plans.find((p) => p.plan.id === PLAN_IDS.START)!
    const pro = plans.find((p) => p.plan.id === PLAN_IDS.PRO)!
    const business = plans.find((p) => p.plan.id === PLAN_IDS.BUSINESS)!

    expect(start.maxUnits).toBe(1)
    expect(pro.maxUnits).toBe(3)
    expect(business.maxUnits).toBeNull()

    expect(start.features.WAITLIST).toBe(false)
    expect(pro.features.WAITLIST).toBe(true)
    expect(start.features.PROMOTIONS).toBe(true) // ⚠️ todos os planos, spec §8
  })
})

describe('adminPlansService — downgrade retira o recurso na hora', () => {
  it('organização PRO usando fichas técnicas perde o acesso ao trocar pra START', () => {
    // Bar do Mestre está na organização Bar do Mestre, plano PRO (decisão 5, docs/DECISIONS.md)
    expect(entitlements.hasFeature(ESTABLISHMENT_IDS.BAR_DO_MESTRE, 'RECIPE_SHEETS')).toBe(true)

    adminPlansService.changeOrganizationPlan(ORG_IDS.BAR_DO_MESTRE, PLAN_IDS.START)

    expect(entitlements.hasFeature(ESTABLISHMENT_IDS.BAR_DO_MESTRE, 'RECIPE_SHEETS')).toBe(false)
    expect(() => entitlements.assertFeature(ESTABLISHMENT_IDS.BAR_DO_MESTRE, 'RECIPE_SHEETS')).toThrowError(
      expect.objectContaining({ code: 'FEATURE_NOT_IN_PLAN', status: 403 }),
    )
  })
})

describe('adminPlansService — upgrade libera o recurso na hora', () => {
  it('organização START passa a acessar fichas técnicas e fila de espera imediatamente', () => {
    expect(entitlements.hasFeature(ESTABLISHMENT_IDS.RESTAURANTE_SP, 'RECIPE_SHEETS')).toBe(false)

    adminPlansService.changeOrganizationPlan(ORG_IDS.BELA_VISTA, PLAN_IDS.PRO)

    expect(entitlements.hasFeature(ESTABLISHMENT_IDS.RESTAURANTE_SP, 'RECIPE_SHEETS')).toBe(true)
    expect(entitlements.hasFeature(ESTABLISHMENT_IDS.RESTAURANTE_SP, 'WAITLIST')).toBe(true)
  })
})

describe('adminPlansService — downgrade preserva os dados', () => {
  it('as unidades continuam existindo e criar uma nova é bloqueado', () => {
    // Grupo Bar do Zé está no plano PRO (MAX_UNITS=3) com as 3 unidades Bar do Zé
    adminPlansService.changeOrganizationPlan(ORG_IDS.GRUPO_BAR_DO_ZE, PLAN_IDS.START)

    const grupoBarDoZeIds: string[] = [
      ESTABLISHMENT_IDS.BAR_DO_ZE_CAMBUI,
      ESTABLISHMENT_IDS.BAR_DO_ZE_TAQUARAL,
      ESTABLISHMENT_IDS.BAR_DO_ZE_CENTRO,
    ]
    const stillThere = adminEstablishmentsService.list().filter((row) => grupoBarDoZeIds.includes(row.id))
    expect(stillThere).toHaveLength(3)

    expect(() =>
      adminEstablishmentsService.create({
        name: 'Bar do Zé · Sousas',
        category: 'BAR',
        street: 'Rua X',
        number: '1',
        neighborhood: 'Sousas',
        city: 'Campinas',
        state: 'SP',
        zip: '13100-000',
        organizationId: ORG_IDS.GRUPO_BAR_DO_ZE,
      }),
    ).toThrowError(expect.objectContaining({ code: 'PLAN_LIMIT_REACHED', status: 403 }))
  })
})

describe('adminPlansService — histórico da troca', () => {
  it('gera AuditLog PLAN_CHANGED com o plano anterior e o novo', () => {
    adminPlansService.changeOrganizationPlan(ORG_IDS.BELA_VISTA, PLAN_IDS.PRO)

    const log = findAll<AuditLog>('auditLogs').find((l) => l.action === 'PLAN_CHANGED' && l.entity === 'Subscription')!
    expect(log).toBeTruthy()
    expect(log.before).toMatchObject({ planId: PLAN_IDS.START })
    expect(log.after).toMatchObject({ planId: PLAN_IDS.PRO })
  })

  it('só existe 1 assinatura ativa por organização depois da troca (sem duplicar)', () => {
    adminPlansService.changeOrganizationPlan(ORG_IDS.BELA_VISTA, PLAN_IDS.PRO)
    const active = findAll<Subscription>('subscriptions').filter(
      (s) => s.organizationId === ORG_IDS.BELA_VISTA && (s.status === 'ACTIVE' || s.status === 'TRIAL'),
    )
    expect(active).toHaveLength(1)
    expect(active[0].planId).toBe(PLAN_IDS.PRO)
  })
})

describe('adminPlansService.changeOrganizationPlan — casos de borda', () => {
  it('plano inativo não pode ser atribuído', () => {
    const created = adminPlansService.create(validPlanInput({ code: 'LEGACY', isActive: false }))
    expect(() => adminPlansService.changeOrganizationPlan(ORG_IDS.BELA_VISTA, created.plan.id)).toThrowError(
      expect.objectContaining({ code: 'PLAN_INACTIVE', status: 400 }),
    )
  })

  it('organização inexistente recebe 404', () => {
    expect(() => adminPlansService.changeOrganizationPlan('org-fantasma', PLAN_IDS.PRO)).toThrowError(
      expect.objectContaining({ code: 'NOT_FOUND' }),
    )
  })
})

describe('adminPlansService.create/update — validação', () => {
  it('código duplicado é rejeitado', () => {
    expect(() => adminPlansService.create(validPlanInput({ code: 'START' }))).toThrowError(
      expect.objectContaining({ code: 'CONFLICT', status: 409 }),
    )
  })

  it('cria plano novo com recursos definidos', () => {
    const detail = adminPlansService.create(
      validPlanInput({ code: 'ENTERPRISE', name: 'FilaZero Enterprise', priceCents: 199900, maxUnits: null }),
    )
    expect(detail.plan.priceCents).toBe(199900)
    expect(detail.maxUnits).toBeNull()
  })

  it('edita plano existente e reflete no detalhe', () => {
    const current = adminPlansService.get(PLAN_IDS.START)
    const updated = adminPlansService.update(PLAN_IDS.START, {
      ...validPlanInput({ code: current.plan.code, name: current.plan.name }),
      priceCents: 12900,
      maxUnits: current.maxUnits,
      features: current.features,
    })
    expect(updated.plan.priceCents).toBe(12900)
  })
})

function validPlanInput(overrides: Partial<AdminPlanInput> = {}): AdminPlanInput {
  return {
    code: 'NOVO',
    name: 'Novo Plano',
    priceCents: 9900,
    billingPeriod: 'MONTHLY',
    isActive: true,
    maxUnits: 1,
    features: {
      KDS: false,
      LOYALTY: false,
      ADVANCED_REPORTS: false,
      API_ACCESS: false,
      MULTI_UNIT: false,
      DEDICATED_SLA: false,
      ACCOUNT_MANAGER: false,
      WHITE_LABEL: false,
      PROMOTIONS: true,
      RECIPE_SHEETS: false,
      WAITLIST: false,
    },
    ...overrides,
  }
}
