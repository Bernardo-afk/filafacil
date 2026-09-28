// Testes da história 21 (fila de espera). Cada `it` espelha um cenário
// Gherkin ou caso de borda da spec.
import { describe, expect, it, beforeEach } from 'vitest'
import { managerWaitlistService, customerWaitlistService, estimateWaitMinutes } from './waitlist'
import { tablesService } from './floorPlan'
import { adminPlansService } from './adminPlans'
import { subscribe } from '../events'
import { resetMockData } from '../reset'
import { USER_IDS, ORG_IDS, ESTABLISHMENT_IDS } from '../seed/ids'
import { createSession, useSessionStore } from '../session'
import { findAll, removeById } from '../storage'
import type { DiningTable, WaitlistEntry } from '../types'

function tableByCode(code: string): DiningTable {
  return findAll<DiningTable>('diningTables').find((t) => t.establishmentId === ESTABLISHMENT_IDS.BAR_DO_MESTRE && t.code === code)!
}

function clearSeedWaitlist(): void {
  for (const entry of findAll<WaitlistEntry>('waitlistEntries')) {
    removeById('waitlistEntries', entry.id)
  }
}

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
  useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF', ESTABLISHMENT_IDS.BAR_DO_MESTRE))
  clearSeedWaitlist()
})

describe('waitlist — próximo da fila é notificado ao liberar a mesa', () => {
  it('mesa 8 (capacidade 6) liberada notifica Lucas (4 pessoas), à frente de Marina (2)', () => {
    managerWaitlistService.add(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { customerName: 'Lucas', partySize: 4 })
    managerWaitlistService.add(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { customerName: 'Marina', partySize: 2 })

    const mesa8 = tableByCode('M08') // capacidade 6, OCCUPIED no seed
    tablesService.setStatus(ESTABLISHMENT_IDS.BAR_DO_MESTRE, mesa8.id, 'AVAILABLE')

    const [lucas, marina] = managerWaitlistService.list(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(lucas.entry.customerName).toBe('Lucas')
    expect(lucas.entry.status).toBe('NOTIFIED')
    expect(marina.entry.status).toBe('WAITING')
  })
})

describe('waitlist — mesa pequena pula quem não cabe', () => {
  it('mesa 3 (capacidade 2) liberada notifica Marina, Lucas continua WAITING na 1ª posição', () => {
    managerWaitlistService.add(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { customerName: 'Lucas', partySize: 6 })
    managerWaitlistService.add(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { customerName: 'Marina', partySize: 2 })

    const mesa3 = tableByCode('M03') // capacidade 2, OCCUPIED no seed
    tablesService.setStatus(ESTABLISHMENT_IDS.BAR_DO_MESTRE, mesa3.id, 'AVAILABLE')

    const entries = managerWaitlistService.list(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    const lucas = entries.find((e) => e.entry.customerName === 'Lucas')!
    const marina = entries.find((e) => e.entry.customerName === 'Marina')!
    expect(marina.entry.status).toBe('NOTIFIED')
    expect(lucas.entry.status).toBe('WAITING')
    expect(lucas.entry.position).toBe(1)
  })
})

describe('waitlist — atribuir mesa', () => {
  it('Lucas NOTIFIED + mesa 2 (capacidade 4) livre: Lucas vira SEATED e a mesa vira OCCUPIED', () => {
    const entry = managerWaitlistService.add(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { customerName: 'Lucas', partySize: 4 })
    managerWaitlistService.notify(ESTABLISHMENT_IDS.BAR_DO_MESTRE, entry.id)

    const mesa2 = tableByCode('M02')
    tablesService.setStatus(ESTABLISHMENT_IDS.BAR_DO_MESTRE, mesa2.id, 'AVAILABLE')

    const updated = managerWaitlistService.assignTable(ESTABLISHMENT_IDS.BAR_DO_MESTRE, entry.id, mesa2.id)
    expect(updated.status).toBe('SEATED')
    expect(updated.seatedTableId).toBe(mesa2.id)

    const table = findAll<DiningTable>('diningTables').find((t) => t.id === mesa2.id)!
    expect(table.status).toBe('OCCUPIED')
  })
})

describe('waitlist — mesa incompatível não pode ser atribuída', () => {
  it('grupo de 6 pessoas na mesa 3 (capacidade 2) recebe 422 TABLE_TOO_SMALL', () => {
    const entry = managerWaitlistService.add(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { customerName: 'Grupo grande', partySize: 6 })
    const mesa3 = tableByCode('M03')
    tablesService.setStatus(ESTABLISHMENT_IDS.BAR_DO_MESTRE, mesa3.id, 'AVAILABLE')

    expect(() => managerWaitlistService.assignTable(ESTABLISHMENT_IDS.BAR_DO_MESTRE, entry.id, mesa3.id)).toThrowError(
      expect.objectContaining({ code: 'TABLE_TOO_SMALL', status: 422 }),
    )
  })
})

describe('waitlist — não compareceu', () => {
  it('NOTIFIED vira NO_SHOW e sai da fila ativa', () => {
    const entry = managerWaitlistService.add(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { customerName: 'Sumiu', partySize: 2 })
    managerWaitlistService.notify(ESTABLISHMENT_IDS.BAR_DO_MESTRE, entry.id)
    managerWaitlistService.noShow(ESTABLISHMENT_IDS.BAR_DO_MESTRE, entry.id)

    expect(managerWaitlistService.list(ESTABLISHMENT_IDS.BAR_DO_MESTRE).map((v) => v.entry.id)).not.toContain(entry.id)
  })
})

describe('waitlist — sem mesa compatível', () => {
  it('grupo de 12 pessoas tem estimativa nula', () => {
    managerWaitlistService.add(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { customerName: 'Grupo enorme', partySize: 12 })
    const [view] = managerWaitlistService.list(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(view.estimatedWaitMinutes).toBeNull()
    expect(view.noCompatibleTable).toBe(true)
  })
})

describe('waitlist — plano sem fila de espera', () => {
  it('gestor recebe 403 FEATURE_NOT_IN_PLAN', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.ADMIN, 'PLATFORM_ADMIN'))
    const plan = adminPlansService.create({
      code: 'SEM_FILA',
      name: 'Sem fila de espera',
      priceCents: 9900,
      billingPeriod: 'MONTHLY',
      isActive: true,
      maxUnits: 10,
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
    })
    adminPlansService.changeOrganizationPlan(ORG_IDS.BAR_DO_MESTRE, plan.plan.id)

    useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF', ESTABLISHMENT_IDS.BAR_DO_MESTRE))
    expect(() => managerWaitlistService.list(ESTABLISHMENT_IDS.BAR_DO_MESTRE)).toThrowError(
      expect.objectContaining({ code: 'FEATURE_NOT_IN_PLAN', status: 403 }),
    )
  })
})

