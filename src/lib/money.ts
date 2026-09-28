// Dinheiro sempre em centavos (number inteiro). Formatação só na UI (spec §3, §4 decisão 9).

const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatCents(cents: number): string {
  return formatter.format(cents / 100)
}

export function centsFromReais(reais: number): number {
  return Math.round(reais * 100)
}

/** Arredondamento "half up" (spec história 29/31: `round_half_up`, nunca banker's rounding). */
export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5)
}

/** Aplica um desconto percentual (1–100) em centavos: `price − round_half_up(price × pct / 100)` (spec história 29). */
export function applyPercentDiscount(priceCents: number, percent: number): number {
  const discount = roundHalfUp((priceCents * percent) / 100)
  return Math.max(0, priceCents - discount)
}
