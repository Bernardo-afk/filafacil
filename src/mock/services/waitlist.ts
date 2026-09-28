// Fila de espera (história 21). Notificação automática ao liberar mesa mora
// em floorPlan.ts (RF24, mesma chamada de função que muda o status pra
// AVAILABLE) — aqui ficam as ações manuais do gestor e a API do cliente
// (preparada agora, UI na Sprint 3).

import { z } from 'zod'
import { findAll, findById, upsert } from '../storage'
import { apiError } from '../errors'
import { assertEstablishmentAccess, requireSession } from '../guard'
import { useSessionStore } from '../session'
import { entitlements } from '../entitlements'
import { audit } from './audit'
import { toE164, isValidBrazilianMobile } from '../../lib/phone'
import { newId, nowISO } from '../../lib/id'
import type { DiningTable, Establishment, Session, WaitlistEntry } from '../types'

function currentSession(): Session {
  return requireSession(useSessionStore.getState().session)
}

function requireManagerWithFeature(establishmentId: string): { session: Session; establishment: Establishment } {
  const session = currentSession()
  const establishment = assertEstablishmentAccess(session, establishmentId, ['MANAGER'])
  entitlements.assertFeature(establishmentId, 'WAITLIST')
  return { session, establishment }
}

/** "Fila ativa" pra exibição do gestor: WAITING e NOTIFIED continuam visíveis (só SEATED/NO_SHOW/CANCELED somem). */
function activeEntries(establishmentId: string): WaitlistEntry[] {
  return findAll<WaitlistEntry>('waitlistEntries')
    .filter((e) => e.establishmentId === establishmentId && (e.status === 'WAITING' || e.status === 'NOTIFIED'))
    .sort((a, b) => a.position - b.position)
}

function waitingEntries(establishmentId: string): WaitlistEntry[] {
  return findAll<WaitlistEntry>('waitlistEntries')
    .filter((e) => e.establishmentId === establishmentId && e.status === 'WAITING')
    .sort((a, b) => a.position - b.position)
}

function compatibleTables(establishmentId: string, partySize: number): DiningTable[] {
  return findAll<DiningTable>('diningTables').filter(
    (t) => t.establishmentId === establishmentId && t.isActive && t.type === 'TABLE' && (t.capacity ?? 0) >= partySize,
  )
}

/**
 * Estimativa v1 (spec história 21, heurística documentada). `index` é a
 * posição 0-based da entrada entre as `WAITING`.
 */
export function estimateWaitMinutes(establishmentId: string, partySize: number, index: number, avgTurnoverMin: number): number | null {
  const compatible = compatibleTables(establishmentId, partySize)
  if (compatible.length === 0) return null

  const free = compatible.filter((t) => t.status === 'AVAILABLE').length
  const missing = Math.max(0, index + 1 - free)
  if (missing === 0) return 0
  return Math.ceil(missing / Math.max(1, compatible.length)) * avgTurnoverMin
}

export interface WaitlistEntryView {
  entry: WaitlistEntry
  waitingMinutes: number
  estimatedWaitMinutes: number | null
  noCompatibleTable: boolean
}

function toView(establishmentId: string, entry: WaitlistEntry, index: number | null, avgTurnoverMin: number): WaitlistEntryView {
  // NOTIFIED já tem mesa se resolvendo — não entra na heurística de quem ainda está esperando
  const estimatedWaitMinutes = index === null ? 0 : estimateWaitMinutes(establishmentId, entry.partySize, index, avgTurnoverMin)
  return {
    entry,
    waitingMinutes: Math.floor((Date.now() - new Date(entry.createdAt).getTime()) / 60_000),
    estimatedWaitMinutes,
    noCompatibleTable: estimatedWaitMinutes === null,
  }
}

export interface WaitlistSummary {
  totalWaiting: number
  estimatedWaitMinutes: number | null
}

