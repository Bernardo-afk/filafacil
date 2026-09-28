// Testes de UI da história 13 (perfil): reflete o cenário Gherkin "Alteração
// refletida imediatamente" e o guard de rota (RequireAuth) + confirmação de saída.
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { ProfileFullScreen } from './ProfileFullScreen'
import { EditProfileScreen } from './EditProfileScreen'
import { RequireAuth } from '../auth/RequireAuth'
import { resetMockData } from '../../mock/reset'
import { USER_IDS } from '../../mock/seed/ids'
import { createSession, useSessionStore } from '../../mock/session'

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
  useSessionStore.getState().clearSession()
})

function renderProfile(initialEntry = '/app/perfil') {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <div>Tela de login</div> },
      { path: '/', element: <div>Boas-vindas</div> },
      {
        path: '/app/perfil',
        element: <RequireAuth />,
        children: [
          { index: true, element: <ProfileFullScreen /> },
          { path: 'editar', element: <EditProfileScreen /> },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  )
  render(<RouterProvider router={router} />)
}

describe('RequireAuth', () => {
  it('sem sessão, redireciona pro login', async () => {
    renderProfile()
    expect(await screen.findByText('Tela de login')).toBeInTheDocument()
  })
})

describe('ProfileFullScreen — alteração refletida imediatamente', () => {
  it('editar o nome atualiza a tela de perfil sem recarregar', async () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.JOAO, 'CUSTOMER'))
    const user = userEvent.setup()
    renderProfile()

    expect(await screen.findByText('João Pereira')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Editar perfil' }))
    const firstNameInput = await screen.findByLabelText('Nome')
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Lucas')
    await user.clear(screen.getByLabelText('Sobrenome'))
    await user.type(screen.getByLabelText('Sobrenome'), 'Henrique')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Lucas Henrique')).toBeInTheDocument()
  })
})

describe('ProfileFullScreen — sair', () => {
  it('pede confirmação antes de encerrar a sessão', async () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.JOAO, 'CUSTOMER'))
    const user = userEvent.setup()
    renderProfile()

    await screen.findByText('João Pereira')
    await user.click(screen.getByRole('button', { name: 'Sair' }))
    expect(screen.getByText('Deseja sair da sua conta?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText('Deseja sair da sua conta?')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sair' }))
    await user.click(screen.getAllByRole('button', { name: 'Sair' })[1])
    expect(await screen.findByText('Boas-vindas')).toBeInTheDocument()
    expect(useSessionStore.getState().session).toBeNull()
  })
})
