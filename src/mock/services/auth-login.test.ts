// Testes da história 06 (login). Cada `it` tem o mesmo nome do cenário Gherkin da spec.
import { describe, expect, it, beforeEach } from 'vitest'
import { authService } from './auth'
import { otpService } from './otp'
import { findAll, upsert } from '../storage'
import { getStoredRefreshToken } from '../storage'
import { getCurrentSession } from '../session'
import type { User } from '../types'

const VALID_CPF = '529.982.247-25'
const PHONE = '19998741234'
const E164_PHONE = `+55${PHONE}`

beforeEach(() => {
  window.localStorage.clear()
})

async function registerByPhone() {
  const { devCode } = await otpService.request(E164_PHONE, 'SMS', 'SIGNUP')
  const { verificationToken } = await otpService.verify(E164_PHONE, devCode, 'SIGNUP')
  return authService.register({
    firstName: 'João',
    lastName: 'Pereira',
    cpf: VALID_CPF,
    phone: PHONE,
    verificationToken,
    acceptTerms: true,
  })
}

async function registerByEmail(email = 'maria@example.com', password = 'Senha123') {
  return authService.register({
    firstName: 'Maria',
    lastName: 'Souza',
    cpf: VALID_CPF,
    email,
    password,
    acceptTerms: true,
  })
}

describe('Login por celular com OTP', () => {
  it('entra na conta e cai na área do cliente', async () => {
    await registerByPhone()
    await authService.logout()

    const { devCode } = await authService.requestLoginOtp(E164_PHONE)
    const { user } = await authService.loginWithOtp(E164_PHONE, devCode)

    expect(user.phoneE164).toBe(E164_PHONE)
    expect(getCurrentSession()?.role).toBe('CUSTOMER')
  })

  it('erra o código 2 vezes e acerta na 3ª tentativa, sem bloqueio', async () => {
    await registerByPhone()
    await authService.logout()

    const { devCode } = await authService.requestLoginOtp(E164_PHONE)
    await expect(authService.loginWithOtp(E164_PHONE, '000000')).rejects.toMatchObject({ code: 'OTP_INVALID' })
    await expect(authService.loginWithOtp(E164_PHONE, '000001')).rejects.toMatchObject({ code: 'OTP_INVALID' })

    const { user } = await authService.loginWithOtp(E164_PHONE, devCode)
    expect(user.phoneE164).toBe(E164_PHONE)
  })

  it('muitas tentativas', async () => {
    await registerByPhone()
    await authService.logout()
    await authService.requestLoginOtp(E164_PHONE)

    for (let i = 0; i < 5; i += 1) {
      await expect(authService.loginWithOtp(E164_PHONE, '000000')).rejects.toBeTruthy()
    }
    await expect(authService.loginWithOtp(E164_PHONE, '000000')).rejects.toMatchObject({ code: 'TOO_MANY_ATTEMPTS' })
  })

  it('código expirado', async () => {
    await registerByPhone()
    await authService.logout()
    const { devCode } = await authService.requestLoginOtp(E164_PHONE)

    const { getCollection, setCollection } = await import('../storage')
    const collection = getCollection<{ id: string; expiresAt: string; identifier: string }>('otpChallenges')
    for (const challenge of Object.values(collection)) {
      if (challenge.identifier === E164_PHONE) challenge.expiresAt = new Date(Date.now() - 1000).toISOString()
    }
    setCollection('otpChallenges', collection)

    await expect(authService.loginWithOtp(E164_PHONE, devCode)).rejects.toMatchObject({ code: 'OTP_EXPIRED', status: 410 })
  })
})

describe('Login por e-mail e senha', () => {
  it('entra na conta com e-mail e senha corretos', async () => {
    await registerByEmail('maria@example.com', 'Senha123')
    await authService.logout()

    const { user } = await authService.login({ email: 'maria@example.com', password: 'Senha123' })
    expect(user.email).toBe('maria@example.com')
  })

  it('credencial inválida não vaza informação (mesma mensagem pra e-mail inexistente e senha errada)', async () => {
    await registerByEmail('maria@example.com', 'Senha123')
    await authService.logout()

    const wrongPassword = await authService.login({ email: 'maria@example.com', password: 'SenhaErrada1' }).catch((e) => e)
    const noSuchEmail = await authService.login({ email: 'ninguem@example.com', password: 'SenhaErrada1' }).catch((e) => e)

    expect(wrongPassword.code).toBe('INVALID_CREDENTIALS')
    expect(noSuchEmail.code).toBe('INVALID_CREDENTIALS')
    expect(wrongPassword.message).toBe(noSuchEmail.message)
  })
})

describe('Login com Google', () => {
  it('cria ou vincula a conta e o cliente entra', async () => {
    const { user } = await authService.loginWithGoogle({ idToken: 'fake-google-sub-123', email: 'novo@gmail.com' })
    expect(user.email).toBe('novo@gmail.com')
    expect(user.role).toBe('CUSTOMER')

    // login social de novo com o mesmo e-mail deve reaproveitar a mesma conta
    const again = await authService.loginWithGoogle({ idToken: 'fake-google-sub-123', email: 'novo@gmail.com' })
    expect(again.user.id).toBe(user.id)
    expect(findAll<User>('users')).toHaveLength(1)
  })
})

describe('Refresh reutilizado', () => {
  it('reuso de um refresh já rotacionado revoga toda a família', async () => {
    const { refreshToken: original } = await registerByEmail()

    const rotated = await authService.refresh(original)
    expect(rotated.refreshToken).not.toBe(original)

    // token atual (rotacionado) continua funcionando
    const rotatedAgain = await authService.refresh(rotated.refreshToken)
    expect(rotatedAgain.accessToken).toBeTruthy()

    // reenviar o token original (já revogado) deve falhar e revogar a família inteira
    await expect(authService.refresh(original)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    await expect(authService.refresh(rotatedAgain.refreshToken)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })
})

describe('Usuário suspenso', () => {
  it('não consegue entrar', async () => {
    await registerByEmail('suspenso@example.com', 'Senha123')
    const user = findAll<User>('users')[0]
    upsert('users', { ...user, status: 'SUSPENDED' })
    await authService.logout()

    await expect(authService.login({ email: 'suspenso@example.com', password: 'Senha123' })).rejects.toMatchObject({
      code: 'ACCOUNT_SUSPENDED',
      status: 403,
    })
  })
})

describe('logout', () => {
  it('limpa a sessão e revoga o refresh token atual', async () => {
    await registerByEmail()
    expect(getCurrentSession()).not.toBeNull()
    expect(getStoredRefreshToken()).not.toBeNull()

    await authService.logout()

    expect(getCurrentSession()).toBeNull()
    expect(getStoredRefreshToken()).toBeNull()
  })
})
