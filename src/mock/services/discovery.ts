// Busca de restaurantes próximos (história 11). GET /establishments com
// filtros/ordenação — não exige sessão (busca de convidado, spec história 11:
// "nunca bloquear o app por falta de permissão").

import { findAll } from '../storage'
import { isEstablishmentPublic, deriveOperationalStatus } from './establishments'
import { isOpenNow } from '../../lib/hours'
import { distanceMeters as haversineMeters } from '../../lib/geo'
import { matchesSearch } from '../../lib/text'
import { CATEGORY_LABELS } from '../../lib/establishmentCategory'
import type { Establishment, EstablishmentCategory, EstablishmentHours, EstablishmentSpecialHours, MenuItem, OperationalStatus } from '../types'

/** Campinas-SP, centro fixo (spec história 11: "sem permissão, usar a cidade escolhida, default Campinas-SP"). */
export const DEFAULT_CITY_CENTER = { lat: -22.9056, lng: -47.0608 }

const DEFAULT_RADIUS_METERS = 10_000
const MAX_RADIUS_METERS = 50_000
const DEFAULT_PAGE_SIZE = 20

export type SortOption = 'recommended' | 'distance' | 'wait' | 'rating'

export interface SearchEstablishmentsParams {
  lat?: number
  lng?: number
  radiusMeters?: number
  q?: string
  openNow?: boolean
  acceptingOrders?: boolean
  maxWaitMinutes?: number
  category?: EstablishmentCategory
  sort?: SortOption
  page?: number
  pageSize?: number
}

export interface SearchResultItem {
  id: string
  name: string
  unitLabel: string | null
  category: EstablishmentCategory
  categoryLabel: string
  coverPhotoUrl: string | null
  distanceMeters: number | null
  ratingAvg: number
  ratingCount: number
  waitTime: { minMinutes: number | null; maxMinutes: number | null }
  operationalStatus: OperationalStatus
  isOpenNow: boolean
  tags: string[]
}

export interface SearchEstablishmentsResult {
  items: SearchResultItem[]
  total: number
  page: number
  pageSize: number
}

function matchesMenu(establishmentId: string, q: string): boolean {
  return findAll<MenuItem>('menuItems').some(
    (item) => item.establishmentId === establishmentId && item.isActive && !item.deletedAt && matchesSearch(item.name, q),
  )
}

function matchesQuery(establishment: Establishment, q: string): boolean {
  if (!q.trim()) return true
  return (
    matchesSearch(establishment.name, q) ||
    matchesSearch(CATEGORY_LABELS[establishment.category], q) ||
    matchesSearch(establishment.neighborhood, q) ||
    establishment.tags.some((tag) => matchesSearch(tag, q)) ||
    matchesMenu(establishment.id, q)
  )
}

export function searchEstablishments(params: SearchEstablishmentsParams = {}): SearchEstablishmentsResult {
  const lat = params.lat ?? DEFAULT_CITY_CENTER.lat
  const lng = params.lng ?? DEFAULT_CITY_CENTER.lng
  const radiusMeters = Math.min(params.radiusMeters ?? DEFAULT_RADIUS_METERS, MAX_RADIUS_METERS)
  const page = Math.max(1, params.page ?? 1)
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE

  const allHours = findAll<EstablishmentHours>('establishmentHours')
  const allSpecialHours = findAll<EstablishmentSpecialHours>('establishmentSpecialHours')

  const candidates = findAll<Establishment>('establishments').filter(
    (e) => isEstablishmentPublic(e) && e.lat != null && e.lng != null,
  )

  const items: SearchResultItem[] = []
  for (const establishment of candidates) {
    const distance = haversineMeters(lat, lng, establishment.lat!, establishment.lng!)
    if (distance > radiusMeters) continue
    if (params.category && establishment.category !== params.category) continue
    if (params.q && !matchesQuery(establishment, params.q)) continue

    const hours = allHours.filter((h) => h.establishmentId === establishment.id)
    const specialHours = allSpecialHours.filter((h) => h.establishmentId === establishment.id)

    // "Aberto agora" olha o horário BUSINESS — uma pausa de pedidos não tira desse filtro (spec história 11)
    const openNow = isOpenNow(hours, specialHours, 'BUSINESS', establishment.timezone)
    if (params.openNow && !openNow) continue

    const { status } = deriveOperationalStatus(establishment, hours, specialHours)
    if (params.acceptingOrders && status !== 'OPEN' && status !== 'BUSY') continue

    if (params.maxWaitMinutes != null && (establishment.waitMaxMinutes == null || establishment.waitMaxMinutes > params.maxWaitMinutes)) {
      continue
    }

    items.push({
      id: establishment.id,
      name: establishment.name,
      unitLabel: establishment.unitLabel,
      category: establishment.category,
      categoryLabel: CATEGORY_LABELS[establishment.category],
      coverPhotoUrl: establishment.coverPhotoUrl,
      distanceMeters: distance,
      ratingAvg: establishment.ratingAvg,
      ratingCount: establishment.ratingCount,
      waitTime: { minMinutes: establishment.waitMinMinutes, maxMinutes: establishment.waitMaxMinutes },
      operationalStatus: status,
      isOpenNow: openNow,
      tags: establishment.tags,
    })
  }

  sortItems(items, params.sort ?? 'recommended')

  const total = items.length
  const start = (page - 1) * pageSize
  return { items: items.slice(start, start + pageSize), total, page, pageSize }
}

function sortItems(items: SearchResultItem[], sort: SortOption): void {
  const byDistance = (a: SearchResultItem, b: SearchResultItem) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity)
  const byRating = (a: SearchResultItem, b: SearchResultItem) => b.ratingAvg - a.ratingAvg
  // "menor espera ordena por wait_min_minutes numérico crescente (nulos por último)" (spec história 11)
  const byWait = (a: SearchResultItem, b: SearchResultItem) => (a.waitTime.minMinutes ?? Infinity) - (b.waitTime.minMinutes ?? Infinity)

  if (sort === 'distance') {
    items.sort(byDistance)
  } else if (sort === 'wait') {
    items.sort(byWait)
  } else if (sort === 'rating') {
    items.sort(byRating)
  } else {
    // "recomendados = distância com desempate por nota"
    items.sort((a, b) => byDistance(a, b) || byRating(a, b))
  }
}
