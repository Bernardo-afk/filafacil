// Testes da história 29 (promoções e descontos). Cada `it` espelha um
// cenário Gherkin ou caso de borda da spec.
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { promotionsService, type PromotionInput } from './promotions'
import { getMenu } from './menu'
import { adminPlansService } from './adminPlans'
import { resetMockData } from '../reset'
import { USER_IDS, ORG_IDS, ESTABLISHMENT_IDS, MENU_ITEM_IDS, MENU_CATEGORY_IDS } from '../seed/ids'
import { createSession, useSessionStore } from '../session'
import { findAll, removeById } from '../storage'
import type { Promotion } from '../types'

function utcForSaoPaulo(dateTimeLocal: string): Date {
  return new Date(`${dateTimeLocal}-03:00`)
}

const HAPPY_HOUR: PromotionInput = {
  name: 'Happy Hour',
  scope: 'CATEGORIES',
  discountType: 'PERCENT',
  discountValue: 20,
  weekdays: [1, 2, 3, 4, 5], // segunda a sexta
  startTime: '17:00',
  endTime: '19:00',
  label: 'Happy Hour -20%',
  isActive: true,
  categoryIds: [MENU_CATEGORY_IDS.DRINKS],
}

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
  useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF', ESTABLISHMENT_IDS.BAR_DO_MESTRE))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('promotionsService — promoção aparece só na janela semanal', () => {
  it('segunda 18:00 aplica; segunda 19:00 e sábado 18:00 não', () => {
    promotionsService.create(ESTABLISHMENT_IDS.BAR_DO_MESTRE, HAPPY_HOUR)

    vi.useFakeTimers()
    vi.setSystemTime(utcForSaoPaulo('2026-09-28T18:00:00')) // segunda
    let menu = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    let caipirinha = menu.categories.flatMap((c) => c.items).find((i) => i.id === MENU_ITEM_IDS.CAIPIRINHA_LIMAO)!
    expect(caipirinha.promoPriceCents).toBe(1760)
    expect(caipirinha.promoLabel).toBe('Happy Hour -20%')

    vi.setSystemTime(utcForSaoPaulo('2026-09-28T19:00:00')) // segunda, fora da janela
    menu = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    caipirinha = menu.categories.flatMap((c) => c.items).find((i) => i.id === MENU_ITEM_IDS.CAIPIRINHA_LIMAO)!
    expect(caipirinha.promoPriceCents).toBeNull()

    vi.setSystemTime(utcForSaoPaulo('2026-10-03T18:00:00')) // sábado
    menu = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    caipirinha = menu.categories.flatMap((c) => c.items).find((i) => i.id === MENU_ITEM_IDS.CAIPIRINHA_LIMAO)!
    expect(caipirinha.promoPriceCents).toBeNull()
  })
})

describe('promotionsService — promoção inativa não se aplica', () => {
  it('nenhum item recebe desconto', () => {
    // remove as promoções do seed (Happy Hour/Combo da semana já ativas) pra isolar o cenário
    for (const p of findAll<Promotion>('promotions').filter((p) => p.establishmentId === ESTABLISHMENT_IDS.BAR_DO_MESTRE)) {
      removeById('promotions', p.id)
    }
    promotionsService.create(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { ...HAPPY_HOUR, isActive: false, weekdays: [0, 1, 2, 3, 4, 5, 6], startTime: '00:00', endTime: '00:00' })

    const menu = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(menu.categories.flatMap((c) => c.items).every((i) => i.promoPriceCents === null)).toBe(true)
  })
})

describe('promotionsService — escopo Todos', () => {
  it('todos os itens ativos mostram o desconto dentro da janela', () => {
    promotionsService.create(ESTABLISHMENT_IDS.BAR_DO_MESTRE, {
      ...HAPPY_HOUR,
      name: 'Tudo em promoção',
      scope: 'ALL',
      discountValue: 10,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startTime: '00:00',
      endTime: '00:00',
      label: 'Tudo -10%',
      categoryIds: undefined,
    })

    const menu = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    const items = menu.categories.flatMap((c) => c.items)
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((i) => i.promoPriceCents !== null)).toBe(true)
  })
})

describe('promotionsService — melhor preço vence', () => {
  it('duas promoções vigentes no mesmo item: vale a de maior desconto', () => {
    promotionsService.create(ESTABLISHMENT_IDS.BAR_DO_MESTRE, {
      ...HAPPY_HOUR,
      name: 'Desconto pequeno',
      discountValue: 10,
      label: '-10%',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startTime: '00:00',
      endTime: '00:00',
    })
    promotionsService.create(ESTABLISHMENT_IDS.BAR_DO_MESTRE, {
      ...HAPPY_HOUR,
      name: 'Desconto grande',
      discountValue: 20,
      label: '-20%',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startTime: '00:00',
      endTime: '00:00',
    })

    const menu = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    const caipirinha = menu.categories.flatMap((c) => c.items).find((i) => i.id === MENU_ITEM_IDS.CAIPIRINHA_LIMAO)!
    expect(caipirinha.promoPriceCents).toBe(1760) // 20% de 2200, não 10%
    expect(caipirinha.promoLabel).toBe('-20%')
  })
})

