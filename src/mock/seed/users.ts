// Usuários (spec §8). Senha de dev para todos que têm login por e-mail/senha:
// "Filazero@123" (nunca hash real — spec §0.2 item 7).

import type { User } from '../types'
import { USER_IDS } from './ids'

const NOW = new Date().toISOString()
export const DEV_PASSWORD = 'Filazero@123'
/** Simula o hash: nunca a senha em texto puro no registro (spec §0.2 item 7 — modo mock, sem hash real). */
export const DEV_PASSWORD_HASH = `mock:${DEV_PASSWORD}`

function user(overrides: Partial<User> & Pick<User, 'id' | 'firstName' | 'lastName' | 'role'>): User {
  return {
    email: null,
    emailVerifiedAt: null,
    phoneE164: null,
    phoneVerifiedAt: null,
    passwordHash: null,
    cpfEncrypted: null,
    cpfHash: null,
    status: 'ACTIVE',
    tokenVersion: 0,
    consentVersion: 'v1',
    consentAcceptedAt: NOW,
    marketingOptIn: false,
    ageConfirmedAt: NOW,
    lastLoginAt: NOW,
    deletedAt: null,
    anonymizedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function buildUsers(): User[] {
  return [
    user({
      id: USER_IDS.ADMIN,
      firstName: 'Admin',
      lastName: 'FilaZero',
      role: 'PLATFORM_ADMIN',
      email: 'admin@filazero.dev',
      emailVerifiedAt: NOW,
      passwordHash: DEV_PASSWORD_HASH,
    }),
    user({
      id: USER_IDS.LUCAS,
      firstName: 'Lucas',
      lastName: 'Torres',
      role: 'STAFF',
      email: 'lucas@bardoze.com.br',
      emailVerifiedAt: NOW,
      passwordHash: DEV_PASSWORD_HASH,
    }),
    user({
      id: USER_IDS.CARLOS,
      firstName: 'Carlos',
      lastName: 'Mendes',
      role: 'STAFF',
      email: 'carlos@filazero.dev',
      emailVerifiedAt: NOW,
      passwordHash: DEV_PASSWORD_HASH,
    }),
    user({
      id: USER_IDS.ANA,
      firstName: 'Ana',
      lastName: 'Rodrigues',
      role: 'STAFF',
      email: 'ana@filazero.dev',
      emailVerifiedAt: NOW,
      passwordHash: DEV_PASSWORD_HASH,
    }),
    user({
      id: USER_IDS.MARIANA,
      firstName: 'Mariana',
      lastName: 'Costa',
      role: 'STAFF',
      email: 'mariana@filazero.dev',
      emailVerifiedAt: NOW,
      passwordHash: DEV_PASSWORD_HASH,
      // "inativa: último acesso em 25 ago" (spec §8) — usado para exercitar o "Inativo" derivado (RF26)
      lastLoginAt: '2026-08-25T12:00:00.000Z',
    }),
    user({
      id: USER_IDS.JOAO,
      firstName: 'João',
      lastName: 'Pereira', // ⚠️ sobrenome não definido no protótipo (spec §8 só dá "João")
      role: 'CUSTOMER',
      email: 'joao@email.com',
      emailVerifiedAt: NOW,
      phoneE164: '+5519999999999',
      phoneVerifiedAt: NOW,
      passwordHash: DEV_PASSWORD_HASH,
      marketingOptIn: true,
    }),
  ]
}
