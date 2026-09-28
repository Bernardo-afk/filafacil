// Leitura pública de estabelecimentos (spec história 34, regra "SUSPENDED e
// DEACTIVATED somem de GET /establishments"; usado depois pelas histórias 11
// e 12). SETUP também não é público — só aparece pro admin.

import { findAll, findById } from '../storage'
import { apiError } from '../errors'
import type { Establishment } from '../types'

export function isEstablishmentPublic(establishment: Establishment): boolean {
  return establishment.status === 'ACTIVE'
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
}
