import { useEffect, useState } from 'react'
import { Plus, X, Bell, ArmchairIcon, UserX } from 'lucide-react'
import { AuthInput } from '../../components/ui/AuthInput'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { managerWaitlistService, type WaitlistEntryView, type JoinWaitlistInput } from '../../mock/services/waitlist'
import { tablesService } from '../../mock/services/floorPlan'
import { isMockApiError } from '../../mock/errors'
import { useSessionStore } from '../../mock/session'
import type { DiningTable } from '../../mock/types'

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

const STATUS_LABELS: Record<string, string> = { WAITING: 'Aguardando', NOTIFIED: 'Chamado' }

// Gestor · Fila de espera (spec história 21, WaitlistMgrSection): indicadores,
// tabela com ações e o modal de "Adicionar"/"Atribuir mesa" (❌ não
// desenhados — proposta: nome/pessoas/telefone e a lista de mesas
// compatíveis livres, spec §30).
export function WaitlistScreen() {
  const establishmentId = useSessionStore((s) => s.session?.activeEstablishmentId ?? null)
  const [entries, setEntries] = useState<WaitlistEntryView[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [error, setError] = useState<string | null>(null)
  const [featureBlocked, setFeatureBlocked] = useState(false)

  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<JoinWaitlistInput>({ customerName: '', partySize: 2 })
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [assigning, setAssigning] = useState<WaitlistEntryView | null>(null)

  function reload() {
    if (!establishmentId) return
    try {
      setEntries(managerWaitlistService.list(establishmentId))
      setTables(tablesService.list(establishmentId))
      setFeatureBlocked(false)
      setError(null)
    } catch (err) {
      if (isMockApiError(err) && err.code === 'FEATURE_NOT_IN_PLAN') setFeatureBlocked(true)
      else setError(errorMessage(err))
    }
  }

  useEffect(reload, [establishmentId])

  async function addToWaitlist() {
    if (!establishmentId) return
    setFormError(null)
    setSaving(true)
    try {
      managerWaitlistService.add(establishmentId, form)
      setAdding(false)
      setForm({ customerName: '', partySize: 2 })
      reload()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  function notify(entryId: string) {
    if (!establishmentId) return
    try {
      managerWaitlistService.notify(establishmentId, entryId)
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function noShow(entryId: string) {
    if (!establishmentId) return
    try {
      managerWaitlistService.noShow(establishmentId, entryId)
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function remove(entryId: string) {
    if (!establishmentId) return
    try {
      managerWaitlistService.remove(establishmentId, entryId)
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function assign(tableId: string) {
    if (!establishmentId || !assigning) return
    try {
      managerWaitlistService.assignTable(establishmentId, assigning.entry.id, tableId)
      setAssigning(null)
      reload()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (!establishmentId) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Selecione um estabelecimento para continuar.</p>
      </div>
    )
  }
  if (featureBlocked) {
    return (
      <div className="p-8">
        <p className="text-sm text-error">Recurso não incluso no seu plano. Fale com o administrador da plataforma para fazer upgrade.</p>
      </div>
    )
  }

  const maxEta = entries.reduce<number | null>((max, e) => (e.estimatedWaitMinutes == null ? max : Math.max(max ?? 0, e.estimatedWaitMinutes)), null)
  const compatibleFreeTables = assigning ? tables.filter((t) => t.isActive && t.type === 'TABLE' && t.status === 'AVAILABLE' && (t.capacity ?? 0) >= assigning.entry.partySize) : []

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="font-display text-xl font-bold text-foreground">Fila de espera</h1>

      <div className="flex flex-wrap gap-4">
        <div className="rounded-[var(--radius-md)] border border-border bg-card px-5 py-3">
          <p className="text-xs text-muted-foreground">Total na fila</p>
          <p className="font-display text-lg font-bold text-foreground">{entries.length} grupos</p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-border bg-card px-5 py-3">
          <p className="text-xs text-muted-foreground">Espera estimada</p>
          <p className="font-display text-lg font-bold text-foreground">{maxEta != null ? `~${maxEta} min` : '—'}</p>
        </div>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="rounded-[var(--radius-md)] border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-body font-semibold text-foreground">Fila de espera</h2>
          <LoadingButton onClick={() => setAdding(true)}>
            <Plus size={16} /> Adicionar
          </LoadingButton>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Pos.</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Pessoas</th>
              <th className="px-4 py-3 font-medium">Tempo esperando</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((view) => (
              <tr key={view.entry.id}>
                <td className="px-4 py-3 text-foreground">{view.entry.position}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{view.entry.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {view.entry.phoneE164 || '—'} · {STATUS_LABELS[view.entry.status]}
                  </p>
                  {view.noCompatibleTable && <p className="text-xs text-error">Nenhuma mesa comporta {view.entry.partySize} pessoas</p>}
                </td>
                <td className="px-4 py-3 text-foreground">{view.entry.partySize} pessoas</td>
                <td className="px-4 py-3 text-foreground">{view.waitingMinutes} min</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => notify(view.entry.id)} aria-label="Chamar" className="text-foreground" title="Chamar">
                      <Bell size={16} />
                    </button>
                    <button type="button" onClick={() => setAssigning(view)} aria-label="Atribuir mesa" className="text-foreground" title="Atribuir mesa">
                      <ArmchairIcon size={16} />
                    </button>
                    <button type="button" onClick={() => noShow(view.entry.id)} aria-label="Não compareceu" className="text-warning" title="Não compareceu">
                      <UserX size={16} />
                    </button>
                    <button type="button" onClick={() => remove(view.entry.id)} aria-label="Remover" className="text-error" title="Remover">
                      <X size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Ninguém na fila.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-[var(--radius-xl)] bg-card p-6">
            <h2 className="mb-4 font-display text-lg font-bold text-foreground">Entrar na fila</h2>
            <div className="flex flex-col gap-4">
              <AuthInput label="Nome" value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} />
              <AuthInput
                label="Quantas pessoas?"
                type="number"
                min={1}
                max={30}
                value={form.partySize}
                onChange={(e) => setForm((f) => ({ ...f, partySize: Number(e.target.value) || 1 }))}
              />
              <AuthInput label="Telefone (opcional)" value={form.phoneE164 ?? ''} onChange={(e) => setForm((f) => ({ ...f, phoneE164: e.target.value }))} />
              {formError && <p className="text-sm text-error">{formError}</p>}
              <div className="flex gap-2 pt-2">
                <LoadingButton variant="secondary" className="flex-1" onClick={() => setAdding(false)}>
                  Cancelar
                </LoadingButton>
                <LoadingButton className="flex-1" loading={saving} disabled={!form.customerName.trim()} onClick={addToWaitlist}>
                  Adicionar
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {assigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-[var(--radius-xl)] bg-card p-6">
            <h2 className="mb-4 font-display text-lg font-bold text-foreground">Atribuir mesa — {assigning.entry.customerName}</h2>
            <div className="mb-4 flex flex-col gap-2">
              {compatibleFreeTables.map((table) => (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => assign(table.id)}
                  className="flex items-center justify-between rounded-[var(--radius-md)] border border-border px-4 py-3 text-left text-sm font-semibold text-foreground"
                >
                  {table.label}
                  <span className="text-muted-foreground">capacidade {table.capacity}</span>
                </button>
              ))}
              {compatibleFreeTables.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma mesa livre e compatível agora.</p>}
            </div>
            <LoadingButton variant="secondary" className="w-full" onClick={() => setAssigning(null)}>
              Cancelar
            </LoadingButton>
          </div>
        </div>
      )}
    </div>
  )
}
