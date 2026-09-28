// resetMockData() (spec §0.2 item 11): apaga as chaves filazero:* e recarrega
// o seed da seção 8. Usado pelo botão "Resetar dados" e por `npm run seed:reset`.

import { listCollectionKeys, setCollection, clearSessionRaw } from './storage'
import { buildSeed, SEED_COLLECTION_MAP } from './seed'

export function resetMockData(): void {
  for (const name of listCollectionKeys()) {
    setCollection(name, {})
  }
  clearSessionRaw()

  const seed = buildSeed()
  for (const [seedKey, collectionName] of Object.entries(SEED_COLLECTION_MAP)) {
    const records = seed[seedKey as keyof typeof seed] as Array<{ id: string }>
    const byId = Object.fromEntries(records.map((r) => [r.id, r]))
    setCollection(collectionName, byId)
  }
}

/** Só semeia se as coleções estiverem vazias (primeira visita) — não sobrescreve dados do usuário. */
export function ensureSeeded(): void {
  const users = listCollectionKeys()
  const alreadySeeded = users.some((name) => {
    try {
      return Object.keys(JSON.parse(window.localStorage.getItem(`filazero:${name}`) ?? '{}')).length > 0
    } catch {
      return false
    }
  })
  if (!alreadySeeded) resetMockData()
}
