// Testes da história 36 (Admin · Usuários). Cada `it` espelha um cenário
// Gherkin ou caso de borda da spec.
import { describe, expect, it, beforeEach } from 'vitest'
import { adminUsersService, type ChangeRoleInput } from './adminUsers'
import { authService } from './auth'
import { usersService } from './users'
import { resetMockData } from '../reset'
import { USER_IDS, ESTABLISHMENT_IDS } from '../seed/ids'
import { DEV_PASSWORD } from '../seed/users'
import { createSession, useSessionStore } from '../session'
import { findById } from '../storage'
import type { User } from '../types'

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
  useSessionStore.getState().setSession(createSession(USER_IDS.ADMIN, 'PLATFORM_ADMIN'))
})

describe('adminUsersService — apenas admin acessa', () => {
  it('STAFF recebe 403 ao listar', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF'))
    expect(() => adminUsersService.list()).toThrowError(expect.objectContaining({ code: 'FORBIDDEN', status: 403 }))
  })
})

describe('adminUsersService — suspensão vale na hora', () => {
  it('próxima requisição do cliente devolve ACCOUNT_SUSPENDED e o refresh token para de funcionar', async () => {
    const { refreshToken } = await authService.login({ email: 'joao@email.com', password: DEV_PASSWORD })

    // authService.login troca a sessão ativa pro usuário logado — volta pro admin antes de suspender
    useSessionStore.getState().setSession(createSession(USER_IDS.ADMIN, 'PLATFORM_ADMIN'))
    adminUsersService.suspend(USER_IDS.JOAO, { reason: 'Uso indevido' })

    useSessionStore.getState().setSession(createSession(USER_IDS.JOAO, 'CUSTOMER'))
    expect(() => usersService.me()).toThrowError(expect.objectContaining({ code: 'ACCOUNT_SUSPENDED', status: 403 }))

    await expect(authService.refresh(refreshToken)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  it('motivo é obrigatório', () => {
    expect(() => adminUsersService.suspend(USER_IDS.JOAO, { reason: '' })).toThrowError(
      expect.objectContaining({ code: 'VALIDATION_ERROR', status: 400 }),
    )
  })
})

describe('adminUsersService — reativação', () => {
  it('usuário reativado consegue entrar de novo', async () => {
    adminUsersService.suspend(USER_IDS.JOAO, { reason: 'teste' })
    adminUsersService.reactivate(USER_IDS.JOAO)

    const { user } = await authService.login({ email: 'joao@email.com', password: DEV_PASSWORD })
    expect(user.status).toBe('ACTIVE')
  })
})

describe('adminUsersService — proteção do último admin', () => {
  it('admin não pode suspender a si mesmo', () => {
    expect(() => adminUsersService.suspend(USER_IDS.ADMIN, { reason: 'teste' })).toThrowError(
      expect.objectContaining({ code: 'CANNOT_SUSPEND_SELF', status: 422 }),
    )
    expect(findById<User>('users', USER_IDS.ADMIN)!.status).toBe('ACTIVE')
  })

  it('não remove o papel do último PLATFORM_ADMIN ativo', () => {
    expect(() =>
      adminUsersService.changeRole(USER_IDS.ADMIN, { role: 'CUSTOMER', memberships: [] }),
    ).toThrowError(expect.objectContaining({ code: 'LAST_ADMIN_PROTECTED', status: 422 }))
  })

  it('com 2 admins ativos, dá pra rebaixar um deles', () => {
    adminUsersService.changeRole(USER_IDS.JOAO, { role: 'PLATFORM_ADMIN', memberships: [] })
    // João agora é o segundo PLATFORM_ADMIN ativo — rebaixar o admin original não quebra mais a regra
    const detail = adminUsersService.changeRole(USER_IDS.ADMIN, { role: 'CUSTOMER', memberships: [] })
    expect(detail.role).toBe('CUSTOMER')
  })
})

describe('adminUsersService — histórico de permissões', () => {
  it('registra quem alterou, o papel anterior e o novo', () => {
    const input: ChangeRoleInput = {
      role: 'STAFF',
      memberships: [{ role: 'MANAGER', establishmentId: ESTABLISHMENT_IDS.LANCHERIA }],
    }
    adminUsersService.changeRole(USER_IDS.JOAO, input)

    const [log] = adminUsersService.listAudit(USER_IDS.JOAO)
    expect(log.action).toBe('ROLE_CHANGED')
    expect(log.actorUserId).toBe(USER_IDS.ADMIN)
    expect(log.before).toMatchObject({ role: 'CUSTOMER' })
    expect(log.after).toMatchObject({ role: 'STAFF' })
  })
})

describe('adminUsersService.changeRole — STAFF exige vínculo', () => {
  it('sem membership é rejeitado', () => {
    expect(() => adminUsersService.changeRole(USER_IDS.JOAO, { role: 'STAFF', memberships: [] })).toThrowError(
      expect.objectContaining({ code: 'STAFF_REQUIRES_MEMBERSHIP', status: 422 }),
    )
  })

  it('substitui os vínculos anteriores pelos novos', () => {
    adminUsersService.changeRole(USER_IDS.CARLOS, {
      role: 'STAFF',
      memberships: [{ role: 'WAITER', establishmentId: ESTABLISHMENT_IDS.LANCHERIA }],
    })
    const detail = adminUsersService.get(USER_IDS.CARLOS)
    expect(detail.memberships).toHaveLength(1)
    expect(detail.memberships[0].role).toBe('WAITER')
  })
})

describe('adminUsersService — inativo derivado', () => {
  it('Mariana aparece Inativa sem que o status gravado mude', () => {
    const row = adminUsersService.list().find((r) => r.id === USER_IDS.MARIANA)!
    expect(row.displayStatus).toBe('INACTIVE')
    expect(row.status).toBe('ACTIVE') // status gravado nunca vira "INACTIVE"
  })

  it('filtro combinado papel + status', () => {
    const rows = adminUsersService.list({ role: 'STAFF', status: 'INACTIVE' })
    expect(rows.map((r) => r.id)).toEqual([USER_IDS.MARIANA])
  })
})

describe('adminUsersService.list — busca sem diferenciar acento', () => {
  it('"joao" encontra "João"', () => {
    const rows = adminUsersService.list({ q: 'joao' })
    expect(rows.map((r) => r.id)).toContain(USER_IDS.JOAO)
  })
})

describe('adminUsersService.exportCsv', () => {
  it('não contém CPF nem telefone', () => {
    const csv = adminUsersService.exportCsv()
    expect(csv).not.toContain('+5519999999999') // telefone verificado de João no seed
    expect(csv.toLowerCase()).not.toContain('cpf')
    expect(csv.split('\n')[0]).toBe('Nome,E-mail,Status,Último acesso,Pedidos')
  })
})
