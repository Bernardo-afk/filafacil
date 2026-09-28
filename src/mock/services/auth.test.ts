import { describe, expect, it, beforeEach } from 'vitest'
import { authService } from './auth'
import { otpService } from './otp'
import { findAll, getCollection, setCollection } from '../storage'
import type { OtpChallenge, User } from '../types'

const VALID_CPF = '529.982.247-25'
const VALID_PHONE = '19998741234'

beforeEach(() => {
  window.localStorage.clear()
})

describe('authService.register — CPF', () => {
  // BYPASS TEMPORÁRIO (pedido explícito do usuário, app 100% mock): dígito
  // verificador de CPF não é mais exigido, só o formato de 11 dígitos.
  it('CPF com formato válido mas dígito verificador incorreto é aceito', async () => {
    const { user } = await authService.register({
      firstName: 'Lucas',
      lastName: 'Torres',
      cpf: '111.111.111-11',
      email: 'lucas@example.com',
      password: 'Senha123',
      acceptTerms: true,
    })

    expect(findAll<User>('users')).toHaveLength(1)
    expect(user.firstName).toBe('Lucas')
  })

  it('CPF já cadastrado', async () => {
    await authService.register({
      firstName: 'Primeiro',
      lastName: 'Usuário',
      cpf: VALID_CPF,
      email: 'primeiro@example.com',
      password: 'Senha123',
      acceptTerms: true,
    })

    await expect(
      authService.register({
        firstName: 'Segundo',
        lastName: 'Usuário',
        cpf: VALID_CPF,
        email: 'segundo@example.com',
        password: 'Senha123',
        acceptTerms: true,
      }),
    ).rejects.toMatchObject({ code: 'CPF_ALREADY_REGISTERED', status: 409 })
  })

  it('aceita CPF com e sem máscara', async () => {
    const { user } = await authService.register({
      firstName: 'Ana',
      lastName: 'Silva',
      cpf: '52998224725',
      email: 'ana.semmascara@example.com',
      password: 'Senha123',
      acceptTerms: true,
    })
    expect(user.cpfMasked).toBe('•••.•••.•••-25')
  })
})

describe('authService.register — celular com OTP', () => {
  it('cria o usuário com role CUSTOMER e phone_verified_at preenchido', async () => {
    const { devCode } = await otpService.request(`+55${VALID_PHONE}`, 'SMS', 'SIGNUP')
    const { verificationToken } = await otpService.verify(`+55${VALID_PHONE}`, devCode, 'SIGNUP')

    const { user } = await authService.register({
      firstName: 'João',
      lastName: 'Pereira',
      cpf: VALID_CPF,
      phone: VALID_PHONE,
      verificationToken,
      acceptTerms: true,
    })

    expect(user.role).toBe('CUSTOMER')
    expect(user.phoneE164).toBe(`+55${VALID_PHONE}`)

    const stored = findAll<User>('users')[0]
    expect(stored.phoneVerifiedAt).not.toBeNull()
    // CPF nunca em texto puro no registro (spec §0.2 item 7)
    expect(stored.cpfEncrypted).not.toContain('52998224725')
    expect(JSON.stringify(stored)).not.toContain('52998224725')
  })

  it('rejeita registro por celular sem verificationToken', async () => {
    await expect(
      authService.register({
        firstName: 'João',
        lastName: 'Pereira',
        cpf: VALID_CPF,
        phone: VALID_PHONE,
        acceptTerms: true,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400 })
  })
})

describe('authService.register — e-mail', () => {
  it('cria e autentica com e-mail válido e senha forte', async () => {
    const { user } = await authService.register({
      firstName: 'Maria',
      lastName: 'Souza',
      cpf: VALID_CPF,
      email: 'maria@example.com',
      password: 'Senha123',
      acceptTerms: true,
    })
    expect(user.email).toBe('maria@example.com')
  })

  it('rejeita senha fraca', async () => {
    await expect(
      authService.register({
        firstName: 'Maria',
        lastName: 'Souza',
        cpf: VALID_CPF,
        email: 'maria@example.com',
        password: '123',
        acceptTerms: true,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400 })
  })

  it('e-mail já cadastrado', async () => {
    await authService.register({
      firstName: 'Maria',
      lastName: 'Souza',
      cpf: VALID_CPF,
      email: 'maria@example.com',
      password: 'Senha123',
      acceptTerms: true,
    })

    await expect(
      authService.register({
        firstName: 'Outra',
        lastName: 'Pessoa',
        cpf: '111.444.777-35',
        email: 'maria@example.com',
        password: 'Senha123',
        acceptTerms: true,
      }),
    ).rejects.toMatchObject({ code: 'EMAIL_ALREADY_REGISTERED', status: 409 })
  })
})

describe('authService.register — termos', () => {
  it('termos obrigatórios', async () => {
    await expect(
      authService.register({
        firstName: 'Maria',
        lastName: 'Souza',
        cpf: VALID_CPF,
        email: 'maria@example.com',
        password: 'Senha123',
        acceptTerms: false,
      }),
    ).rejects.toMatchObject({ code: 'TERMS_REQUIRED', status: 400 })
  })

  it('marketing opcional grava false quando não marcado', async () => {
    const { user } = await authService.register({
      firstName: 'Maria',
      lastName: 'Souza',
      cpf: VALID_CPF,
      email: 'maria@example.com',
      password: 'Senha123',
      acceptTerms: true,
    })
    expect(user.marketingOptIn).toBe(false)
  })
})

describe('OTP', () => {
  // BYPASS TEMPORÁRIO (pedido explícito do usuário, app 100% mock): verify()
  // aceita qualquer código, mesmo expirado ou após várias tentativas erradas.
  it('código é aceito mesmo depois de expirado', async () => {
    const { devCode } = await otpService.request(`+55${VALID_PHONE}`, 'SMS', 'SIGNUP')
    const challenge = findAll<OtpChallenge>('otpChallenges')[0]
    // força a expiração sem esperar 5 minutos de verdade
    const collection = getCollection<OtpChallenge>('otpChallenges')
    collection[challenge.id].expiresAt = new Date(Date.now() - 1000).toISOString()
    setCollection('otpChallenges', collection)

    await expect(otpService.verify(`+55${VALID_PHONE}`, devCode, 'SIGNUP')).resolves.toMatchObject({
      verificationToken: challenge.id,
    })
  })

  it('código errado também é aceito, sem limite de tentativas', async () => {
    await otpService.request(`+55${VALID_PHONE}`, 'SMS', 'SIGNUP')
    for (let i = 0; i < 6; i += 1) {
      await expect(otpService.verify(`+55${VALID_PHONE}`, '000000', 'SIGNUP')).resolves.toBeTruthy()
    }
  })

  it('reenvio respeita os 60s', async () => {
    await otpService.request(`+55${VALID_PHONE}`, 'SMS', 'SIGNUP')
    await expect(otpService.request(`+55${VALID_PHONE}`, 'SMS', 'SIGNUP')).rejects.toMatchObject({
      code: 'TOO_MANY_ATTEMPTS',
      status: 429,
    })
  })
})