const joinSchema = z.object({
  customerName: z.string().trim().min(1, 'Nome é obrigatório.').max(120),
  phoneE164: z.string().trim().optional(),
  partySize: z.number().int().min(1).max(30),
  userId: z.string().trim().optional(),
})
export type JoinWaitlistInput = z.infer<typeof joinSchema>

export const managerWaitlistService = {
  list(establishmentId: string): WaitlistEntryView[] {
    const { establishment } = requireManagerWithFeature(establishmentId)
    const waiting = waitingEntries(establishmentId)
    return activeEntries(establishmentId).map((entry) => {
      const index = entry.status === 'WAITING' ? waiting.findIndex((e) => e.id === entry.id) : null
      return toView(establishmentId, entry, index, establishment.avgTableTurnoverMin)
    })
  },

  summary(establishmentId: string): WaitlistSummary {
    const views = managerWaitlistService.list(establishmentId)
    const etas = views.map((v) => v.estimatedWaitMinutes).filter((v): v is number => v != null)
    return { totalWaiting: views.length, estimatedWaitMinutes: etas.length > 0 ? Math.max(...etas) : null }
  },

  add(establishmentId: string, input: JoinWaitlistInput): WaitlistEntry {
    const { session } = requireManagerWithFeature(establishmentId)
    return createEntry(establishmentId, input, session.userId)
  },

  /** "Chamar" — NOTIFIED manualmente (a automática mora em floorPlan.ts). */
  notify(establishmentId: string, entryId: string): WaitlistEntry {
    const { session } = requireManagerWithFeature(establishmentId)
    const entry = getOwnedEntry(establishmentId, entryId)
    const now = nowISO()
    const updated: WaitlistEntry = { ...entry, status: 'NOTIFIED', notifiedAt: now, updatedAt: now }
    upsert('waitlistEntries', updated)
    audit.log({ actorUserId: session.userId, establishmentId, entity: 'WaitlistEntry', entityId: entryId, action: 'NOTIFIED', before: { status: entry.status }, after: { status: 'NOTIFIED' } })
    return updated
  },

  /** "Atribuir mesa": mesa precisa estar AVAILABLE e comportar o grupo (422 TABLE_TOO_SMALL). */
  assignTable(establishmentId: string, entryId: string, tableId: string): WaitlistEntry {
    const { session } = requireManagerWithFeature(establishmentId)
    const entry = getOwnedEntry(establishmentId, entryId)

    const table = findById<DiningTable>('diningTables', tableId)
    if (!table || table.establishmentId !== establishmentId || !table.isActive) throw apiError('NOT_FOUND', 404)
    if ((table.capacity ?? 0) < entry.partySize) throw apiError('TABLE_TOO_SMALL', 422)
    if (table.status !== 'AVAILABLE') throw apiError('VALIDATION_ERROR', 400, { field: 'tableId', reason: 'not available' })

    const now = nowISO()
    upsert('diningTables', { ...table, status: 'OCCUPIED', updatedAt: now })
    const updated: WaitlistEntry = { ...entry, status: 'SEATED', seatedAt: now, seatedTableId: tableId, updatedAt: now }
    upsert('waitlistEntries', updated)

    audit.log({ actorUserId: session.userId, establishmentId, entity: 'WaitlistEntry', entityId: entryId, action: 'SEATED', before: { status: entry.status }, after: { tableId } })
    return updated
  },

  noShow(establishmentId: string, entryId: string): WaitlistEntry {
    const { session } = requireManagerWithFeature(establishmentId)
    const entry = getOwnedEntry(establishmentId, entryId)
    const updated: WaitlistEntry = { ...entry, status: 'NO_SHOW', updatedAt: nowISO() }
    upsert('waitlistEntries', updated)
    audit.log({ actorUserId: session.userId, establishmentId, entity: 'WaitlistEntry', entityId: entryId, action: 'NO_SHOW', before: { status: entry.status }, after: { status: 'NO_SHOW' } })
    return updated
  },

  remove(establishmentId: string, entryId: string): WaitlistEntry {
    const { session } = requireManagerWithFeature(establishmentId)
    const entry = getOwnedEntry(establishmentId, entryId)
    const updated: WaitlistEntry = { ...entry, status: 'CANCELED', canceledAt: nowISO(), updatedAt: nowISO() }
    upsert('waitlistEntries', updated)
    audit.log({ actorUserId: session.userId, establishmentId, entity: 'WaitlistEntry', entityId: entryId, action: 'CANCELED', before: { status: entry.status }, after: { status: 'CANCELED' } })
    return updated
  },

  /** `PATCH .../:entryId { position }` — API mantida pra reordenar manualmente; a UI fica pra depois (spec história 21). */
  reorder(establishmentId: string, entryId: string, position: number): WaitlistEntry {
    const { session } = requireManagerWithFeature(establishmentId)
    const entry = getOwnedEntry(establishmentId, entryId)
    const updated: WaitlistEntry = { ...entry, position, updatedAt: nowISO() }
    upsert('waitlistEntries', updated)
    audit.log({ actorUserId: session.userId, establishmentId, entity: 'WaitlistEntry', entityId: entryId, action: 'REORDERED', before: { position: entry.position }, after: { position } })
    return updated
  },
}

