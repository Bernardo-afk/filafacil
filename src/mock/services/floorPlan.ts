// Mesas, locais e planta do salão (história 20). Mudar uma mesa pra
// AVAILABLE dispara a notificação da fila (história 21, RF24) — "na mesma
// chamada de função", sem job nem import cruzado com waitlist.ts (ambos só
// leem/gravam as coleções compartilhadas via storage.ts).

import { z } from 'zod'
import { findAll, findById, upsert } from '../storage'
import { apiError } from '../errors'
import { assertEstablishmentAccess, requireSession } from '../guard'
import { useSessionStore } from '../session'
import { audit } from './audit'
import { emit } from '../events'
import { newId, nowISO } from '../../lib/id'
import { randomOpaqueToken } from '../../lib/hash'
import { LocationType, TableShape, TableStatus } from '../types'
import type { Area, DiningTable, Establishment, FloorPlan, Notification, Session, WaitlistEntry } from '../types'

function currentSession(): Session {
  return requireSession(useSessionStore.getState().session)
}

function requireManager(establishmentId: string): { session: Session; establishment: Establishment } {
  const session = currentSession()
  const establishment = assertEstablishmentAccess(session, establishmentId, ['MANAGER'])
  return { session, establishment }
}

// ---------------------------------------------------------------------------
// Áreas
// ---------------------------------------------------------------------------

const areaSchema = z.object({ name: z.string().trim().min(1, 'Nome é obrigatório.').max(60) })
export type AreaInput = z.infer<typeof areaSchema>

export const areasService = {
  list(establishmentId: string): Area[] {
    const { establishment } = requireManager(establishmentId)
    return findAll<Area>('areas')
      .filter((a) => a.establishmentId === establishment.id && a.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  },

  create(establishmentId: string, input: AreaInput): Area {
    const { establishment, session } = requireManager(establishmentId)
    const parsed = areaSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })

    const existing = findAll<Area>('areas').filter((a) => a.establishmentId === establishment.id)
    const now = nowISO()
    const area: Area = { id: newId(), establishmentId: establishment.id, name: parsed.data.name, sortOrder: existing.length, isActive: true, createdAt: now, updatedAt: now }
    upsert('areas', area)
    audit.log({ actorUserId: session.userId, establishmentId, entity: 'Area', entityId: area.id, action: 'CREATED', before: null, after: { name: area.name } })
    return area
  },

  update(establishmentId: string, areaId: string, input: AreaInput): Area {
    const { establishment, session } = requireManager(establishmentId)
    const current = findById<Area>('areas', areaId)
    if (!current || current.establishmentId !== establishment.id) throw apiError('NOT_FOUND', 404)

    const parsed = areaSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })

    const updated: Area = { ...current, name: parsed.data.name, updatedAt: nowISO() }
    upsert('areas', updated)
    audit.log({ actorUserId: session.userId, establishmentId, entity: 'Area', entityId: areaId, action: 'UPDATED', before: { name: current.name }, after: { name: updated.name } })
    return updated
  },

  delete(establishmentId: string, areaId: string): void {
    const { establishment, session } = requireManager(establishmentId)
    const current = findById<Area>('areas', areaId)
    if (!current || current.establishmentId !== establishment.id) throw apiError('NOT_FOUND', 404)

    upsert('areas', { ...current, isActive: false, updatedAt: nowISO() })
    audit.log({ actorUserId: session.userId, establishmentId, entity: 'Area', entityId: areaId, action: 'DELETED', before: { name: current.name }, after: null })
  },
}

// ---------------------------------------------------------------------------
// Mesas e locais
// ---------------------------------------------------------------------------

const tableSchema = z.object({
  code: z.string().trim().min(1, 'Código é obrigatório.').max(10),
  label: z.string().trim().min(1, 'Nome é obrigatório.').max(60),
  areaId: z.string().trim().min(1, 'Área é obrigatória.'),
  type: z.enum(Object.values(LocationType) as [string, ...string[]]).default('TABLE'),
  capacity: z.number().int().min(1).max(30).nullable().optional(),
  shape: z.enum(Object.values(TableShape) as [string, ...string[]]).optional(),
})
export type TableInput = z.input<typeof tableSchema>

function assertCodeAvailable(establishmentId: string, code: string, excludingId?: string): void {
  const taken = findAll<DiningTable>('diningTables').some((t) => t.establishmentId === establishmentId && t.code === code && t.id !== excludingId)
  if (taken) throw apiError('TABLE_CODE_TAKEN', 409)
}

