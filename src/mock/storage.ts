// Wrapper fino sobre localStorage (spec §4 "Persistência"). Cada coleção é um
// Record<string, Entidade> serializado em JSON sob a chave `filazero:<nome>`.

const PREFIX = 'filazero:'

export type CollectionName =
  | 'users'
  | 'otpChallenges'
  | 'oauthAccounts'
  | 'refreshTokens'
  | 'addresses'
  | 'organizations'
  | 'establishments'
  | 'establishmentHours'
  | 'establishmentSpecialHours'
  | 'establishmentPhotos'
  | 'memberships'
  | 'plans'
  | 'planFeatures'
  | 'subscriptions'
  | 'menuCategories'
  | 'menuItems'
  | 'promotions'
  | 'promotionTargets'
  | 'ingredients'
  | 'recipeSheets'
  | 'recipeSheetLines'
  | 'areas'
  | 'floorPlans'
  | 'diningTables'
  | 'waitlistEntries'
  | 'notifications'
  | 'auditLogs'

function key(name: CollectionName): string {
  return `${PREFIX}${name}`
}

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

/** Fallback em memória (SSR/testes sem jsdom, ou localStorage bloqueado). */
const memoryFallback = new Map<string, string>()

function rawGet(k: string): string | null {
  if (hasLocalStorage()) {
    try {
      return window.localStorage.getItem(k)
    } catch {
      // segue para o fallback
    }
  }
  return memoryFallback.get(k) ?? null
}

function rawSet(k: string, value: string): void {
  if (hasLocalStorage()) {
    try {
      window.localStorage.setItem(k, value)
      return
    } catch {
      // segue para o fallback (ex.: quota estourada)
    }
  }
  memoryFallback.set(k, value)
}

function rawRemove(k: string): void {
  if (hasLocalStorage()) {
    try {
      window.localStorage.removeItem(k)
    } catch {
      // ignora
    }
  }
  memoryFallback.delete(k)
}

/** Lê uma coleção inteira. Nunca lança: coleção ausente ou corrompida vira {}. */
export function getCollection<T>(name: CollectionName): Record<string, T> {
  const raw = rawGet(key(name))
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, T>
  } catch {
    console.error(`[filazero/mock] coleção "${name}" corrompida em localStorage; tratando como vazia.`)
    return {}
  }
}

/** Grava a coleção inteira de uma vez (usado após validar tudo em memória). */
export function setCollection<T>(name: CollectionName, data: Record<string, T>): void {
  rawSet(key(name), JSON.stringify(data))
}

export function clearCollection(name: CollectionName): void {
  rawRemove(key(name))
}

/** Lista todas as chaves `filazero:*` gravadas (usado pelo reset e pelo painel de dev). */
export function listCollectionKeys(): CollectionName[] {
  const names: CollectionName[] = [
    'users',
    'otpChallenges',
    'oauthAccounts',
    'refreshTokens',
    'addresses',
    'organizations',
    'establishments',
    'establishmentHours',
    'establishmentSpecialHours',
    'establishmentPhotos',
    'memberships',
    'plans',
    'planFeatures',
    'subscriptions',
    'menuCategories',
    'menuItems',
    'promotions',
    'promotionTargets',
    'ingredients',
    'recipeSheets',
    'recipeSheetLines',
    'areas',
    'floorPlans',
    'diningTables',
    'waitlistEntries',
    'notifications',
    'auditLogs',
  ]
  return names
}

// ---------------------------------------------------------------------------
// Sessão: filazero:session, fora do padrão de coleção (é um objeto único)
// ---------------------------------------------------------------------------

const SESSION_KEY = `${PREFIX}session`
const REFRESH_TOKEN_KEY = `${PREFIX}refreshToken`

export function getSessionRaw<T>(): T | null {
  const raw = rawGet(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function setSessionRaw<T>(value: T): void {
  rawSet(SESSION_KEY, JSON.stringify(value))
}

export function clearSessionRaw(): void {
  rawRemove(SESSION_KEY)
}

// ---------------------------------------------------------------------------
// Refresh token opaco (spec história 06): guardado só no navegador, nunca em
// texto puro na coleção refreshTokens (só o hash — ver mock/services/auth.ts).
// ---------------------------------------------------------------------------

export function getStoredRefreshToken(): string | null {
  return rawGet(REFRESH_TOKEN_KEY)
}

export function setStoredRefreshToken(token: string): void {
  rawSet(REFRESH_TOKEN_KEY, token)
}

export function clearStoredRefreshToken(): void {
  rawRemove(REFRESH_TOKEN_KEY)
}

// ---------------------------------------------------------------------------
// Helpers de CRUD por coleção (usados pelos mock services)
// ---------------------------------------------------------------------------

export function upsert<T extends { id: string }>(name: CollectionName, record: T): T {
  const collection = getCollection<T>(name)
  collection[record.id] = record
  setCollection(name, collection)
  return record
}

export function upsertMany<T extends { id: string }>(name: CollectionName, records: T[]): T[] {
  const collection = getCollection<T>(name)
  for (const record of records) {
    collection[record.id] = record
  }
  setCollection(name, collection)
  return records
}

export function findById<T>(name: CollectionName, id: string): T | null {
  const collection = getCollection<T>(name)
  return collection[id] ?? null
}

export function findAll<T>(name: CollectionName): T[] {
  return Object.values(getCollection<T>(name))
}

export function removeById(name: CollectionName, id: string): void {
  const collection = getCollection(name)
  delete collection[id]
  setCollection(name, collection)
}
