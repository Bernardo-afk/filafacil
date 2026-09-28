// Organizações (spec §3 Organization, §8). "Toda unidade pertence a uma
// organização. Estabelecimento avulso ganha uma organização própria."
//
// ⚠️ O documento nomeia só 3 organizações (Grupo Bar do Zé, Restaurantes Bela
// Vista, Boteco Corp) sem mapear todos os 9 estabelecimentos do seed a elas.
// Decisão registrada em docs/DECISIONS.md: Grupo Bar do Zé fica com as 3
// unidades "Bar do Zé" (como o documento diz explicitamente, plano Pro);
// Bela Vista (Start, 1 unidade) fica com o Restaurante São Paulo; Boteco Corp
// (Business, 2 unidades) fica com Seu Joaquim Bar e Boteco da Vila; os demais
// estabelecimentos avulsos (Bar do Mestre, Cantina Universitária, Lancheria
// do Zé) ganham cada um a própria organização no plano Start.

import type { Organization } from '../types'
import { ORG_IDS } from './ids'

const NOW = new Date().toISOString()

function org(id: string, name: string): Organization {
  return { id, name, createdAt: NOW, updatedAt: NOW }
}

export function buildOrganizations(): Organization[] {
  return [
    org(ORG_IDS.GRUPO_BAR_DO_ZE, 'Grupo Bar do Zé'),
    org(ORG_IDS.BELA_VISTA, 'Restaurantes Bela Vista'),
    org(ORG_IDS.BOTECO_CORP, 'Boteco Corp'),
    org(ORG_IDS.BAR_DO_MESTRE, 'Bar do Mestre'),
    org(ORG_IDS.CANTINA, 'Cantina Universitária'),
    org(ORG_IDS.LANCHERIA, 'Lancheria do Zé'),
  ]
}
