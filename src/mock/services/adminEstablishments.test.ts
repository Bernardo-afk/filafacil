// Testes da história 34 (Admin · Estabelecimentos). Cada `it` espelha um
// cenário Gherkin ou caso de borda da spec.
import { describe, expect, it, beforeEach } from 'vitest'
import { adminEstablishmentsService, type CreateEstablishmentInput } from './adminEstablishments'
import { establishmentsService } from './establishments'
import { resetMockData } from '../reset'
import { USER_IDS, ORG_IDS, ESTABLISHMENT_IDS } from '../seed/ids'
import { createSession, useSessionStore } from '../session'
import { findAll } from '../storage'
import type { AuditLog, Organization, Subscription } from '../types'

const VALID_NEW: CreateEstablishmentInput = {
  name: 'Espetinho do Bairro',
  category: 'BAR',
  street: 'Rua Nova',
  number: '55',
  neighborhood: 'Centro',
  city: 'Campinas',
  state: 'sp',
  zip: '13010-000',
  lat: -22.9,
  lng: -47.06,
}

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
  useSessionStore.getState().setSession(createSession(USER_IDS.ADMIN, 'PLATFORM_ADMIN'))
})

describe('adminEstablishmentsService — apenas admin acessa', () => {
  it('STAFF recebe 403 ao tentar criar', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF'))
    expect(() => adminEstablishmentsService.create(VALID_NEW)).toThrowError(
      expect.objectContaining({ code: 'FORBIDDEN', status: 403 }),
    )
  })

  it('sem sessão recebe UNAUTHENTICATED', () => {
    useSessionStore.getState().clearSession()
    expect(() => adminEstablishmentsService.list()).toThrowError(expect.objectContaining({ code: 'UNAUTHENTICATED' }))
  })
})

