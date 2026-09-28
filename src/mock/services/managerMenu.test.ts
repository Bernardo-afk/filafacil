// Testes da história 28 (cardápio do gestor) e história 19 (disponibilidade).
// Cada `it` espelha um cenário Gherkin ou caso de borda da spec.
import { describe, expect, it, beforeEach } from 'vitest'
import { managerMenuService, priceCentsFromBRLInput } from './managerMenu'
import { getMenu, assertItemOrderable } from './menu'
import { resetMockData } from '../reset'
import { USER_IDS, ESTABLISHMENT_IDS, MENU_ITEM_IDS, MENU_CATEGORY_IDS } from '../seed/ids'
import { createSession, useSessionStore } from '../session'
import { findById } from '../storage'
import type { MenuItem } from '../types'

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
  useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF', ESTABLISHMENT_IDS.BAR_DO_MESTRE))
})

describe('managerMenuService — alteração aparece para o cliente', () => {
  it('mudar o preço reflete no GET .../menu na hora', () => {
    managerMenuService.updateItem(ESTABLISHMENT_IDS.BAR_DO_MESTRE, MENU_ITEM_IDS.X_BURGER, {
      categoryId: MENU_CATEGORY_IDS.LANCHES,
      name: 'X-Burger',
      description: 'Hambúrguer artesanal',
      priceCents: 3090,
    })

    const menu = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    const item = menu.categories.flatMap((c) => c.items).find((i) => i.id === MENU_ITEM_IDS.X_BURGER)!
    expect(item.priceCents).toBe(3090)
  })
})

describe('managerMenuService — item excluído some', () => {
  it('não aparece no cardápio do cliente nem na lista de gestão, mas continua com deletedAt', () => {
    managerMenuService.deleteItem(ESTABLISHMENT_IDS.BAR_DO_MESTRE, MENU_ITEM_IDS.X_BURGER)

    const menu = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(menu.categories.flatMap((c) => c.items).map((i) => i.id)).not.toContain(MENU_ITEM_IDS.X_BURGER)

    const managerList = managerMenuService.listItems(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(managerList.map((i) => i.id)).not.toContain(MENU_ITEM_IDS.X_BURGER)

    const stored = findById<MenuItem>('menuItems', MENU_ITEM_IDS.X_BURGER)!
    expect(stored.deletedAt).not.toBeNull()
    expect(stored.isActive).toBe(false)
  })
})

describe('managerMenuService — categoria com itens não pode ser excluída', () => {
  it('recebe 422 CATEGORY_NOT_EMPTY', () => {
    expect(() => managerMenuService.deleteCategory(ESTABLISHMENT_IDS.BAR_DO_MESTRE, MENU_CATEGORY_IDS.LANCHES)).toThrowError(
      expect.objectContaining({ code: 'CATEGORY_NOT_EMPTY', status: 422 }),
    )
  })

  it('categoria vazia pode ser excluída', () => {
    const category = managerMenuService.createCategory(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { name: 'Sobremesas' })
    expect(() => managerMenuService.deleteCategory(ESTABLISHMENT_IDS.BAR_DO_MESTRE, category.id)).not.toThrow()
  })
})

describe('managerMenuService — isolamento entre estabelecimentos', () => {
  it('gestor do estabelecimento A não edita item do estabelecimento B', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF', ESTABLISHMENT_IDS.BAR_DO_ZE_CAMBUI))
    expect(() =>
      managerMenuService.updateItem(ESTABLISHMENT_IDS.BAR_DO_ZE_CAMBUI, MENU_ITEM_IDS.X_BURGER, {
        categoryId: MENU_CATEGORY_IDS.LANCHES,
        name: 'X-Burger',
        priceCents: 1,
      }),
    ).toThrowError(expect.objectContaining({ code: 'NOT_FOUND', status: 404 }))
  })
})

describe('managerMenuService — foto inválida', () => {
  it('PDF é rejeitado com 400 INVALID_IMAGE', () => {
    expect(() => managerMenuService.validatePhoto({ type: 'application/pdf', size: 1000 })).toThrowError(
      expect.objectContaining({ code: 'INVALID_IMAGE', status: 400 }),
    )
  })

  it('JPEG dentro do limite passa', () => {
    expect(() => managerMenuService.validatePhoto({ type: 'image/jpeg', size: 1024 })).not.toThrow()
  })

  it('arquivo maior que 5 MB é rejeitado', () => {
    expect(() => managerMenuService.validatePhoto({ type: 'image/png', size: 6 * 1024 * 1024 })).toThrowError(
      expect.objectContaining({ code: 'INVALID_IMAGE' }),
    )
  })
})

describe('priceCentsFromBRLInput — preço com vírgula', () => {
  it('"28,90" vira 2890 centavos sem erro de arredondamento', () => {
    expect(priceCentsFromBRLInput('28,90')).toBe(2890)
  })

  it('"1.234,56" (milhar com ponto) vira 123456 centavos', () => {
    expect(priceCentsFromBRLInput('1.234,56')).toBe(123456)
  })
})

