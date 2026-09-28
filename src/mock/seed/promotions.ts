// Promoções recorrentes do Bar do Mestre (spec §8, RF17/RF18).

import type { Promotion, PromotionTarget } from '../types'
import { ESTABLISHMENT_IDS, MENU_CATEGORY_IDS, PROMOTION_IDS, USER_IDS } from './ids'

const NOW = new Date().toISOString()
const EST = ESTABLISHMENT_IDS.BAR_DO_MESTRE
const SEG_SEX = [1, 2, 3, 4, 5]
const TODA_SEMANA = [0, 1, 2, 3, 4, 5, 6]
const QUARTA = [3]

export function buildPromotions(): Promotion[] {
  return [
    {
      id: PROMOTION_IDS.HAPPY_HOUR,
      establishmentId: EST,
      name: 'Happy Hour',
      scope: 'CATEGORIES',
      discountType: 'PERCENT',
      discountValue: 20,
      weekdays: SEG_SEX,
      startTime: '17:00',
      endTime: '19:00',
      validFrom: null,
      validUntil: null,
      label: 'Happy Hour -20%',
      isActive: true,
      createdBy: USER_IDS.LUCAS,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: PROMOTION_IDS.COMBO_DA_SEMANA,
      establishmentId: EST,
      name: 'Combo da semana',
      scope: 'CATEGORIES',
      discountType: 'PERCENT',
      discountValue: 15,
      weekdays: TODA_SEMANA,
      startTime: '00:00',
      endTime: '23:59',
      validFrom: null,
      validUntil: null,
      label: 'Combo -15%',
      isActive: true,
      createdBy: USER_IDS.LUCAS,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: PROMOTION_IDS.QUARTA_UNIVERSITARIA,
      establishmentId: EST,
      name: 'Quarta universitária',
      scope: 'ALL',
      discountType: 'PERCENT',
      discountValue: 10,
      weekdays: QUARTA,
      startTime: '20:00',
      endTime: '22:00',
      validFrom: null,
      validUntil: null,
      label: 'Quarta universitária -10%',
      isActive: false,
      createdBy: USER_IDS.LUCAS,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]
}

export function buildPromotionTargets(): PromotionTarget[] {
  return [
    {
      id: 'promo-target-happy-hour-cervejas',
      promotionId: PROMOTION_IDS.HAPPY_HOUR,
      menuItemId: null,
      categoryId: MENU_CATEGORY_IDS.CERVEJAS,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'promo-target-happy-hour-drinks',
      promotionId: PROMOTION_IDS.HAPPY_HOUR,
      menuItemId: null,
      categoryId: MENU_CATEGORY_IDS.DRINKS,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'promo-target-combo-da-semana',
      promotionId: PROMOTION_IDS.COMBO_DA_SEMANA,
      menuItemId: null,
      categoryId: MENU_CATEGORY_IDS.COMBOS,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]
}
