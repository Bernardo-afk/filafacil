// addressesService (história 13: "Meus endereços", spec §3 Address). Até 10
// por usuário, exatamente 1 padrão. Isolamento por dono: nunca lê/edita
// endereço de outro usuário (404, mesmo princípio de tenant do guard.ts).

import { z } from 'zod'
import { findAll, findById, upsert, removeById } from '../storage'
import { apiError } from '../errors'
import { newId, nowISO } from '../../lib/id'
import { requireActiveUser, requireSession } from '../guard'
import { useSessionStore } from '../session'
import type { Address } from '../types'

const MAX_ADDRESSES = 10

const addressSchema = z.object({
  label: z.string().trim().min(1, 'Rótulo é obrigatório.').max(40),
  street: z.string().trim().min(1, 'Rua é obrigatória.').max(160),
  number: z.string().trim().min(1, 'Número é obrigatório.').max(20),
  complement: z.string().trim().max(120).optional(),
  neighborhood: z.string().trim().min(1, 'Bairro é obrigatório.').max(80),
  city: z.string().trim().min(1, 'Cidade é obrigatória.').max(80),
  state: z.string().trim().length(2, 'UF precisa ter 2 letras.'),
  zip: z.string().trim(),
  isDefault: z.boolean().optional(),
})

export type AddressInput = z.infer<typeof addressSchema>

function currentUserId(): string {
  const session = requireSession(useSessionStore.getState().session)
  return requireActiveUser(session).id
}

function ownedAddress(userId: string, addressId: string): Address {
  const address = findById<Address>('addresses', addressId)
  if (!address || address.userId !== userId) throw apiError('NOT_FOUND', 404)
  return address
}

/** Garante exatamente 1 padrão: tira o selo de todo outro endereço do usuário. */
function unsetOtherDefaults(userId: string, exceptId: string): void {
  const now = nowISO()
  for (const address of findAll<Address>('addresses')) {
    if (address.userId === userId && address.id !== exceptId && address.isDefault) {
      upsert('addresses', { ...address, isDefault: false, updatedAt: now })
    }
  }
}

function parseAddress(input: AddressInput): { data: z.infer<typeof addressSchema>; zip: string; state: string } {
  const parsed = addressSchema.safeParse(input)
  if (!parsed.success) throw apiError('VALIDATION_ERROR', 400, { issues: parsed.error.issues })

  const zip = parsed.data.zip.replace(/\D/g, '')
  if (zip.length !== 8) throw apiError('VALIDATION_ERROR', 400, { field: 'zip' })

  return { data: parsed.data, zip, state: parsed.data.state.toUpperCase() }
}

export const addressesService = {
  list(): Address[] {
    const userId = currentUserId()
    return findAll<Address>('addresses')
      .filter((a) => a.userId === userId)
      .sort((a, b) => (a.isDefault === b.isDefault ? a.createdAt.localeCompare(b.createdAt) : a.isDefault ? -1 : 1))
  },

  get(addressId: string): Address {
    return ownedAddress(currentUserId(), addressId)
  },

  create(input: AddressInput): Address {
    const userId = currentUserId()
    const { data, zip, state } = parseAddress(input)

    const existing = findAll<Address>('addresses').filter((a) => a.userId === userId)
    if (existing.length >= MAX_ADDRESSES) throw apiError('ADDRESS_LIMIT_REACHED', 422)

    const now = nowISO()
    // primeiro endereço do usuário sempre nasce padrão (spec: "exatamente 1 padrão")
    const isDefault = existing.length === 0 ? true : Boolean(data.isDefault)
    if (isDefault) unsetOtherDefaults(userId, '')

    const address: Address = {
      id: newId(),
      userId,
      label: data.label,
      street: data.street,
      number: data.number,
      complement: data.complement || null,
      neighborhood: data.neighborhood,
      city: data.city,
      state,
      zip,
      lat: null,
      lng: null,
      isDefault,
      createdAt: now,
      updatedAt: now,
    }
    upsert('addresses', address)
    return address
  },

  update(addressId: string, input: AddressInput): Address {
    const userId = currentUserId()
    const current = ownedAddress(userId, addressId)
    const { data, zip, state } = parseAddress(input)

    // não dá pra tirar o selo padrão editando — só definindo outro como padrão (mantém sempre 1)
    const isDefault = current.isDefault || Boolean(data.isDefault)
    if (isDefault && !current.isDefault) unsetOtherDefaults(userId, addressId)

    const updated: Address = {
      ...current,
      label: data.label,
      street: data.street,
      number: data.number,
      complement: data.complement || null,
      neighborhood: data.neighborhood,
      city: data.city,
      state,
      zip,
      isDefault,
      updatedAt: nowISO(),
    }
    upsert('addresses', updated)
    return updated
  },

  setDefault(addressId: string): Address {
    const userId = currentUserId()
    const current = ownedAddress(userId, addressId)
    unsetOtherDefaults(userId, addressId)
    const updated: Address = { ...current, isDefault: true, updatedAt: nowISO() }
    upsert('addresses', updated)
    return updated
  },

  remove(addressId: string): void {
    const userId = currentUserId()
    const current = ownedAddress(userId, addressId)
    removeById('addresses', addressId)

    if (current.isDefault) {
      const [oldest] = findAll<Address>('addresses')
        .filter((a) => a.userId === userId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      if (oldest) upsert('addresses', { ...oldest, isDefault: true, updatedAt: nowISO() })
    }
  },
}
