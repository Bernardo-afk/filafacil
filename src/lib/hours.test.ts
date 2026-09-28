import { describe, expect, it } from 'vitest'
import { isOpenNow, formatTodayHours } from './hours'
import { buildEstablishmentHours, buildEstablishmentSpecialHours } from '../mock/seed/hours'
import { ESTABLISHMENT_IDS } from '../mock/seed/ids'

const allHours = buildEstablishmentHours()
const allSpecialHours = buildEstablishmentSpecialHours()
// isOpenNow/formatTodayHours esperam as horas já filtradas por estabelecimento
// (quem filtra é o mock service, spec §3 "toda função de leitura filtra por
// establishmentId"); os testes replicam esse filtro para refletir o uso real.
const hours = allHours.filter((h) => h.establishmentId === ESTABLISHMENT_IDS.BAR_DO_MESTRE)
const specialHours = allSpecialHours.filter((h) => h.establishmentId === ESTABLISHMENT_IDS.BAR_DO_MESTRE)
const TZ = 'America/Sao_Paulo'

function utcForSaoPaulo(dateTimeLocal: string): Date {
  // São Paulo é UTC-3 o ano todo desde o fim do horário de verão (2019).
  return new Date(`${dateTimeLocal}-03:00`)
}

describe('isOpenNow — Bar do Mestre (17:00–02:00 todos os dias)', () => {
  it('está aberto às 20:00 de uma terça', () => {
    const at = utcForSaoPaulo('2026-09-29T20:00:00') // terça-feira
    expect(isOpenNow(hours, [], 'BUSINESS', TZ, at)).toBe(true)
  })

  it('cruza a meia-noite: está aberto às 01:00 de terça (janela de segunda)', () => {
    const at = utcForSaoPaulo('2026-09-29T01:00:00') // terça 01:00, ainda dentro da janela de segunda
    expect(isOpenNow(hours, [], 'BUSINESS', TZ, at)).toBe(true)
  })

  it('está fechado às 10:00 da manhã', () => {
    const at = utcForSaoPaulo('2026-09-29T10:00:00')
    expect(isOpenNow(hours, [], 'BUSINESS', TZ, at)).toBe(false)
  })

  it('horário especial fechado sobrescreve o semanal', () => {
    const at = utcForSaoPaulo('2026-09-07T20:00:00') // segunda, mas fechado no especial
    expect(isOpenNow(hours, specialHours, 'BUSINESS', TZ, at)).toBe(false)
  })
})

describe('formatTodayHours', () => {
  it('mostra a janela de hoje', () => {
    const at = utcForSaoPaulo('2026-09-29T12:00:00')
    expect(formatTodayHours(hours, [], 'BUSINESS', TZ, at)).toBe('17:00–02:00')
  })

  it('mostra "Fechado hoje" no horário especial', () => {
    const at = utcForSaoPaulo('2026-09-07T12:00:00')
    expect(formatTodayHours(hours, specialHours, 'BUSINESS', TZ, at)).toBe('Fechado hoje')
  })
})

describe('isOpenNow — estabelecimento sem horário cadastrado', () => {
  it('sempre fechado (ex.: Bar do Zé Taquaral, sem hours no seed)', () => {
    const at = utcForSaoPaulo('2026-09-29T20:00:00')
    const taquaralHours = allHours.filter((h) => h.establishmentId === ESTABLISHMENT_IDS.BAR_DO_ZE_TAQUARAL)
    expect(taquaralHours).toHaveLength(0)
    expect(isOpenNow(taquaralHours, [], 'BUSINESS', TZ, at)).toBe(false)
  })
})
