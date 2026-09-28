// Admin · Usuários da plataforma (história 36). Só PLATFORM_ADMIN chama
// qualquer função daqui. Contrato: GET /admin/users, PATCH /admin/users/:id,
// POST /admin/users/:id/suspend|reactivate, GET /admin/users/:id/audit,
// GET /admin/users/export.

import { z } from 'zod'
import { findAll, findById, upsert, removeById } from '../storage'
import { apiError } from '../errors'
import { requireRole, requireSession } from '../guard'
import { useSessionStore } from '../session'
import { audit } from './audit'
import { revokeAllRefreshTokensFor } from './refreshTokens'
import { nowISO, newId } from '../../lib/id'
import { matchesSearch } from '../../lib/text'
import { isInactiveSince } from '../../lib/relativeTime'
import { MembershipRole, UserRole } from '../types'
import type { AuditLog, Establishment, Membership, Organization, User } from '../types'

function currentAdmin(): User {
  const session = requireSession(useSessionStore.getState().session)
  return requireRole(session, ['PLATFORM_ADMIN'])
}

function countActiveAdmins(excludingUserId?: string): number {
  return findAll<User>('users').filter(
    (u) => u.role === 'PLATFORM_ADMIN' && u.status === 'ACTIVE' && u.id !== excludingUserId,
  ).length
}

// ---------------------------------------------------------------------------
// Leitura (lista + detalhe)
// ---------------------------------------------------------------------------

/** "Ativo"/"Inativo" (derivado)/"Suspenso" — nunca grava um novo status pra isso (spec história 36). */
export type DisplayStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export function displayStatus(user: User): DisplayStatus {
  if (user.status === 'SUSPENDED') return 'SUSPENDED'
  return isInactiveSince(user.lastLoginAt) ? 'INACTIVE' : 'ACTIVE'
}

export interface AdminUserRow {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phoneE164: string | null
  role: User['role']
  status: User['status']
  displayStatus: DisplayStatus
  lastLoginAt: string | null
  /** "Pedidos" depende de um módulo futuro (spec história 36). */
  ordersCount: null
}

function toRow(user: User): AdminUserRow {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneE164: user.phoneE164,
    role: user.role,
    status: user.status,
    displayStatus: displayStatus(user),
    lastLoginAt: user.lastLoginAt,
    ordersCount: null,
  }
}

export interface MembershipView {
  id: string
  role: Membership['role']
  establishmentId: string | null
  establishmentName: string | null
  organizationId: string | null
  organizationName: string | null
}

export interface AdminUserDetail extends AdminUserRow {
  createdAt: string
  memberships: MembershipView[]
}

function membershipViews(userId: string): MembershipView[] {
  return findAll<Membership>('memberships')
    .filter((m) => m.userId === userId)
    .map((m) => ({
      id: m.id,
      role: m.role,
      establishmentId: m.establishmentId,
      establishmentName: m.establishmentId ? (findById<Establishment>('establishments', m.establishmentId)?.name ?? null) : null,
      organizationId: m.organizationId,
      organizationName: m.organizationId ? (findById<Organization>('organizations', m.organizationId)?.name ?? null) : null,
    }))
}

function toDetail(user: User): AdminUserDetail {
  return { ...toRow(user), createdAt: user.createdAt, memberships: membershipViews(user.id) }
}

export interface AdminUserFilters {
  q?: string
  role?: User['role']
  status?: DisplayStatus
}

