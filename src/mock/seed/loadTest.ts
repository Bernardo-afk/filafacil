// +500 estabelecimentos aleatórios para o teste de desempenho da busca
// (spec §8, ativado com VITE_SEED_LOAD_TEST=1 — RF08, meta de 2s na história 11).

import type { Establishment } from '../types'
import { newId } from '../../lib/id'
import { offsetMeters } from '../../lib/geo'
import { ORG_IDS } from './ids'

const REFERENCE = { lat: -22.9056, lng: -47.0608 }
const CATEGORIES: Establishment['category'][] = ['BAR', 'RESTAURANT', 'BURGER_HOUSE', 'PIZZERIA', 'CAFE', 'SNACK_BAR', 'CANTINA']

export function buildLoadTestEstablishments(count = 500): Establishment[] {
  const now = new Date().toISOString()
  return Array.from({ length: count }, (_, i) => {
    const angle = (i * 137.5) % 360 // espiral áurea: espalha os pontos sem acumular numa linha
    const distance = 200 + (i % 50) * 150
    const rad = (angle * Math.PI) / 180
    const { lat, lng } = offsetMeters(REFERENCE.lat, REFERENCE.lng, distance * Math.cos(rad), distance * Math.sin(rad))
    return {
      id: newId(),
      organizationId: ORG_IDS.BAR_DO_MESTRE, // ⚠️ carga sintética: agrupada numa organização qualquer, só para volume
      name: `Estabelecimento de Teste ${i + 1}`,
      shortName: `Teste ${i + 1}`,
      unitLabel: null,
      category: CATEGORIES[i % CATEGORIES.length],
      description: 'Estabelecimento gerado para teste de carga da busca.',
      logoUrl: null,
      coverPhotoUrl: null,
      phone: null,
      email: null,
      website: null,
      status: 'ACTIVE',
      statusReason: null,
      street: 'Rua de Teste',
      number: String(i + 1),
      complement: null,
      neighborhood: 'Bairro de Teste',
      city: 'Campinas',
      state: 'SP',
      zip: '13000000',
      lat,
      lng,
      timezone: 'America/Sao_Paulo',
      tags: ['Teste de carga'],
      ratingAvg: 3 + (i % 20) / 10,
      ratingCount: i * 3,
      waitMinMinutes: 5 + (i % 20),
      waitMaxMinutes: 15 + (i % 20),
      highDemand: i % 7 === 0,
      ordersPausedAt: null,
      ordersPausedUntil: null,
      ordersPauseReason: null,
      avgTableTurnoverMin: 45,
      menuVersion: 0,
      createdBy: null,
      createdAt: now,
      updatedAt: now,
    }
  })
}

export function loadTestEnabled(): boolean {
  return (import.meta.env as Record<string, string | undefined>).VITE_SEED_LOAD_TEST === '1'
}
