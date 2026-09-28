// Vínculos de equipe (spec §3 Membership, §8). Sprint 1 exercita ATTENDANT e MANAGER.

import type { Membership } from '../types'
import { MEMBERSHIP_IDS, USER_IDS, ORG_IDS, ESTABLISHMENT_IDS } from './ids'

const NOW = new Date().toISOString()

function membership(
  id: string,
  userId: string,
  role: Membership['role'],
  scope: { establishmentId: string } | { organizationId: string },
): Membership {
  return {
    id,
    userId,
    role,
    establishmentId: 'establishmentId' in scope ? scope.establishmentId : null,
    organizationId: 'organizationId' in scope ? scope.organizationId : null,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

export function buildMemberships(): Membership[] {
  return [
    // Lucas gerencia a organização inteira (3 unidades Bar do Zé)
    membership(MEMBERSHIP_IDS.LUCAS_GRUPO_BAR_DO_ZE, USER_IDS.LUCAS, 'MANAGER', {
      organizationId: ORG_IDS.GRUPO_BAR_DO_ZE,
    }),
    // Também gestor do Bar do Mestre: o protótipo confunde "Bar do Mestre" e
    // "Bar do Zé" (spec §10.3, inconsistência 1); na dúvida, Lucas gerencia os
    // dois para que exista uma conta pronta para testar as telas de gestor no
    // estabelecimento com cardápio, promoções, mesas e fila completos.
    membership(MEMBERSHIP_IDS.LUCAS_BAR_DO_MESTRE, USER_IDS.LUCAS, 'MANAGER', {
      establishmentId: ESTABLISHMENT_IDS.BAR_DO_MESTRE,
    }),
    // Carlos e Ana são atendentes do Bar do Mestre; Mariana também (inativa)
    membership(MEMBERSHIP_IDS.CARLOS_BAR_DO_MESTRE, USER_IDS.CARLOS, 'ATTENDANT', {
      establishmentId: ESTABLISHMENT_IDS.BAR_DO_MESTRE,
    }),
    membership(MEMBERSHIP_IDS.ANA_BAR_DO_MESTRE, USER_IDS.ANA, 'ATTENDANT', {
      establishmentId: ESTABLISHMENT_IDS.BAR_DO_MESTRE,
    }),
    membership(MEMBERSHIP_IDS.MARIANA_BAR_DO_MESTRE, USER_IDS.MARIANA, 'ATTENDANT', {
      establishmentId: ESTABLISHMENT_IDS.BAR_DO_MESTRE,
    }),
  ]
}
