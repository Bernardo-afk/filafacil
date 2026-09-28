// Fila de espera do Bar do Mestre (spec §8). ⚠️ O protótipo põe Lucas na
// posição 1 mesmo esperando menos que os outros; o seed usa ordem de
// chegada (João, Marina, Lucas), como o documento manda usar.

import type { WaitlistEntry } from '../types'
import { ESTABLISHMENT_IDS } from './ids'

const EST = ESTABLISHMENT_IDS.BAR_DO_MESTRE
const NOW = Date.now()

function minutesAgo(minutes: number): string {
  return new Date(NOW - minutes * 60_000).toISOString()
}

function entry(
  id: string,
  position: number,
  customerName: string,
  phoneE164: string,
  partySize: number,
  waitingMinutes: number,
): WaitlistEntry {
  const createdAt = minutesAgo(waitingMinutes)
  return {
    id,
    establishmentId: EST,
    userId: null,
    customerName,
    phoneE164,
    partySize,
    status: 'WAITING',
    position,
    estimatedWaitMinutes: null,
    notifiedAt: null,
    seatedAt: null,
    canceledAt: null,
    notifiedTableId: null,
    seatedTableId: null,
    createdAt,
    updatedAt: createdAt,
  }
}

export function buildWaitlistEntries(): WaitlistEntry[] {
  return [
    entry('waitlist-joao-mendes', 1, 'João Mendes', '+5519976543210', 3, 30),
    entry('waitlist-marina-silva', 2, 'Marina Silva', '+5519987654321', 2, 24),
    entry('waitlist-lucas-torres', 3, 'Lucas Torres', '+5519998741234', 4, 19),
  ]
}
