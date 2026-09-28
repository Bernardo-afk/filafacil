// authService.register (história 01). Login/social/refresh/logout chegam na
// história 06. Contrato: mesma forma de POST /auth/register (spec §4/§5),
// só que como função direta.

import { z } from 'zod'
import { findAll, upsert } from '../storage'
import { apiError } from '../errors'
import { newId, nowISO } from '../../lib/id'
import { isValidCpf, onlyDigits as onlyCpfDigits, mockEncryptCpf, mockHashCpf } from '../../lib/cpf'
import { toE164, isValidBrazilianMobile } from '../../lib/phone'
import { isValidPassword } from '../../lib/password'
import { otpService } from './otp'
import { audit } from './audit'
import { toSafeUser, type SafeUser } from './users'
import { createSession, useSessionStore } from '../session'
import type { User } from '../types'

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

export const authService = {
  async register(input: RegisterInput): Promise<{ user: SafeUser }> {
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

    const session = createSession(user.id, user.role)
    useSessionStore.getState().setSession(session)

    return { user: toSafeUser(user) }
  },
}
