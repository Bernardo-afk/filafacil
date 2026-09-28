// Horário de funcionamento/pedidos (spec RF14, §3 EstablishmentHours). Interpreta
// no fuso do estabelecimento; horário especial da data sobrescreve o semanal;
// janela pode cruzar a meia-noite (closesAt < opensAt).

import type { EstablishmentHours, EstablishmentSpecialHours, HoursKind } from '../mock/types'

export interface DayWindow {
  isClosed: boolean
  opensAt: string | null
  closesAt: string | null
}

function partsInTimezone(at: Date, timezone: string): { weekday: number; time: string; date: string } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(at)
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekday = weekdayNames.indexOf(map.weekday)
  const hour = map.hour === '24' ? '00' : map.hour
  return {
    weekday,
    time: `${hour}:${map.minute}`,
    date: `${map.year}-${map.month}-${map.day}`,
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** true se `time` cai dentro de [opensAt, closesAt), cruzando meia-noite quando closesAt < opensAt. */
export function isWithinWindow(time: string, opensAt: string, closesAt: string): boolean {
  const t = timeToMinutes(time)
  const start = timeToMinutes(opensAt)
  const end = timeToMinutes(closesAt)
  if (start === end) return true // "00:00–23:59" tratado como o dia todo pelo chamador
  if (end > start) return t >= start && t < end
  return t >= start || t < end // cruza a meia-noite
}

function resolveDayWindow(
  weekday: number,
  dateStr: string,
  kind: HoursKind,
  hours: EstablishmentHours[],
  specialHours: EstablishmentSpecialHours[],
): DayWindow {
  const special = specialHours.find((s) => s.kind === kind && s.date === dateStr)
  if (special) {
    return { isClosed: special.isClosed, opensAt: special.opensAt, closesAt: special.closesAt }
  }
  const weekly = hours.find((h) => h.kind === kind && h.weekday === weekday)
  if (!weekly) return { isClosed: true, opensAt: null, closesAt: null }
  return { isClosed: weekly.isClosed, opensAt: weekly.opensAt, closesAt: weekly.closesAt }
}

/**
 * `hours`/`specialHours` devem já vir filtrados para um único estabelecimento
 * (quem filtra é o mock service, spec §3 "toda função de leitura filtra por
 * establishmentId"). Considera o dia atual e o anterior, para o caso de uma
 * janela do dia anterior cruzar a meia-noite e ainda cobrir o horário atual
 * (ex.: 17:00 → 02:00).
 */
export function isOpenNow(
  hours: EstablishmentHours[],
  specialHours: EstablishmentSpecialHours[],
  kind: HoursKind,
  timezone: string,
  at: Date = new Date(),
): boolean {
  const { weekday, time, date } = partsInTimezone(at, timezone)
  const today = resolveDayWindow(weekday, date, kind, hours, specialHours)
  if (!today.isClosed && today.opensAt && today.closesAt && isWithinWindow(time, today.opensAt, today.closesAt)) {
    // se não cruza a meia-noite, ou se cruza e "time" está na parte que ainda é "hoje" (>= opensAt)
    if (today.closesAt > today.opensAt || time >= today.opensAt) return true
  }

  const yesterdayWeekday = (weekday + 6) % 7
  const yesterdayDate = new Date(at.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayDateStr = partsInTimezone(yesterdayDate, timezone).date
  const yesterday = resolveDayWindow(yesterdayWeekday, yesterdayDateStr, kind, hours, specialHours)
  if (
    !yesterday.isClosed &&
    yesterday.opensAt &&
    yesterday.closesAt &&
    yesterday.closesAt < yesterday.opensAt && // só importa se cruzou a meia-noite
    time < yesterday.closesAt
  ) {
    return true
  }

  return false
}

/** "17:00–02:00" ou "Fechado hoje" para exibir na página do restaurante (RF09). */
export function formatTodayHours(
  hours: EstablishmentHours[],
  specialHours: EstablishmentSpecialHours[],
  kind: HoursKind,
  timezone: string,
  at: Date = new Date(),
): string {
  const { weekday, date } = partsInTimezone(at, timezone)
  const today = resolveDayWindow(weekday, date, kind, hours, specialHours)
  if (today.isClosed || !today.opensAt || !today.closesAt) return 'Fechado hoje'
  return `${today.opensAt}–${today.closesAt}`
}
