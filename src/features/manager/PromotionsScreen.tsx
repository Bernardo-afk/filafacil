import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { AuthInput } from '../../components/ui/AuthInput'
import { promotionsService, type PromotionInput, type PromotionView } from '../../mock/services/promotions'
import { managerMenuService } from '../../mock/services/managerMenu'
import { isMockApiError } from '../../mock/errors'
import { useSessionStore } from '../../mock/session'
import type { MenuCategory, MenuItem, Promotion } from '../../mock/types'

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

const WEEKDAYS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]

const STATUS_LABELS: Record<PromotionView['status'], string> = { ACTIVE_NOW: 'Ativa agora', SCHEDULED: 'Agendada', INACTIVE: 'Inativa' }
const STATUS_TONES: Record<PromotionView['status'], string> = {
  ACTIVE_NOW: 'bg-success-bg text-success',
  SCHEDULED: 'bg-warning-bg text-warning',
  INACTIVE: 'bg-muted text-muted-foreground',
}

function emptyForm(): PromotionInput {
  return {
    name: '',
    scope: 'ALL',
    discountType: 'PERCENT',
    discountValue: 10,
    weekdays: [1, 2, 3, 4, 5],
    startTime: '17:00',
    endTime: '19:00',
    label: '',
    isActive: true,
    categoryIds: [],
    menuItemIds: [],
  }
}

function scopeSummary(promotion: Promotion, categories: MenuCategory[], items: MenuItem[], targetIds: { categoryId: string | null; menuItemId: string | null }[]): string {
  if (promotion.scope === 'ALL') return 'Todos os itens'
  if (promotion.scope === 'CATEGORIES') {
    const names = targetIds.map((t) => categories.find((c) => c.id === t.categoryId)?.name).filter(Boolean)
    return names.join(', ') || '—'
  }
  const names = targetIds.map((t) => items.find((i) => i.id === t.menuItemId)?.name).filter(Boolean)
  return names.join(', ') || '—'
}

