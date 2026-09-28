// Testes da história 13 (perfil). Cada `it` espelha um cenário Gherkin da spec.
import { describe, expect, it, beforeEach } from 'vitest'
import { usersService } from './users'
import { otpService } from './otp'
import { resetMockData } from '../reset'
import { USER_IDS } from '../seed/ids'
import { DEV_PASSWORD } from '../seed/users'
import { createSession, useSessionStore } from '../session'
import { findAll, getCollection, upsert } from '../storage'
import type { RefreshToken, User } from '../types'

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
  useSessionStore.getState().setSession(createSession(USER_IDS.JOAO, 'CUSTOMER'))
})

describe('usersService.updateProfile', () => {
  it('alteração refletida imediatamente', async () => {
    await usersService.updateProfile({ firstName: 'Lucas', lastName: 'Henrique' })
    expect(usersService.me().firstName).toBe('Lucas')
    expect(usersService.me().lastName).toBe('Henrique')
  })

  it('CPF nunca muda via PATCH /me (não está no schema)', async () => {
    const before = findAll<User>('users').find((u) => u.id === USER_IDS.JOAO)!
    await usersService.updateProfile({ firstName: 'João', lastName: 'Pereira' })
    const after = findAll<User>('users').find((u) => u.id === USER_IDS.JOAO)!
    expect(after.cpfHash).toBe(before.cpfHash)
    expect(after.cpfEncrypted).toBe(before.cpfEncrypted)
  })

  it('sem sessão, é bloqueado', async () => {
    useSessionStore.getState().clearSession()
    await expect(usersService.updateProfile({ firstName: 'X', lastName: 'Y' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
  })
})

describe('usersService — trocar celular exige verificação', () => {
  it('só muda depois do código correto', async () => {
    const newPhone = '19988887777'
    const { devCode } = await usersService.requestContactChange({ type: 'PHONE', value: newPhone })

    await expect(
      usersService.confirmContactChange({ type: 'PHONE', value: newPhone, code: '000000' }),
    ).rejects.toMatchObject({ code: 'OTP_INVALID' })
    expect(usersService.me().phoneE164).not.toBe('+5519988887777')

    await usersService.confirmContactChange({ type: 'PHONE', value: newPhone, code: devCode })
    expect(usersService.me().phoneE164).toBe('+5519988887777')
  })
})

describe('usersService — e-mail já usado', () => {
  it('recebe EMAIL_ALREADY_REGISTERED e nada muda', async () => {
    // admin@filazero.dev já existe no seed (spec §8)
    await expect(usersService.requestContactChange({ type: 'EMAIL', value: 'admin@filazero.dev' })).rejects.toMatchObject({
      code: 'EMAIL_ALREADY_REGISTERED',
      status: 409,
    })
    expect(usersService.me().email).toBe('joao@email.com')
  })
})

describe('usersService.changePassword', () => {
  it('senha atual incorreta é rejeitada', async () => {
    await expect(
      usersService.changePassword({ currentPassword: 'errada', newPassword: 'NovaSenha1' }),
    ).rejects.toMatchObject({ code: 'CURRENT_PASSWORD_INVALID' })
  })

  it('troca com senha atual correta', async () => {
    await usersService.changePassword({ currentPassword: DEV_PASSWORD, newPassword: 'NovaSenha1' })
    const stored = findAll<User>('users').find((u) => u.id === USER_IDS.JOAO)!
    expect(stored.passwordHash).toBe('mock:NovaSenha1')
  })
})

describe('usersService.logoutAllDevices', () => {
  it('sair de todos os dispositivos revoga todos os refresh tokens do usuário', async () => {
    // simula 2 aparelhos: 2 refresh tokens ativos pro mesmo usuário
    const now = new Date().toISOString()
    const tokenFor = (id: string): RefreshToken => ({
      id,
      userId: USER_IDS.JOAO,
      tokenHash: `hash-${id}`,
      familyId: `family-${id}`,
      expiresAt: new Date(Date.now() + 100000).toISOString(),
      revokedAt: null,
      userAgent: null,
      ip: null,
      createdAt: now,
      updatedAt: now,
    })
    upsert('refreshTokens', tokenFor('device-1'))
    upsert('refreshTokens', tokenFor('device-2'))

    await usersService.logoutAllDevices()

    const tokens = getCollection<RefreshToken>('refreshTokens')
    expect(tokens['device-1'].revokedAt).not.toBeNull()
    expect(tokens['device-2'].revokedAt).not.toBeNull()

    const user = findAll<User>('users').find((u) => u.id === USER_IDS.JOAO)!
    expect(user.tokenVersion).toBe(1)

    // e a sessão local também é encerrada (este aparelho faz parte de "todos")
    expect(useSessionStore.getState().session).toBeNull()
  })

  it('não revoga refresh token de outro usuário', async () => {
    const now = new Date().toISOString()
    upsert('refreshTokens', {
      id: 'other-device',
      userId: USER_IDS.ADMIN,
      tokenHash: 'hash-other',
      familyId: 'family-other',
      expiresAt: new Date(Date.now() + 100000).toISOString(),
      revokedAt: null,
      userAgent: null,
      ip: null,
      createdAt: now,
      updatedAt: now,
    })

    await usersService.logoutAllDevices()

    const tokens = getCollection<RefreshToken>('refreshTokens')
    expect(tokens['other-device'].revokedAt).toBeNull()
  })
})

describe('otpService — CHANGE_CONTACT não vaza pra LOGIN/SIGNUP', () => {
  it('token de outro purpose não confirma a troca de contato', async () => {
    const { devCode } = await otpService.request('+5519988887777', 'SMS', 'LOGIN')
    await otpService.verify('+5519988887777', devCode, 'LOGIN')

    await expect(
      usersService.confirmContactChange({ type: 'PHONE', value: '19988887777', code: devCode }),
    ).rejects.toMatchObject({ code: 'OTP_INVALID' })
  })
})
