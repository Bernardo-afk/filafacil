import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { AdminHeader } from './AdminHeader'
import { UserStatusBadge } from './userStatusBadge'
import { LoadingButton } from '../../components/ui/LoadingButton'
import { adminUsersService, type AdminUserDetail } from '../../mock/services/adminUsers'
import { adminEstablishmentsService } from '../../mock/services/adminEstablishments'
import { isMockApiError } from '../../mock/errors'
import { formatLastAccess } from '../../lib/relativeTime'
import { MembershipRole, UserRole } from '../../mock/types'
import type { AuditLog, Membership } from '../../mock/types'

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Cliente',
  STAFF: 'Equipe',
  PLATFORM_ADMIN: 'Admin',
}

const MEMBERSHIP_ROLE_LABELS: Record<string, string> = {
  ATTENDANT: 'Atendente',
  RECEPTION: 'Recepção',
  WAITER: 'Garçom',
  KITCHEN: 'Cozinha',
  CASHIER: 'Caixa',
  SUPERVISOR: 'Supervisor',
  MANAGER: 'Gestor',
}

function errorMessage(err: unknown): string {
  if (isMockApiError(err)) return err.message
  return 'Algo deu errado. Tente novamente.'
}

interface MembershipDraft {
  role: Membership['role']
  establishmentId: string
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-border bg-card p-4">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-display text-lg font-semibold text-foreground">{value}</span>
    </div>
  )
}

