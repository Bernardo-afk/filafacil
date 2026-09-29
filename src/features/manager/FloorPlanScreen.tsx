import { useEffect, useState } from 'react'
import { FloorMap, FLOOR_MAP_STATUS_META } from './FloorMap'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { getFloorPlan, putFloorPlan, tablesService } from '../../mock/services/floorPlan'
import { isMockApiError } from '../../mock/errors'
import { useSessionStore } from '../../mock/session'
import type { DiningTable, TableStatus } from '../../mock/types'

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

// Gestor · Planta (spec história 20, FloorMgrSection): legenda + grade +
// painel da mesa. Sem editor de arrastar-e-soltar (spec: "não criar um CAD
// complexo") — seleciona a mesa e clica na célula de destino pra mover.
export function FloorPlanScreen() {
  const establishmentId = useSessionStore((s) => s.session?.activeEstablishmentId ?? null)
  const [gridCols, setGridCols] = useState(6)
  const [gridRows, setGridRows] = useState(3)
  const [tables, setTables] = useState<DiningTable[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  function reload() {
    if (!establishmentId) return
    try {
      const { floorPlan, tables: t } = getFloorPlan(establishmentId)
      setGridCols(floorPlan.gridCols)
      setGridRows(floorPlan.gridRows)
      setTables(t)
      setDirty(false)
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(reload, [establishmentId])

  const selected = tables.find((t) => t.id === selectedId) ?? null

  function selectTable(table: DiningTable) {
    setSelectedId(table.id)
    setMoving(false)
    setNotice(null)
  }

  function moveSelectedTo(x: number, y: number) {
    if (!selected) return
    setTables((prev) => prev.map((t) => (t.id === selected.id ? { ...t, gridX: x, gridY: y } : t)))
    setMoving(false)
    setDirty(true)
  }

  async function saveLayout() {
    if (!establishmentId) return
    setError(null)
    setSaving(true)
    try {
      putFloorPlan(establishmentId, {
        gridCols,
        gridRows,
        positions: tables.map((t) => ({ tableId: t.id, gridX: t.gridX, gridY: t.gridY, gridW: t.gridW, gridH: t.gridH })),
      })
      setDirty(false)
      setNotice('Planta salva.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  function changeStatus(status: TableStatus) {
    if (!establishmentId || !selected) return
    try {
      tablesService.setStatus(establishmentId, selected.id, status)
      reload()
      setNotice(null)
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
        <h1 className="font-display text-xl font-bold text-foreground">Planta do salão</h1>
        {dirty && (
          <LoadingButton loading={saving} onClick={saveLayout}>
            Salvar planta
          </LoadingButton>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {Object.entries(FLOOR_MAP_STATUS_META).map(([status, meta]) => {
          const Icon = meta.icon
          return (
            <span key={status} className="flex items-center gap-1.5 text-xs text-foreground">
              <Icon size={14} /> {meta.label}
            </span>
          )
        })}
      </div>

      {notice && <p className="text-sm text-success">{notice}</p>}
      {error && <p className="text-sm text-error">{error}</p>}

      {moving && <p className="text-sm text-primary">Escolha a célula de destino para "{selected?.label}".</p>}

      <FloorMap
        gridCols={gridCols}
        gridRows={gridRows}
        tables={tables}
        selectedTableId={selectedId}
        highlightCellForSelection={moving}
        onTableClick={selectTable}
        onCellClick={moving ? moveSelectedTo : undefined}
      />

      {selected && !moving && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-card p-4 sm:max-w-sm">
          <div>
            <p className="font-display text-lg font-bold text-foreground">{selected.label}</p>
            <p className="text-sm text-muted-foreground">
              {FLOOR_MAP_STATUS_META[selected.status].label} · capacidade {selected.capacity ?? '—'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LoadingButton variant="secondary" onClick={() => changeStatus('AVAILABLE')} disabled={selected.status === 'AVAILABLE'}>
              Liberar
            </LoadingButton>
            <LoadingButton variant="secondary" onClick={() => changeStatus('OCCUPIED')} disabled={selected.status === 'OCCUPIED'}>
              Ocupar
            </LoadingButton>
            <LoadingButton variant="secondary" onClick={() => changeStatus('UNAVAILABLE')} disabled={selected.status === 'UNAVAILABLE'}>
              Bloquear
            </LoadingButton>
          </div>
          <div className="flex flex-wrap gap-2">
            <LoadingButton variant="secondary" onClick={() => setMoving(true)}>
              Mover mesa
            </LoadingButton>
            <LoadingButton variant="secondary" disabled title="Em breve">
              Transferir mesa
            </LoadingButton>
            <LoadingButton variant="secondary" disabled title="Em breve">
              Juntar mesas
            </LoadingButton>
            <LoadingButton variant="secondary" disabled title="Em breve">
              Fechar mesa
            </LoadingButton>
          </div>
        </div>
      )}
    </div>
  )
}
