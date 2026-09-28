// Resolve os vínculos de um STAFF em "acessos" concretos (1 por estabelecimento),
// expandindo vínculo por organização em uma entrada por unidade (spec história 06:
// "quem tem mais de um vínculo escolhe o estabelecimento").

import { findAll } from '../storage'
import type { Establishment, Membership, MembershipRole } from '../types'

export interface StaffAccess {
  membershipId: string
  role: MembershipRole
  establishmentId: string
  establishmentName: string
}

export function listStaffAccess(userId: string): StaffAccess[] {
  const memberships = findAll<Membership>('memberships').filter((m) => m.userId === userId)
  const establishments = findAll<Establishment>('establishments')
  const access: StaffAccess[] = []

  for (const membership of memberships) {
    if (membership.establishmentId) {
      const est = establishments.find((e) => e.id === membership.establishmentId)
      if (est) access.push(toAccess(membership.id, membership.role, est))
    } else if (membership.organizationId) {
      for (const est of establishments.filter((e) => e.organizationId === membership.organizationId)) {
        access.push(toAccess(membership.id, membership.role, est))
      }
    }
  }

  return access
}

function toAccess(membershipId: string, role: MembershipRole, est: Establishment): StaffAccess {
  return {
    membershipId,
    role,
    establishmentId: est.id,
    establishmentName: est.unitLabel ? `${est.name} · ${est.unitLabel}` : est.name,
  }
}

const ATTENDANT_ROLES: MembershipRole[] = ['ATTENDANT', 'RECEPTION', 'WAITER', 'KITCHEN', 'CASHIER']

/** '/gestor' para MANAGER/SUPERVISOR, '/atendente' para o resto (spec história 06: redirecionamento por papel). */
export function pathForMembershipRole(role: MembershipRole): string {
  return ATTENDANT_ROLES.includes(role) ? '/atendente' : '/gestor'
}