// PromotionsSection do gestor (spec história 29): cartões com nome, status
// derivado, escopo/desconto e dias/horário. Exige PROMOTIONS no plano.
export function PromotionsScreen() {
  const establishmentId = useSessionStore((s) => s.session?.activeEstablishmentId ?? null)
  const [promotions, setPromotions] = useState<PromotionView[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [featureBlocked, setFeatureBlocked] = useState(false)

  const [editing, setEditing] = useState<Promotion | 'new' | null>(null)
  const [form, setForm] = useState<PromotionInput>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function reload() {
    if (!establishmentId) return
    try {
      setPromotions(promotionsService.list(establishmentId))
      setCategories(managerMenuService.listCategories(establishmentId))
      setItems(managerMenuService.listItems(establishmentId))
      setFeatureBlocked(false)
      setError(null)
    } catch (err) {
      if (isMockApiError(err) && err.code === 'FEATURE_NOT_IN_PLAN') {
        setFeatureBlocked(true)
      } else {
        setError(errorMessage(err))
      }
    }
  }

  useEffect(reload, [establishmentId])

  function openNew() {
    setForm(emptyForm())
    setFormError(null)
    setEditing('new')
  }

  function openEdit(view: PromotionView) {
    const p = view.promotion
    setForm({
      name: p.name,
      scope: p.scope,
      discountType: p.discountType,
      discountValue: p.discountValue,
      weekdays: p.weekdays,
      startTime: p.startTime,
      endTime: p.endTime,
      validFrom: p.validFrom ?? undefined,
      validUntil: p.validUntil ?? undefined,
      label: p.label,
      isActive: p.isActive,
      categoryIds: view.targets.map((t) => t.categoryId).filter((v): v is string => Boolean(v)),
      menuItemIds: view.targets.map((t) => t.menuItemId).filter((v): v is string => Boolean(v)),
    })
    setFormError(null)
    setEditing(p)
  }

  function toggleWeekday(value: number) {
    setForm((f) => ({ ...f, weekdays: f.weekdays.includes(value) ? f.weekdays.filter((d) => d !== value) : [...f.weekdays, value] }))
  }

  function toggleTarget(kind: 'categoryIds' | 'menuItemIds', id: string) {
    setForm((f) => {
      const current = f[kind] ?? []
      return { ...f, [kind]: current.includes(id) ? current.filter((v) => v !== id) : [...current, id] }
    })
  }

  async function save() {
    if (!establishmentId) return
    setFormError(null)
    setSaving(true)
    try {
      if (editing === 'new') {
        promotionsService.create(establishmentId, form)
      } else if (editing) {
        promotionsService.update(establishmentId, editing.id, form)
      }
      setEditing(null)
      reload()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  function remove(promotionId: string) {
    if (!establishmentId) return
    try {
      promotionsService.delete(establishmentId, promotionId)
      reload()
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

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold text-foreground">Promoções</h1>
        <LoadingButton onClick={openNew}>
          <Plus size={16} /> Nova promoção
        </LoadingButton>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex flex-col gap-3">
        {promotions.map((view) => (
          <div key={view.promotion.id} className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-border bg-card p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-body font-semibold text-foreground">{view.promotion.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONES[view.status]}`}>{STATUS_LABELS[view.status]}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {scopeSummary(view.promotion, categories, items, view.targets)} · −
                {view.promotion.discountType === 'PERCENT' ? `${view.promotion.discountValue}%` : `R$ ${(view.promotion.discountValue / 100).toFixed(2)}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {view.promotion.weekdays.length === 7 ? 'Toda semana' : WEEKDAYS.filter((w) => view.promotion.weekdays.includes(w.value)).map((w) => w.label).join(', ')} ·{' '}
                {view.promotion.startTime}–{view.promotion.endTime}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => openEdit(view)} aria-label={`Editar ${view.promotion.name}`} className="text-foreground">
                <Pencil size={16} />
              </button>
              <button type="button" onClick={() => remove(view.promotion.id)} aria-label={`Excluir ${view.promotion.name}`} className="text-error">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {promotions.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma promoção cadastrada.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-xl)] bg-card p-6">
            <h2 className="mb-4 font-display text-lg font-bold text-foreground">{editing === 'new' ? 'Nova promoção' : 'Editar promoção'}</h2>

            <div className="flex flex-col gap-4">
              <AuthInput label="Nome" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <AuthInput label="Selo exibido ao cliente" placeholder="Happy Hour -20%" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />

              <label className="flex flex-col gap-1.5">
                <span className="font-body text-sm font-medium text-foreground">Escopo</span>
                <select
                  value={form.scope}
                  onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as PromotionInput['scope'] }))}
                  className="rounded-[var(--radius-md)] border border-border px-4 py-3 text-sm text-foreground"
                >
                  <option value="ALL">Todos</option>
                  <option value="CATEGORIES">Categorias</option>
                  <option value="ITEMS">Itens</option>
                </select>
              </label>

              {form.scope === 'CATEGORIES' && (
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleTarget('categoryIds', c.id)}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                        form.categoryIds?.includes(c.id) ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}

              {form.scope === 'ITEMS' && (
                <div className="flex flex-wrap gap-2">
                  {items.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => toggleTarget('menuItemIds', i.id)}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                        form.menuItemIds?.includes(i.id) ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground'
                      }`}
                    >
                      {i.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="font-body text-sm font-medium text-foreground">Tipo</span>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as PromotionInput['discountType'] }))}
                    className="rounded-[var(--radius-md)] border border-border px-4 py-3 text-sm text-foreground"
                  >
                    <option value="PERCENT">Percentual (%)</option>
                    <option value="FIXED_PRICE_CENTS">Preço fixo (R$)</option>
                  </select>
                </label>
                <AuthInput
                  label={form.discountType === 'PERCENT' ? 'Desconto (%)' : 'Preço fixo (centavos)'}
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm((f) => ({ ...f, discountValue: Number(e.target.value) }))}
                />
              </div>

              <div>
                <span className="mb-1.5 block font-body text-sm font-medium text-foreground">Dias da semana</span>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((w) => (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() => toggleWeekday(w.value)}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                        form.weekdays.includes(w.value) ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="font-body text-sm font-medium text-foreground">Início</span>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm text-foreground"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="font-body text-sm font-medium text-foreground">Fim</span>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm text-foreground"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 accent-primary" />
                Ativa
              </label>

              {formError && <p className="text-sm text-error">{formError}</p>}

              <div className="flex gap-2 pt-2">
                <LoadingButton variant="secondary" className="flex-1" onClick={() => setEditing(null)}>
                  Cancelar
                </LoadingButton>
                <LoadingButton className="flex-1" loading={saving} onClick={save}>
                  Salvar
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
