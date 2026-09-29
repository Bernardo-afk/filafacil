import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { AuthInput } from '../../components/ui/AuthInput'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { managerMenuService, priceCentsFromBRLInput, type ItemInput } from '../../mock/services/managerMenu'
import { isMockApiError } from '../../mock/errors'
import { useSessionStore } from '../../mock/session'
import { formatCents } from '../../lib/money'
import type { MenuCategory, MenuItem } from '../../mock/types'

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

interface ItemFormState {
  categoryId: string
  name: string
  description: string
  priceText: string
  isFeatured: boolean
  isAvailable: boolean
  photoUrl: string | null
}

function emptyForm(categoryId: string): ItemFormState {
  return { categoryId, name: '', description: '', priceText: '', isFeatured: false, isAvailable: true, photoUrl: null }
}

// MenuSection do gestor (spec história 28): "N itens no cardápio" + tabela
// com foto/nome, categoria, preço, status (mesmo endpoint da história 19) e
// ações. Categorias ganham um painel simples de criar/excluir ao lado.
export function MenuScreen() {
  const establishmentId = useSessionStore((s) => s.session?.activeEstablishmentId ?? null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')

  const [editing, setEditing] = useState<MenuItem | 'new' | null>(null)
  const [form, setForm] = useState<ItemFormState>(emptyForm(''))
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reload() {
    if (!establishmentId) return
    try {
      setCategories(managerMenuService.listCategories(establishmentId))
      setItems(managerMenuService.listItems(establishmentId))
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(reload, [establishmentId])

  function categoryName(categoryId: string): string {
    return categories.find((c) => c.id === categoryId)?.name ?? '—'
  }

  function openNew() {
    setForm(emptyForm(categories[0]?.id ?? ''))
    setFormError(null)
    setEditing('new')
  }

  function openEdit(item: MenuItem) {
    setForm({
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      priceText: (item.priceCents / 100).toFixed(2).replace('.', ','),
      isFeatured: item.isFeatured,
      isAvailable: item.isAvailable,
      photoUrl: item.photoUrl,
    })
    setFormError(null)
    setEditing(item)
  }

  function onPickPhoto(file: File | undefined) {
    if (!file || !establishmentId) return
    try {
      managerMenuService.validatePhoto(file)
      setForm((f) => ({ ...f, photoUrl: URL.createObjectURL(file) }))
    } catch (err) {
      setFormError(errorMessage(err))
    }
  }

  async function saveItem() {
    if (!establishmentId) return
    setFormError(null)
    setSaving(true)
    try {
      const input: ItemInput = {
        categoryId: form.categoryId,
        name: form.name,
        description: form.description,
        priceCents: priceCentsFromBRLInput(form.priceText),
        photoUrl: form.photoUrl,
        isFeatured: form.isFeatured,
        isAvailable: form.isAvailable,
      }
      if (editing === 'new') {
        managerMenuService.createItem(establishmentId, input)
      } else if (editing) {
        managerMenuService.updateItem(establishmentId, editing.id, input)
      }
      setEditing(null)
      reload()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  function deleteItem(item: MenuItem) {
    if (!establishmentId) return
    try {
      managerMenuService.deleteItem(establishmentId, item.id)
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function toggleAvailability(item: MenuItem) {
    if (!establishmentId) return
    try {
      managerMenuService.setAvailability(establishmentId, item.id, !item.isAvailable)
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function addCategory() {
    if (!establishmentId || !newCategoryName.trim()) return
    try {
      managerMenuService.createCategory(establishmentId, { name: newCategoryName.trim() })
      setNewCategoryName('')
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function removeCategory(categoryId: string) {
    if (!establishmentId) return
    try {
      managerMenuService.deleteCategory(establishmentId, categoryId)
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

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Cardápio</h1>
          <p className="text-sm text-muted-foreground">{items.length} itens no cardápio</p>
        </div>
        <LoadingButton onClick={openNew}>
          <Plus size={16} /> Novo item
        </LoadingButton>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {categories.map((category) => (
          <span key={category.id} className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm text-foreground">
            {category.name}
            <button type="button" onClick={() => removeCategory(category.id)} aria-label={`Excluir categoria ${category.name}`} className="text-muted-foreground">
              <X size={12} />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-1">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nova categoria"
            className="rounded-full border border-border px-3 py-1.5 text-sm text-foreground outline-none"
          />
          <button type="button" onClick={addCategory} className="rounded-full bg-muted p-1.5 text-foreground">
            <Plus size={14} />
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-card">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Preço</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-muted text-[10px] text-muted-foreground">
                      {item.photoUrl ? <img src={item.photoUrl} alt={item.name} className="h-full w-full rounded-[var(--radius-sm)] object-cover" /> : 'Sem foto'}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      {item.isFeatured && <span className="text-xs text-primary">+ pedido</span>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-foreground">{categoryName(item.categoryId)}</td>
                <td className="px-4 py-3 text-foreground">{formatCents(item.priceCents)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleAvailability(item)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.isAvailable ? 'bg-success-bg text-success' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {item.isAvailable ? 'Disponível' : 'Esgotado'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => openEdit(item)} aria-label={`Editar ${item.name}`} className="text-foreground">
                      <Pencil size={16} />
                    </button>
                    <button type="button" onClick={() => deleteItem(item)} aria-label={`Excluir ${item.name}`} className="text-error">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum item cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-foreground/40" role="dialog" aria-modal="true">
          <div className="h-full w-full max-w-md overflow-y-auto bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">{editing === 'new' ? 'Novo item' : 'Editar item'}</h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-32 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-dashed border-border bg-muted"
              >
                {form.photoUrl ? (
                  <img src={form.photoUrl} alt="Prévia" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm text-muted-foreground">Adicionar foto</span>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => onPickPhoto(e.target.files?.[0])}
              />

              <AuthInput label="Nome" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <label className="flex flex-col gap-1.5">
                <span className="font-body text-sm font-medium text-foreground">Descrição</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  maxLength={400}
                  rows={3}
                  className="rounded-[var(--radius-md)] border border-border p-3 font-body text-sm text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-body text-sm font-medium text-foreground">Categoria</span>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="rounded-[var(--radius-md)] border border-border px-4 py-3 font-body text-base text-foreground outline-none focus:border-primary"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <AuthInput
                label="Preço (R$)"
                placeholder="0,00"
                value={form.priceText}
                onChange={(e) => setForm((f) => ({ ...f, priceText: e.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))} className="h-4 w-4 accent-primary" />
                Destacar em "Mais pedidos"
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))} className="h-4 w-4 accent-primary" />
                Disponível
              </label>

              {formError && <p className="text-sm text-error">{formError}</p>}

              <div className="flex gap-2 pt-2">
                <LoadingButton variant="secondary" className="flex-1" onClick={() => setEditing(null)}>
                  Cancelar
                </LoadingButton>
                <LoadingButton className="flex-1" loading={saving} disabled={!form.categoryId || !form.name.trim()} onClick={saveItem}>
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
