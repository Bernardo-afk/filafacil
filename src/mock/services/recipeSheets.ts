// Fichas técnicas (história 31). Custo e margem são **sempre calculados na
// leitura** — nunca gravados prontos (spec: "mudar o preço de um ingrediente
// atualiza todos os pratos na hora").

import { z } from 'zod'
import { findAll, findById, upsert, removeById } from '../storage'
import { apiError } from '../errors'
import { assertEstablishmentAccess, requireSession } from '../guard'
import { useSessionStore } from '../session'
import { entitlements } from '../entitlements'
import { audit } from './audit'
import { newId, nowISO } from '../../lib/id'
import { roundHalfUp } from '../../lib/money'
import { IngredientUnit } from '../types'
import type { Ingredient, MenuItem, RecipeSheet, RecipeSheetLine, Session } from '../types'

const DEFAULT_MAX_COST_PERCENT = 40

function currentSession(): Session {
  return requireSession(useSessionStore.getState().session)
}

function requireManagerWithFeature(establishmentId: string): Session {
  const session = currentSession()
  assertEstablishmentAccess(session, establishmentId, ['MANAGER'])
  entitlements.assertFeature(establishmentId, 'RECIPE_SHEETS')
  return session
}

// ---------------------------------------------------------------------------
// Unidades e conversão (spec história 31: massa, volume, contagem)
// ---------------------------------------------------------------------------

const DIMENSION: Record<IngredientUnit, 'MASS' | 'VOLUME' | 'COUNT'> = {
  G: 'MASS',
  KG: 'MASS',
  ML: 'VOLUME',
  L: 'VOLUME',
  UN: 'COUNT',
  CX: 'COUNT',
  PCT: 'COUNT',
}

/** Converte `quantity` (na unidade da linha) para a unidade de compra do ingrediente. */
export function convertToPurchaseUnit(quantity: number, from: IngredientUnit, to: IngredientUnit): number {
  if (from === to) return quantity
  if (DIMENSION[from] !== DIMENSION[to] || DIMENSION[from] === 'COUNT') {
    throw apiError('UNIT_INCOMPATIBLE', 422, { from, to })
  }
  if (from === 'G' && to === 'KG') return quantity / 1000
  if (from === 'KG' && to === 'G') return quantity * 1000
  if (from === 'ML' && to === 'L') return quantity / 1000
  if (from === 'L' && to === 'ML') return quantity * 1000
  throw apiError('UNIT_INCOMPATIBLE', 422, { from, to })
}

// ---------------------------------------------------------------------------
// Ingredientes
// ---------------------------------------------------------------------------

const ingredientSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(120),
  purchaseUnit: z.enum(Object.values(IngredientUnit) as [string, ...string[]]),
  unitCostCents: z.number().int().min(0),
})
export type IngredientInput = z.infer<typeof ingredientSchema>

export const ingredientsService = {
  list(establishmentId: string): Ingredient[] {
    requireManagerWithFeature(establishmentId)
    return findAll<Ingredient>('ingredients').filter((i) => i.establishmentId === establishmentId && !i.deletedAt)
  },

  create(establishmentId: string, input: IngredientInput): Ingredient {
    const session = requireManagerWithFeature(establishmentId)
    const parsed = ingredientSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })

    const now = nowISO()
    const ingredient: Ingredient = {
      id: newId(),
      establishmentId,
      name: parsed.data.name,
      purchaseUnit: parsed.data.purchaseUnit as IngredientUnit,
      unitCostCents: parsed.data.unitCostCents,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    upsert('ingredients', ingredient)
    audit.log({ actorUserId: session.userId, establishmentId, entity: 'Ingredient', entityId: ingredient.id, action: 'CREATED', before: null, after: { name: ingredient.name } })
    return ingredient
  },

  update(establishmentId: string, ingredientId: string, input: IngredientInput): Ingredient {
    const session = requireManagerWithFeature(establishmentId)
    const current = findById<Ingredient>('ingredients', ingredientId)
    if (!current || current.establishmentId !== establishmentId || current.deletedAt) throw apiError('NOT_FOUND', 404)

    const parsed = ingredientSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })

    const updated: Ingredient = { ...current, name: parsed.data.name, purchaseUnit: parsed.data.purchaseUnit as IngredientUnit, unitCostCents: parsed.data.unitCostCents, updatedAt: nowISO() }
    upsert('ingredients', updated)
    audit.log({ actorUserId: session.userId, establishmentId, entity: 'Ingredient', entityId: ingredientId, action: 'UPDATED', before: { unitCostCents: current.unitCostCents }, after: { unitCostCents: updated.unitCostCents } })
    return updated
  },

  /** 409 INGREDIENT_IN_USE se alguma ficha usa o ingrediente (spec história 31). */
  delete(establishmentId: string, ingredientId: string): void {
    const session = requireManagerWithFeature(establishmentId)
    const current = findById<Ingredient>('ingredients', ingredientId)
    if (!current || current.establishmentId !== establishmentId || current.deletedAt) throw apiError('NOT_FOUND', 404)

    const inUse = findAll<RecipeSheetLine>('recipeSheetLines').some((l) => l.ingredientId === ingredientId)
    if (inUse) throw apiError('INGREDIENT_IN_USE', 409)

    upsert('ingredients', { ...current, deletedAt: nowISO(), updatedAt: nowISO() })
    audit.log({ actorUserId: session.userId, establishmentId, entity: 'Ingredient', entityId: ingredientId, action: 'DELETED', before: { name: current.name }, after: null })
  },
}

