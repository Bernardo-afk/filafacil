// CPF (spec RF02, história 01). 🔶 decisão do grupo: manter CPF no cadastro.
// Sem criptografia real no mock (spec §0.2 item 7) — cifra/hash aqui só simulam o formato.

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

const REPEATED = /^(\d)\1{10}$/

/** Valida os 2 dígitos verificadores e rejeita sequências repetidas (111.111.111-11 etc.). */
export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value)
  if (digits.length !== 11) return false
  if (REPEATED.test(digits)) return false

  const calcCheckDigit = (base: string, factor: number): number => {
    let total = 0
    for (const digit of base) {
      total += Number(digit) * factor
      factor -= 1
    }
    const remainder = (total * 10) % 11
    return remainder === 10 ? 0 : remainder
  }

  const digit1 = calcCheckDigit(digits.slice(0, 9), 10)
  const digit2 = calcCheckDigit(digits.slice(0, 9) + digit1, 11)
  return digits === digits.slice(0, 9) + String(digit1) + String(digit2)
}

export function formatCpf(value: string): string {
  const digits = onlyDigits(value).padEnd(11, '_')
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`.replace(/_/g, '')
}

/** "•••.•••.•••-25": nunca mostra os 9 primeiros dígitos (spec RF02). */
export function maskCpf(value: string): string {
  const digits = onlyDigits(value)
  if (digits.length !== 11) return '•••.•••.•••-••'
  return `•••.•••.•••-${digits.slice(9, 11)}`
}

/** Simula "cifrado": nunca em texto puro no registro nem em log. Não é AES real (spec §0.2 item 7). */
export function mockEncryptCpf(value: string): string {
  return btoa(onlyDigits(value))
}

/** Simula HMAC-SHA256 para unicidade/busca (spec: cpf_hash). Não é criptográfico. */
export async function mockHashCpf(value: string): Promise<string> {
  const digits = onlyDigits(value)
  const data = new TextEncoder().encode(`filazero-cpf-pepper:${digits}`)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
