// Testes da história 31 (fichas técnicas). Cada `it` espelha um cenário
// Gherkin ou caso de borda da spec — usa a ficha do X-Burger já semeada
// (spec §8), que bate exatamente com os números do Gherkin.
import { describe, expect, it, beforeEach } from 'vitest'
import { recipeSheetsService, ingredientsService, convertToPurchaseUnit } from './recipeSheets'
import { adminPlansService } from './adminPlans'
import { resetMockData } from '../reset'
import { USER_IDS, ORG_IDS, ESTABLISHMENT_IDS, MENU_ITEM_IDS, INGREDIENT_IDS } from '../seed/ids'
import { createSession, useSessionStore } from '../session'

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
  useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF', ESTABLISHMENT_IDS.BAR_DO_MESTRE))
})

describe('recipeSheetsService — custo e margem calculados automaticamente', () => {
  it('X-Burger: custo R$ 11,40, margem R$ 17,50 (60,6%), sem alerta', () => {
    const detail = recipeSheetsService.get(ESTABLISHMENT_IDS.BAR_DO_MESTRE, MENU_ITEM_IDS.X_BURGER)!
    expect(detail.cost.costPerPortionCents).toBe(1140)
    expect(detail.cost.marginCents).toBe(1750)
    expect(detail.cost.marginPercent).toBe(60.6)
    expect(detail.cost.cmvPercent).toBe(39.4)
    expect(detail.cost.costAlert).toBe(false)
  })
})

describe('recipeSheetsService — mudança de preço recalcula todos os pratos e liga o alerta', () => {
  it('molho especial a R$ 72,00/kg: custo R$ 11,64, margem R$ 17,26 (59,7%), alerta ligado', () => {
    ingredientsService.update(ESTABLISHMENT_IDS.BAR_DO_MESTRE, INGREDIENT_IDS.MOLHO_ESPECIAL, {
      name: 'Molho especial',
      purchaseUnit: 'KG',
      unitCostCents: 7200,
    })

    const detail = recipeSheetsService.get(ESTABLISHMENT_IDS.BAR_DO_MESTRE, MENU_ITEM_IDS.X_BURGER)!
    expect(detail.cost.costPerPortionCents).toBe(1164)
    expect(detail.cost.marginCents).toBe(1726)
    expect(detail.cost.marginPercent).toBe(59.7)
    expect(detail.cost.cmvPercent).toBe(40.3)
    expect(detail.cost.costAlert).toBe(true)
  })

  it('recalcula toda outra ficha que usa o mesmo ingrediente', () => {
    // nenhuma outra ficha do seed usa molho especial além do X-Burger — confirma isolamento do efeito
    const before = recipeSheetsService.get(ESTABLISHMENT_IDS.BAR_DO_MESTRE, MENU_ITEM_IDS.BATATA_FRITA)!
    ingredientsService.update(ESTABLISHMENT_IDS.BAR_DO_MESTRE, INGREDIENT_IDS.MOLHO_ESPECIAL, {
      name: 'Molho especial',
      purchaseUnit: 'KG',
      unitCostCents: 7200,
    })
    const after = recipeSheetsService.get(ESTABLISHMENT_IDS.BAR_DO_MESTRE, MENU_ITEM_IDS.BATATA_FRITA)!
    expect(after.cost.costPerPortionCents).toBe(before.cost.costPerPortionCents)
  })
})

