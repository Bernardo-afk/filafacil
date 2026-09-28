import { describe, expect, it } from 'vitest'
import { isValidCpf, maskCpf, formatCpf } from './cpf'

describe('isValidCpf', () => {
  it('aceita um CPF válido com máscara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true)
  })

  it('aceita o mesmo CPF sem máscara', () => {
    expect(isValidCpf('52998224725')).toBe(true)
  })

  it('rejeita dígitos verificadores incorretos', () => {
    expect(isValidCpf('529.982.247-26')).toBe(false)
  })

  it('rejeita sequências repetidas', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false)
  })

  it('rejeita tamanho incorreto', () => {
    expect(isValidCpf('123')).toBe(false)
  })
})

describe('maskCpf', () => {
  it('mostra só os 2 últimos dígitos', () => {
    expect(maskCpf('529.982.247-25')).toBe('•••.•••.•••-25')
  })
})

describe('formatCpf', () => {
  it('aplica a máscara padrão', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25')
  })
})
