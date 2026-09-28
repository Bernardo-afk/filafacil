// Leitura pública de estabelecimentos (spec história 34, regra "SUSPENDED e
// DEACTIVATED somem de GET /establishments"; usado pelas histórias 11 e 12).
// SETUP também não é público — só aparece pro admin/gestor.

import { findAll, findById } from '../storage'
import { apiError } from '../errors'
import { isOpenNow, formatTodayHours } from '../../lib/hours'
import { distanceMeters as haversineMeters } from '../../lib/geo'
import type { Establishment, EstablishmentHours, EstablishmentPhoto, EstablishmentSpecialHours, OperationalStatus } from '../types'

export function isEstablishmentPublic(establishment: Establishment): boolean {
  return establishment.status === 'ACTIVE'
}

/**
 * Status derivado (spec história 12, §3): PAUSED → CLOSED → BUSY → OPEN, nessa
 * ordem de prioridade. Pausa com prazo termina sozinha — só compara
 * `ordersPausedUntil` com agora, sem job (spec: "sem job").
 */
export function deriveOperationalStatus(
  establishment: Establishment,
  hours: EstablishmentHours[],
  specialHours: EstablishmentSpecialHours[],
  now: Date = new Date(),
): { status: OperationalStatus; pausedUntil: string | null } {
  const isPaused =
    establishment.ordersPausedAt != null &&
    (!establishment.ordersPausedUntil || new Date(establishment.ordersPausedUntil).getTime() > now.getTime())
  if (isPaused) return { status: 'PAUSED', pausedUntil: establishment.ordersPausedUntil }

  if (!isOpenNow(hours, specialHours, 'ORDERS', establishment.timezone, now)) {
    return { status: 'CLOSED', pausedUntil: null }
  }
  if (establishment.highDemand) return { status: 'BUSY', pausedUntil: null }
  return { status: 'OPEN', pausedUntil: null }
}

function formatAddress(establishment: Establishment): string {
  return `${establishment.street}, ${establishment.number} · ${establishment.neighborhood}`
}

export interface RestaurantDetailView {
  id: string
  name: string
  shortName: string
  unitLabel: string | null
  category: Establishment['category']
  tags: string[]
  ratingAvg: number
  ratingCount: number
  distanceMeters: number | null
  waitTime: { minMinutes: number | null; maxMinutes: number | null }
  operationalStatus: OperationalStatus
  pausedUntil: string | null
  pauseReason: string | null
  address: string
  todayHours: string
  photos: string[]
  timezone: string
  lat: number | null
  lng: number | null
}

export const establishmentsService = {
  /** GET /establishments — só os ACTIVE (relido a cada chamada, sem cache). */
  listPublic(): Establishment[] {
    return findAll<Establishment>('establishments').filter(isEstablishmentPublic)
  },

  /** GET /establishments/:id — 404 pra SETUP/SUSPENDED/DEACTIVATED, não só pra inexistente. */
  getPublic(id: string): Establishment {
    const establishment = findById<Establishment>('establishments', id)
    if (!establishment || !isEstablishmentPublic(establishment)) throw apiError('NOT_FOUND', 404)
    return establishment
  },

  /** GET /establishments/:id?lat=&lng= (spec história 12). */
  getRestaurantDetail(id: string, opts: { lat?: number; lng?: number } = {}): RestaurantDetailView {
    const establishment = establishmentsService.getPublic(id)
    const hours = findAll<EstablishmentHours>('establishmentHours').filter((h) => h.establishmentId === id)
    const specialHours = findAll<EstablishmentSpecialHours>('establishmentSpecialHours').filter((h) => h.establishmentId === id)
    const photos = findAll<EstablishmentPhoto>('establishmentPhotos')
      .filter((p) => p.establishmentId === id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => p.url)

    const { status, pausedUntil } = deriveOperationalStatus(establishment, hours, specialHours)
    const distance =
      opts.lat != null && opts.lng != null && establishment.lat != null && establishment.lng != null
        ? haversineMeters(opts.lat, opts.lng, establishment.lat, establishment.lng)
        : null

    return {
      id: establishment.id,
      name: establishment.name,
      shortName: establishment.shortName,
      unitLabel: establishment.unitLabel,
      category: establishment.category,
      tags: establishment.tags,
      ratingAvg: establishment.ratingAvg,
      ratingCount: establishment.ratingCount,
      distanceMeters: distance,
      waitTime: { minMinutes: establishment.waitMinMinutes, maxMinutes: establishment.waitMaxMinutes },
      operationalStatus: status,
      pausedUntil,
      pauseReason: establishment.ordersPauseReason,
      address: formatAddress(establishment),
      todayHours: formatTodayHours(hours, specialHours, 'BUSINESS', establishment.timezone),
      photos,
      timezone: establishment.timezone,
      lat: establishment.lat,
      lng: establishment.lng,
    }
  },
}