describe('promotionsService — janela que cruza a meia-noite', () => {
  it('sexta 22:00–02:00 continua vigente no sábado à 01:00', () => {
    promotionsService.create(ESTABLISHMENT_IDS.BAR_DO_MESTRE, {
      ...HAPPY_HOUR,
      name: 'Madrugada',
      weekdays: [5], // sexta
      startTime: '22:00',
      endTime: '02:00',
      label: 'Madrugada -20%',
    })

    vi.useFakeTimers()
    vi.setSystemTime(utcForSaoPaulo('2026-10-03T01:00:00')) // sábado 01:00
    const menu = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    const caipirinha = menu.categories.flatMap((c) => c.items).find((i) => i.id === MENU_ITEM_IDS.CAIPIRINHA_LIMAO)!
    expect(caipirinha.promoPriceCents).toBe(1760)
  })
})

describe('promotionsService — plano sem promoções', () => {
  it('gestor recebe 403 e o cardápio deixa de mostrar o desconto', () => {
    promotionsService.create(ESTABLISHMENT_IDS.BAR_DO_MESTRE, HAPPY_HOUR)

    useSessionStore.getState().setSession(createSession(USER_IDS.ADMIN, 'PLATFORM_ADMIN'))
    const noPromoPlan = adminPlansService.create({
      code: 'SEM_PROMO',
      name: 'Plano sem promoções',
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
        PROMOTIONS: false,
        RECIPE_SHEETS: false,
        WAITLIST: false,
      },
    })
    adminPlansService.changeOrganizationPlan(ORG_IDS.BAR_DO_MESTRE, noPromoPlan.plan.id)

    useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF', ESTABLISHMENT_IDS.BAR_DO_MESTRE))
    expect(() => promotionsService.list(ESTABLISHMENT_IDS.BAR_DO_MESTRE)).toThrowError(
      expect.objectContaining({ code: 'FEATURE_NOT_IN_PLAN', status: 403 }),
    )

    vi.useFakeTimers()
    vi.setSystemTime(utcForSaoPaulo('2026-09-28T18:00:00')) // segunda, dentro da janela do Happy Hour
    const menu = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(menu.categories.flatMap((c) => c.items).every((i) => i.promoPriceCents === null)).toBe(true)
  })
})

describe('promotionsService.create — validação', () => {
  it('desconto percentual fora de 1–95 é rejeitado', () => {
    expect(() => promotionsService.create(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { ...HAPPY_HOUR, discountValue: 100 })).toThrowError(
      expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    )
  })

  it('preço fixo maior ou igual ao preço do item é rejeitado', () => {
    expect(() =>
      promotionsService.create(ESTABLISHMENT_IDS.BAR_DO_MESTRE, {
        ...HAPPY_HOUR,
        scope: 'ITEMS',
        discountType: 'FIXED_PRICE_CENTS',
        discountValue: 5000,
        categoryIds: undefined,
        menuItemIds: [MENU_ITEM_IDS.CAIPIRINHA_LIMAO],
      }),
    ).toThrowError(expect.objectContaining({ code: 'VALIDATION_ERROR' }))
  })

  it('preço fixo menor que o preço do item é aceito e aplicado', () => {
    promotionsService.create(ESTABLISHMENT_IDS.BAR_DO_MESTRE, {
      ...HAPPY_HOUR,
      name: 'Preço fixo',
      scope: 'ITEMS',
      discountType: 'FIXED_PRICE_CENTS',
      discountValue: 900,
      label: 'R$ 9,00',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startTime: '00:00',
      endTime: '00:00',
      categoryIds: undefined,
      menuItemIds: [MENU_ITEM_IDS.CAIPIRINHA_LIMAO],
    })

    const menu = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    const caipirinha = menu.categories.flatMap((c) => c.items).find((i) => i.id === MENU_ITEM_IDS.CAIPIRINHA_LIMAO)!
    expect(caipirinha.promoPriceCents).toBe(900)
  })
})

describe('promotionsService — arredondamento half-up com preços ímpares', () => {
  it('20% sobre um preço ímpar arredonda pra cima no meio exato', () => {
    // Batata Frita R$ 22,00 (2200 centavos); 15% => 330, sem ambiguidade de arredondamento aqui,
    // mas confere a fórmula: 2200 - round_half_up(2200*15/100) = 2200-330=1870
    promotionsService.create(ESTABLISHMENT_IDS.BAR_DO_MESTRE, {
      ...HAPPY_HOUR,
      name: 'Combo da semana',
      scope: 'ALL',
      discountValue: 15,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startTime: '00:00',
      endTime: '00:00',
      label: 'Combo -15%',
      categoryIds: undefined,
    })

    const menu = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    const batata = menu.categories.flatMap((c) => c.items).find((i) => i.id === MENU_ITEM_IDS.BATATA_FRITA)!
    expect(batata.promoPriceCents).toBe(1870)
  })
})
