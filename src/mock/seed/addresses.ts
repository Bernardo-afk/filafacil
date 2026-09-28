// Endereços do cliente (spec §3 Address, §8: Casa e Trabalho de João).

import type { Address } from '../types'
import { ADDRESS_IDS, USER_IDS } from './ids'

const NOW = new Date().toISOString()

export function buildAddresses(): Address[] {
  return [
    {
      id: ADDRESS_IDS.JOAO_CASA,
      userId: USER_IDS.JOAO,
      label: 'Casa',
      street: 'Rua das Acácias',
      number: '123',
      complement: null,
      neighborhood: 'Centro',
      city: 'Campinas',
      state: 'SP',
      zip: '13010000',
      lat: null,
      lng: null,
      isDefault: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: ADDRESS_IDS.JOAO_TRABALHO,
      userId: USER_IDS.JOAO,
      label: 'Trabalho',
      street: 'Av. Universitária',
      number: '450',
      complement: null,
      neighborhood: 'Barão Geraldo',
      city: 'Campinas',
      state: 'SP',
      zip: '13083000',
      lat: null,
      lng: null,
      isDefault: false,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]
}
