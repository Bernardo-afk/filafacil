// Testes da história 11 (buscar restaurantes próximos). Cada `it` espelha um
// cenário Gherkin ou caso de borda da spec.
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { searchEstablishments, DEFAULT_CITY_CENTER } from './discovery'
import { resetMockData } from '../reset'
import { ESTABLISHMENT_IDS } from '../seed/ids'
import { findById, upsert } from '../storage'
import type { Establishment } from '../types'

// terça 20h em São Paulo (mesmo instante usado em establishments.test.ts):
// dentro do horário BUSINESS de todos os estabelecimentos com hours no seed.
const OPEN_AT = new Date('2026-09-29T20:00:00-03:00')

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
  vi.useFakeTimers()
  vi.setSystemTime(OPEN_AT)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('searchEstablishments — ordenação por distância com status visível', () => {
  it('vem ordenada da menor pra maior distância e mostra o status de cada uma', () => {
    const result = searchEstablishments({ lat: DEFAULT_CITY_CENTER.lat, lng: DEFAULT_CITY_CENTER.lng, radiusMeters: 50_000 })
    expect(result.items.length).toBeGreaterThan(1)

    const distances = result.items.map((i) => i.distanceMeters!)
    expect(distances).toEqual([...distances].sort((a, b) => a - b))

    for (const item of result.items) {
      expect(['OPEN', 'BUSY', 'PAUSED', 'CLOSED']).toContain(item.operationalStatus)
    }
  })
})

describe('searchEstablishments — suspenso e em configuração não aparecem', () => {
  it('SUSPENDED e SETUP ficam fora da lista e do contador', () => {
    const result = searchEstablishments({ radiusMeters: 50_000 })
    const ids = result.items.map((i) => i.id)
    expect(ids).not.toContain(ESTABLISHMENT_IDS.RESTAURANTE_SP) // SUSPENDED
    expect(ids).not.toContain(ESTABLISHMENT_IDS.BAR_DO_ZE_CENTRO) // SETUP, sem lat/lng também
  })

  it('estabelecimento sem lat/lng não aparece mesmo que ACTIVE', () => {
    const e = findById<Establishment>('establishments', ESTABLISHMENT_IDS.LANCHERIA)!
    upsert('establishments', { ...e, lat: null, lng: null })

    const result = searchEstablishments({ radiusMeters: 50_000 })
    expect(result.items.map((i) => i.id)).not.toContain(ESTABLISHMENT_IDS.LANCHERIA)
  })
})

describe('searchEstablishments — filtro "Aberto agora"', () => {
  it('só aparecem os abertos no horário BUSINESS', () => {
    const all = searchEstablishments({ radiusMeters: 50_000 })
    const openOnly = searchEstablishments({ radiusMeters: 50_000, openNow: true })
    expect(openOnly.items.length).toBeLessThanOrEqual(all.items.length)
    expect(openOnly.items.every((i) => i.isOpenNow)).toBe(true)
  })

  it('pausa de pedidos não tira o estabelecimento do filtro "Aberto agora"', () => {
    // Bar do Zé Cambuí já nasce com pedidos pausados no seed (spec §8) e tem BUSINESS aberto todo dia
    const withoutFilter = searchEstablishments({ radiusMeters: 50_000 }).items.find((i) => i.id === ESTABLISHMENT_IDS.BAR_DO_ZE_CAMBUI)
    expect(withoutFilter?.operationalStatus).toBe('PAUSED')

    const openNowResult = searchEstablishments({ radiusMeters: 50_000, openNow: true })
    expect(openNowResult.items.map((i) => i.id)).toContain(ESTABLISHMENT_IDS.BAR_DO_ZE_CAMBUI)
  })
})

describe('searchEstablishments — "Aceitando pedidos" exclui pausados e fechados', () => {
  it('acceptingOrders só mantém OPEN ou BUSY', () => {
    const result = searchEstablishments({ radiusMeters: 50_000, acceptingOrders: true })
    expect(result.items.every((i) => i.operationalStatus === 'OPEN' || i.operationalStatus === 'BUSY')).toBe(true)
    expect(result.items.map((i) => i.id)).not.toContain(ESTABLISHMENT_IDS.BAR_DO_ZE_CAMBUI) // pausado
  })
})

