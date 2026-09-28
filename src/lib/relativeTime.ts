// "Último acesso" (spec história 36, AdminUsersSection): "Agora", "há Xh",
// "Ontem", "há N dias".

export function formatLastAccess(lastLoginAt: string | null): string {
  if (!lastLoginAt) return 'Nunca'

  const diffHours = (Date.now() - new Date(lastLoginAt).getTime()) / (60 * 60 * 1000)
  if (diffHours < 1) return 'Agora'
  if (diffHours < 24) return `há ${Math.round(diffHours)}h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Ontem'
  return `há ${diffDays} dias`
}

const INACTIVE_AFTER_DAYS = 30

/** "Inativo" é derivado (spec história 36): sem acesso há mais de 30 dias, sem gravar status novo. */
export function isInactiveSince(lastLoginAt: string | null): boolean {
  if (!lastLoginAt) return true
  const diffDays = (Date.now() - new Date(lastLoginAt).getTime()) / (24 * 60 * 60 * 1000)
  return diffDays > INACTIVE_AFTER_DAYS
}
