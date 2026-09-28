import { useEffect, useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { managerEstablishmentService } from '../../mock/services/managerEstablishment'
import { isMockApiError } from '../../mock/errors'
import { useSessionStore } from '../../mock/session'
import type { EstablishmentSpecialHours, HoursKind } from '../../mock/types'

const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

interface DayRow {
  weekday: number
  isClosed: boolean
  opensAt: string
  closesAt: string
}

function emptyWeek(): DayRow[] {
  return Array.from({ length: 7 }, (_, weekday) => ({ weekday, isClosed: true, opensAt: '18:00', closesAt: '23:00' }))
}

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

function DayGrid({ title, rows, onChange }: { title: string; rows: DayRow[]; onChange: (rows: DayRow[]) => void }) {
  function updateDay(weekday: number, patch: Partial<DayRow>) {
    onChange(rows.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)))
  }

  function copyToAllDays(weekday: number) {
    const source = rows.find((r) => r.weekday === weekday)!
    onChange(rows.map((r) => ({ ...source, weekday: r.weekday })))
  }

  function set24h(weekday: number) {
    updateDay(weekday, { isClosed: false, opensAt: '00:00', closesAt: '00:00' })
  }

  return (
    <div>
      <h2 className="mb-2 font-body text-sm font-semibold text-foreground">{title}</h2>
      <div className="flex flex-col divide-y divide-border rounded-[var(--radius-md)] border border-border bg-card">
        {rows.map((row) => (
          <div key={row.weekday} className="flex flex-wrap items-center gap-3 p-3">
            <span className="w-24 text-sm font-medium text-foreground">{WEEKDAY_LABELS[row.weekday]}</span>
            <label className="flex items-center gap-1.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={row.isClosed}
                onChange={(e) => updateDay(row.weekday, { isClosed: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              Fechar neste dia
            </label>
            {!row.isClosed && (
              <>
                <input
                  type="time"
                  value={row.opensAt}
                  onChange={(e) => updateDay(row.weekday, { opensAt: e.target.value })}
                  className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-sm text-foreground"
                />
                <span className="text-sm text-muted-foreground">até</span>
                <input
                  type="time"
                  value={row.closesAt}
                  onChange={(e) => updateDay(row.weekday, { closesAt: e.target.value })}
                  className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-sm text-foreground"
                />
                <button type="button" onClick={() => set24h(row.weekday)} className="text-xs text-primary underline decoration-dotted">
                  24 horas
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => copyToAllDays(row.weekday)}
              className="ml-auto flex items-center gap-1 text-xs text-primary underline decoration-dotted"
            >
              <Copy size={12} /> Copiar para todos os dias
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// SchedulesSection do gestor (spec história 12): dois horários (funcionamento
// e pedidos pelo FilaZero), "Copiar horário para outros dias", 24 horas e
// horários especiais por data.
export function HoursScreen() {
  const activeEstablishmentId = useSessionStore((s) => s.session?.activeEstablishmentId ?? null)
  const [business, setBusiness] = useState<DayRow[]>(emptyWeek())
  const [orders, setOrders] = useState<DayRow[]>(emptyWeek())
  const [specialHours, setSpecialHours] = useState<EstablishmentSpecialHours[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [specialDate, setSpecialDate] = useState('')
  const [specialKind, setSpecialKind] = useState<HoursKind>('BUSINESS')
  const [specialClosed, setSpecialClosed] = useState(true)
  const [specialOpensAt, setSpecialOpensAt] = useState('18:00')
  const [specialClosesAt, setSpecialClosesAt] = useState('23:00')

  function reload() {
    if (!activeEstablishmentId) return
    try {
      const view = managerEstablishmentService.get(activeEstablishmentId)
      const toRows = (kind: HoursKind): DayRow[] =>
        emptyWeek().map((fallback) => {
          const found = view.hours.find((h) => h.kind === kind && h.weekday === fallback.weekday)
          return found ? { weekday: found.weekday, isClosed: found.isClosed, opensAt: found.opensAt ?? '18:00', closesAt: found.closesAt ?? '23:00' } : fallback
        })
      setBusiness(toRows('BUSINESS'))
      setOrders(toRows('ORDERS'))
      setSpecialHours(view.specialHours)
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(reload, [activeEstablishmentId])

  async function save() {
    if (!activeEstablishmentId) return
    setError(null)
    setNotice(null)
    setLoading(true)
    try {
      managerEstablishmentService.updateHours(activeEstablishmentId, {
        business: business.map((r) => ({ weekday: r.weekday, isClosed: r.isClosed, opensAt: r.isClosed ? null : r.opensAt, closesAt: r.isClosed ? null : r.closesAt })),
        orders: orders.map((r) => ({ weekday: r.weekday, isClosed: r.isClosed, opensAt: r.isClosed ? null : r.opensAt, closesAt: r.isClosed ? null : r.closesAt })),
      })
      setNotice('Horários salvos.')
      reload()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function saveSpecial() {
    if (!activeEstablishmentId || !specialDate) return
    setError(null)
    try {
      managerEstablishmentService.upsertSpecialHours(activeEstablishmentId, {
        date: specialDate,
        kind: specialKind,
        isClosed: specialClosed,
        opensAt: specialClosed ? null : specialOpensAt,
        closesAt: specialClosed ? null : specialClosesAt,
      })
      setSpecialDate('')
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function removeSpecial(id: string) {
    if (!activeEstablishmentId) return
    try {
      managerEstablishmentService.removeSpecialHours(activeEstablishmentId, id)
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (!activeEstablishmentId) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Selecione um estabelecimento para continuar.</p>
      </div>
    )
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8 p-8">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Horários</h1>
        <p className="text-sm text-muted-foreground">Funcionamento e pedidos pelo FilaZero podem ter janelas diferentes.</p>
      </div>

      <DayGrid title="Funcionamento" rows={business} onChange={setBusiness} />
      <DayGrid title="Pedidos pelo FilaZero" rows={orders} onChange={setOrders} />

      {notice && <p className="text-sm text-success">{notice}</p>}
      {error && <p className="text-sm text-error">{error}</p>}
      <div>
        <LoadingButton loading={loading} onClick={save}>
          Salvar horários
        </LoadingButton>
      </div>

      <div>
        <h2 className="mb-2 font-body text-sm font-semibold text-foreground">Horários especiais</h2>
        <div className="mb-3 flex flex-col gap-2">
          {specialHours.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-card px-4 py-2 text-sm">
              <span className="text-foreground">
                {s.date} · {s.kind === 'BUSINESS' ? 'Funcionamento' : 'Pedidos'} · {s.isClosed ? 'Fechado' : `${s.opensAt}–${s.closesAt}`}
              </span>
              <button type="button" onClick={() => removeSpecial(s.id)} className="text-error" aria-label="Remover horário especial">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {specialHours.length === 0 && <p className="text-sm text-muted-foreground">Nenhum horário especial cadastrado.</p>}
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] border border-border bg-card p-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-sm font-medium text-foreground">Data</span>
            <input
              type="date"
              value={specialDate}
              onChange={(e) => setSpecialDate(e.target.value)}
              className="rounded-[var(--radius-sm)] border border-border px-2 py-1.5 text-sm text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-sm font-medium text-foreground">Tipo</span>
            <select
              value={specialKind}
              onChange={(e) => setSpecialKind(e.target.value as HoursKind)}
              className="rounded-[var(--radius-sm)] border border-border px-2 py-1.5 text-sm text-foreground"
            >
              <option value="BUSINESS">Funcionamento</option>
              <option value="ORDERS">Pedidos</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-sm text-foreground">
            <input type="checkbox" checked={specialClosed} onChange={(e) => setSpecialClosed(e.target.checked)} className="h-4 w-4 accent-primary" />
            Fechado
          </label>
          {!specialClosed && (
            <>
              <input
                type="time"
                value={specialOpensAt}
                onChange={(e) => setSpecialOpensAt(e.target.value)}
                className="rounded-[var(--radius-sm)] border border-border px-2 py-1.5 text-sm text-foreground"
              />
              <input
                type="time"
                value={specialClosesAt}
                onChange={(e) => setSpecialClosesAt(e.target.value)}
                className="rounded-[var(--radius-sm)] border border-border px-2 py-1.5 text-sm text-foreground"
              />
            </>
          )}
          <LoadingButton disabled={!specialDate} onClick={saveSpecial}>
            Salvar horário especial
          </LoadingButton>
        </div>
      </div>
    </div>
  )
}
