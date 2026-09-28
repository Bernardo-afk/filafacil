// Testes da história 13 (perfil — "Meus endereços"). Cada `it` espelha um
// cenário Gherkin ou caso de borda da spec.
import { describe, expect, it, beforeEach } from 'vitest'
import { addressesService } from './addresses'
import { resetMockData } from '../reset'
import { USER_IDS, ADDRESS_IDS } from '../seed/ids'
import { createSession, useSessionStore } from '../session'
import { authService } from './auth'

const VALID_ADDRESS = {
  label: 'Casa dos pais',
  street: 'Rua Nova',
  number: '10',
  complement: '',
  neighborhood: 'Centro',
  city: 'Campinas',
  state: 'sp',
  zip: '13010-000',
}

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
  useSessionStore.getState().setSession(createSession(USER_IDS.JOAO, 'CUSTOMER'))
})

describe('addressesService.list', () => {
  it('lista só os endereços do usuário logado (João tem Casa e Trabalho no seed)', () => {
    const addresses = addressesService.list()
    expect(addresses).toHaveLength(2)
    expect(addresses.every((a) => a.userId === USER_IDS.JOAO)).toBe(true)
  })

  it('padrão sempre em primeiro na lista', () => {
    const [first] = addressesService.list()
    expect(first.isDefault).toBe(true)
    expect(first.id).toBe(ADDRESS_IDS.JOAO_CASA)
  })
})

describe('addressesService — endereço padrão único', () => {
  it('definir outro como padrão tira o selo do anterior', () => {
    addressesService.setDefault(ADDRESS_IDS.JOAO_TRABALHO)

    const addresses = addressesService.list()
    const casa = addresses.find((a) => a.id === ADDRESS_IDS.JOAO_CASA)!
    const trabalho = addresses.find((a) => a.id === ADDRESS_IDS.JOAO_TRABALHO)!

    expect(trabalho.isDefault).toBe(true)
    expect(casa.isDefault).toBe(false)
    expect(addresses.filter((a) => a.isDefault)).toHaveLength(1)
  })
})

describe('addressesService.create', () => {
  it('primeiro endereço de um usuário novo nasce padrão', async () => {
    const { user } = await authService.register({
      firstName: 'Nova',
      lastName: 'Pessoa',
      cpf: '111.444.777-35',
      email: 'nova.pessoa@example.com',
      password: 'Senha123',
      acceptTerms: true,
    })
    useSessionStore.getState().setSession(createSession(user.id, 'CUSTOMER'))

    const address = addressesService.create(VALID_ADDRESS)
    expect(address.isDefault).toBe(true)
    expect(address.state).toBe('SP')
    expect(address.zip).toBe('13010000')
  })

  it('limite de 10 endereços', () => {
    for (let i = 0; i < 8; i += 1) {
      addressesService.create({ ...VALID_ADDRESS, label: `Endereço ${i}` })
    }
    // João já tinha 2 no seed + 8 novos = 10
    expect(addressesService.list()).toHaveLength(10)

    expect(() => addressesService.create({ ...VALID_ADDRESS, label: 'Onze' })).toThrowError(
      expect.objectContaining({ code: 'ADDRESS_LIMIT_REACHED', status: 422 }),
    )
  })

  it('CEP precisa ter 8 dígitos', () => {
    expect(() => addressesService.create({ ...VALID_ADDRESS, zip: '123' })).toThrowError(
      expect.objectContaining({ code: 'VALIDATION_ERROR' }),
    )
  })
})

describe('addressesService — isolamento por usuário', () => {
  it('um usuário nunca lê endereço de outro (404)', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.ADMIN, 'PLATFORM_ADMIN'))
    expect(() => addressesService.get(ADDRESS_IDS.JOAO_CASA)).toThrowError(
      expect.objectContaining({ code: 'NOT_FOUND', status: 404 }),
    )
  })

  it('um usuário nunca edita endereço de outro (404)', () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.ADMIN, 'PLATFORM_ADMIN'))
    expect(() => addressesService.update(ADDRESS_IDS.JOAO_CASA, VALID_ADDRESS)).toThrowError(
      expect.objectContaining({ code: 'NOT_FOUND', status: 404 }),
    )
  })
})

describe('addressesService.remove', () => {
  it('excluir o padrão promove outro endereço restante', () => {
    addressesService.remove(ADDRESS_IDS.JOAO_CASA)

    const remaining = addressesService.list()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(ADDRESS_IDS.JOAO_TRABALHO)
    expect(remaining[0].isDefault).toBe(true)
  })
})