export const tablesService = {
  list(establishmentId: string): DiningTable[] {
    const { establishment } = requireManager(establishmentId)
    return findAll<DiningTable>('diningTables').filter((t) => t.establishmentId === establishment.id)
  },

  create(establishmentId: string, input: TableInput): DiningTable {
    const { establishment, session } = requireManager(establishmentId)
    const parsed = tableSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
    const data = parsed.data

    const area = findById<Area>('areas', data.areaId)
    if (!area || area.establishmentId !== establishment.id) throw apiError('NOT_FOUND', 404, { field: 'areaId' })
    assertCodeAvailable(establishment.id, data.code)

    const floorPlan = getOrCreateFloorPlan(establishment.id)
    const now = nowISO()
    const table: DiningTable = {
      id: newId(),
      establishmentId: establishment.id,
      areaId: data.areaId,
      floorPlanId: floorPlan.id,
      type: (data.type as DiningTable['type']) ?? 'TABLE',
      code: data.code,
      label: data.label,
      capacity: data.capacity ?? null,
      shape: (data.shape as DiningTable['shape']) ?? 'SQUARE',
      // nasce fora da grade visível — só aparece na planta depois de posicionada em putFloorPlan (spec história 20)
      gridX: 0,
      gridY: 0,
      gridW: 1,
      gridH: 1,
      status: 'AVAILABLE',
      qrToken: randomOpaqueToken(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }
    upsert('diningTables', table)
    audit.log({ actorUserId: session.userId, establishmentId, entity: 'DiningTable', entityId: table.id, action: 'CREATED', before: null, after: { code: table.code } })
    return table
  },

  update(establishmentId: string, tableId: string, input: TableInput): DiningTable {
    const { establishment, session } = requireManager(establishmentId)
    const current = findById<DiningTable>('diningTables', tableId)
    if (!current || current.establishmentId !== establishment.id) throw apiError('NOT_FOUND', 404)

    const parsed = tableSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
    const data = parsed.data
    assertCodeAvailable(establishment.id, data.code, tableId)

    const updated: DiningTable = {
      ...current,
      code: data.code,
      label: data.label,
      areaId: data.areaId,
      type: (data.type as DiningTable['type']) ?? current.type,
      capacity: data.capacity ?? null,
      shape: (data.shape as DiningTable['shape']) ?? current.shape,
      updatedAt: nowISO(),
    }
    upsert('diningTables', updated)
    audit.log({ actorUserId: session.userId, establishmentId, entity: 'DiningTable', entityId: tableId, action: 'UPDATED', before: { code: current.code }, after: { code: updated.code } })
    return updated
  },

  /** Desativada some do mapa e não recebe fila (spec história 20). */
  delete(establishmentId: string, tableId: string): void {
    const { establishment, session } = requireManager(establishmentId)
    const current = findById<DiningTable>('diningTables', tableId)
    if (!current || current.establishmentId !== establishment.id) throw apiError('NOT_FOUND', 404)

    upsert('diningTables', { ...current, isActive: false, updatedAt: nowISO() })
    audit.log({ actorUserId: session.userId, establishmentId, entity: 'DiningTable', entityId: tableId, action: 'DELETED', before: { code: current.code }, after: null })
  },

  /** PATCH /tables/:tableId/status — Liberar/Ocupar/Bloquear (e o resto do enum, pro mapa do atendente). */
  setStatus(establishmentId: string, tableId: string, status: string): DiningTable {
    const { establishment, session } = requireManager(establishmentId)
    const current = findById<DiningTable>('diningTables', tableId)
    if (!current || current.establishmentId !== establishment.id) throw apiError('NOT_FOUND', 404)

    const values = Object.values(TableStatus) as string[]
    if (!values.includes(status)) throw apiError('VALIDATION_ERROR', 400, { field: 'status' })

    const updated: DiningTable = { ...current, status: status as DiningTable['status'], updatedAt: nowISO() }
    upsert('diningTables', updated)
    audit.log({ actorUserId: session.userId, establishmentId, entity: 'DiningTable', entityId: tableId, action: 'STATUS_CHANGED', before: { status: current.status }, after: { status } })

    if (status === 'AVAILABLE') notifyNextForFreedTable(establishment, updated)
    return updated
  },
}

// ---------------------------------------------------------------------------
// Planta (grade + posições)
// ---------------------------------------------------------------------------

function getOrCreateFloorPlan(establishmentId: string): FloorPlan {
  const existing = findAll<FloorPlan>('floorPlans').find((f) => f.establishmentId === establishmentId)
  if (existing) return existing
  const now = nowISO()
  const floorPlan: FloorPlan = { id: newId(), establishmentId, name: 'Planta principal', gridCols: 6, gridRows: 3, createdAt: now, updatedAt: now }
  upsert('floorPlans', floorPlan)
  return floorPlan
}

export interface FloorPlanView {
  floorPlan: FloorPlan
  tables: DiningTable[]
}

export function getFloorPlan(establishmentId: string): FloorPlanView {
  requireManager(establishmentId)
  return {
    floorPlan: getOrCreateFloorPlan(establishmentId),
    tables: findAll<DiningTable>('diningTables').filter((t) => t.establishmentId === establishmentId && t.isActive),
  }
}

const positionSchema = z.object({
  tableId: z.string().trim().min(1),
  gridX: z.number().int().min(0),
  gridY: z.number().int().min(0),
  gridW: z.number().int().min(1),
  gridH: z.number().int().min(1),
})
const putFloorPlanSchema = z.object({
  gridCols: z.number().int().min(1),
  gridRows: z.number().int().min(1),
  positions: z.array(positionSchema),
})
export type PutFloorPlanInput = z.infer<typeof putFloorPlanSchema>

function cellsOf(pos: { gridX: number; gridY: number; gridW: number; gridH: number }): string[] {
  const cells: string[] = []
  for (let x = pos.gridX; x < pos.gridX + pos.gridW; x += 1) {
    for (let y = pos.gridY; y < pos.gridY + pos.gridH; y += 1) {
      cells.push(`${x},${y}`)
    }
  }
  return cells
}

/** PUT /floor-plan — grade + posições em uma transação: sem sobreposição, dentro dos limites, qr_token nunca muda (spec história 20). */
export function putFloorPlan(establishmentId: string, input: PutFloorPlanInput): FloorPlanView {
  const { session } = requireManager(establishmentId)
  const parsed = putFloorPlanSchema.safeParse(input)
  if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
  const data = parsed.data

  const activeTables = findAll<DiningTable>('diningTables').filter((t) => t.establishmentId === establishmentId && t.isActive)
  const byId = new Map(activeTables.map((t) => [t.id, t]))

  for (const pos of data.positions) {
    if (!byId.has(pos.tableId)) throw apiError('NOT_FOUND', 404, { field: 'tableId' })
    if (pos.gridX + pos.gridW > data.gridCols || pos.gridY + pos.gridH > data.gridRows) {
      throw apiError('VALIDATION_ERROR', 400, { code: 'OUT_OF_BOUNDS', tableId: pos.tableId })
    }
  }

  // mesas fora da lista mantêm a posição atual — a checagem de sobreposição olha pro layout inteiro
  const positionsById = new Map(data.positions.map((p) => [p.tableId, p]))
  const occupied = new Map<string, string>()
  for (const table of activeTables) {
    const pos = positionsById.get(table.id) ?? table
    for (const cell of cellsOf(pos)) {
      const holder = occupied.get(cell)
      if (holder && holder !== table.id) throw apiError('TABLE_OVERLAP', 422, { cell })
      occupied.set(cell, table.id)
    }
  }

  const now = nowISO()
  const floorPlan: FloorPlan = { ...getOrCreateFloorPlan(establishmentId), gridCols: data.gridCols, gridRows: data.gridRows, updatedAt: now }
  upsert('floorPlans', floorPlan)

  for (const pos of data.positions) {
    const table = byId.get(pos.tableId)!
    // qr_token nunca é regenerado ao salvar a planta de novo (spec história 20)
    upsert('diningTables', { ...table, gridX: pos.gridX, gridY: pos.gridY, gridW: pos.gridW, gridH: pos.gridH, updatedAt: now })
  }

  audit.log({ actorUserId: session.userId, establishmentId, entity: 'FloorPlan', entityId: floorPlan.id, action: 'UPDATED', before: null, after: { gridCols: data.gridCols, gridRows: data.gridRows } })

  return { floorPlan, tables: findAll<DiningTable>('diningTables').filter((t) => t.establishmentId === establishmentId && t.isActive) }
}

// ---------------------------------------------------------------------------
// Notificação automática da fila (spec história 21, RF24) — mesma chamada
// de função que libera a mesa, sem job.
// ---------------------------------------------------------------------------

function notifyNextForFreedTable(establishment: Establishment, freedTable: DiningTable): void {
  if (freedTable.type !== 'TABLE') return

  const waiting = findAll<WaitlistEntry>('waitlistEntries')
    .filter((e) => e.establishmentId === establishment.id && e.status === 'WAITING')
    .sort((a, b) => a.position - b.position)

  const next = waiting.find((e) => e.partySize <= (freedTable.capacity ?? 0))
  if (!next) return

  const now = nowISO()
  const updatedEntry: WaitlistEntry = { ...next, status: 'NOTIFIED', notifiedAt: now, notifiedTableId: freedTable.id, updatedAt: now }
  upsert('waitlistEntries', updatedEntry)

  if (next.userId) {
    const notification: Notification = {
      id: newId(),
      userId: next.userId,
      establishmentId: establishment.id,
      channel: 'IN_APP',
      type: 'WAITLIST_TABLE_READY',
      title: 'Sua mesa está pronta!',
      body: `Dirija-se à recepção — mesa ${freedTable.label}.`,
      payload: { entryId: next.id, tableId: freedTable.id },
      readAt: null,
      createdAt: now,
      updatedAt: now,
    }
    upsert('notifications', notification)
  }

  emit('waitlist.notified', { entryId: next.id, tableId: freedTable.id, tableLabel: freedTable.label })
}
