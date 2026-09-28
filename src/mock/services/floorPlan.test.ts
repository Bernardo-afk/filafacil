// Testes da história 20 (planta do salão). Cada `it` espelha um cenário
// Gherkin ou caso de borda da spec.
import { describe, expect, it, beforeEach } from 'vitest'
import { areasService, tablesService, getFloorPlan, putFloorPlan } from './floorPlan'
import { adminUsersService } from './adminUsers'
import { resetMockData } from '../reset'
import { USER_IDS, ESTABLISHMENT_IDS } from '../seed/ids'
import { createSession, useSessionStore } from '../session'
import { findAll } from '../storage'
import type { DiningTable } from '../types'

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
  useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF', ESTABLISHMENT_IDS.BAR_DO_MESTRE))
})

function tableByCode(code: string): DiningTable {
  return findAll<DiningTable>('diningTables').find((t) => t.establishmentId === ESTABLISHMENT_IDS.BAR_DO_MESTRE && t.code === code)!
}

function allPositions() {
  const { tables } = getFloorPlan(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
  return tables.map((t) => ({ tableId: t.id, gridX: t.gridX, gridY: t.gridY, gridW: t.gridW, gridH: t.gridH }))
}

describe('putFloorPlan — mesa reposicionada aparece na mesma posição', () => {
  it('mover a mesa 5 pra uma célula livre (5,3) e salvar reflete no GET', () => {
    const mesa5 = tableByCode('M05')
    const positions = allPositions().map((p) => (p.tableId === mesa5.id ? { ...p, gridX: 5, gridY: 3 } : p))

    putFloorPlan(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { gridCols: 6, gridRows: 4, positions })

    const { tables } = getFloorPlan(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    const updated = tables.find((t) => t.id === mesa5.id)!
    expect(updated.gridX).toBe(5)
    expect(updated.gridY).toBe(3)
  })
})

describe('putFloorPlan — sobreposição bloqueada', () => {
  it('duas mesas na mesma célula recebem 422 e nada é salvo', () => {
    const mesa1 = tableByCode('M01')
    const mesa2 = tableByCode('M02')
    const before = allPositions()

    const positions = before.map((p) => (p.tableId === mesa2.id ? { ...p, gridX: mesa1.gridX, gridY: mesa1.gridY } : p))

    expect(() => putFloorPlan(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { gridCols: 6, gridRows: 4, positions })).toThrowError(
      expect.objectContaining({ code: 'TABLE_OVERLAP', status: 422 }),
    )

    // atômico: nenhuma mesa mudou (nem a que não estava em conflito)
    const after = allPositions()
    expect(after).toEqual(before)
  })
})

describe('tablesService.create — código de mesa único', () => {
  it('criar outra mesa com código "M03" recebe 409', () => {
    const areas = areasService.list(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(() =>
      tablesService.create(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { code: 'M03', label: 'Mesa duplicada', areaId: areas[0].id, capacity: 4 }),
    ).toThrowError(expect.objectContaining({ code: 'TABLE_CODE_TAKEN', status: 409 }))
  })
})

describe('tablesService.delete — mesa desativada', () => {
  it('some da planta e não aparece mais como ativa', () => {
    const mesa1 = tableByCode('M01')
    tablesService.delete(ESTABLISHMENT_IDS.BAR_DO_MESTRE, mesa1.id)

    const { tables } = getFloorPlan(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(tables.map((t) => t.id)).not.toContain(mesa1.id)
  })
})

describe('putFloorPlan — QR token estável', () => {
  it('salvar a planta de novo mantém o qr_token', () => {
    const mesa1Before = tableByCode('M01')
    putFloorPlan(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { gridCols: 6, gridRows: 4, positions: allPositions() })
    const mesa1After = tableByCode('M01')
    expect(mesa1After.qrToken).toBe(mesa1Before.qrToken)
  })
})

describe('tablesService.setStatus — liberar, ocupar e bloquear', () => {
  it('mesa OCCUPIED liberada passa pra AVAILABLE', () => {
    const mesa2 = tableByCode('M02') // OCCUPIED no seed
    expect(mesa2.status).toBe('OCCUPIED')
    const updated = tablesService.setStatus(ESTABLISHMENT_IDS.BAR_DO_MESTRE, mesa2.id, 'AVAILABLE')
    expect(updated.status).toBe('AVAILABLE')
  })
})

describe('putFloorPlan — casos de borda', () => {
  it('redimensionar pra fora da grade é rejeitado', () => {
    const mesa1 = tableByCode('M01')
    const positions = allPositions().map((p) => (p.tableId === mesa1.id ? { ...p, gridX: 10, gridY: 0 } : p))
    expect(() => putFloorPlan(ESTABLISHMENT_IDS.BAR_DO_MESTRE, { gridCols: 6, gridRows: 4, positions })).toThrow()
  })

  it('remover todas as mesas é permitido', () => {
    const { tables } = getFloorPlan(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    for (const table of tables) {
      tablesService.delete(ESTABLISHMENT_IDS.BAR_DO_MESTRE, table.id)
    }
    expect(getFloorPlan(ESTABLISHMENT_IDS.BAR_DO_MESTRE).tables).toHaveLength(0)
  })
})

describe('floorPlan — isolamento entre estabelecimentos', () => {
  it('gestor de outro estabelecimento recebe 404', () => {
    // Lucas gerencia os dois (decisão 6, docs/DECISIONS.md) — usa Ana só como gestora do Bar do Zé Cambuí
    useSessionStore.getState().setSession(createSession(USER_IDS.ADMIN, 'PLATFORM_ADMIN'))
    adminUsersService.changeRole(USER_IDS.ANA, { role: 'STAFF', memberships: [{ role: 'MANAGER', establishmentId: ESTABLISHMENT_IDS.BAR_DO_ZE_CAMBUI }] })

    useSessionStore.getState().setSession(createSession(USER_IDS.ANA, 'STAFF', ESTABLISHMENT_IDS.BAR_DO_ZE_CAMBUI))
    expect(() => getFloorPlan(ESTABLISHMENT_IDS.BAR_DO_MESTRE)).toThrowError(expect.objectContaining({ code: 'NOT_FOUND', status: 404 }))
  })
})
