// Dinheiro sempre em centavos (number inteiro). Formatação só na UI (spec §3, §4 decisão 9).

const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatCents(cents: number): string {
  return formatter.format(cents / 100)
}

export function centsFromReais(reais: number): number {
  return Math.round(reais * 100)
}

/** Aplica um desconto percentual (1–100) em centavos, arredondando para baixo. */
export function applyPercentDiscount(priceCents: number, percent: number): number {
  return Math.max(0, Math.floor(priceCents * (1 - percent / 100)))
}
