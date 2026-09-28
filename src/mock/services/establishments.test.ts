// Testes da história 34 (leitura pública) e história 12 (status derivado,
// pausa de pedidos, dados do gestor). `isOpenNow`/horário cruzando meia-noite
// /horário especial já são testados em `src/lib/hours.test.ts` — aqui só a
// composição PAUSED → CLOSED → BUSY → OPEN e o resto específico da história 12.
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { establishmentsService, deriveOperationalStatus } from './establishments'
import { managerEstablishmentService } from './managerEstablishment'
import { resetMockData } from '../reset'
import { ESTABLISHMENT_IDS, USER_IDS } from '../seed/ids'
import { createSession, useSessionStore } from '../session'
import { findAll, findById } from '../storage'
import type { Establishment, EstablishmentHours } from '../types'

function utcForSaoPaulo(dateTimeLocal: string): Date {
  return new Date(`${dateTimeLocal}-03:00`)
}

const OPEN_AT = utcForSaoPaulo('2026-09-29T20:00:00') // terça 20h, dentro de 17:00–02:00 (BUSINESS) e 17:30–00:30 (ORDERS) do Bar do Mestre
const CLOSED_AT = utcForSaoPaulo('2026-09-29T10:00:00') // terça de manhã, fora dos dois horários

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('establishmentsService.listPublic', () => {
  it('só devolve estabelecimentos ACTIVE', () => {
    const ids = establishmentsService.listPublic().map((e) => e.id)
    expect(ids).toContain(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(ids).not.toContain(ESTABLISHMENT_IDS.BAR_DO_ZE_CENTRO) // SETUP
    expect(ids).not.toContain(ESTABLISHMENT_IDS.RESTAURANTE_SP) // SUSPENDED
  })
})

describe('establishmentsService.getPublic — estabelecimento inativo', () => {
  it('SETUP devolve 404', () => {
    expect(() => establishmentsService.getPublic(ESTABLISHMENT_IDS.BAR_DO_ZE_CENTRO)).toThrowError(
      expect.objectContaining({ code: 'NOT_FOUND', status: 404 }),
    )
  })

  it('SUSPENDED devolve 404', () => {
    expect(() => establishmentsService.getPublic(ESTABLISHMENT_IDS.RESTAURANTE_SP)).toThrowError(
      expect.objectContaining({ code: 'NOT_FOUND', status: 404 }),
    )
  })
})

describe('establishmentsService.getRestaurantDetail — dados batem com o cadastro do gestor', () => {
  it('nota, endereço, tags e horário de hoje vêm exatamente do estabelecimento', () => {
    vi.useFakeTimers()
    vi.setSystemTime(OPEN_AT)

    const detail = establishmentsService.getRestaurantDetail(ESTABLISHMENT_IDS.BAR_DO_MESTRE)

    expect(detail.ratingAvg).toBe(4.7)
    expect(detail.ratingCount).toBe(312)
    expect(detail.address).toBe('Rua das Flores, 148 · Centro')
    expect(detail.tags).toEqual(['Cervejas artesanais', 'Petiscos'])
    expect(detail.todayHours).toBe('17:00–02:00')
    expect(detail.waitTime).toEqual({ minMinutes: 12, maxMinutes: 18 })
  })

  it('distância só aparece com lat/lng do cliente', () => {
    const withoutGeo = establishmentsService.getRestaurantDetail(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(withoutGeo.distanceMeters).toBeNull()

    const est = findById<Establishment>('establishments', ESTABLISHMENT_IDS.BAR_DO_MESTRE)!
    const withGeo = establishmentsService.getRestaurantDetail(ESTABLISHMENT_IDS.BAR_DO_MESTRE, {
      lat: est.lat! + 0.01,
      lng: est.lng!,
    })
    expect(withGeo.distanceMeters).toBeGreaterThan(0)
  })
})

describe('deriveOperationalStatus — prioridade PAUSED → CLOSED → BUSY → OPEN', () => {
  const baseHours: EstablishmentHours[] = [
    {
      id: 'h',
      establishmentId: 'e',
      kind: 'ORDERS',
      weekday: OPEN_AT.getUTCDay(),
      opensAt: '00:00',
      closesAt: '00:00', // "24 horas" (start === end -> sempre aberto, spec/lib hours.ts)
      isClosed: false,
      createdAt: '',
      updatedAt: '',
    },
  ]

  function base(overrides: Partial<Establishment>): Establishment {
    return {
      ...(findById<Establishment>('establishments', ESTABLISHMENT_IDS.BAR_DO_MESTRE) as Establishment),
      highDemand: false,
      ordersPausedAt: null,
      ordersPausedUntil: null,
      ordersPauseReason: null,
      ...overrides,
    }
  }

  it('PAUSED vence mesmo dentro do horário e sem alta demanda', () => {
    const { status } = deriveOperationalStatus(
      base({ ordersPausedAt: new Date().toISOString(), ordersPausedUntil: null, highDemand: true }),
      baseHours,
      [],
      OPEN_AT,
    )
    expect(status).toBe('PAUSED')
  })

  it('CLOSED quando fora do horário de pedidos, mesmo sem pausa', () => {
    const { status } = deriveOperationalStatus(base({}), [], [], CLOSED_AT)
    expect(status).toBe('CLOSED')
  })

  it('BUSY quando aberto e highDemand', () => {
    const { status } = deriveOperationalStatus(base({ highDemand: true }), baseHours, [], OPEN_AT)
    expect(status).toBe('BUSY')
  })

  it('OPEN quando aberto, sem pausa e sem alta demanda', () => {
    const { status } = deriveOperationalStatus(base({}), baseHours, [], OPEN_AT)
    expect(status).toBe('OPEN')
  })
})

describe('deriveOperationalStatus — pausa com prazo termina sozinha', () => {
  it('PAUSED durante a janela, volta a refletir o horário normal depois, sem ação manual', () => {
    vi.useFakeTimers()
    vi.setSystemTime(OPEN_AT)

    useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF'))
    managerEstablishmentService.pauseOrders(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { durationMinutes: 30, reason: 'Cozinha sobrecarregada' })

    expect(establishmentsService.getRestaurantDetail(ESTABLISHMENT_IDS.BAR_DO_MESTRE).operationalStatus).toBe('PAUSED')

    vi.setSystemTime(new Date(OPEN_AT.getTime() + 31 * 60_000))
    expect(establishmentsService.getRestaurantDetail(ESTABLISHMENT_IDS.BAR_DO_MESTRE).operationalStatus).not.toBe('PAUSED')
  })

  it('"até eu reativar" (sem prazo) só termina com resumeOrders', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF'))
    managerEstablishmentService.pauseOrders(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { durationMinutes: null })

    vi.useFakeTimers()
    vi.setSystemTime(new Date(Date.now() + 365 * 24 * 60 * 60_000))
    expect(establishmentsService.getRestaurantDetail(ESTABLISHMENT_IDS.BAR_DO_MESTRE).operationalStatus).toBe('PAUSED')
    vi.useRealTimers()

    managerEstablishmentService.resumeOrders(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(establishmentsService.getRestaurantDetail(ESTABLISHMENT_IDS.BAR_DO_MESTRE).operationalStatus).not.toBe('PAUSED')
  })
})

describe('managerEstablishmentService — isolamento por estabelecimento', () => {
  it('gestor de outro estabelecimento não edita este (404)', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF')) // Lucas não gerencia Seu Joaquim Bar
    expect(() => managerEstablishmentService.get(ESTABLISHMENT_IDS.SEU_JOAQUIM)).toThrowError(
      expect.objectContaining({ code: 'NOT_FOUND', status: 404 }),
    )
  })

  it('gestor do próprio estabelecimento consegue ler e editar', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF'))
    const view = managerEstablishmentService.get(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(view.establishment.id).toBe(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
  })
})

describe('managerEstablishmentService.updateHours', () => {
  it('substitui a semana inteira e reflete no todayHours', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF'))
    const business = Array.from({ length: 7 }, (_, weekday) => ({ weekday, isClosed: false, opensAt: '10:00', closesAt: '22:00' }))
    const orders = Array.from({ length: 7 }, (_, weekday) => ({ weekday, isClosed: false, opensAt: '10:00', closesAt: '22:00' }))
    managerEstablishmentService.updateHours(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { business, orders })

    const rows = findAll<EstablishmentHours>('establishmentHours').filter((h) => h.establishmentId === ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(rows).toHaveLength(14)

    vi.useFakeTimers()
    vi.setSystemTime(utcForSaoPaulo('2026-09-29T15:00:00'))
    expect(establishmentsService.getRestaurantDetail(ESTABLISHMENT_IDS.BAR_DO_MESTRE).todayHours).toBe('10:00–22:00')
  })
})

describe('managerEstablishmentService.upsertSpecialHours', () => {
  it('novo horário especial sobrescreve o semanal na leitura', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF'))
    managerEstablishmentService.upsertSpecialHours(ESTABLISHMENT_IDS.BAR_DO_MESTRE, {
      date: '2026-09-29',
      kind: 'BUSINESS',
      isClosed: true,
    })

    vi.useFakeTimers()
    vi.setSystemTime(OPEN_AT)
    expect(establishmentsService.getRestaurantDetail(ESTABLISHMENT_IDS.BAR_DO_MESTRE).todayHours).toBe('Fechado hoje')
  })
})

describe('managerEstablishmentService.updateInfo', () => {
  it('atualiza os dados cadastrais', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF'))
    managerEstablishmentService.updateInfo(ESTABLISHMENT_IDS.BAR_DO_MESTRE, {
      name: 'Bar do Mestre Renovado',
      shortName: 'Bar do Mestre',
      category: 'BAR',
      street: 'Rua das Flores',
      number: '148',
      neighborhood: 'Centro',
      city: 'Campinas',
      state: 'SP',
      zip: '13010000',
    })

    const updated = findById<Establishment>('establishments', ESTABLISHMENT_IDS.BAR_DO_MESTRE)!
    expect(updated.name).toBe('Bar do Mestre Renovado')
  })
})
