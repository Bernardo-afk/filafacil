import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usersService, type SafeUser } from '../../mock/services/users'
import { isMockApiError } from '../../mock/errors'

// GET /me sem cache (spec história 13): cada tela relê o usuário ao montar e
// depois de qualquer PATCH, em vez de guardar um valor "gelado" em memória.
export function useCurrentUser() {
  const navigate = useNavigate()
  const [user, setUser] = useState<SafeUser | null>(null)

  const reload = useCallback(() => {
    try {
      setUser(usersService.me())
    } catch (err) {
      if (isMockApiError(err) && (err.code === 'UNAUTHENTICATED' || err.code === 'SESSION_EXPIRED')) {
        navigate('/login', { replace: true })
        return
      }
      throw err
    }
  }, [navigate])

  useEffect(() => {
    reload()
  }, [reload])

  return { user, reload }
}
