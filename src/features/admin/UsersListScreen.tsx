import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Download } from 'lucide-react'
import { AdminHeader } from './AdminHeader'
import { UserStatusBadge } from './userStatusBadge'
import { adminUsersService, type AdminUserFilters, type AdminUserRow, type DisplayStatus } from '../../mock/services/adminUsers'
import { formatLastAccess } from '../../lib/relativeTime'
import type { UserRole } from '../../mock/types'

const ROLE_OPTIONS: Array<{ value: UserRole | ''; label: string }> = [
  { value: '', label: 'Todos os papéis' },
  { value: 'CUSTOMER', label: 'Cliente' },
  { value: 'STAFF', label: 'Equipe' },
  { value: 'PLATFORM_ADMIN', label: 'Admin' },
]

const STATUS_OPTIONS: Array<{ value: DisplayStatus | ''; label: string }> = [
  { value: '', label: 'Todos os status' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INACTIVE', label: 'Inativo' },
  { value: 'SUSPENDED', label: 'Suspenso' },
]

function downloadCsv(csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'usuarios-filazero.csv'
  link.click()
  URL.revokeObjectURL(url)
}

// AdminUsersSection (spec história 36): busca + filtros + tabela + "Exportar".
export function UsersListScreen() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [status, setStatus] = useState<DisplayStatus | ''>('')
  const [rows, setRows] = useState<AdminUserRow[]>([])

  function reload() {
    const filters: AdminUserFilters = { q, role: role || undefined, status: status || undefined }
    setRows(adminUsersService.list(filters))
  }

  useEffect(reload, [q, role, status])

  return (
    <div className="flex flex-col">
      <AdminHeader title="Usuários" onRefresh={reload} />

      <div className="flex flex-col gap-4 p-4 sm:p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-card px-4 py-2.5">
            <Search size={18} className="text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou e-mail…"
              className="w-full bg-transparent font-body text-sm text-foreground outline-none"
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole | '')}
            className="rounded-[var(--radius-md)] border border-border bg-card px-3 py-2.5 text-sm text-foreground"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DisplayStatus | '')}
            className="rounded-[var(--radius-md)] border border-border bg-card px-3 py-2.5 text-sm text-foreground"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => downloadCsv(adminUsersService.exportCsv())}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground"
          >
            <Download size={16} />
            Exportar
          </button>
        </div>

        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Último acesso</th>
                <th className="px-4 py-3 font-medium">Pedidos</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.firstName} {row.lastName}
                  </td>
                  <td className="px-4 py-3 text-foreground">{row.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <UserStatusBadge status={row.displayStatus} />
                  </td>
                  <td className="px-4 py-3 text-foreground">{formatLastAccess(row.lastLoginAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.ordersCount ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/usuarios/${row.id}`)}
                      className="text-sm font-semibold text-primary underline decoration-dotted"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado.
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
