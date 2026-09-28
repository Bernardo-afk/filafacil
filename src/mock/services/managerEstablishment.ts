// Gestor · Estabelecimento e Horários (história 12). Só quem tem `Membership`
// (direto ou por organização) com o estabelecimento edita — `assertEstablishmentAccess`
// devolve 404, não 403, pra quem não tem vínculo (spec §6, "isolamento por
// estabelecimento").

import { z } from 'zod'
import { findAll, findById, upsert, removeById } from '../storage'
import { apiError } from '../errors'
import { assertEstablishmentAccess, requireSession } from '../guard'
import { useSessionStore } from '../session'
import { audit } from './audit'
import { newId, nowISO } from '../../lib/id'
import { EstablishmentCategory } from '../types'
import type { Establishment, EstablishmentHours, EstablishmentPhoto, EstablishmentSpecialHours, HoursKind } from '../types'

const CATEGORY_VALUES = Object.values(EstablishmentCategory) as [string, ...string[]]
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function currentSession() {
  return requireSession(useSessionStore.getState().session)
}

function requireManagerAccess(establishmentId: string): { userId: string; establishment: Establishment } {
  const session = currentSession()
  const establishment = assertEstablishmentAccess(session, establishmentId, ['MANAGER'])
  return { userId: session.userId, establishment }
}

export interface ManagerEstablishmentView {
  establishment: Establishment
  hours: EstablishmentHours[]
  specialHours: EstablishmentSpecialHours[]
  photos: EstablishmentPhoto[]
}

const infoSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(120),
  shortName: z.string().trim().min(1, 'Nome curto é obrigatório.').max(60),
  category: z.enum(CATEGORY_VALUES),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().toLowerCase().email('E-mail inválido.').optional().or(z.literal('')),
  description: z.string().trim().max(2000).optional(),
  street: z.string().trim().min(1, 'Rua é obrigatória.').max(160),
  number: z.string().trim().min(1, 'Número é obrigatório.').max(20),
  complement: z.string().trim().max(120).optional(),
  neighborhood: z.string().trim().min(1, 'Bairro é obrigatório.').max(80),
  city: z.string().trim().min(1, 'Cidade é obrigatória.').max(80),
  state: z.string().trim().length(2, 'UF precisa ter 2 letras.'),
  zip: z.string().trim(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
})
export type ManagerEstablishmentInfoInput = z.input<typeof infoSchema>

const dayWindowSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    isClosed: z.boolean(),
    opensAt: z.string().regex(TIME_RE).nullable(),
    closesAt: z.string().regex(TIME_RE).nullable(),
  })
  .refine((d) => d.isClosed || (d.opensAt && d.closesAt), { message: 'Informe abertura e fechamento, ou marque "Fechar neste dia".' })

const hoursInputSchema = z.object({
  business: z.array(dayWindowSchema).length(7),
  orders: z.array(dayWindowSchema).length(7),
})
export type ManagerHoursInput = z.input<typeof hoursInputSchema>

const specialHoursSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
    kind: z.enum(['BUSINESS', 'ORDERS']),
    isClosed: z.boolean(),
    opensAt: z.string().regex(TIME_RE).nullable().optional(),
    closesAt: z.string().regex(TIME_RE).nullable().optional(),
  })
  .refine((d) => d.isClosed || (d.opensAt && d.closesAt), { message: 'Informe abertura e fechamento, ou marque "Fechado".' })
export type SpecialHoursInput = z.input<typeof specialHoursSchema>

const PAUSE_REASONS = ['Cozinha sobrecarregada', 'Falta de equipe', 'Problema operacional', 'Encerramento antecipado'] as const
const pauseSchema = z.object({
  durationMinutes: z.number().int().positive().nullable(), // null = "até eu reativar"
  reason: z.string().trim().max(120).optional(),
})
export type PauseOrdersInput = z.input<typeof pauseSchema>

