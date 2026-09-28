import { describe, expect, it } from 'vitest'
import { formatCents, applyPercentDiscount } from './money'

describe('formatCents', () => {
  it('formata centavos como BRL', () => {
    expect(formatCents(1890)).toBe('R$ 18,90')
  })
})

describe('applyPercentDiscount', () => {
  it('aplica 20% de desconto', () => {
    expect(applyPercentDiscount(1890, 20)).toBe(1512)
  })

  it('nunca fica negativo', () => {
    expect(applyPercentDiscount(100, 200)).toBe(0)
  })
})
