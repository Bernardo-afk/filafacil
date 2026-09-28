import type { EstablishmentCategory } from '../mock/types'

// Rótulos em pt-BR de EstablishmentCategory (spec §7): usados no cadastro
// (admin/gestor) e na busca (história 11, campo `categoryLabel`).
export const CATEGORY_LABELS: Record<EstablishmentCategory, string> = {
  BAR: 'Bar',
  RESTAURANT: 'Restaurante',
  BURGER_HOUSE: 'Hamburgueria',
  PIZZERIA: 'Pizzaria',
  CAFE: 'Cafeteria',
  SNACK_BAR: 'Lanchonete',
  CANTINA: 'Cantina',
}
