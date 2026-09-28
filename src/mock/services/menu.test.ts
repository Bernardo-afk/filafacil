// Testes da história 03 (cardápio do cliente). Cada `it` espelha um cenário
// Gherkin ou caso de borda da spec.
import { describe, expect, it, beforeEach } from 'vitest'
import { getMenu } from './menu'
import { managerMenuService } from './managerMenu'
import { resetMockData } from '../reset'
import { ESTABLISHMENT_IDS, USER_IDS, MENU_ITEM_IDS } from '../seed/ids'
import { createSession, useSessionStore } from '../session'

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
})

describe('getMenu — todo item mostra foto, nome, descrição e preço', () => {
  it('itens do Bar do Mestre vêm completos', () => {
    const menu = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    const xBurger = menu.categories.flatMap((c) => c.items).find((i) => i.id === MENU_ITEM_IDS.X_BURGER)!
    expect(xBurger.name).toBe('X-Burger')
    expect(xBurger.description).toContain('Hambúrguer')
    expect(xBurger.priceCents).toBe(2890)
  })
})

describe('getMenu — filtro por categoria e busca', () => {
  it('categoria Drinks + busca "lim" encontra só Caipirinha de Limão', () => {
    const drinksCategory = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE).categories.find((c) => c.name === 'Drinks')!
    const menu = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { categoryId: drinksCategory.id, q: 'lim' })
    const names = menu.categories.flatMap((c) => c.items).map((i) => i.name)
    expect(names).toEqual(['Caipirinha de Limão'])
  })

  it('busca sem diferenciar acento: "limao" encontra "Limão"', () => {
    const menu = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { q: 'limao' })
    expect(menu.categories.flatMap((c) => c.items).map((i) => i.name)).toContain('Caipirinha de Limão')
  })
})

describe('getMenu — item esgotado visível e desabilitado', () => {
  it('X-Bacon aparece com isAvailable false', () => {
    const menu = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    const xBacon = menu.categories.flatMap((c) => c.items).find((i) => i.id === MENU_ITEM_IDS.X_BACON)!
    expect(xBacon.isAvailable).toBe(false)
  })
})

describe('getMenu — estabelecimento inativo', () => {
  it('SUSPENDED devolve 404', () => {
    expect(() => getMenu(ESTABLISHMENT_IDS.RESTAURANTE_SP)).toThrowError(expect.objectContaining({ code: 'NOT_FOUND', status: 404 }))
  })
})

describe('getMenu — categoria sem itens não aparece', () => {
  it('categoria recém-criada e vazia não entra na resposta', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF', ESTABLISHMENT_IDS.BAR_DO_MESTRE))
    const empty = managerMenuService.createCategory(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { name: 'Sobremesas' })

    const menu = getMenu(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(menu.categories.map((c) => c.id)).not.toContain(empty.id)
    expect(menu.categories.every((c) => c.items.length > 0)).toBe(true)
  })
})
