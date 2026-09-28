// Sessão sem JWT real (spec §0.2 item 4, §4 decisão 2): { userId, role,
// activeEstablishmentId, expiresAt } em localStorage. expiresAt de 15 min só
// simula a UX de sessão expirada; "renovar" é só estender expiresAt.

import { create } from 'zustand'
import { getSessionRaw, setSessionRaw, clearSessionRaw } from './storage'
import type { Session, UserRole } from './types'

const SESSION_TTL_MINUTES = 15

function isExpired(session: Session | null): boolean {
  if (!session) return true
  return new Date(session.expiresAt).getTime() < Date.now()
}

export function createSession(userId: string, role: UserRole, activeEstablishmentId: string | null = null): Session {
  return {
    userId,
    role,
    activeEstablishmentId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MINUTES * 60_000).toISOString(),
  }
}

/** Lida diretamente com localStorage — para uso dentro dos mock services (fora do React). */
export function getCurrentSession(): Session | null {
  const stored = getSessionRaw<Session>()
  return stored && !isExpired(stored) ? stored : null
}

interface SessionState {
  session: Session | null
  setSession: (session: Session) => void
  clearSession: () => void
  touch: () => void
  setActiveEstablishment: (establishmentId: string | null) => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: getCurrentSession(),
  setSession: (session) => {
    setSessionRaw(session)
    set({ session })
  },
  clearSession: () => {
    clearSessionRaw()
    set({ session: null })
  },
  touch: () => {
    const current = get().session
    if (!current) return
    const next = { ...current, expiresAt: new Date(Date.now() + SESSION_TTL_MINUTES * 60_000).toISOString() }
    setSessionRaw(next)
    set({ session: next })
  },
  setActiveEstablishment: (establishmentId) => {
    const current = get().session
    if (!current) return
    const next = { ...current, activeEstablishmentId: establishmentId }
    setSessionRaw(next)
    set({ session: next })
  },
}))
