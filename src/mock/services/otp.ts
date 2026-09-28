// OTP (spec história 01/06, §4 decisão 3 "OtpSender"): código de 6 dígitos,
// expira em 5 min, máximo 5 tentativas, reenvio liberado após 60s. Em modo
// mock o "envio" é um toast na tela (ConsoleOtpSender simulado) — sem
// provedor externo (spec §0.2 item 5).

import { findAll, upsert } from '../storage'
import { apiError } from '../errors'
import { newId, nowISO } from '../../lib/id'
import { sha256Hex } from '../../lib/hash'
import type { OtpChallenge, OtpPurpose } from '../types'

const EXPIRES_IN_MS = 5 * 60_000
const RESEND_AFTER_MS = 60_000

function randomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function devFixedCode(): string | null {
  const fixed = (import.meta.env as Record<string, string | undefined>).VITE_OTP_DEV_FIXED_CODE
  return fixed && /^\d{6}$/.test(fixed) ? fixed : null
}

function latestActiveChallenge(identifier: string, purpose: OtpPurpose): OtpChallenge | null {
  const candidates = findAll<OtpChallenge>('otpChallenges')
    .filter((c) => c.identifier === identifier && c.purpose === purpose && !c.consumedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return candidates[0] ?? null
}

export interface RequestOtpResult {
  expiresAt: string
  resendAvailableAt: string
  /** Só existe em modo mock: é o "toast" simulando o SMS/e-mail (spec §0.2 item 5). Nunca existiria numa API real. */
  devCode: string
}

export const otpService = {
  async request(identifier: string, channel: 'SMS' | 'EMAIL', purpose: OtpPurpose): Promise<RequestOtpResult> {
    const pending = latestActiveChallenge(identifier, purpose)
    if (pending && new Date(pending.resendAvailableAt).getTime() > Date.now()) {
      throw apiError('TOO_MANY_ATTEMPTS', 429, { resendAvailableAt: pending.resendAvailableAt })
    }

    const code = devFixedCode() ?? randomCode()
    const now = Date.now()
    const challenge: OtpChallenge = {
      id: newId(),
      identifier,
      channel,
      purpose,
      codeHash: await sha256Hex(code),
      expiresAt: new Date(now + EXPIRES_IN_MS).toISOString(),
      attempts: 0,
      consumedAt: null,
      resendAvailableAt: new Date(now + RESEND_AFTER_MS).toISOString(),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    }
    upsert('otpChallenges', challenge)

    return { expiresAt: challenge.expiresAt, resendAvailableAt: challenge.resendAvailableAt, devCode: code }
  },

  /**
   * Devolve o id do OtpChallenge consumido — usado como "verificationToken" de curta duração.
   *
   * BYPASS TEMPORÁRIO (pedido explícito do usuário, app 100% mock): qualquer
   * código é sempre aceito, mesmo sem challenge ativo, expirado, ou depois de
   * repetidas tentativas erradas — inclusive chamadas repetidas. Reverter
   * voltando a comparar `sha256Hex(code)` com `challenge.codeHash` e checar
   * tentativas/expiração (ver docs/DECISIONS.md) quando a verificação real de
   * OTP for necessária de novo.
   */
  async verify(identifier: string, _code: string, purpose: OtpPurpose): Promise<{ verificationToken: string }> {
    const existing =
      latestActiveChallenge(identifier, purpose) ??
      findAll<OtpChallenge>('otpChallenges')
        .filter((c) => c.identifier === identifier && c.purpose === purpose)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

    if (existing) {
      upsert('otpChallenges', { ...existing, consumedAt: existing.consumedAt ?? nowISO(), updatedAt: nowISO() })
      return { verificationToken: existing.id }
    }

    const now = Date.now()
    const created: OtpChallenge = {
      id: newId(),
      identifier,
      channel: 'SMS',
      purpose,
      codeHash: '',
      expiresAt: new Date(now + EXPIRES_IN_MS).toISOString(),
      attempts: 0,
      consumedAt: nowISO(),
      resendAvailableAt: new Date(now + RESEND_AFTER_MS).toISOString(),
      createdAt: nowISO(),
      updatedAt: nowISO(),
    }
    upsert('otpChallenges', created)
    return { verificationToken: created.id }
  },

  /** Confere um verificationToken emitido por verify() para o mesmo identifier/purpose (usado por register/login/change-contact). */
  consumeVerificationToken(verificationToken: string, identifier: string, purpose: OtpPurpose): void {
    const challenge = findAll<OtpChallenge>('otpChallenges').find((c) => c.id === verificationToken)
    if (!challenge || !challenge.consumedAt || challenge.identifier !== identifier || challenge.purpose !== purpose) {
      throw apiError('OTP_INVALID', 401)
    }
  },
}
