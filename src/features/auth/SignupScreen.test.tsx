import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SignupScreen } from './SignupScreen'
import { findAll } from '../../mock/storage'
import { otpService } from '../../mock/services/otp'
import type { User } from '../../mock/types'

beforeEach(() => {
  window.localStorage.clear()
})

function renderSignup() {
  return render(
    <MemoryRouter initialEntries={['/cadastro']}>
      <SignupScreen />
    </MemoryRouter>,
  )
}

describe('SignupScreen — cadastro por e-mail', () => {
  it('completa o fluxo até "Conta criada!"', async () => {
    const user = userEvent.setup()
    renderSignup()

    await user.type(screen.getByLabelText('Nome'), 'Maria')
    await user.type(screen.getByLabelText('Sobrenome'), 'Souza')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await user.click(screen.getByRole('button', { name: 'Usar e-mail' }))
    await user.type(screen.getByLabelText('E-mail'), 'maria@example.com')
    await user.type(screen.getByLabelText('Senha'), 'Senha123')
    await user.type(screen.getByLabelText('Confirmar senha'), 'Senha123')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await user.type(screen.getByLabelText('CPF'), '52998224725')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await user.click(screen.getByLabelText(/Li e aceito os Termos/))
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('Conta criada!')).toBeInTheDocument()

    const users = findAll<User>('users')
    expect(users).toHaveLength(1)
    expect(users[0].email).toBe('maria@example.com')
    expect(users[0].marketingOptIn).toBe(false)
  })

  // BYPASS TEMPORÁRIO (pedido explícito do usuário, app 100% mock): não exige
  // mais dígito verificador de CPF válido.
  it('aceita CPF com dígito verificador inválido', async () => {
    const user = userEvent.setup()
    renderSignup()

    await user.type(screen.getByLabelText('Nome'), 'Maria')
    await user.type(screen.getByLabelText('Sobrenome'), 'Souza')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(screen.getByRole('button', { name: 'Usar e-mail' }))
    await user.type(screen.getByLabelText('E-mail'), 'maria@example.com')
    await user.type(screen.getByLabelText('Senha'), 'Senha123')
    await user.type(screen.getByLabelText('Confirmar senha'), 'Senha123')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await user.type(screen.getByLabelText('CPF'), '11111111111')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(screen.getByLabelText(/Li e aceito os Termos/))
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('Conta criada!')).toBeInTheDocument()
    expect(findAll<User>('users')).toHaveLength(1)
  })
})

describe('SignupScreen — cadastro por celular com OTP', () => {
  it('completa o fluxo usando o código de teste mostrado no toast', async () => {
    const user = userEvent.setup()
    renderSignup()

    await user.type(screen.getByLabelText('Nome'), 'João')
    await user.type(screen.getByLabelText('Sobrenome'), 'Pereira')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await user.click(screen.getByRole('button', { name: 'Usar celular' }))
    await user.type(screen.getByLabelText('Celular'), '19998741234')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    const toast = await screen.findByText(/Código de teste: \d{6}/)
    const code = toast.textContent!.match(/\d{6}/)![0]

    for (const [index, digit] of code.split('').entries()) {
      await user.type(screen.getByLabelText(`Dígito ${index + 1}`), digit)
    }
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await user.type(await screen.findByLabelText('CPF'), '52998224725')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(screen.getByLabelText(/Li e aceito os Termos/))
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByText('Conta criada!')).toBeInTheDocument()
    const users = findAll<User>('users')
    expect(users[0].phoneVerifiedAt).not.toBeNull()
  })

  // BYPASS TEMPORÁRIO (pedido explícito do usuário, app 100% mock): qualquer
  // código digitado avança a tela, não existe mais "código incorreto".
  it('qualquer código digitado avança pro próximo passo', async () => {
    const user = userEvent.setup()
    renderSignup()

    await user.type(screen.getByLabelText('Nome'), 'João')
    await user.type(screen.getByLabelText('Sobrenome'), 'Pereira')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(screen.getByRole('button', { name: 'Usar celular' }))
    await user.type(screen.getByLabelText('Celular'), '19998741234')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    for (const [index, digit] of '000000'.split('').entries()) {
      await user.type(screen.getByLabelText(`Dígito ${index + 1}`), digit)
    }
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByLabelText('CPF')).toBeInTheDocument()
  })
})

describe('otpService — usado pela tela', () => {
  it('reenvio fica bloqueado por 60s', async () => {
    await otpService.request('+5519998741234', 'SMS', 'SIGNUP')
    await expect(otpService.request('+5519998741234', 'SMS', 'SIGNUP')).rejects.toMatchObject({
      code: 'TOO_MANY_ATTEMPTS',
    })
  })
})
