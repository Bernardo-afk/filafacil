import { useEffect, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { AuthInput } from '../../components/ui/AuthInput'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { areasService, tablesService, type TableInput } from '../../mock/services/floorPlan'
import { isMockApiError } from '../../mock/errors'
import { useSessionStore } from '../../mock/session'
import type { Area, DiningTable } from '../../mock/types'

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

// Gestor · Mesas e locais (spec história 20, TablesSection): "N locais
// configurados em M áreas", tabela por área com código/QR/status.
export function TablesScreen() {
  const establishmentId = useSessionStore((s) => s.session?.activeEstablishmentId ?? null)
  const [areas, setAreas] = useState<Area[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [error, setError] = useState<string | null>(null)
  const [newAreaName, setNewAreaName] = useState('')

  const [addingTable, setAddingTable] = useState(false)
  const [editingTable, setEditingTable] = useState<DiningTable | null>(null)
  const [form, setForm] = useState<TableInput>({ code: '', label: '', areaId: '', capacity: 4 })
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function reload() {
    if (!establishmentId) return
    try {
      setAreas(areasService.list(establishmentId))
      setTables(tablesService.list(establishmentId).filter((t) => t.isActive))
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(reload, [establishmentId])

  function addArea() {
    if (!establishmentId || !newAreaName.trim()) return
    try {
      areasService.create(establishmentId, { name: newAreaName.trim() })
      setNewAreaName('')
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function openAdd() {
    setForm({ code: '', label: '', areaId: areas[0]?.id ?? '', capacity: 4 })
    setFormError(null)
    setAddingTable(true)
  }

  function openEdit(table: DiningTable) {
    setForm({ code: table.code, label: table.label, areaId: table.areaId, capacity: table.capacity, type: table.type, shape: table.shape })
    setFormError(null)
    setEditingTable(table)
  }

  async function saveTable() {
    if (!establishmentId) return
    setFormError(null)
    setSaving(true)
    try {
      if (editingTable) {
        tablesService.update(establishmentId, editingTable.id, form)
      } else {
        tablesService.create(establishmentId, form)
      }
      setAddingTable(false)
      setEditingTable(null)
      reload()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  function deactivate(table: DiningTable) {
    if (!establishmentId) return
    try {
      tablesService.delete(establishmentId, table.id)
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
          <h1 className="font-display text-xl font-bold text-foreground">Mesas e locais</h1>
          <p className="text-sm text-muted-foreground">
            {tables.length} locais configurados em {areas.length} áreas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <input
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              placeholder="Nova área"
              className="w-28 rounded-full border border-border px-3 py-1.5 text-sm text-foreground outline-none"
            />
            <button type="button" onClick={addArea} className="rounded-full bg-muted p-1.5 text-foreground">
              <Plus size={14} />
            </button>
          </div>
          <LoadingButton onClick={openAdd}>
            <Plus size={16} /> Adicionar mesa
          </LoadingButton>
        </div>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      {areas.map((area) => (
        <div key={area.id} className="flex flex-col gap-2">
          <h2 className="font-body text-sm font-semibold text-foreground">{area.name}</h2>
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-card">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Mesa/Local</th>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">QR Code</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tables
                  .filter((t) => t.areaId === area.id)
                  .map((table) => (
                    <tr key={table.id}>
                      <td className="px-4 py-3 font-medium text-foreground">{table.label}</td>
                      <td className="px-4 py-3 text-foreground">{table.code}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{table.qrToken.slice(0, 8)}…</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">Ativa</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => openEdit(table)} aria-label={`Editar ${table.label}`} className="text-foreground">
                            <Pencil size={16} />
                          </button>
                          <button type="button" onClick={() => deactivate(table)} className="text-xs text-error underline decoration-dotted">
                            Desativar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {tables.filter((t) => t.areaId === area.id).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Nenhuma mesa nesta área.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {(addingTable || editingTable) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-[var(--radius-xl)] bg-card p-6">
            <h2 className="mb-4 font-display text-lg font-bold text-foreground">{editingTable ? 'Editar mesa' : 'Adicionar mesa'}</h2>
            <div className="flex flex-col gap-4">
              <AuthInput label="Nome da mesa" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
              <AuthInput label="Código" placeholder="M19" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
              <label className="flex flex-col gap-1.5">
                <span className="font-body text-sm font-medium text-foreground">Área</span>
                <select value={form.areaId} onChange={(e) => setForm((f) => ({ ...f, areaId: e.target.value }))} className="rounded-[var(--radius-md)] border border-border px-4 py-3 text-sm text-foreground">
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <AuthInput
                label="Capacidade"
                type="number"
                min={1}
                max={30}
                value={form.capacity ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) || null }))}
              />
              {formError && <p className="text-sm text-error">{formError}</p>}
              <div className="flex gap-2 pt-2">
                <LoadingButton
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setAddingTable(false)
                    setEditingTable(null)
                  }}
                >
                  Cancelar
                </LoadingButton>
                <LoadingButton className="flex-1" loading={saving} onClick={saveTable}>
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
