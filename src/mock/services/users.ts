// Projeção segura de User (spec §6: nunca CPF completo, senha ou OTP fora do
// mock service). Usado pelo auth (histórias 01/06) e pelo perfil (história 13).

import { maskCpf } from '../../lib/cpf'
import type { User } from '../types'

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