describe('adminEstablishmentsService — estabelecimento desativado some das buscas', () => {
  it('DEACTIVATED some do GET /establishments e devolve 404 no GET /:id', () => {
    expect(establishmentsService.listPublic().map((e) => e.id)).toContain(ESTABLISHMENT_IDS.BAR_DO_MESTRE)

    adminEstablishmentsService.changeStatus(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { status: 'DEACTIVATED' })

    expect(establishmentsService.listPublic().map((e) => e.id)).not.toContain(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(() => establishmentsService.getPublic(ESTABLISHMENT_IDS.BAR_DO_MESTRE)).toThrowError(
      expect.objectContaining({ code: 'NOT_FOUND' }),
    )
  })

  it('reativação: volta a aparecer na busca', () => {
    adminEstablishmentsService.changeStatus(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { status: 'DEACTIVATED' })
    adminEstablishmentsService.changeStatus(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { status: 'ACTIVE' })

    expect(establishmentsService.listPublic().map((e) => e.id)).toContain(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
  })
})

describe('adminEstablishmentsService — motivo obrigatório para suspender', () => {
  it('sem motivo recebe 400 e o status não muda', () => {
    expect(() => adminEstablishmentsService.changeStatus(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { status: 'SUSPENDED' })).toThrowError(
      expect.objectContaining({ code: 'VALIDATION_ERROR', status: 400 }),
    )
    expect(adminEstablishmentsService.get(ESTABLISHMENT_IDS.BAR_DO_MESTRE).establishment.status).toBe('ACTIVE')
  })

  it('com motivo, suspende e grava statusReason', () => {
    const detail = adminEstablishmentsService.changeStatus(ESTABLISHMENT_IDS.BAR_DO_MESTRE, {
      status: 'SUSPENDED',
      reason: 'Violação das regras de uso',
    })
    expect(detail.establishment.status).toBe('SUSPENDED')
    expect(detail.establishment.statusReason).toBe('Violação das regras de uso')
  })
})

describe('adminEstablishmentsService — em configuração não aparece', () => {
  it('SETUP não aparece na busca pública', () => {
    expect(establishmentsService.listPublic().map((e) => e.id)).not.toContain(ESTABLISHMENT_IDS.BAR_DO_ZE_CENTRO)
  })

  it('ativar sem checklist completo (endereço/coordenadas/horário) é bloqueado', () => {
    // Bar do Zé Centro nasceu "em configuração" sem endereço/lat-lng/horário (spec §8)
    expect(() => adminEstablishmentsService.changeStatus(ESTABLISHMENT_IDS.BAR_DO_ZE_CENTRO, { status: 'ACTIVE' })).toThrowError(
      expect.objectContaining({ code: 'VALIDATION_ERROR', status: 400 }),
    )
  })
})

describe('adminEstablishmentsService — transições inválidas', () => {
  it('SETUP não pode ir direto pra SUSPENDED', () => {
    expect(() =>
      adminEstablishmentsService.changeStatus(ESTABLISHMENT_IDS.BAR_DO_ZE_CENTRO, { status: 'SUSPENDED', reason: 'x' }),
    ).toThrowError(expect.objectContaining({ code: 'VALIDATION_ERROR' }))
  })
})

describe('adminEstablishmentsService — limite de unidades do plano', () => {
  it('organização START com 1 unidade recebe 403 ao criar a segunda', () => {
    // Restaurantes Bela Vista está no plano START com 1 unidade (Restaurante São Paulo, spec §8)
    expect(() =>
      adminEstablishmentsService.create({ ...VALID_NEW, organizationId: ORG_IDS.BELA_VISTA }),
    ).toThrowError(expect.objectContaining({ code: 'PLAN_LIMIT_REACHED', status: 403 }))
  })

  it('organização BUSINESS (ilimitado) aceita mais uma unidade', () => {
    const detail = adminEstablishmentsService.create({ ...VALID_NEW, organizationId: ORG_IDS.BOTECO_CORP })
    expect(detail.establishment.organizationId).toBe(ORG_IDS.BOTECO_CORP)
  })
})

describe('adminEstablishmentsService.create — organização', () => {
  it('estabelecimento avulso ganha organização própria com assinatura TRIAL START', () => {
    const detail = adminEstablishmentsService.create(VALID_NEW)
    expect(detail.establishment.status).toBe('SETUP')

    const organization = findAll<Organization>('organizations').find((o) => o.id === detail.establishment.organizationId)!
    expect(organization.name).toBe(VALID_NEW.name)

    const subscription = findAll<Subscription>('subscriptions').find((s) => s.organizationId === organization.id)!
    expect(subscription.status).toBe('TRIAL')
    expect(detail.planCode).toBe('START')
  })

  it('organização existente herda a assinatura que já tinha, sem duplicar', () => {
    const before = findAll<Subscription>('subscriptions').filter((s) => s.organizationId === ORG_IDS.BOTECO_CORP)
    adminEstablishmentsService.create({ ...VALID_NEW, organizationId: ORG_IDS.BOTECO_CORP })
    const after = findAll<Subscription>('subscriptions').filter((s) => s.organizationId === ORG_IDS.BOTECO_CORP)
    expect(after).toHaveLength(before.length)
  })

  it('organização inexistente recebe 404', () => {
    expect(() => adminEstablishmentsService.create({ ...VALID_NEW, organizationId: 'org-fantasma' })).toThrowError(
      expect.objectContaining({ code: 'NOT_FOUND', status: 404 }),
    )
  })

  it('lat/lng fora do intervalo é rejeitado', () => {
    expect(() => adminEstablishmentsService.create({ ...VALID_NEW, lat: 999 })).toThrowError(
      expect.objectContaining({ code: 'VALIDATION_ERROR', status: 400 }),
    )
  })
})

describe('adminEstablishmentsService.create — gestor responsável', () => {
  it('e-mail de usuário existente cria Membership(MANAGER)', () => {
    const detail = adminEstablishmentsService.create({ ...VALID_NEW, managerEmail: 'lucas@bardoze.com.br' })
    expect(detail.managerName).toBe('Lucas')
  })

  it('e-mail sem usuário correspondente recebe USER_NOT_FOUND', () => {
    expect(() => adminEstablishmentsService.create({ ...VALID_NEW, managerEmail: 'ninguem@example.com' })).toThrowError(
      expect.objectContaining({ code: 'USER_NOT_FOUND', status: 404 }),
    )
  })
})

describe('adminEstablishmentsService.list — busca sem diferenciar acento', () => {
  it('"sao paulo" encontra "Restaurante São Paulo"', () => {
    const rows = adminEstablishmentsService.list({ q: 'sao paulo' })
    expect(rows.map((r) => r.id)).toContain(ESTABLISHMENT_IDS.RESTAURANTE_SP)
  })
})

describe('adminEstablishmentsService — auditoria', () => {
  it('toda troca de status grava AuditLog STATUS_CHANGED', () => {
    adminEstablishmentsService.changeStatus(ESTABLISHMENT_IDS.BAR_DO_MESTRE, {
      status: 'SUSPENDED',
      reason: 'teste',
    })
    const logs = findAll<AuditLog>('auditLogs').filter(
      (l) => l.entityId === ESTABLISHMENT_IDS.BAR_DO_MESTRE && l.action === 'STATUS_CHANGED',
    )
    expect(logs.length).toBeGreaterThan(0)
  })
})