describe('managerMenuService.createItem — validação', () => {
  it('preço mínimo é 1 centavo', () => {
    expect(() =>
      managerMenuService.createItem(ESTABLISHMENT_IDS.BAR_DO_MESTRE, {
        categoryId: MENU_CATEGORY_IDS.LANCHES,
        name: 'Item grátis',
        priceCents: 0,
      }),
    ).toThrowError(expect.objectContaining({ code: 'VALIDATION_ERROR' }))
  })

  it('descrição acima de 400 caracteres é rejeitada', () => {
    expect(() =>
      managerMenuService.createItem(ESTABLISHMENT_IDS.BAR_DO_MESTRE, {
        categoryId: MENU_CATEGORY_IDS.LANCHES,
        name: 'Item',
        description: 'x'.repeat(401),
        priceCents: 100,
      }),
    ).toThrowError(expect.objectContaining({ code: 'VALIDATION_ERROR' }))
  })
})

describe('managerMenuService — menu_version incrementa uma vez por operação', () => {
  it('cada criação de item soma exatamente 1', () => {
    const before = findById<{ menuVersion: number }>('establishments', ESTABLISHMENT_IDS.BAR_DO_MESTRE)!.menuVersion
    managerMenuService.createItem(ESTABLISHMENT_IDS.BAR_DO_MESTRE, {
      categoryId: MENU_CATEGORY_IDS.LANCHES,
      name: 'Novo item',
      priceCents: 100,
    })
    const after = findById<{ menuVersion: number }>('establishments', ESTABLISHMENT_IDS.BAR_DO_MESTRE)!.menuVersion
    expect(after).toBe(before + 1)
  })
})

describe('disponibilidade (história 19) — item esgotado', () => {
  it('ATTENDANT pode marcar como indisponível e isso reflete no cardápio', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.CARLOS, 'STAFF', ESTABLISHMENT_IDS.BAR_DO_MESTRE))
    managerMenuService.setAvailability(ESTABLISHMENT_IDS.BAR_DO_MESTRE, MENU_ITEM_IDS.X_BACON, false)

    const menu = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    const item = menu.categories.flatMap((c) => c.items).find((i) => i.id === MENU_ITEM_IDS.X_BACON)!
    expect(item.isAvailable).toBe(false)
  })

  it('reativar usa o mesmo toggle', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.CARLOS, 'STAFF', ESTABLISHMENT_IDS.BAR_DO_MESTRE))
    managerMenuService.setAvailability(ESTABLISHMENT_IDS.BAR_DO_MESTRE, MENU_ITEM_IDS.X_BACON, true)
    const updated = findById<MenuItem>('menuItems', MENU_ITEM_IDS.X_BACON)!
    expect(updated.isAvailable).toBe(true)
  })

  it('histórico lista as alterações com autor', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.ANA, 'STAFF', ESTABLISHMENT_IDS.BAR_DO_MESTRE))
    managerMenuService.setAvailability(ESTABLISHMENT_IDS.BAR_DO_MESTRE, MENU_ITEM_IDS.CERVEJA_IPA, false)
    managerMenuService.setAvailability(ESTABLISHMENT_IDS.BAR_DO_MESTRE, MENU_ITEM_IDS.CERVEJA_IPA, true)

    const history = managerMenuService.listItemHistory(ESTABLISHMENT_IDS.BAR_DO_MESTRE, MENU_ITEM_IDS.CERVEJA_IPA)
    expect(history).toHaveLength(2)
    expect(history.every((l) => l.actorUserId === USER_IDS.ANA)).toBe(true)
  })

  it('isolamento: atendente de A não altera item de B', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.CARLOS, 'STAFF', ESTABLISHMENT_IDS.BAR_DO_ZE_CAMBUI))
    expect(() => managerMenuService.setAvailability(ESTABLISHMENT_IDS.BAR_DO_ZE_CAMBUI, MENU_ITEM_IDS.X_BACON, false)).toThrowError(
      expect.objectContaining({ code: 'NOT_FOUND', status: 404 }),
    )
  })
})

describe('assertItemOrderable (preparação Sprint 2)', () => {
  it('item indisponível lança 422 ITEM_UNAVAILABLE', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.CARLOS, 'STAFF', ESTABLISHMENT_IDS.BAR_DO_MESTRE))
    managerMenuService.setAvailability(ESTABLISHMENT_IDS.BAR_DO_MESTRE, MENU_ITEM_IDS.X_BACON, false)
    expect(() => assertItemOrderable(MENU_ITEM_IDS.X_BACON)).toThrowError(
      expect.objectContaining({ code: 'ITEM_UNAVAILABLE', status: 422 }),
    )
  })

  it('item disponível passa', () => {
    expect(() => assertItemOrderable(MENU_ITEM_IDS.CERVEJA_IPA)).not.toThrow()
  })
})