describe('searchEstablishments — menor espera em ordem numérica', () => {
  it('ordena 8–12, 10–15, 25–30 e por último o sem informação', () => {
    const now = new Date().toISOString()
    function withWait(id: string, min: number | null, max: number | null): void {
      const e = findById<Establishment>('establishments', id)!
      upsert('establishments', { ...e, waitMinMinutes: min, waitMaxMinutes: max, lat: e.lat ?? -22.9, lng: e.lng ?? -47.06, updatedAt: now })
    }
    withWait(ESTABLISHMENT_IDS.BAR_DO_MESTRE, 10, 15)
    withWait(ESTABLISHMENT_IDS.SEU_JOAQUIM, 25, 30)
    withWait(ESTABLISHMENT_IDS.BOTECO_DA_VILA, 8, 12)
    withWait(ESTABLISHMENT_IDS.CANTINA, null, null)
    withWait(ESTABLISHMENT_IDS.LANCHERIA, null, null)

    const result = searchEstablishments({ radiusMeters: 50_000, sort: 'wait' })
    const ids = result.items.map((i) => i.id)
    const posBoteco = ids.indexOf(ESTABLISHMENT_IDS.BOTECO_DA_VILA)
    const posMestre = ids.indexOf(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    const posJoaquim = ids.indexOf(ESTABLISHMENT_IDS.SEU_JOAQUIM)
    const posCantina = ids.indexOf(ESTABLISHMENT_IDS.CANTINA)

    expect(posBoteco).toBeLessThan(posMestre)
    expect(posMestre).toBeLessThan(posJoaquim)
    expect(posJoaquim).toBeLessThan(posCantina)
  })
})

describe('searchEstablishments — busca por item do cardápio', () => {
  it('buscar "burger" encontra o restaurante com X-Burger', () => {
    const result = searchEstablishments({ radiusMeters: 50_000, q: 'burger' })
    expect(result.items.map((i) => i.id)).toContain(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
  })

  it('busca com acento: "cafe" não quebra mesmo sem estabelecimento do tipo', () => {
    const result = searchEstablishments({ radiusMeters: 50_000, q: 'cafe' })
    expect(result.items).toEqual([])
  })

  it('busca por bairro sem diferenciar acento: "barao geraldo" encontra "Barão Geraldo"', () => {
    // Seu Joaquim Bar fica no bairro Barão Geraldo (spec §8)
    const result = searchEstablishments({ radiusMeters: 50_000, q: 'barao geraldo' })
    expect(result.items.map((i) => i.id)).toContain(ESTABLISHMENT_IDS.SEU_JOAQUIM)
  })
})

describe('searchEstablishments — sem permissão de localização', () => {
  it('sem lat/lng usa o centro de Campinas e continua funcionando', () => {
    const result = searchEstablishments({ radiusMeters: 50_000 })
    expect(result.items.length).toBeGreaterThan(0)
  })
})

describe('searchEstablishments — raio', () => {
  it('raio máximo é limitado a 50km mesmo se pedirem mais', () => {
    const huge = searchEstablishments({ radiusMeters: 1_000_000 })
    const capped = searchEstablishments({ radiusMeters: 50_000 })
    expect(huge.items.length).toBe(capped.items.length)
  })

  it('raio pequeno filtra estabelecimentos distantes', () => {
    const wide = searchEstablishments({ lat: DEFAULT_CITY_CENTER.lat, lng: DEFAULT_CITY_CENTER.lng, radiusMeters: 50_000 })
    const narrow = searchEstablishments({ lat: DEFAULT_CITY_CENTER.lat, lng: DEFAULT_CITY_CENTER.lng, radiusMeters: 100 })
    expect(narrow.items.length).toBeLessThan(wide.items.length)
    expect(narrow.items.every((i) => (i.distanceMeters ?? 0) <= 100)).toBe(true)
  })
})

describe('searchEstablishments — paginação estável', () => {
  it('página 2 não repete itens da página 1', () => {
    const page1 = searchEstablishments({ radiusMeters: 50_000, page: 1, pageSize: 2 })
    const page2 = searchEstablishments({ radiusMeters: 50_000, page: 2, pageSize: 2 })
    const ids1 = page1.items.map((i) => i.id)
    const ids2 = page2.items.map((i) => i.id)
    expect(ids1.some((id) => ids2.includes(id))).toBe(false)
    expect(page1.total).toBe(page2.total)
  })
})