// ---------------------------------------------------------------------------
// Ficha técnica: cálculo (sempre na leitura)
// ---------------------------------------------------------------------------

export interface RecipeSheetLineView {
  ingredientId: string
  name: string
  quantity: number
  unit: IngredientUnit
  costCents: number
}

export interface RecipeSheetCost {
  costPerPortionCents: number
  marginCents: number
  marginPercent: number
  cmvPercent: number
  costAlert: boolean
  hasNoLines: boolean
}

export interface RecipeSheetDetail {
  menuItemId: string
  yieldPortions: number
  method: string | null
  maxCostPercent: number
  lines: RecipeSheetLineView[]
  priceCents: number
  cost: RecipeSheetCost
}

function computeCost(lines: RecipeSheetLine[], yieldPortions: number, maxCostPercent: number, priceCents: number): RecipeSheetCost {
  const ingredients = findAll<Ingredient>('ingredients')
  let totalCents = 0
  for (const line of lines) {
    const ingredient = ingredients.find((i) => i.id === line.ingredientId)
    if (!ingredient) continue
    const converted = convertToPurchaseUnit(line.quantity, line.unit, ingredient.purchaseUnit)
    totalCents += converted * ingredient.unitCostCents
  }

  const costPerPortionCents = roundHalfUp(totalCents / Math.max(1, yieldPortions))
  const marginCents = priceCents - costPerPortionCents
  const marginPercent = priceCents > 0 ? Math.round((marginCents / priceCents) * 1000) / 10 : 0
  const cmvPercent = priceCents > 0 ? Math.round((costPerPortionCents / priceCents) * 1000) / 10 : 0

  return {
    costPerPortionCents,
    marginCents,
    marginPercent,
    cmvPercent,
    costAlert: cmvPercent > maxCostPercent,
    hasNoLines: lines.length === 0,
  }
}

function toDetail(sheet: RecipeSheet, item: MenuItem): RecipeSheetDetail {
  const lines = findAll<RecipeSheetLine>('recipeSheetLines').filter((l) => l.recipeSheetId === sheet.id)
  const ingredients = findAll<Ingredient>('ingredients')
  return {
    menuItemId: sheet.menuItemId,
    yieldPortions: sheet.yieldPortions,
    method: sheet.method,
    maxCostPercent: sheet.maxCostPercent,
    lines: lines.map((l) => ({
      ingredientId: l.ingredientId,
      name: ingredients.find((i) => i.id === l.ingredientId)?.name ?? '—',
      quantity: l.quantity,
      unit: l.unit,
      costCents: roundHalfUp(convertToPurchaseUnit(l.quantity, l.unit, ingredients.find((i) => i.id === l.ingredientId)?.purchaseUnit ?? l.unit) * (ingredients.find((i) => i.id === l.ingredientId)?.unitCostCents ?? 0)),
    })),
    priceCents: item.priceCents,
    cost: computeCost(lines, sheet.yieldPortions, sheet.maxCostPercent, item.priceCents),
  }
}

