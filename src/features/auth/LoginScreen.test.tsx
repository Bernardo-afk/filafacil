import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { LoginScreen } from './LoginScreen'
import { resetMockData } from '../../mock/reset'
import { USER_IDS } from '../../mock/seed/ids'
import { DEV_PASSWORD } from '../../mock/seed/users'
import { findById, upsert } from '../../mock/storage'
import type { User } from '../../mock/types'

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
})

function renderLogin() {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginScreen /> },
      { path: '/app', element: <div>Área do cliente</div> },
      { path: '/gestor', element: <div>Área do gestor</div> },
      { path: '/atendente', element: <div>Área do atendente</div> },
      { path: '/escolher-estabelecimento', element: <div>Escolher estabelecimento</div> },
    ],
    { initialEntries: ['/login'] },
  )
  render(<RouterProvider router={router} />)
}

describe('LoginScreen — e-mail e senha', () => {
  it('entra com o usuário seed do admin e vai pra /admin (via authService)', async () => {
    const user = userEvent.setup()
    const router = createMemoryRouter(
      [
        { path: '/login', element: <LoginScreen /> },
        { path: '/admin', element: <div>Área do admin</div> },
      ],
      { initialEntries: ['/login'] },
    )
    render(<RouterProvider router={router} />)

    await user.type(screen.getByLabelText('Celular ou e-mail'), 'admin@filazero.dev')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(await screen.findByLabelText('Senha'), DEV_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Área do admin')).toBeInTheDocument()
  })

  it('credencial inválida mostra erro sem revelar se a conta existe', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Celular ou e-mail'), 'ninguem@example.com')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(await screen.findByLabelText('Senha'), 'QualquerSenha1')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeInTheDocument()
  })

  it('usuário suspenso não consegue entrar', async () => {
    const user = userEvent.setup()
    const admin = findById<User>('users', USER_IDS.ADMIN)!
    upsert('users', { ...admin, status: 'SUSPENDED' })
    renderLogin()

    await user.type(screen.getByLabelText('Celular ou e-mail'), 'admin@filazero.dev')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(await screen.findByLabelText('Senha'), DEV_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Sua conta está suspensa. Entre em contato com o suporte.')).toBeInTheDocument()
  })
})

describe('LoginScreen — múltiplos vínculos', () => {
  it('gestor com mais de um vínculo cai na tela de escolher estabelecimento', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Celular ou e-mail'), 'lucas@bardoze.com.br')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(await screen.findByLabelText('Senha'), DEV_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Escolher estabelecimento')).toBeInTheDocument()
  })

  it('atendente com um único vínculo vai direto pra área do atendente', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Celular ou e-mail'), 'carlos@filazero.dev')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(await screen.findByLabelText('Senha'), DEV_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Área do atendente')).toBeInTheDocument()
  })
})

describe('LoginScreen — botões sociais', () => {
  it('Google e Apple ficam desabilitados por flag (spec §0.2 item 6)', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: 'Continuar com Google' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Continuar com Apple' })).toBeDisabled()
  })
})

describe('LoginScreen — celular com OTP', () => {
  it('entra digitando o código do toast', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Celular ou e-mail'), '19999999999')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    const toast = await screen.findByText(/Código de teste: \d{6}/)
    const code = toast.textContent!.match(/\d{6}/)![0]
    for (const [index, digit] of code.split('').entries()) {
      await user.type(screen.getByLabelText(`Dígito ${index + 1}`), digit)
    }
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText('Área do cliente')).toBeInTheDocument()
  })
})