// Painel de detalhe do usuário (spec história 36: "❌ não desenhado — proposta:
// painel lateral com dados básicos, vínculos, histórico e as ações 'Alterar
// papel/vínculos' e 'Suspender/Reativar'"). Vira tela própria, como a de
// estabelecimento (história 34, decisão 17).
export function UserDetailScreen() {
  const navigate = useNavigate()
  const { userId } = useParams()
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [audit, setAudit] = useState<AuditLog[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [editingRole, setEditingRole] = useState(false)
  const [role, setRole] = useState<string>('CUSTOMER')
  const [memberships, setMemberships] = useState<MembershipDraft[]>([])
  const [roleError, setRoleError] = useState<string | null>(null)
  const [establishments, setEstablishments] = useState<Array<{ id: string; name: string }>>([])

  const [suspendReason, setSuspendReason] = useState<string | null>(null)
  const [suspendError, setSuspendError] = useState<string | null>(null)

  const reload = useCallback(() => {
    if (!userId) return
    try {
      const d = adminUsersService.get(userId)
      setDetail(d)
      setAudit(adminUsersService.listAudit(userId))
      setRole(d.role)
      setMemberships(d.memberships.map((m) => ({ role: m.role, establishmentId: m.establishmentId ?? '' })))
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [userId])

  useEffect(() => {
    reload()
    setEstablishments(adminEstablishmentsService.list().map((e) => ({ id: e.id, name: e.unitLabel ? `${e.name} · ${e.unitLabel}` : e.name })))
  }, [reload])

  if (error) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <p className="text-sm text-error">{error}</p>
      </div>
    )
  }
  if (!detail || !userId) return null
  const id = userId

  function openRoleEditor() {
    setRoleError(null)
    setRole(detail!.role)
    setMemberships(detail!.memberships.map((m) => ({ role: m.role, establishmentId: m.establishmentId ?? '' })))
    setEditingRole(true)
  }

  async function saveRole() {
    setRoleError(null)
    setLoading(true)
    try {
      adminUsersService.changeRole(id, {
        role: role as never,
        memberships:
          role === 'STAFF' ? memberships.filter((m) => m.establishmentId).map((m) => ({ role: m.role, establishmentId: m.establishmentId })) : [],
      })
      setEditingRole(false)
      reload()
    } catch (err) {
      setRoleError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function suspend(reason: string) {
    setLoading(true)
    try {
      adminUsersService.suspend(id, { reason })
      setSuspendReason(null)
      setSuspendError(null)
      reload()
    } catch (err) {
      setSuspendError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function reactivate() {
    setLoading(true)
    try {
      adminUsersService.reactivate(id)
      reload()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col">
      <AdminHeader title="Detalhe do usuário" onRefresh={reload} />

      <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8">
        <button
          type="button"
          onClick={() => navigate('/admin/usuarios')}
          className="flex w-fit items-center gap-2 text-sm font-semibold text-foreground"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              {detail.firstName} {detail.lastName}
            </h2>
            <p className="text-sm text-muted-foreground">{detail.email ?? detail.phoneE164 ?? '—'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">{ROLE_LABELS[detail.role]}</span>
            <UserStatusBadge status={detail.displayStatus} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Último acesso" value={formatLastAccess(detail.lastLoginAt)} />
          <Stat label="Membro desde" value={DATE_TIME_FORMAT.format(new Date(detail.createdAt))} />
          <Stat label="Pedidos" value="—" />
        </div>

        <div>
          <h3 className="mb-2 font-body text-sm font-semibold text-foreground">Vínculos</h3>
          {detail.memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum vínculo.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {detail.memberships.map((m) => (
                <li key={m.id} className="text-sm text-foreground">
                  {MEMBERSHIP_ROLE_LABELS[m.role]} · {m.establishmentName ?? m.organizationName ?? '—'}
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <LoadingButton variant="secondary" onClick={openRoleEditor}>
            Alterar papel/vínculos
          </LoadingButton>
          {detail.status === 'SUSPENDED' ? (
            <LoadingButton loading={loading} onClick={reactivate}>
              Reativar
            </LoadingButton>
          ) : (
            <LoadingButton loading={loading} variant="secondary" onClick={() => setSuspendReason('')}>
              Suspender
            </LoadingButton>
          )}
        </div>

        <div>
          <h3 className="mb-2 font-body text-sm font-semibold text-foreground">Histórico</h3>
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem alterações registradas.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {audit.map((log) => (
                <li key={log.id} className="rounded-[var(--radius-md)] border border-border bg-card p-3 text-sm">
                  <p className="font-medium text-foreground">{log.action}</p>
                  <p className="text-xs text-muted-foreground">{DATE_TIME_FORMAT.format(new Date(log.createdAt))}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-[var(--radius-xl)] bg-card p-6">
            <h3 className="mb-4 font-display text-lg font-bold text-foreground">Alterar papel/vínculos</h3>

            <label className="mb-4 flex flex-col gap-1.5">
              <span className="font-body text-sm font-medium text-foreground">Papel</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-[var(--radius-md)] border border-border px-4 py-2.5 font-body text-sm text-foreground outline-none focus:border-primary"
              >
                {Object.values(UserRole).map((value) => (
                  <option key={value} value={value}>
                    {ROLE_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>

            {role === 'STAFF' && (
              <div className="mb-4 flex flex-col gap-2">
                <span className="font-body text-sm font-medium text-foreground">Vínculos</span>
                {memberships.map((m, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={m.role}
                      onChange={(e) => {
                        const next = [...memberships]
                        next[index] = { ...m, role: e.target.value as Membership['role'] }
                        setMemberships(next)
                      }}
                      className="rounded-[var(--radius-md)] border border-border px-2 py-2 text-sm text-foreground"
                    >
                      {Object.values(MembershipRole).map((value) => (
                        <option key={value} value={value}>
                          {MEMBERSHIP_ROLE_LABELS[value]}
                        </option>
                      ))}
                    </select>
                    <select
                      value={m.establishmentId}
                      onChange={(e) => {
                        const next = [...memberships]
                        next[index] = { ...m, establishmentId: e.target.value }
                        setMemberships(next)
                      }}
                      className="flex-1 rounded-[var(--radius-md)] border border-border px-2 py-2 text-sm text-foreground"
                    >
                      <option value="">Selecione o estabelecimento…</option>
                      {establishments.map((est) => (
                        <option key={est.id} value={est.id}>
                          {est.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setMemberships(memberships.filter((_, i) => i !== index))}
                      className="text-error"
                      aria-label="Remover vínculo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setMemberships([...memberships, { role: 'ATTENDANT', establishmentId: '' }])}
                  className="flex w-fit items-center gap-1 text-sm text-primary underline decoration-dotted"
                >
                  <Plus size={14} /> Adicionar vínculo
                </button>
              </div>
            )}

            {roleError && <p className="mb-2 text-sm text-error">{roleError}</p>}

            <div className="flex gap-2">
              <LoadingButton variant="secondary" className="flex-1" onClick={() => setEditingRole(false)}>
                Cancelar
              </LoadingButton>
              <LoadingButton className="flex-1" loading={loading} onClick={saveRole}>
                Salvar
              </LoadingButton>
            </div>
          </div>
        </div>
      )}

      {suspendReason !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-[var(--radius-xl)] bg-card p-6">
            <h3 className="mb-2 font-display text-lg font-bold text-foreground">Suspender usuário</h3>
            <p className="mb-4 text-sm text-muted-foreground">Informe o motivo da suspensão.</p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
              className="mb-2 w-full rounded-[var(--radius-md)] border border-border p-3 text-sm text-foreground outline-none focus:border-primary"
              placeholder="Ex.: uso indevido da plataforma"
            />
            {suspendError && <p className="mb-2 text-sm text-error">{suspendError}</p>}
            <div className="flex gap-2">
              <LoadingButton
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setSuspendReason(null)
                  setSuspendError(null)
                }}
              >
                Cancelar
              </LoadingButton>
              <LoadingButton
                className="flex-1"
                loading={loading}
                disabled={suspendReason.trim().length === 0}
                onClick={() => suspend(suspendReason)}
              >
                Suspender
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
