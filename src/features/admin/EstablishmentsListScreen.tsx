import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal, Plus } from 'lucide-react'
import { AdminHeader } from './AdminHeader'
import { StatusBadge, PlanBadge } from './statusBadge'
import { adminEstablishmentsService, type AdminEstablishmentRow } from '../../mock/services/adminEstablishments'
import type { Establishment } from '../../mock/types'

const STATUS_OPTIONS: Array<{ value: Establishment['status'] | ''; label: string }> = [
  { value: '', label: 'Todos os status' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'SETUP', label: 'Em configuração' },
  { value: 'SUSPENDED', label: 'Suspenso' },
  { value: 'DEACTIVATED', label: 'Desativado' },
]

const PLAN_OPTIONS = [
  { value: '', label: 'Todos os planos' },
  { value: 'START', label: 'Start' },
  { value: 'PRO', label: 'Pro' },
  { value: 'BUSINESS', label: 'Business' },
]

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

// EstablishmentsSection (spec história 34): busca + filtros + tabela + "Novo".
export function EstablishmentsListScreen() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<Establishment['status'] | ''>('')
  const [planCode, setPlanCode] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [rows, setRows] = useState<AdminEstablishmentRow[]>([])

  function reload() {
    setRows(adminEstablishmentsService.list({ q, status: status || undefined, planCode: planCode || undefined }))
  }

  useEffect(reload, [q, status, planCode])

  return (
    <div className="flex flex-col">
      <AdminHeader title="Estabelecimentos" onRefresh={reload} />

      <div className="flex flex-col gap-4 p-8">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-card px-4 py-2.5">
            <Search size={18} className="text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar estabelecimento ou cidade…"
              className="w-full bg-transparent font-body text-sm text-foreground outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground"
          >
            <SlidersHorizontal size={16} />
            Filtrar
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/estabelecimentos/novo')}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus size={16} />
            Novo
          </button>
        </div>

        {showFilters && (
          <div className="flex gap-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Establishment['status'] | '')}
              className="rounded-[var(--radius-md)] border border-border bg-card px-3 py-2 text-sm text-foreground"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={planCode}
              onChange={(e) => setPlanCode(e.target.value)}
              className="rounded-[var(--radius-md)] border border-border bg-card px-3 py-2 text-sm text-foreground"
            >
              {PLAN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Estabelecimento</th>
                <th className="px-4 py-3 font-medium">Cidade</th>
                <th className="px-4 py-3 font-medium">Plano</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Entrada</th>
                <th className="px-4 py-3 font-medium">Volume hoje</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {row.name}
                      {row.unitLabel ? ` · ${row.unitLabel}` : ''}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.ticketsOpen === null ? '—' : `${row.ticketsOpen} tickets abertos`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">{row.city}</td>
                  <td className="px-4 py-3">
                    <PlanBadge code={row.planCode} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-foreground">{DATE_FORMAT.format(new Date(row.createdAt))}</td>
                  <td className="px-4 py-3 text-muted-foreground">—</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/estabelecimentos/${row.id}`)}
                      className="text-sm font-semibold text-primary underline decoration-dotted"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhum estabelecimento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
