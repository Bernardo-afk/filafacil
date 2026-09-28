import { PlanFeatureKey } from '../../mock/types'

// Rótulos em pt-BR dos recursos por plano (spec história 37, tabela §8).
export const FEATURE_LABELS: Record<Exclude<PlanFeatureKey, 'MAX_UNITS'>, string> = {
  KDS: 'KDS (tela de cozinha)',
  LOYALTY: 'Fidelidade',
  ADVANCED_REPORTS: 'Relatórios avançados',
  API_ACCESS: 'Acesso à API',
  MULTI_UNIT: 'Múltiplas unidades',
  DEDICATED_SLA: 'SLA dedicado',
  ACCOUNT_MANAGER: 'Gerente de conta',
  WHITE_LABEL: 'White label',
  PROMOTIONS: 'Promoções',
  RECIPE_SHEETS: 'Fichas técnicas',
  WAITLIST: 'Fila de espera',
}

export const BOOLEAN_FEATURE_KEYS = Object.values(PlanFeatureKey).filter(
  (key) => key !== PlanFeatureKey.MAX_UNITS,
) as Array<Exclude<PlanFeatureKey, 'MAX_UNITS'>>