const lineInputSchema = z.object({
  ingredientId: z.string().trim().min(1),
  quantity: z.number().positive('Quantidade deve ser maior que zero.'),
  unit: z.enum(Object.values(IngredientUnit) as [string, ...string[]]),
})

const recipeSheetSchema = z.object({
  yieldPortions: z.number().int().min(1),
  method: z.string().trim().max(2000).optional(),
  maxCostPercent: z.number().min(1).max(100).optional(),
  lines: z.array(lineInputSchema),
})
export type RecipeSheetInput = z.infer<typeof recipeSheetSchema>

export interface RecipeSheetListRow {
  menuItem: MenuItem
  categoryId: string
  detail: RecipeSheetDetail | null
}

export const recipeSheetsService = {
  /** GET .../recipe-sheets — produto sem ficha aparece com custo/margem "—" (spec história 31). */
  list(establishmentId: string): RecipeSheetListRow[] {
    requireManagerWithFeature(establishmentId)
    const items = findAll<MenuItem>('menuItems').filter((i) => i.establishmentId === establishmentId && i.isActive && !i.deletedAt)
    const sheets = findAll<RecipeSheet>('recipeSheets').filter((s) => s.establishmentId === establishmentId)

    return items.map((item) => {
      const sheet = sheets.find((s) => s.menuItemId === item.id)
      return { menuItem: item, categoryId: item.categoryId, detail: sheet ? toDetail(sheet, item) : null }
    })
  },

  get(establishmentId: string, menuItemId: string): RecipeSheetDetail | null {
    requireManagerWithFeature(establishmentId)
    const item = findById<MenuItem>('menuItems', menuItemId)
    if (!item || item.establishmentId !== establishmentId) throw apiError('NOT_FOUND', 404)

    const sheet = findAll<RecipeSheet>('recipeSheets').find((s) => s.establishmentId === establishmentId && s.menuItemId === menuItemId)
    return sheet ? toDetail(sheet, item) : null
  },

  /** PUT .../recipe-sheet — cria ou substitui a ficha inteira (linhas incluídas). */
  put(establishmentId: string, menuItemId: string, input: RecipeSheetInput): RecipeSheetDetail {
    const session = requireManagerWithFeature(establishmentId)
    const item = findById<MenuItem>('menuItems', menuItemId)
    if (!item || item.establishmentId !== establishmentId) throw apiError('NOT_FOUND', 404)

    const parsed = recipeSheetSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
    const data = parsed.data

    // valida unidade compatível com cada ingrediente antes de gravar qualquer coisa
    const ingredients = findAll<Ingredient>('ingredients')
    for (const line of data.lines) {
      const ingredient = ingredients.find((i) => i.id === line.ingredientId)
      if (!ingredient || ingredient.establishmentId !== establishmentId) throw apiError('NOT_FOUND', 404, { field: 'ingredientId' })
      convertToPurchaseUnit(line.quantity, line.unit as IngredientUnit, ingredient.purchaseUnit)
    }

    const now = nowISO()
    const current = findAll<RecipeSheet>('recipeSheets').find((s) => s.establishmentId === establishmentId && s.menuItemId === menuItemId)
    const sheet: RecipeSheet = {
      id: current?.id ?? newId(),
      establishmentId,
      menuItemId,
      yieldPortions: data.yieldPortions,
      method: data.method ?? null,
      maxCostPercent: data.maxCostPercent ?? DEFAULT_MAX_COST_PERCENT,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    }
    upsert('recipeSheets', sheet)

    for (const existing of findAll<RecipeSheetLine>('recipeSheetLines').filter((l) => l.recipeSheetId === sheet.id)) {
      removeById('recipeSheetLines', existing.id)
    }
    for (const line of data.lines) {
      upsert('recipeSheetLines', {
        id: newId(),
        recipeSheetId: sheet.id,
        ingredientId: line.ingredientId,
        quantity: line.quantity,
        unit: line.unit as IngredientUnit,
        createdAt: now,
        updatedAt: now,
      } satisfies RecipeSheetLine)
    }

    audit.log({ actorUserId: session.userId, establishmentId, entity: 'RecipeSheet', entityId: sheet.id, action: current ? 'UPDATED' : 'CREATED', before: null, after: { menuItemId } })
    return toDetail(sheet, item)
  },
}
