// authService: register (história 01) + login, refresh, logout, social
// (história 06). Contrato: mesma forma de POST /auth/register|login|refresh|
// logout|social/* (spec §4/§5), só que como função direta.

import { z } from 'zod'
import {
  findAll,
  upsert,
  getCollection,
  setCollection,
  getStoredRefreshToken,
  setStoredRefreshToken,
  clearStoredRefreshToken,
} from '../storage'
import { apiError } from '../errors'
import { newId, nowISO } from '../../lib/id'
import { sha256Hex, randomOpaqueToken } from '../../lib/hash'
import { isValidCpf, onlyDigits as onlyCpfDigits, mockEncryptCpf, mockHashCpf } from '../../lib/cpf'
import { toE164, isValidBrazilianMobile } from '../../lib/phone'
import { isValidPassword } from '../../lib/password'
import { otpService } from './otp'
import { audit } from './audit'
import { toSafeUser, type SafeUser } from './users'
import { listStaffAccess } from './membership'
import { createSession, useSessionStore } from '../session'
import type { RefreshToken, User } from '../types'

const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Nome é obrigatório.').max(80),
    lastName: z.string().trim().min(1, 'Sobrenome é obrigatório.').max(120),
    cpf: z.string().min(1, 'CPF é obrigatório.'),
    email: z.string().trim().toLowerCase().email('E-mail inválido.').optional(),
    phone: z.string().trim().min(1).optional(),
    password: z.string().optional(),
    verificationToken: z.string().optional(),
    acceptTerms: z.boolean(),
    marketingOptIn: z.boolean().optional(),
  })
  .refine((data) => Boolean(data.email) || Boolean(data.phone), {
    message: 'Informe celular ou e-mail.',
  })

export type RegisterInput = z.infer<typeof registerSchema>

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 dias

/** Emite um refresh token opaco (spec história 06): guarda só o hash na coleção, o valor cru vai pro storage do navegador. */
async function issueRefreshToken(userId: string, familyId: string = newId()): Promise<string> {
  const raw = randomOpaqueToken()
  const token: RefreshToken = {
    id: newId(),
    userId,
    tokenHash: await sha256Hex(raw),
    familyId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString(),
    revokedAt: null,
    userAgent: null,
    ip: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }
  upsert('refreshTokens', token)
  setStoredRefreshToken(raw)
  return raw
}

async function revokeRefreshTokenFamily(familyId: string): Promise<void> {
  const collection = getCollection<RefreshToken>('refreshTokens')
  const now = nowISO()
  for (const token of Object.values(collection)) {
    if (token.familyId === familyId && !token.revokedAt) {
      collection[token.id] = { ...token, revokedAt: now, updatedAt: now }
    }
  }
  setCollection('refreshTokens', collection)
}

/** Sessão + establishmentId ativo, resolvido pelo vínculo do STAFF quando é só 1 (spec história 06). */
function startSession(user: User): void {
  const access = user.role === 'STAFF' ? listStaffAccess(user.id) : []
  const activeEstablishmentId = access.length === 1 ? access[0].establishmentId : null
  useSessionStore.getState().setSession(createSession(user.id, user.role, activeEstablishmentId))
}

function touchLastLogin(user: User): User {
  const now = nowISO()
  const updated = { ...user, lastLoginAt: now, updatedAt: now }
  upsert('users', updated)
  return updated
}

