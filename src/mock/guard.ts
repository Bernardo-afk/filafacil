// RBAC + tenant guard (spec §4 decisão 3, §6). Nenhum service recebe
// establishmentId vindo só da UI sem essa checagem. Suspensão vale na hora
// porque toda função relê status/role do usuário antes de agir (nunca confia
// num token velho).

import { findAll, findById } from './storage'
import { apiError } from './errors'
import type { Establishment, Membership, MembershipRole, Session, User, UserRole } from './types'

export function requireSession(session: Session | null): Session {
  if (!session) throw apiError('UNAUTHENTICATED', 401)
  if (new Date(session.expiresAt).getTime() < Date.now()) throw apiError('SESSION_EXPIRED', 401)
  return session
}

/** Relê o registro do usuário a cada chamada: suspensão vale na próxima ação. */
export function requireActiveUser(session: Session): User {
  const user = findById<User>('users', session.userId)
  if (!user || user.status === 'DELETED') throw apiError('UNAUTHENTICATED', 401)
  if (user.status === 'SUSPENDED') throw apiError('ACCOUNT_SUSPENDED', 403)
  return user
}

export function requireRole(session: Session, allowedRoles: UserRole[]): User {
  const user = requireActiveUser(session)
  if (!allowedRoles.includes(user.role)) throw apiError('FORBIDDEN', 403)
  return user
}

function hasMembership(userId: string, establishment: Establishment, allowedRoles?: MembershipRole[]): boolean {
  const memberships = findAll<Membership>('memberships').filter((m) => m.userId === userId)
  return memberships.some((m) => {
    const matchesTenant = m.establishmentId === establishment.id || m.organizationId === establishment.organizationId
    if (!matchesTenant) return false
    if (!allowedRoles || allowedRoles.length === 0) return true
    return allowedRoles.includes(m.role)
  })
}

/**
 * Confere sessão + status do usuário + vínculo com o estabelecimento (direto
 * ou por organização). PLATFORM_ADMIN sempre passa. Isolamento por tenant:
 * quem não tem vínculo recebe NOT_FOUND, não FORBIDDEN, para não revelar que
 * o recurso existe (RF29, spec §6 "isolamento por estabelecimento").
 */
export function assertEstablishmentAccess(
  session: Session,
  establishmentId: string,
  allowedRoles?: MembershipRole[],
): Establishment {
  const user = requireActiveUser(session)
  const establishment = findById<Establishment>('establishments', establishmentId)
  if (!establishment) throw apiError('NOT_FOUND', 404)

  if (user.role === 'PLATFORM_ADMIN') return establishment
  if (user.role !== 'STAFF') throw apiError('NOT_FOUND', 404)
  if (!hasMembership(user.id, establishment, allowedRoles)) throw apiError('NOT_FOUND', 404)

  return establishment
}
