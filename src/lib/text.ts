// Normalização de texto pra busca (spec história 34: "busca por nome ou
// cidade sem diferenciar acento"). NFD separa a letra do diacrítico, que é
// descartado pela regex.

export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function matchesSearch(haystack: string, query: string): boolean {
  if (!query.trim()) return true
  return normalizeForSearch(haystack).includes(normalizeForSearch(query))
}