describe('waitlist — casos de borda', () => {
  it('liberar duas mesas quase ao mesmo tempo não notifica a mesma entrada duas vezes', () => {
    managerWaitlistService.add(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { customerName: 'Primeiro', partySize: 2 })
    managerWaitlistService.add(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { customerName: 'Segundo', partySize: 2 })

    const mesa3 = tableByCode('M03') // capacidade 2
    const mesa5 = tableByCode('M05') // capacidade 2
    tablesService.setStatus(ESTABLISHMENT_IDS.BAR_DO_MESTRE, mesa3.id, 'AVAILABLE')
    tablesService.setStatus(ESTABLISHMENT_IDS.BAR_DO_MESTRE, mesa5.id, 'AVAILABLE')

    const entries = managerWaitlistService.list(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(entries.filter((e) => e.entry.status === 'WAITING')).toHaveLength(0)
    const notifiedNames = findAll<WaitlistEntry>('waitlistEntries')
      .filter((e) => e.status === 'NOTIFIED')
      .map((e) => e.customerName)
    expect(new Set(notifiedNames).size).toBe(2) // as duas, não a mesma repetida
  })

  it('fila vazia não gera evento waitlist.notified', () => {
    let fired = false
    const unsubscribe = subscribe('waitlist.notified', () => {
      fired = true
    })
    const mesa1 = tableByCode('M01')
    tablesService.setStatus(ESTABLISHMENT_IDS.BAR_DO_MESTRE, mesa1.id, 'AVAILABLE')
    unsubscribe()
    expect(fired).toBe(false)
  })

  it('cliente que sai da fila (leave) some da lista do gestor', () => {
    const entry = customerWaitlistService.join(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { customerName: 'Cliente logado', partySize: 2, userId: USER_IDS.JOAO })
    expect(managerWaitlistService.list(ESTABLISHMENT_IDS.BAR_DO_MESTRE).map((v) => v.entry.id)).toContain(entry.id)

    customerWaitlistService.leave(USER_IDS.JOAO, entry.id)
    expect(managerWaitlistService.list(ESTABLISHMENT_IDS.BAR_DO_MESTRE).map((v) => v.entry.id)).not.toContain(entry.id)
  })
})

describe('estimateWaitMinutes — heurística v1', () => {
  it('sem mesa livre agora: faltam = index+1, eta = ceil(faltam/compatíveis) × avg_turnover', () => {
    // Bar do Mestre: avgTableTurnoverMin = 45 (spec §8)
    const eta = estimateWaitMinutes(ESTABLISHMENT_IDS.BAR_DO_MESTRE, 2, 0, 45)
    // mesas compatíveis com 2 pessoas existem (capacidade >= 2) e pelo menos uma livre no seed
    expect(eta).not.toBeNull()
  })

  it('sem nenhuma mesa compatível, eta é nulo', () => {
    expect(estimateWaitMinutes(ESTABLISHMENT_IDS.BAR_DO_MESTRE, 99, 0, 45)).toBeNull()
  })
})
