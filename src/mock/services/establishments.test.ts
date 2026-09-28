// Testes da história 34 — leitura pública (spec: "SUSPENDED e DEACTIVATED
// somem de GET /establishments", "Em configuração não aparece").
import { describe, expect, it, beforeEach } from 'vitest'
import { establishmentsService } from './establishments'
import { resetMockData } from '../reset'
import { ESTABLISHMENT_IDS } from '../seed/ids'

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
})

describe('establishmentsService.listPublic', () => {
  it('só devolve estabelecimentos ACTIVE', () => {
    const ids = establishmentsService.listPublic().map((e) => e.id)
    expect(ids).toContain(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(ids).not.toContain(ESTABLISHMENT_IDS.BAR_DO_ZE_CENTRO) // SETUP
    expect(ids).not.toContain(ESTABLISHMENT_IDS.RESTAURANTE_SP) // SUSPENDED
  })
})

describe('establishmentsService.getPublic', () => {
  it('estabelecimento ACTIVE aparece', () => {
    expect(establishmentsService.getPublic(ESTABLISHMENT_IDS.BAR_DO_MESTRE).id).toBe(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
  })

  it('SETUP devolve 404 (não é só "inexistente")', () => {
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