function getOwnedEntry(establishmentId: string, entryId: string): WaitlistEntry {
  const entry = findById<WaitlistEntry>('waitlistEntries', entryId)
  if (!entry || entry.establishmentId !== establishmentId) throw apiError('NOT_FOUND', 404)
  return entry
}

function createEntry(establishmentId: string, input: JoinWaitlistInput, userId?: string): WaitlistEntry {
  const parsed = joinSchema.safeParse(input)
  if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
  const data = parsed.data

  let phoneE164 = ''
  if (data.phoneE164) {
    phoneE164 = toE164(data.phoneE164)
    if (!isValidBrazilianMobile(phoneE164)) throw apiError('VALIDATION_ERROR', 400, { field: 'phoneE164' })
  }

  const currentMax = findAll<WaitlistEntry>('waitlistEntries')
    .filter((e) => e.establishmentId === establishmentId && e.status === 'WAITING')
    .reduce((max, e) => Math.max(max, e.position), 0)

  const now = nowISO()
  const entry: WaitlistEntry = {
    id: newId(),
    establishmentId,
    userId: userId ?? data.userId ?? null,
    customerName: data.customerName,
    phoneE164,
    partySize: data.partySize,
    status: 'WAITING',
    position: currentMax + 1,
    estimatedWaitMinutes: null,
    notifiedAt: null,
    seatedAt: null,
    canceledAt: null,
    notifiedTableId: null,
    seatedTableId: null,
    createdAt: now,
    updatedAt: now,
  }
  upsert('waitlistEntries', entry)
  return entry
}

// ---------------------------------------------------------------------------
// API do cliente (preparada agora, UI na Sprint 3 — spec história 21)
// ---------------------------------------------------------------------------

export const customerWaitlistService = {
  join(establishmentId: string, input: JoinWaitlistInput): WaitlistEntry {
    entitlements.assertFeature(establishmentId, 'WAITLIST')
    return createEntry(establishmentId, input)
  },

  getMine(userId: string): WaitlistEntry[] {
    return findAll<WaitlistEntry>('waitlistEntries').filter((e) => e.userId === userId && e.status === 'WAITING')
  },

  leave(userId: string, entryId: string): void {
    const entry = findById<WaitlistEntry>('waitlistEntries', entryId)
    if (!entry || entry.userId !== userId) throw apiError('NOT_FOUND', 404)
    upsert('waitlistEntries', { ...entry, status: 'CANCELED', canceledAt: nowISO(), updatedAt: nowISO() })
  },
}