export const adminUsersService = {
  list(filters: AdminUserFilters = {}): AdminUserRow[] {
    currentAdmin()
    return findAll<User>('users')
      .filter((u) => u.status !== 'DELETED')
      .filter((u) => !filters.role || u.role === filters.role)
      .map(toRow)
      .filter((row) => !filters.status || row.displayStatus === filters.status)
      .filter(
        (row) =>
          !filters.q ||
          matchesSearch(`${row.firstName} ${row.lastName}`, filters.q) ||
          (row.email && matchesSearch(row.email, filters.q)),
      )
      .sort((a, b) => a.firstName.localeCompare(b.firstName))
  },

  get(id: string): AdminUserDetail {
    currentAdmin()
    const user = findById<User>('users', id)
    if (!user || user.status === 'DELETED') throw apiError('NOT_FOUND', 404)
    return toDetail(user)
  },

  listAudit(id: string): AuditLog[] {
    currentAdmin()
    return findAll<AuditLog>('auditLogs')
      .filter((l) => l.entity === 'User' && l.entityId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  /** CSV sem CPF nem telefone (spec história 36: "não expor informações sensíveis desnecessariamente"). */
  exportCsv(): string {
    currentAdmin()
    const header = 'Nome,E-mail,Status,Último acesso,Pedidos'
    const rows = findAll<User>('users')
      .filter((u) => u.status !== 'DELETED')
      .map(toRow)
      .map((row) => {
        const name = `${row.firstName} ${row.lastName}`.trim().replace(/"/g, '""')
        const email = row.email ?? ''
        const statusLabel = { ACTIVE: 'Ativo', INACTIVE: 'Inativo', SUSPENDED: 'Suspenso' }[row.displayStatus]
        const lastLogin = row.lastLoginAt ?? ''
        return `"${name}","${email}","${statusLabel}","${lastLogin}",""`
      })
    return [header, ...rows].join('\n')
  },

  // -------------------------------------------------------------------------
  // Papel e vínculos
  // -------------------------------------------------------------------------

  changeRole(id: string, input: ChangeRoleInput): AdminUserDetail {
    const admin = currentAdmin()
    const user = findById<User>('users', id)
    if (!user || user.status === 'DELETED') throw apiError('NOT_FOUND', 404)

    const parsed = changeRoleSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
    const data = parsed.data

    if (user.role === 'PLATFORM_ADMIN' && data.role !== 'PLATFORM_ADMIN' && countActiveAdmins(user.id) === 0) {
      throw apiError('LAST_ADMIN_PROTECTED', 422)
    }
    if (data.role === 'STAFF' && data.memberships.length === 0) {
      throw apiError('STAFF_REQUIRES_MEMBERSHIP', 422)
    }

    for (const m of data.memberships) {
      if (m.establishmentId && !findById<Establishment>('establishments', m.establishmentId)) {
        throw apiError('NOT_FOUND', 404, { field: 'establishmentId' })
      }
      if (m.organizationId && !findById<Organization>('organizations', m.organizationId)) {
        throw apiError('NOT_FOUND', 404, { field: 'organizationId' })
      }
    }

    // vínculos só fazem sentido pra STAFF — troca sempre substitui o conjunto anterior inteiro
    for (const existing of findAll<Membership>('memberships').filter((m) => m.userId === id)) {
      removeById('memberships', existing.id)
    }
    const now = nowISO()
    if (data.role === 'STAFF') {
      for (const m of data.memberships) {
        upsert('memberships', {
          id: newId(),
          userId: id,
          role: m.role as Membership['role'],
          establishmentId: m.establishmentId ?? null,
          organizationId: m.organizationId ?? null,
          createdAt: now,
          updatedAt: now,
        } satisfies Membership)
      }
    }

    const updated: User = { ...user, role: data.role as User['role'], updatedAt: now }
    upsert('users', updated)

    audit.log({
      actorUserId: admin.id,
      establishmentId: null,
      entity: 'User',
      entityId: id,
      action: 'ROLE_CHANGED',
      before: { role: user.role },
      after: { role: updated.role },
    })

    return toDetail(updated)
  },

  // -------------------------------------------------------------------------
  // Suspender / reativar
  // -------------------------------------------------------------------------

  suspend(id: string, input: { reason: string }): AdminUserDetail {
    const admin = currentAdmin()
    if (id === admin.id) throw apiError('CANNOT_SUSPEND_SELF', 422)

    const user = findById<User>('users', id)
    if (!user || user.status === 'DELETED') throw apiError('NOT_FOUND', 404)
    if (!input.reason?.trim()) throw apiError('VALIDATION_ERROR', 400, { field: 'reason' })

    if (user.role === 'PLATFORM_ADMIN' && countActiveAdmins(user.id) === 0) {
      throw apiError('LAST_ADMIN_PROTECTED', 422)
    }

    const now = nowISO()
    const updated: User = { ...user, status: 'SUSPENDED', tokenVersion: user.tokenVersion + 1, updatedAt: now }
    upsert('users', updated)
    revokeAllRefreshTokensFor(id)

    audit.log({
      actorUserId: admin.id,
      establishmentId: null,
      entity: 'User',
      entityId: id,
      action: 'STATUS_CHANGED',
      before: { status: user.status },
      after: { status: 'SUSPENDED', reason: input.reason.trim() },
    })

    return toDetail(updated)
  },

  reactivate(id: string): AdminUserDetail {
    const admin = currentAdmin()
    const user = findById<User>('users', id)
    if (!user || user.status === 'DELETED') throw apiError('NOT_FOUND', 404)

    const now = nowISO()
    const updated: User = { ...user, status: 'ACTIVE', updatedAt: now }
    upsert('users', updated)

    audit.log({
      actorUserId: admin.id,
      establishmentId: null,
      entity: 'User',
      entityId: id,
      action: 'STATUS_CHANGED',
      before: { status: user.status },
      after: { status: 'ACTIVE' },
    })

    return toDetail(updated)
  },
}

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

const membershipInputSchema = z
  .object({
    role: z.enum(Object.values(MembershipRole) as [string, ...string[]]),
    establishmentId: z.string().trim().optional(),
    organizationId: z.string().trim().optional(),
  })
  .refine((m) => Boolean(m.establishmentId) !== Boolean(m.organizationId), {
    message: 'Informe establishmentId OU organizationId, nunca os dois nem nenhum.',
  })

const changeRoleSchema = z.object({
  role: z.enum(Object.values(UserRole) as [string, ...string[]]),
  memberships: z.array(membershipInputSchema),
})

export type ChangeRoleInput = z.input<typeof changeRoleSchema>
