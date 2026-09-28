// Cardápio do Bar do Mestre (spec §8, todos ✅ em mock.ts).

import type { MenuCategory, MenuItem } from '../types'
import { ESTABLISHMENT_IDS, MENU_CATEGORY_IDS, MENU_ITEM_IDS } from './ids'

const NOW = new Date().toISOString()
const EST = ESTABLISHMENT_IDS.BAR_DO_MESTRE

export function buildMenuCategories(): MenuCategory[] {
  const names: Array<[string, string]> = [
    [MENU_CATEGORY_IDS.CERVEJAS, 'Cervejas'],
    [MENU_CATEGORY_IDS.DRINKS, 'Drinks'],
    [MENU_CATEGORY_IDS.PORCOES, 'Porções'],
    [MENU_CATEGORY_IDS.LANCHES, 'Lanches'],
    [MENU_CATEGORY_IDS.COMBOS, 'Combos'],
  ]
  return names.map(([id, name], index) => ({
    id,
    establishmentId: EST,
    name,
    sortOrder: index,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  }))
}

function item(overrides: Partial<MenuItem> & Pick<MenuItem, 'id' | 'categoryId' | 'name' | 'description' | 'priceCents'>): MenuItem {
  return {
    establishmentId: EST,
    photoUrl: null,
    isAvailable: true,
    isFeatured: false,
    isActive: true,
    sortOrder: 0,
    prepStation: null,
    prepTimeMin: null,
    deletedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function buildMenuItems(): MenuItem[] {
  return [
    item({
      id: MENU_ITEM_IDS.CERVEJA_IPA,
      categoryId: MENU_CATEGORY_IDS.CERVEJAS,
      name: 'Cerveja IPA 600ml',
      description: 'Artesanal com notas cítricas e amargor equilibrado',
      priceCents: 1890,
      isFeatured: true,
      sortOrder: 0,
    }),
    item({
      id: MENU_ITEM_IDS.X_BURGER,
      categoryId: MENU_CATEGORY_IDS.LANCHES,
      name: 'X-Burger',
      description: 'Hambúrguer artesanal 180g, alface, tomate, cheddar e maionese especial',
      priceCents: 2890,
      isFeatured: true,
      sortOrder: 0,
    }),
    item({
      id: MENU_ITEM_IDS.CAIPIRINHA_LIMAO,
      categoryId: MENU_CATEGORY_IDS.DRINKS,
      name: 'Caipirinha de Limão',
      description: 'Cachaça premium, limão siciliano e açúcar cristal',
      priceCents: 2200,
      sortOrder: 0,
    }),
    item({
      id: MENU_ITEM_IDS.BATATA_FRITA,
      categoryId: MENU_CATEGORY_IDS.PORCOES,
      name: 'Batata Frita',
      description: 'Porção 400g crocante com molho aïoli',
      priceCents: 2200,
      sortOrder: 0,
    }),
    item({
      id: MENU_ITEM_IDS.X_BACON,
      categoryId: MENU_CATEGORY_IDS.LANCHES,
      name: 'X-Bacon',
      description: 'Hambúrguer com bacon crocante, queijo e cebola caramelizada',
      priceCents: 3290,
      isAvailable: false, // "esgotado" (spec §8) — visível e desabilitado (RF10, decisão 10.1 #9)
      sortOrder: 1,
    }),
    item({
      id: MENU_ITEM_IDS.HEINEKEN,
      categoryId: MENU_CATEGORY_IDS.CERVEJAS,
      name: 'Heineken Long Neck',
      description: 'Cerveja holandesa 330ml gelada',
      priceCents: 1290,
      sortOrder: 1,
    }),
    item({
      id: MENU_ITEM_IDS.COMBO_IPA_BURGER,
      categoryId: MENU_CATEGORY_IDS.COMBOS,
      name: 'Combo IPA + X-Burger',
      description: 'Cerveja IPA 600ml + X-Burger com batata pequena',
      priceCents: 4200, // preço antes do desconto (spec §10.1, decisão 21)
      isFeatured: true,
      sortOrder: 0,
    }),
    item({
      id: MENU_ITEM_IDS.GIN_TONICA,
      categoryId: MENU_CATEGORY_IDS.DRINKS,
      name: 'Gin Tônica',
      description: 'Gin premium, água tônica Schweppes, pepino e pimenta rosa',
      priceCents: 2800,
      sortOrder: 1,
    }),
    item({
      id: MENU_ITEM_IDS.COXINHA,
      categoryId: MENU_CATEGORY_IDS.PORCOES,
      name: 'Porção de Coxinha',
      description: 'Bandeja com 12 unidades, frango desfiado e catupiry',
      priceCents: 3500,
      sortOrder: 1,
    }),
  ]
}
