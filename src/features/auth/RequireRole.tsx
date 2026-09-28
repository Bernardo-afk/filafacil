import { Navigate, Outlet } from 'react-router-dom'
import { useSessionStore } from '../../mock/session'
import type { UserRole } from '../../mock/types'

// Protege áreas restritas a um papel (spec história 34: "Apenas admin
// acessa"). Sem sessão -> login; com sessão mas papel errado -> início.
export function RequireRole({ roles }: { roles: UserRole[] }) {
  const session = useSessionStore((s) => s.session)
  if (!session) return <Navigate to="/login" replace />
  if (!roles.includes(session.role)) return <Navigate to="/" replace />
  return <Outlet />
}
