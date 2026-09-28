// Mesas e locais do Bar do Mestre (spec §3 Area/FloorPlan/DiningTable, §8).
//
// ⚠️ O grid padrão (6×3, spec §3 FloorPlan) só cobre as 18 mesas do Salão
// (M01–M18). Para caber a Área externa (M21, M22) e o Balcão (BLC) na mesma
// planta (1 FloorPlan por estabelecimento), usamos grid_rows=4: a 4ª linha
// tem a área externa e o balcão. Decisão registrada em docs/DECISIONS.md.

import type { Area, DiningTable, FloorPlan } from '../types'
import { AREA_IDS, ESTABLISHMENT_IDS, FLOOR_PLAN_IDS } from './ids'

const NOW = new Date().toISOString()
const EST = ESTABLISHMENT_IDS.BAR_DO_MESTRE

export function buildAreas(): Area[] {
  return [
    { id: AREA_IDS.SALAO, establishmentId: EST, name: 'Salão', sortOrder: 0, isActive: true, createdAt: NOW, updatedAt: NOW },
    { id: AREA_IDS.EXTERNA, establishmentId: EST, name: 'Área externa', sortOrder: 1, isActive: true, createdAt: NOW, updatedAt: NOW },
    { id: AREA_IDS.BALCAO, establishmentId: EST, name: 'Balcão', sortOrder: 2, isActive: true, createdAt: NOW, updatedAt: NOW },
  ]
}

export function buildFloorPlans(): FloorPlan[] {
  return [
    {
      id: FLOOR_PLAN_IDS.BAR_DO_MESTRE,
      establishmentId: EST,
      name: 'Planta principal',
      gridCols: 6,
      gridRows: 4,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]
}

// mapa do atendente (spec §8): status inicial das 18 mesas do Salão
const SALAO_STATUS: Record<number, DiningTable['status']> = {
  1: 'AVAILABLE',
  2: 'OCCUPIED',
  3: 'OCCUPIED',
  4: 'RESERVED',
  5: 'AVAILABLE',
  6: 'CALLING',
  7: 'AVAILABLE',
  8: 'OCCUPIED',
  9: 'AVAILABLE',
  10: 'AWAITING_PAYMENT',
  11: 'AVAILABLE',
  12: 'OCCUPIED',
  13: 'UNAVAILABLE',
  14: 'AVAILABLE',
  15: 'OCCUPIED',
  16: 'RESERVED',
  17: 'AVAILABLE',
  18: 'OCCUPIED',
}

const CAPACITY_2 = new Set([3, 5, 9, 12, 14, 16])
const CAPACITY_6 = new Set([8, 15, 18])

function salaoCapacity(n: number): number {
  if (CAPACITY_2.has(n)) return 2
  if (CAPACITY_6.has(n)) return 6
  return 4
}

function qrToken(n: number): string {
  return `QR-${String(n).padStart(4, '0')}`
}

export function buildDiningTables(): DiningTable[] {
  const tables: DiningTable[] = []

  for (let n = 1; n <= 18; n += 1) {
    const index = n - 1 // 0..17, grade 6 cols x 3 rows
    tables.push({
      id: `table-m${String(n).padStart(2, '0')}`,
      establishmentId: EST,
      areaId: AREA_IDS.SALAO,
      floorPlanId: FLOOR_PLAN_IDS.BAR_DO_MESTRE,
      type: 'TABLE',
      code: `M${String(n).padStart(2, '0')}`,
      label: `Mesa ${n}`,
      capacity: salaoCapacity(n),
      shape: 'SQUARE',
      gridX: index % 6,
      gridY: Math.floor(index / 6),
      gridW: 1,
      gridH: 1,
      status: SALAO_STATUS[n],
      qrToken: qrToken(n),
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    })
  }

  tables.push({
    id: 'table-m21',
    establishmentId: EST,
    areaId: AREA_IDS.EXTERNA,
    floorPlanId: FLOOR_PLAN_IDS.BAR_DO_MESTRE,
    type: 'TABLE',
    code: 'M21',
    label: 'Mesa 21',
    capacity: 4,
    shape: 'ROUND',
    gridX: 0,
    gridY: 3,
    gridW: 1,
    gridH: 1,
    status: 'AVAILABLE',
    qrToken: qrToken(21),
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  })

  tables.push({
    id: 'table-m22',
    establishmentId: EST,
    areaId: AREA_IDS.EXTERNA,
    floorPlanId: FLOOR_PLAN_IDS.BAR_DO_MESTRE,
    type: 'TABLE',
    code: 'M22',
    label: 'Mesa 22',
    capacity: 4,
    shape: 'ROUND',
    gridX: 1,
    gridY: 3,
    gridW: 1,
    gridH: 1,
    status: 'AVAILABLE',
    qrToken: qrToken(22),
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  })

  tables.push({
    id: 'table-blc',
    establishmentId: EST,
    areaId: AREA_IDS.BALCAO,
    floorPlanId: FLOOR_PLAN_IDS.BAR_DO_MESTRE,
    type: 'COUNTER',
    code: 'BLC',
    label: 'Balcão',
    capacity: null,
    shape: 'RECTANGLE',
    gridX: 2,
    gridY: 3,
    gridW: 2,
    gridH: 1,
    status: 'AVAILABLE',
    qrToken: 'QR-0023',
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  })

  return tables
}
