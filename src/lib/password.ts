// Regra de senha (spec RF01/história 01): mínimo 8 caracteres, 1 letra, 1 número.
// Exportado como regras individuais para o componente PasswordRequirements
// (spec §7) mostrar o que falta enquanto a pessoa digita.

export interface PasswordRule {
  key: 'length' | 'letter' | 'number'
  label: string
  test: (password: string) => boolean
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: 'length', label: 'Mínimo de 8 caracteres', test: (p) => p.length >= 8 },
  { key: 'letter', label: 'Pelo menos 1 letra', test: (p) => /[a-zA-Z]/.test(p) },
  { key: 'number', label: 'Pelo menos 1 número', test: (p) => /\d/.test(p) },
]

export function isValidPassword(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password))
}
