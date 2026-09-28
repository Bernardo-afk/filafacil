// IDs fixos e legíveis para o seed (spec §8), para poder referenciar entidades
// entre arquivos sem gerar UUIDs aleatórios a cada reset. Qualquer registro
// criado em tempo de execução (fora do seed) usa crypto.randomUUID() (lib/id.ts).

export const USER_IDS = {
  ADMIN: 'user-admin',
  LUCAS: 'user-lucas',
  CARLOS: 'user-carlos',
  ANA: 'user-ana',
  MARIANA: 'user-mariana',
  JOAO: 'user-joao',
} as const

export const ORG_IDS = {
  GRUPO_BAR_DO_ZE: 'org-grupo-bar-do-ze',
  BELA_VISTA: 'org-restaurantes-bela-vista',
  BOTECO_CORP: 'org-boteco-corp',
  BAR_DO_MESTRE: 'org-bar-do-mestre',
  CANTINA: 'org-cantina-universitaria',
  LANCHERIA: 'org-lancheria-do-ze',
} as const

export const PLAN_IDS = {
  START: 'plan-start',
  PRO: 'plan-pro',
  BUSINESS: 'plan-business',
} as const

export const SUBSCRIPTION_IDS = {
  GRUPO_BAR_DO_ZE: 'sub-grupo-bar-do-ze',
  BELA_VISTA: 'sub-restaurantes-bela-vista',
  BOTECO_CORP: 'sub-boteco-corp',
  BAR_DO_MESTRE: 'sub-bar-do-mestre',
  CANTINA: 'sub-cantina-universitaria',
  LANCHERIA: 'sub-lancheria-do-ze',
} as const

export const ESTABLISHMENT_IDS = {
  BAR_DO_MESTRE: 'estab-bar-do-mestre',
  SEU_JOAQUIM: 'estab-seu-joaquim-bar',
  CANTINA: 'estab-cantina-universitaria',
  BOTECO_DA_VILA: 'estab-boteco-da-vila',
  LANCHERIA: 'estab-lancheria-do-ze',
  BAR_DO_ZE_CAMBUI: 'estab-bar-do-ze-cambui',
  BAR_DO_ZE_TAQUARAL: 'estab-bar-do-ze-taquaral',
  BAR_DO_ZE_CENTRO: 'estab-bar-do-ze-centro',
  RESTAURANTE_SP: 'estab-restaurante-sao-paulo',
} as const

export const MENU_CATEGORY_IDS = {
  CERVEJAS: 'cat-cervejas',
  DRINKS: 'cat-drinks',
  PORCOES: 'cat-porcoes',
  LANCHES: 'cat-lanches',
  COMBOS: 'cat-combos',
} as const

export const MENU_ITEM_IDS = {
  CERVEJA_IPA: 'item-cerveja-ipa',
  X_BURGER: 'item-x-burger',
  CAIPIRINHA_LIMAO: 'item-caipirinha-limao',
  BATATA_FRITA: 'item-batata-frita',
  X_BACON: 'item-x-bacon',
  HEINEKEN: 'item-heineken',
  COMBO_IPA_BURGER: 'item-combo-ipa-burger',
  GIN_TONICA: 'item-gin-tonica',
  COXINHA: 'item-porcao-coxinha',
} as const

export const PROMOTION_IDS = {
  HAPPY_HOUR: 'promo-happy-hour',
  COMBO_DA_SEMANA: 'promo-combo-da-semana',
  QUARTA_UNIVERSITARIA: 'promo-quarta-universitaria',
} as const

export const INGREDIENT_IDS = {
  PAO_HAMBURGUER: 'ing-pao-hamburguer',
  HAMBURGUER: 'ing-hamburguer',
  QUEIJO_CHEDDAR: 'ing-queijo-cheddar',
  MOLHO_ESPECIAL: 'ing-molho-especial',
  BATATA_CONGELADA: 'ing-batata-congelada',
  CHOPE_IPA: 'ing-chope-ipa',
  GIN: 'ing-gin',
  TONICA: 'ing-tonica',
} as const

export const RECIPE_SHEET_IDS = {
  X_BURGER: 'recipe-x-burger',
  BATATA_FRITA: 'recipe-batata-frita',
  CERVEJA_IPA: 'recipe-cerveja-ipa',
  GIN_TONICA: 'recipe-gin-tonica',
} as const

export const AREA_IDS = {
  SALAO: 'area-salao',
  EXTERNA: 'area-externa',
  BALCAO: 'area-balcao',
} as const

export const FLOOR_PLAN_IDS = {
  BAR_DO_MESTRE: 'floorplan-bar-do-mestre',
} as const

export const ADDRESS_IDS = {
  JOAO_CASA: 'addr-joao-casa',
  JOAO_TRABALHO: 'addr-joao-trabalho',
} as const

export const MEMBERSHIP_IDS = {
  LUCAS_GRUPO_BAR_DO_ZE: 'member-lucas-grupo-bar-do-ze',
  LUCAS_BAR_DO_MESTRE: 'member-lucas-bar-do-mestre',
  CARLOS_BAR_DO_MESTRE: 'member-carlos-bar-do-mestre',
  ANA_BAR_DO_MESTRE: 'member-ana-bar-do-mestre',
  MARIANA_BAR_DO_MESTRE: 'member-mariana-bar-do-mestre',
} as const