export const managerEstablishmentService = {
  get(establishmentId: string): ManagerEstablishmentView {
    const { establishment } = requireManagerAccess(establishmentId)
    return {
      establishment,
      hours: findAll<EstablishmentHours>('establishmentHours').filter((h) => h.establishmentId === establishmentId),
      specialHours: findAll<EstablishmentSpecialHours>('establishmentSpecialHours').filter((h) => h.establishmentId === establishmentId),
      photos: findAll<EstablishmentPhoto>('establishmentPhotos')
        .filter((p) => p.establishmentId === establishmentId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }
  },

  /** PATCH /establishments/:id — só os campos cadastrais (spec história 12, tela "Estabelecimento"). */
  updateInfo(establishmentId: string, input: ManagerEstablishmentInfoInput): Establishment {
    const { userId, establishment } = requireManagerAccess(establishmentId)
    const parsed = infoSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
    const data = parsed.data

    const updated: Establishment = {
      ...establishment,
      name: data.name,
      shortName: data.shortName,
      category: data.category as Establishment['category'],
      phone: data.phone || null,
      email: data.email || null,
      description: data.description ?? establishment.description,
      street: data.street,
      number: data.number,
      complement: data.complement || null,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state.toUpperCase(),
      zip: data.zip.replace(/\D/g, ''),
      lat: data.lat ?? establishment.lat,
      lng: data.lng ?? establishment.lng,
      updatedAt: nowISO(),
    }
    upsert('establishments', updated)

    audit.log({
      actorUserId: userId,
      establishmentId,
      entity: 'Establishment',
      entityId: establishmentId,
      action: 'UPDATED',
      before: { name: establishment.name },
      after: { name: updated.name },
    })

    return updated
  },

  /** PUT /establishments/:id/hours — substitui a semana inteira dos dois horários (spec história 12, "Horários"). */
  updateHours(establishmentId: string, input: ManagerHoursInput): EstablishmentHours[] {
    const { userId } = requireManagerAccess(establishmentId)
    const parsed = hoursInputSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
    const data = parsed.data

    for (const existing of findAll<EstablishmentHours>('establishmentHours').filter((h) => h.establishmentId === establishmentId)) {
      removeById('establishmentHours', existing.id)
    }

    const now = nowISO()
    const rows: EstablishmentHours[] = []
    function buildRows(kind: HoursKind, days: typeof data.business): void {
      for (const day of days) {
        const row: EstablishmentHours = {
          id: newId(),
          establishmentId,
          kind,
          weekday: day.weekday,
          opensAt: day.isClosed ? null : day.opensAt,
          closesAt: day.isClosed ? null : day.closesAt,
          isClosed: day.isClosed,
          createdAt: now,
          updatedAt: now,
        }
        upsert('establishmentHours', row)
        rows.push(row)
      }
    }
    buildRows('BUSINESS', data.business)
    buildRows('ORDERS', data.orders)

    audit.log({
      actorUserId: userId,
      establishmentId,
      entity: 'Establishment',
      entityId: establishmentId,
      action: 'HOURS_UPDATED',
      before: null,
      after: null,
    })

    return rows
  },

  /** PUT /establishments/:id/special-hours — 1 data + tipo por vez; sobrescreve se já existir (spec história 12). */
  upsertSpecialHours(establishmentId: string, input: SpecialHoursInput): EstablishmentSpecialHours {
    const { userId } = requireManagerAccess(establishmentId)
    const parsed = specialHoursSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
    const data = parsed.data

    const current = findAll<EstablishmentSpecialHours>('establishmentSpecialHours').find(
      (h) => h.establishmentId === establishmentId && h.date === data.date && h.kind === data.kind,
    )
    const now = nowISO()
    const row: EstablishmentSpecialHours = {
      id: current?.id ?? newId(),
      establishmentId,
      kind: data.kind,
      date: data.date,
      isClosed: data.isClosed,
      opensAt: data.isClosed ? null : (data.opensAt ?? null),
      closesAt: data.isClosed ? null : (data.closesAt ?? null),
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    }
    upsert('establishmentSpecialHours', row)

    audit.log({
      actorUserId: userId,
      establishmentId,
      entity: 'Establishment',
      entityId: establishmentId,
      action: 'SPECIAL_HOURS_UPDATED',
      before: null,
      after: { date: data.date, kind: data.kind, isClosed: data.isClosed },
    })

    return row
  },

  removeSpecialHours(establishmentId: string, specialHoursId: string): void {
    const { userId } = requireManagerAccess(establishmentId)
    const row = findById<EstablishmentSpecialHours>('establishmentSpecialHours', specialHoursId)
    if (!row || row.establishmentId !== establishmentId) throw apiError('NOT_FOUND', 404)
    removeById('establishmentSpecialHours', specialHoursId)

    audit.log({
      actorUserId: userId,
      establishmentId,
      entity: 'Establishment',
      entityId: establishmentId,
      action: 'SPECIAL_HOURS_REMOVED',
      before: { date: row.date, kind: row.kind },
      after: null,
    })
  },

  /** PUT /establishments/:id/orders-pause (spec história 12: "a API e o status entram agora"). */
  pauseOrders(establishmentId: string, input: PauseOrdersInput): Establishment {
    const { userId, establishment } = requireManagerAccess(establishmentId)
    const parsed = pauseSchema.safeParse(input)
    if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })
    const data = parsed.data

    const now = nowISO()
    const updated: Establishment = {
      ...establishment,
      ordersPausedAt: now,
      ordersPausedUntil: data.durationMinutes ? new Date(Date.now() + data.durationMinutes * 60_000).toISOString() : null,
      ordersPauseReason: data.reason || null,
      updatedAt: now,
    }
    upsert('establishments', updated)

    audit.log({
      actorUserId: userId,
      establishmentId,
      entity: 'Establishment',
      entityId: establishmentId,
      action: 'ORDERS_PAUSED',
      before: null,
      after: { durationMinutes: data.durationMinutes, reason: data.reason ?? null },
    })

    return updated
  },

  /** DELETE /establishments/:id/orders-pause — "até eu reativar" só termina assim (spec história 12). */
  resumeOrders(establishmentId: string): Establishment {
    const { userId, establishment } = requireManagerAccess(establishmentId)
    const updated: Establishment = {
      ...establishment,
      ordersPausedAt: null,
      ordersPausedUntil: null,
      ordersPauseReason: null,
      updatedAt: nowISO(),
    }
    upsert('establishments', updated)

    audit.log({
      actorUserId: userId,
      establishmentId,
      entity: 'Establishment',
      entityId: establishmentId,
      action: 'ORDERS_RESUMED',
      before: null,
      after: null,
    })

    return updated
  },
}

export const PAUSE_REASON_OPTIONS = PAUSE_REASONS