describe('convertToPurchaseUnit — unidade incompatível', () => {
  it('ingrediente comprado em KG rejeita linha em ML', () => {
    expect(() => convertToPurchaseUnit(100, 'ML', 'KG')).toThrowError(expect.objectContaining({ code: 'UNIT_INCOMPATIBLE', status: 422 }))
  })

  it('UN nunca converte pra CX/PCT', () => {
    expect(() => convertToPurchaseUnit(1, 'UN', 'CX')).toThrowError(expect.objectContaining({ code: 'UNIT_INCOMPATIBLE' }))
  })

  it('conversões válidas: G↔KG e ML↔L', () => {
    expect(convertToPurchaseUnit(1000, 'G', 'KG')).toBe(1)
    expect(convertToPurchaseUnit(1, 'KG', 'G')).toBe(1000)
    expect(convertToPurchaseUnit(1000, 'ML', 'L')).toBe(1)
    expect(convertToPurchaseUnit(1, 'L', 'ML')).toBe(1000)
  })

  it('salvar ficha com unidade incompatível rejeita antes de gravar', () => {
    expect(() =>
      recipeSheetsService.put(ESTABLISHMENT_IDS.BAR_DO_MESTRE, MENU_ITEM_IDS.X_BURGER, {
        yieldPortions: 1,
        lines: [{ ingredientId: INGREDIENT_IDS.MOLHO_ESPECIAL, quantity: 10, unit: 'ML' }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'UNIT_INCOMPATIBLE' }))
  })
})

describe('ingredientsService.delete — ingrediente em uso', () => {
  it('recebe 409 INGREDIENT_IN_USE', () => {
    expect(() => ingredientsService.delete(ESTABLISHMENT_IDS.BAR_DO_MESTRE, INGREDIENT_IDS.MOLHO_ESPECIAL)).toThrowError(
      expect.objectContaining({ code: 'INGREDIENT_IN_USE', status: 409 }),
    )
  })

  it('ingrediente sem uso pode ser excluído', () => {
    const created = ingredientsService.create(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { name: 'Alface', purchaseUnit: 'UN', unitCostCents: 50 })
    expect(() => ingredientsService.delete(ESTABLISHMENT_IDS.BAR_DO_MESTRE, created.id)).not.toThrow()
  })
})

describe('recipeSheetsService — produto sem ficha', () => {
  it('aparece com custo "—" (null) na lista', () => {
    const rows = recipeSheetsService.list(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    const heineken = rows.find((r) => r.menuItem.id === MENU_ITEM_IDS.HEINEKEN)!
    expect(heineken.detail).toBeNull()
  })
})

describe('recipeSheetsService — ficha sem linhas', () => {
  it('custo 0 e aviso de "sem linhas"', () => {
    recipeSheetsService.put(ESTABLISHMENT_IDS.BAR_DO_MESTRE, MENU_ITEM_IDS.HEINEKEN, { yieldPortions: 1, lines: [] })
    const detail = recipeSheetsService.get(ESTABLISHMENT_IDS.BAR_DO_MESTRE, MENU_ITEM_IDS.HEINEKEN)!
    expect(detail.cost.costPerPortionCents).toBe(0)
    expect(detail.cost.hasNoLines).toBe(true)
  })
})

describe('recipeSheetsService — rendimento maior que 1', () => {
  it('divide o custo total pelas porções', () => {
    recipeSheetsService.put(ESTABLISHMENT_IDS.BAR_DO_MESTRE, MENU_ITEM_IDS.HEINEKEN, {
      yieldPortions: 4,
      lines: [{ ingredientId: INGREDIENT_IDS.CHOPE_IPA, quantity: 2, unit: 'L' }], // 2L a R$12,80/L = 2560 centavos / 4 porções
    })
    const detail = recipeSheetsService.get(ESTABLISHMENT_IDS.BAR_DO_MESTRE, MENU_ITEM_IDS.HEINEKEN)!
    expect(detail.cost.costPerPortionCents).toBe(640)
  })
})

describe('recipeSheetsService — isolamento entre estabelecimentos', () => {
  it('gestor de outro estabelecimento recebe 404', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF', ESTABLISHMENT_IDS.BAR_DO_ZE_CAMBUI))
    expect(() => recipeSheetsService.get(ESTABLISHMENT_IDS.BAR_DO_ZE_CAMBUI, MENU_ITEM_IDS.X_BURGER)).toThrowError(
      expect.objectContaining({ code: 'NOT_FOUND', status: 404 }),
    )
  })
})

describe('recipeSheetsService — exige RECIPE_SHEETS no plano', () => {
  it('organização sem o recurso recebe 403 FEATURE_NOT_IN_PLAN', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.ADMIN, 'PLATFORM_ADMIN'))
    const plan = adminPlansService.create({
      code: 'SEM_FICHA',
      name: 'Sem fichas técnicas',
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
    expect(() => recipeSheetsService.list(ESTABLISHMENT_IDS.BAR_DO_MESTRE)).toThrowError(
      expect.objectContaining({ code: 'FEATURE_NOT_IN_PLAN', status: 403 }),
    )
  })
})