export const authService = {
  async register(input: RegisterInput): Promise<{ user: SafeUser; refreshToken: string }> {
    const parsed = registerSchema.safeParse(input)
    if (!parsed.success) {
      throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
    }
    const data = parsed.data

    if (!data.acceptTerms) throw apiError('TERMS_REQUIRED', 400)
    if (!isValidCpf(data.cpf)) throw apiError('CPF_INVALID', 400)

    const cpfDigits = onlyCpfDigits(data.cpf)
    const cpfHash = await mockHashCpf(cpfDigits)
    const users = findAll<User>('users')

    if (users.some((u) => u.cpfHash === cpfHash)) throw apiError('CPF_ALREADY_REGISTERED', 409)

    let phoneE164: string | null = null
    if (data.phone) {
      phoneE164 = toE164(data.phone)
      if (!isValidBrazilianMobile(phoneE164)) throw apiError('VALIDATION_ERROR', 400, { field: 'phone' })
      if (!data.verificationToken) throw apiError('VALIDATION_ERROR', 400, { field: 'verificationToken' })
      otpService.consumeVerificationToken(data.verificationToken, phoneE164, 'SIGNUP')
      if (users.some((u) => u.phoneE164 === phoneE164)) throw apiError('PHONE_ALREADY_REGISTERED', 409)
    }

    let email: string | null = null
    if (data.email) {
      email = data.email
      if (!data.password || !isValidPassword(data.password)) {
        throw apiError('VALIDATION_ERROR', 400, { field: 'password' })
      }
      if (users.some((u) => u.email === email)) throw apiError('EMAIL_ALREADY_REGISTERED', 409)
    }

    const now = nowISO()
    const user: User = {
      id: newId(),
      firstName: data.firstName,
      lastName: data.lastName,
      email,
      emailVerifiedAt: null,
      phoneE164,
      phoneVerifiedAt: phoneE164 ? now : null,
      // modo mock: nunca um hash real (spec §0.2 item 7) — só o bastante pra simular a checagem no login
      passwordHash: data.password ? `mock:${data.password}` : null,
      cpfEncrypted: mockEncryptCpf(cpfDigits),
      cpfHash,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      tokenVersion: 0,
      consentVersion: 'v1',
      consentAcceptedAt: now,
      marketingOptIn: data.marketingOptIn ?? false,
      ageConfirmedAt: null,
      lastLoginAt: now,
      deletedAt: null,
      anonymizedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    upsert('users', user)
    audit.log({
      actorUserId: user.id,
      establishmentId: null,
      entity: 'User',
      entityId: user.id,
      action: 'REGISTERED',
      before: null,
      after: { role: user.role },
    })

    startSession(user)
    const refreshToken = await issueRefreshToken(user.id)

    return { user: toSafeUser(user), refreshToken }
  },

  async login(input: { email: string; password: string }): Promise<{ user: SafeUser; refreshToken: string }> {
    const schema = z.object({
      email: z.string().trim().toLowerCase().email(),
      password: z.string().min(1),
    })
    const parsed = schema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })

    // mesma mensagem pra e-mail inexistente e senha errada — não revela se a conta existe (spec história 06)
    const user = findAll<User>('users').find((u) => u.email === parsed.data.email)
    if (!user || user.passwordHash !== `mock:${parsed.data.password}`) {
      throw apiError('INVALID_CREDENTIALS', 401)
    }
    if (user.status === 'SUSPENDED') throw apiError('ACCOUNT_SUSPENDED', 403)

    const fresh = touchLastLogin(user)
    startSession(fresh)
    const refreshToken = await issueRefreshToken(fresh.id)

    return { user: toSafeUser(fresh), refreshToken }
  },

  async requestLoginOtp(identifier: string): Promise<{ devCode: string; resendAvailableAt: string; expiresAt: string }> {
    return otpService.request(toE164(identifier), 'SMS', 'LOGIN')
  },

  async loginWithOtp(identifier: string, code: string): Promise<{ user: SafeUser; refreshToken: string }> {
    const phone = toE164(identifier)
    await otpService.verify(phone, code, 'LOGIN')

    const user = findAll<User>('users').find((u) => u.phoneE164 === phone)
    if (!user) throw apiError('INVALID_CREDENTIALS', 401)
    if (user.status === 'SUSPENDED') throw apiError('ACCOUNT_SUSPENDED', 403)

    const fresh = touchLastLogin(user)
    startSession(fresh)
    const refreshToken = await issueRefreshToken(fresh.id)

    return { user: toSafeUser(fresh), refreshToken }
  },

  /** Sem backend não dá para validar um ID token do Google de verdade (spec §0.2 item 6): o botão fica desligado por flag na UI; aqui só o contrato existe. */
  async loginWithGoogle(input: { idToken: string; email: string }): Promise<{ user: SafeUser; refreshToken: string }> {
    const email = input.email.trim().toLowerCase()
    const existing = findAll<User>('users').find((u) => u.email === email)

    if (existing?.status === 'SUSPENDED') throw apiError('ACCOUNT_SUSPENDED', 403)

    const now = nowISO()
    let user: User
    if (existing) {
      user = touchLastLogin(existing)
    } else {
      user = {
        id: newId(),
        firstName: '',
        lastName: '',
        email,
        emailVerifiedAt: now,
        phoneE164: null,
        phoneVerifiedAt: null,
        passwordHash: null,
        cpfEncrypted: null,
        cpfHash: null,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        tokenVersion: 0,
        consentVersion: 'v1',
        consentAcceptedAt: now,
        marketingOptIn: false,
        ageConfirmedAt: null,
        lastLoginAt: now,
        deletedAt: null,
        anonymizedAt: null,
        createdAt: now,
        updatedAt: now,
      }
      upsert('users', user)
      upsert('oauthAccounts', {
        id: newId(),
        userId: user.id,
        provider: 'GOOGLE',
        providerUserId: input.idToken,
        email,
        createdAt: now,
        updatedAt: now,
      })
    }

    startSession(user)
    const refreshToken = await issueRefreshToken(user.id)
    return { user: toSafeUser(user), refreshToken }
  },

  /** Reuso de um refresh já rotacionado revoga a família inteira (spec história 06). */
  async refresh(rawToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = await sha256Hex(rawToken)
    const stored = findAll<RefreshToken>('refreshTokens').find((t) => t.tokenHash === tokenHash)
    if (!stored) throw apiError('UNAUTHENTICATED', 401)

    if (stored.revokedAt) {
      await revokeRefreshTokenFamily(stored.familyId)
      clearStoredRefreshToken()
      throw apiError('UNAUTHENTICATED', 401, { reason: 'REFRESH_REUSE_DETECTED' })
    }
    if (new Date(stored.expiresAt).getTime() < Date.now()) {
      throw apiError('SESSION_EXPIRED', 401)
    }

    const user = findAll<User>('users').find((u) => u.id === stored.userId)
    if (!user) throw apiError('UNAUTHENTICATED', 401)
    if (user.status === 'SUSPENDED') throw apiError('ACCOUNT_SUSPENDED', 403)

    const now = nowISO()
    upsert('refreshTokens', { ...stored, revokedAt: now, updatedAt: now })

    startSession(user)
    useSessionStore.getState().touch()
    const refreshToken = await issueRefreshToken(user.id, stored.familyId)

    return { accessToken: 'mock-access-token', refreshToken }
  },

  async logout(): Promise<void> {
    const raw = getStoredRefreshToken()
    if (raw) {
      const tokenHash = await sha256Hex(raw)
      const collection = getCollection<RefreshToken>('refreshTokens')
      const match = Object.values(collection).find((t) => t.tokenHash === tokenHash)
      if (match && !match.revokedAt) {
        const now = nowISO()
        collection[match.id] = { ...match, revokedAt: now, updatedAt: now }
        setCollection('refreshTokens', collection)
      }
    }
    clearStoredRefreshToken()
    useSessionStore.getState().clearSession()
  },
}
