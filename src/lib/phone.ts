// Celular normalizado para E.164 (spec RF01/RF03). Default: Brasil (+55).

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** "19999999999" ou "+5519999999999" ou "(19) 99999-9999" → "+5519999999999". */
export function toE164(value: string, defaultCountry = '55'): string {
  let digits = onlyDigits(value)
  if (value.trim().startsWith('+')) {
    return `+${digits}`
  }
  if (digits.length <= 11) {
    digits = `${defaultCountry}${digits}`
  }
  return `+${digits}`
}

export function isValidBrazilianMobile(value: string): boolean {
  const e164 = toE164(value)
  // +55 + DDD (2) + 9 + 8 dígitos = +55 + 11 dígitos
  return /^\+55\d{2}9\d{8}$/.test(e164)
}

/** "+5519999999999" → "(19) 99999-9999" */
export function formatBrazilianPhone(e164: string): string {
  const match = /^\+55(\d{2})(\d{5})(\d{4})$/.exec(e164)
  if (!match) return e164
  const [, ddd, first, last] = match
  return `(${ddd}) ${first}-${last}`
}

export function looksLikeEmail(identifier: string): boolean {
  return identifier.includes('@')
}
