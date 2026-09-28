// Horários (spec §3 EstablishmentHours/EstablishmentSpecialHours, §8).
// "O horário ORDERS de cada um é igual ao de funcionamento", exceto o Bar do
// Mestre, cujo exemplo do protótipo é 17:30→00:30 (⚠️ único exemplo dado).

import type { EstablishmentHours, EstablishmentSpecialHours, HoursKind } from '../types'
import { ESTABLISHMENT_IDS } from './ids'

const NOW = new Date().toISOString()
let seq = 0
function nextId(prefix: string): string {
  seq += 1
  return `${prefix}-${seq}`
}

function weekWindow(establishmentId: string, kind: HoursKind, opensAt: string, closesAt: string): EstablishmentHours[] {
  return Array.from({ length: 7 }, (_, weekday) => ({
    id: nextId(`hours-${establishmentId}-${kind}-${weekday}`),
    establishmentId,
    kind,
    weekday,
    opensAt,
    closesAt,
    isClosed: false,
    createdAt: NOW,
    updatedAt: NOW,
  }))
}

export function buildEstablishmentHours(): EstablishmentHours[] {
  return [
    ...weekWindow(ESTABLISHMENT_IDS.BAR_DO_MESTRE, 'BUSINESS', '17:00', '02:00'),
    ...weekWindow(ESTABLISHMENT_IDS.BAR_DO_MESTRE, 'ORDERS', '17:30', '00:30'),
    ...weekWindow(ESTABLISHMENT_IDS.SEU_JOAQUIM, 'BUSINESS', '18:00', '01:00'),
    ...weekWindow(ESTABLISHMENT_IDS.SEU_JOAQUIM, 'ORDERS', '18:00', '01:00'),
    // ⚠️ fechamento não informado pelo protótipo; usa o horário de almoço/jantar da cantina
    ...weekWindow(ESTABLISHMENT_IDS.CANTINA, 'BUSINESS', '18:00', '22:00'),
    ...weekWindow(ESTABLISHMENT_IDS.CANTINA, 'ORDERS', '18:00', '22:00'),
    ...weekWindow(ESTABLISHMENT_IDS.BOTECO_DA_VILA, 'BUSINESS', '16:00', '00:00'),
    ...weekWindow(ESTABLISHMENT_IDS.BOTECO_DA_VILA, 'ORDERS', '16:00', '00:00'),
    ...weekWindow(ESTABLISHMENT_IDS.LANCHERIA, 'BUSINESS', '11:00', '23:00'),
    ...weekWindow(ESTABLISHMENT_IDS.LANCHERIA, 'ORDERS', '11:00', '23:00'),
    ...weekWindow(ESTABLISHMENT_IDS.BAR_DO_ZE_CAMBUI, 'BUSINESS', '17:00', '02:00'),
    ...weekWindow(ESTABLISHMENT_IDS.BAR_DO_ZE_CAMBUI, 'ORDERS', '17:00', '02:00'),
    // Taquaral, Centro (em configuração) e Restaurante São Paulo (suspenso): sem horário no seed.
  ]
}

/** Exemplo do §3 (EstablishmentSpecialHours): "07/09 ✅ (spec)" fechado, sobrescrevendo o semanal. */
export function buildEstablishmentSpecialHours(): EstablishmentSpecialHours[] {
  return [
    {
      id: 'special-bar-do-mestre-2026-09-07',
      establishmentId: ESTABLISHMENT_IDS.BAR_DO_MESTRE,
      kind: 'BUSINESS',
      date: '2026-09-07',
      isClosed: true,
      opensAt: null,
      closesAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]
}
