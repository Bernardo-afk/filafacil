// Feature flags (spec §1.3 e §4 decisão 10). Todas false na Sprint 1.
// Um módulo só, lido em todo lugar — evita `if (import.meta.env.VITE_X)` espalhado.

function readFlag(name: string): boolean {
  const raw = (import.meta.env as Record<string, string | undefined>)[name]
  return raw === 'true' || raw === '1'
}

export const flags = {
  ORDERING_ENABLED: readFlag('VITE_ORDERING_ENABLED'),
  LOYALTY_ENABLED: readFlag('VITE_LOYALTY_ENABLED'),
  RESERVATIONS_ENABLED: readFlag('VITE_RESERVATIONS_ENABLED'),
  AUTH_GOOGLE_ENABLED: readFlag('VITE_AUTH_GOOGLE_ENABLED'),
  AUTH_APPLE_ENABLED: readFlag('VITE_AUTH_APPLE_ENABLED'),
} as const
