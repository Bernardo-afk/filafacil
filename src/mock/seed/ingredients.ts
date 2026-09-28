// Ingredientes e fichas técnicas do Bar do Mestre (spec §8, RF15/RF16).
//
// ⚠️ A tabela do documento mistura "160 g" (peso descritivo) com "R$ 7,20 por
// un" (custo de compra) para o hambúrguer — tratamos como ingrediente comprado
// por unidade (1 hambúrguer = 1 UN = R$ 7,20), não por grama, para o custo
// bater com o total de R$ 11,40 informado. Idem para o queijo (fatias = UN).
// Molho especial é comprado por KG e consumido em G (conversão dentro da
// mesma dimensão, spec RF15/§3 Ingredient).

import type { Ingredient, RecipeSheet, RecipeSheetLine } from '../types'
import { ESTABLISHMENT_IDS, INGREDIENT_IDS, MENU_ITEM_IDS, RECIPE_SHEET_IDS } from './ids'

const NOW = new Date().toISOString()
const EST = ESTABLISHMENT_IDS.BAR_DO_MESTRE

function ingredient(id: string, name: string, purchaseUnit: Ingredient['purchaseUnit'], unitCostCents: number): Ingredient {
  return {
    id,
    establishmentId: EST,
    name,
    purchaseUnit,
    unitCostCents,
    deletedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

export function buildIngredients(): Ingredient[] {
  return [
    ingredient(INGREDIENT_IDS.PAO_HAMBURGUER, 'Pão de hambúrguer', 'UN', 120),
    ingredient(INGREDIENT_IDS.HAMBURGUER, 'Hambúrguer 160g', 'UN', 720),
    ingredient(INGREDIENT_IDS.QUEIJO_CHEDDAR, 'Queijo cheddar (fatia)', 'UN', 90),
    ingredient(INGREDIENT_IDS.MOLHO_ESPECIAL, 'Molho especial', 'KG', 6000),
    ingredient(INGREDIENT_IDS.BATATA_CONGELADA, 'Batata congelada', 'KG', 2400),
    ingredient(INGREDIENT_IDS.CHOPE_IPA, 'Chope IPA', 'L', 1280),
    ingredient(INGREDIENT_IDS.GIN, 'Gin', 'L', 18000),
    ingredient(INGREDIENT_IDS.TONICA, 'Água tônica', 'L', 2000),
  ]
}

function sheet(id: string, menuItemId: string, yieldPortions = 1): RecipeSheet {
  return {
    id,
    establishmentId: EST,
    menuItemId,
    yieldPortions,
    method: null,
    maxCostPercent: 40,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function line(id: string, recipeSheetId: string, ingredientId: string, quantity: number, unit: RecipeSheetLine['unit']): RecipeSheetLine {
  return { id, recipeSheetId, ingredientId, quantity, unit, createdAt: NOW, updatedAt: NOW }
}

export function buildRecipeSheets(): RecipeSheet[] {
  return [
    sheet(RECIPE_SHEET_IDS.X_BURGER, MENU_ITEM_IDS.X_BURGER),
    sheet(RECIPE_SHEET_IDS.BATATA_FRITA, MENU_ITEM_IDS.BATATA_FRITA),
    sheet(RECIPE_SHEET_IDS.CERVEJA_IPA, MENU_ITEM_IDS.CERVEJA_IPA),
    sheet(RECIPE_SHEET_IDS.GIN_TONICA, MENU_ITEM_IDS.GIN_TONICA),
  ]
}

export function buildRecipeSheetLines(): RecipeSheetLine[] {
  return [
    // X-Burger → custo total R$ 11,40
    line('line-xburger-pao', RECIPE_SHEET_IDS.X_BURGER, INGREDIENT_IDS.PAO_HAMBURGUER, 1, 'UN'),
    line('line-xburger-hamburguer', RECIPE_SHEET_IDS.X_BURGER, INGREDIENT_IDS.HAMBURGUER, 1, 'UN'),
    line('line-xburger-queijo', RECIPE_SHEET_IDS.X_BURGER, INGREDIENT_IDS.QUEIJO_CHEDDAR, 2, 'UN'),
    line('line-xburger-molho', RECIPE_SHEET_IDS.X_BURGER, INGREDIENT_IDS.MOLHO_ESPECIAL, 20, 'G'),
    // Batata Frita → custo total R$ 4,80
    line('line-batata', RECIPE_SHEET_IDS.BATATA_FRITA, INGREDIENT_IDS.BATATA_CONGELADA, 200, 'G'),
    // Cerveja IPA → custo total R$ 6,40
    line('line-ipa', RECIPE_SHEET_IDS.CERVEJA_IPA, INGREDIENT_IDS.CHOPE_IPA, 500, 'ML'),
    // Gin Tônica → custo total R$ 12,00
    line('line-gin', RECIPE_SHEET_IDS.GIN_TONICA, INGREDIENT_IDS.GIN, 50, 'ML'),
    line('line-tonica', RECIPE_SHEET_IDS.GIN_TONICA, INGREDIENT_IDS.TONICA, 150, 'ML'),
  ]
}
