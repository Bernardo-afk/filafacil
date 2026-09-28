// Projeção segura de User (spec §6: nunca CPF completo, senha ou OTP fora do
// mock service). Usado pelo auth (histórias 01/06) e pelo perfil (história 13).

import { z } from 'zod'
import { maskCpf } from '../../lib/cpf'
import { toE164, isValidBrazilianMobile } from '../../lib/phone'
import { isValidPassword } from '../../lib/password'
import { nowISO } from '../../lib/id'
import { findAll, upsert, getCollection, setCollection, clearStoredRefreshToken } from '../storage'
import { apiError } from '../errors'
import { requireActiveUser, requireSession } from '../guard'
import { useSessionStore } from '../session'
import { otpService } from './otp'
import { audit } from './audit'
import type { RefreshToken, User } from '../types'

export interface SafeUser {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phoneE164: string | null
  role: User['role']
  status: User['status']
  cpfMasked: string | null
  marketingOptIn: boolean
}

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneE164: user.phoneE164,
    role: user.role,
    status: user.status,
    cpfMasked: user.cpfEncrypted ? maskCpfFromEncrypted(user.cpfEncrypted) : null,
    marketingOptIn: user.marketingOptIn,
  }
}

function maskCpfFromEncrypted(cpfEncrypted: string): string {
  // mockEncryptCpf (lib/cpf.ts) só faz base64 dos dígitos — o bastante para
  // remontar a máscara sem guardar o CPF em texto puro no restante do app.
  return maskCpf(atob(cpfEncrypted))
}

// ---------------------------------------------------------------------------
// usersService (história 13: "Perfil do usuário"). Contrato: GET /me, PATCH
// /me, POST /me/contact-change/request|confirm, POST /auth/logout-all.
// ---------------------------------------------------------------------------

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'Nome é obrigatório.').max(80),
  lastName: z.string().trim().min(1, 'Sobrenome é obrigatório.').max(120),
})

function currentSessionUser(): User {
  const session = requireSession(useSessionStore.getState().session)
  return requireActiveUser(session)
}

export const usersService = {
  /** GET /me — relê a coleção a cada chamada, nunca cacheado (spec história 13). */
  me(): SafeUser {
    return toSafeUser(currentSessionUser())
  },

  async updateProfile(input: { firstName: string; lastName: string }): Promise<SafeUser> {
    const user = currentSessionUser()
    const parsed = updateProfileSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })

    const updated: User = { ...user, firstName: parsed.data.firstName, lastName: parsed.data.lastName, updatedAt: nowISO() }
    upsert('users', updated)
    audit.log({
      actorUserId: user.id,
      establishmentId: null,
      entity: 'User',
      entityId: user.id,
      action: 'PROFILE_UPDATED',
      before: { firstName: user.firstName, lastName: user.lastName },
      after: { firstName: updated.firstName, lastName: updated.lastName },
    })
    return toSafeUser(updated)
  },

  /** Envia o código pro novo celular/e-mail (OtpPurpose.CHANGE_CONTACT). Unicidade checada já aqui. */
  async requestContactChange(input: { type: 'EMAIL' | 'PHONE'; value: string }) {
    const user = currentSessionUser()
    const others = findAll<User>('users').filter((u) => u.id !== user.id)

    if (input.type === 'EMAIL') {
      const email = input.value.trim().toLowerCase()
      if (!/^\S+@\S+\.\S+$/.test(email)) throw apiError('VALIDATION_ERROR', 400, { field: 'email' })
      if (others.some((u) => u.email === email)) throw apiError('EMAIL_ALREADY_REGISTERED', 409)
      return otpService.request(email, 'EMAIL', 'CHANGE_CONTACT')
    }

    const phone = toE164(input.value)
    if (!isValidBrazilianMobile(phone)) throw apiError('VALIDATION_ERROR', 400, { field: 'phone' })
    if (others.some((u) => u.phoneE164 === phone)) throw apiError('PHONE_ALREADY_REGISTERED', 409)
    return otpService.request(phone, 'SMS', 'CHANGE_CONTACT')
  },

  /** Confirma o código e só então grava o novo celular/e-mail (spec história 13). */
  async confirmContactChange(input: { type: 'EMAIL' | 'PHONE'; value: string; code: string }): Promise<SafeUser> {
    const user = currentSessionUser()
    const identifier = input.type === 'EMAIL' ? input.value.trim().toLowerCase() : toE164(input.value)
    await otpService.verify(identifier, input.code, 'CHANGE_CONTACT')

    // reconfere unicidade no confirm (pode ter sido registrado por outra conta entre o request e o confirm)
    const others = findAll<User>('users').filter((u) => u.id !== user.id)
    if (input.type === 'EMAIL' && others.some((u) => u.email === identifier)) {
      throw apiError('EMAIL_ALREADY_REGISTERED', 409)
    }
    if (input.type === 'PHONE' && others.some((u) => u.phoneE164 === identifier)) {
      throw apiError('PHONE_ALREADY_REGISTERED', 409)
    }

    const now = nowISO()
    const updated: User =
      input.type === 'EMAIL'
        ? { ...user, email: identifier, emailVerifiedAt: now, updatedAt: now }
        : { ...user, phoneE164: identifier, phoneVerifiedAt: now, updatedAt: now }
    upsert('users', updated)
    audit.log({
      actorUserId: user.id,
      establishmentId: null,
      entity: 'User',
      entityId: user.id,
      action: input.type === 'EMAIL' ? 'EMAIL_CHANGED' : 'PHONE_CHANGED',
      before: null,
      after: null,
    })
    return toSafeUser(updated)
  },

  async changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
    const user = currentSessionUser()
    if (!user.passwordHash || user.passwordHash !== `mock:${input.currentPassword}`) {
      throw apiError('CURRENT_PASSWORD_INVALID', 401)
    }
    if (!isValidPassword(input.newPassword)) throw apiError('VALIDATION_ERROR', 400, { field: 'newPassword' })

    upsert('users', { ...user, passwordHash: `mock:${input.newPassword}`, updatedAt: nowISO() })
    audit.log({
      actorUserId: user.id,
      establishmentId: null,
      entity: 'User',
      entityId: user.id,
      action: 'PASSWORD_CHANGED',
      before: null,
      after: null,
    })
  },

  /** "Sair de todos os dispositivos": token_version+1 + revoga todo refresh token do usuário (spec história 13). */
  async logoutAllDevices(): Promise<void> {
    const user = currentSessionUser()
    const now = nowISO()
    upsert('users', { ...user, tokenVersion: user.tokenVersion + 1, updatedAt: now })

    const collection = getCollection<RefreshToken>('refreshTokens')
    for (const token of Object.values(collection)) {
      if (token.userId === user.id && !token.revokedAt) {
        collection[token.id] = { ...token, revokedAt: now, updatedAt: now }
      }
    }
    setCollection('refreshTokens', collection)
    audit.log({
      actorUserId: user.id,
      establishmentId: null,
      entity: 'User',
      entityId: user.id,
      action: 'LOGOUT_ALL_DEVICES',
      before: null,
      after: null,
    })

    // revoga também a sessão local — este dispositivo faz parte de "todos" (spec história 13)
    clearStoredRefreshToken()
    useSessionStore.getState().clearSession()
  },
}
