import { useEffect, useState } from 'react'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import { AuthInput } from '../../components/ui/AuthInput'
import { LoadingButton } from '../../components/ui/LoadingButton'
import {
  recipeSheetsService,
  ingredientsService,
  type RecipeSheetListRow,
  type RecipeSheetDetail,
  type RecipeSheetInput,
} from '../../mock/services/recipeSheets'
import { managerMenuService } from '../../mock/services/managerMenu'
import { isMockApiError } from '../../mock/errors'
import { useSessionStore } from '../../mock/session'
import { formatCents } from '../../lib/money'
import { IngredientUnit } from '../../mock/types'
import type { Ingredient, MenuCategory } from '../../mock/types'

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

interface LineDraft {
  ingredientId: string
  quantity: string
  unit: string
}

// RecipesSection do gestor (spec história 31): tabela produto/categoria/
// ingredientes/custo/preço/margem, painel de detalhe e editor com custo ao
// vivo. Custo e margem nunca são gravados — sempre calculados na leitura.
export function RecipeSheetsScreen() {
  const establishmentId = useSessionStore((s) => s.session?.activeEstablishmentId ?? null)
  const [rows, setRows] = useState<RecipeSheetListRow[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [featureBlocked, setFeatureBlocked] = useState(false)

  const [selected, setSelected] = useState<RecipeSheetListRow | null>(null)
  const [editing, setEditing] = useState(false)
  const [yieldPortions, setYieldPortions] = useState('1')
  const [maxCostPercent, setMaxCostPercent] = useState('40')
  const [method, setMethod] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [newIngredientName, setNewIngredientName] = useState('')
  const [newIngredientUnit, setNewIngredientUnit] = useState<string>('UN')
  const [newIngredientCost, setNewIngredientCost] = useState('')

  function reload() {
    if (!establishmentId) return
    try {
      setRows(recipeSheetsService.list(establishmentId))
      setCategories(managerMenuService.listCategories(establishmentId))
      setIngredients(ingredientsService.list(establishmentId))
      setFeatureBlocked(false)
      setError(null)
    } catch (err) {
      if (isMockApiError(err) && err.code === 'FEATURE_NOT_IN_PLAN') setFeatureBlocked(true)
      else setError(errorMessage(err))
    }
  }

  useEffect(reload, [establishmentId])

  function categoryName(categoryId: string): string {
    return categories.find((c) => c.id === categoryId)?.name ?? '—'
  }

  function openRow(row: RecipeSheetListRow) {
    setSelected(row)
    setEditing(false)
  }

  function openEditor(row: RecipeSheetListRow) {
    setSelected(row)
    setYieldPortions(String(row.detail?.yieldPortions ?? 1))
    setMaxCostPercent(String(row.detail?.maxCostPercent ?? 40))
    setMethod(row.detail?.method ?? '')
    setLines(row.detail?.lines.map((l) => ({ ingredientId: l.ingredientId, quantity: String(l.quantity), unit: l.unit })) ?? [])
    setFormError(null)
    setEditing(true)
  }

  function addLine() {
    setLines((prev) => [...prev, { ingredientId: ingredients[0]?.id ?? '', quantity: '1', unit: ingredients[0]?.purchaseUnit ?? 'UN' }])
  }

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  async function saveSheet() {
    if (!establishmentId || !selected) return
    setFormError(null)
    setSaving(true)
    try {
      const input: RecipeSheetInput = {
        yieldPortions: Number(yieldPortions) || 1,
        method: method || undefined,
        maxCostPercent: Number(maxCostPercent) || 40,
        lines: lines
          .filter((l) => l.ingredientId)
          .map((l) => ({ ingredientId: l.ingredientId, quantity: Number(l.quantity.replace(',', '.')) || 0, unit: l.unit })),
      }
      recipeSheetsService.put(establishmentId, selected.menuItem.id, input)
      reload()
      const updated = recipeSheetsService.list(establishmentId).find((r) => r.menuItem.id === selected.menuItem.id) ?? null
      setSelected(updated)
      setEditing(false)
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  function addIngredient() {
    if (!establishmentId || !newIngredientName.trim() || !newIngredientCost) return
    try {
      ingredientsService.create(establishmentId, {
        name: newIngredientName.trim(),
        purchaseUnit: newIngredientUnit as Ingredient['purchaseUnit'],
        unitCostCents: Math.round(Number(newIngredientCost.replace(',', '.')) * 100),
      })
      setNewIngredientName('')
      setNewIngredientCost('')
      setIngredients(ingredientsService.list(establishmentId))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (!establishmentId) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <p className="text-sm text-muted-foreground">Selecione um estabelecimento para continuar.</p>
      </div>
    )
  }
  if (featureBlocked) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <p className="text-sm text-error">Recurso não incluso no seu plano. Fale com o administrador da plataforma para fazer upgrade.</p>
      </div>
    )
  }

  const filteredRows = activeCategory ? rows.filter((r) => r.categoryId === activeCategory) : rows

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8">
      <h1 className="font-display text-xl font-bold text-foreground">Fichas técnicas</h1>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${activeCategory === null ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground'}`}
        >
          Todas
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveCategory(c.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${activeCategory === c.id ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground'}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Produto</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Custo</th>
              <th className="px-4 py-3 font-medium">Preço venda</th>
              <th className="px-4 py-3 font-medium">Margem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredRows.map((row) => (
              <tr key={row.menuItem.id} onClick={() => openRow(row)} className="cursor-pointer hover:bg-muted/40">
                <td className="px-4 py-3 font-medium text-foreground">{row.menuItem.name}</td>
                <td className="px-4 py-3 text-foreground">{categoryName(row.categoryId)}</td>
                <td className="px-4 py-3 text-foreground">
                  {row.detail ? (
                    <span className="flex items-center gap-1">
                      {formatCents(row.detail.cost.costPerPortionCents)}
                      {row.detail.cost.costAlert && <AlertTriangle size={14} className="text-warning" />}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-foreground">{formatCents(row.menuItem.priceCents)}</td>
                <td className="px-4 py-3 text-foreground">{row.detail ? `${formatCents(row.detail.cost.marginCents)} (${row.detail.cost.marginPercent}%)` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-2 font-body text-sm font-semibold text-foreground">Ingredientes</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {ingredients.map((i) => (
            <span key={i.id} className="rounded-full border border-border px-3 py-1 text-xs text-foreground">
              {i.name} · {formatCents(i.unitCostCents)}/{i.purchaseUnit}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <AuthInput label="Nome" value={newIngredientName} onChange={(e) => setNewIngredientName(e.target.value)} />
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-sm font-medium text-foreground">Unidade de compra</span>
            <select value={newIngredientUnit} onChange={(e) => setNewIngredientUnit(e.target.value)} className="rounded-[var(--radius-md)] border border-border px-3 py-2.5 text-sm text-foreground">
              {Object.values(IngredientUnit).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
          <AuthInput label="Custo (R$)" value={newIngredientCost} onChange={(e) => setNewIngredientCost(e.target.value)} />
          <LoadingButton onClick={addIngredient}>
            <Plus size={16} /> Adicionar
          </LoadingButton>
        </div>
      </div>

      {selected && !editing && (
        <RecipeDetailPanel row={selected} onClose={() => setSelected(null)} onEdit={() => openEditor(selected)} />
      )}

      {selected && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-xl)] bg-card p-6">
            <h2 className="mb-4 font-display text-lg font-bold text-foreground">Ficha — {selected.menuItem.name}</h2>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <AuthInput label="Rendimento (porções)" type="number" min={1} value={yieldPortions} onChange={(e) => setYieldPortions(e.target.value)} />
                <AuthInput label="Alerta de CMV (%)" type="number" value={maxCostPercent} onChange={(e) => setMaxCostPercent(e.target.value)} />
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="font-body text-sm font-medium text-foreground">Modo de preparo (opcional)</span>
                <textarea value={method} onChange={(e) => setMethod(e.target.value)} rows={3} className="rounded-[var(--radius-md)] border border-border p-3 text-sm text-foreground" />
              </label>

              <div>
                <span className="mb-1.5 block font-body text-sm font-medium text-foreground">Ingredientes</span>
                <div className="flex flex-col gap-2">
                  {lines.map((line, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={line.ingredientId}
                        onChange={(e) => updateLine(index, { ingredientId: e.target.value })}
                        className="flex-1 rounded-[var(--radius-sm)] border border-border px-2 py-2 text-sm text-foreground"
                      >
                        {ingredients.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </select>
                      <input
                        value={line.quantity}
                        onChange={(e) => updateLine(index, { quantity: e.target.value })}
                        className="w-20 rounded-[var(--radius-sm)] border border-border px-2 py-2 text-sm text-foreground"
                      />
                      <select value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })} className="w-20 rounded-[var(--radius-sm)] border border-border px-2 py-2 text-sm text-foreground">
                        {Object.values(IngredientUnit).map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => setLines(lines.filter((_, i) => i !== index))} className="text-error" aria-label="Remover linha">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addLine} className="flex w-fit items-center gap-1 text-sm text-primary underline decoration-dotted">
                    <Plus size={14} /> Adicionar ingrediente
                  </button>
                </div>
              </div>

              {formError && <p className="text-sm text-error">{formError}</p>}

              <div className="flex gap-2 pt-2">
                <LoadingButton variant="secondary" className="flex-1" onClick={() => setEditing(false)}>
                  Cancelar
                </LoadingButton>
                <LoadingButton className="flex-1" loading={saving} onClick={saveSheet}>
                  Salvar ficha
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RecipeDetailPanel({ row, onClose, onEdit }: { row: RecipeSheetListRow; onClose: () => void; onEdit: () => void }) {
  const detail: RecipeSheetDetail | null = row.detail
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-[var(--radius-xl)] bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-bold text-foreground">{row.menuItem.name}</h2>
        {detail ? (
          <>
            <ul className="mb-4 flex flex-col gap-1">
              {detail.lines.map((l) => (
                <li key={l.ingredientId} className="flex justify-between text-sm text-foreground">
                  <span>
                    {l.name} ({l.quantity} {l.unit})
                  </span>
                  <span>{formatCents(l.costCents)}</span>
                </li>
              ))}
              {detail.lines.length === 0 && <li className="text-sm text-muted-foreground">Sem ingredientes cadastrados.</li>}
            </ul>
            <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between font-semibold text-foreground">
                <span>Custo total</span>
                <span>{formatCents(detail.cost.costPerPortionCents)}</span>
              </div>
              <div className="flex justify-between text-foreground">
                <span>Preço venda</span>
                <span>{formatCents(detail.priceCents)}</span>
              </div>
              <div className="flex justify-between text-foreground">
                <span>Margem</span>
                <span>
                  {formatCents(detail.cost.marginCents)} ({detail.cost.marginPercent}%)
                </span>
              </div>
              {detail.cost.costAlert && (
                <p className="mt-1 flex items-center gap-1 text-warning">
                  <AlertTriangle size={14} /> CMV de {detail.cost.cmvPercent}% acima do limite de {detail.maxCostPercent}%
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">Este item ainda não tem ficha técnica.</p>
        )}
        <div className="mt-4 flex gap-2">
          <LoadingButton variant="secondary" className="flex-1" onClick={onClose}>
            Fechar
          </LoadingButton>
          <LoadingButton className="flex-1" onClick={onEdit}>
            Editar ficha
          </LoadingButton>
        </div>
      </div>
    </div>
  )
}
