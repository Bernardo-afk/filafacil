import { Navigate, Outlet } from 'react-router-dom'
import { useSessionStore } from '../../mock/session'

// Protege sub-rotas que exigem sessão ativa (história 13 em diante) —
// sem sessão, manda pro login.
export function RequireAuth() {
  const session = useSessionStore((s) => s.session)
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
