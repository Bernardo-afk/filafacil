// Teste de UI da história 36 (Admin · Usuários): suspender no detalhe reflete
// na lista sem recarregar, e o filtro por status derivado funciona.
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { UsersListScreen } from './UsersListScreen'
import { UserDetailScreen } from './UserDetailScreen'
import { RequireRole } from '../auth/RequireRole'
import { resetMockData } from '../../mock/reset'
import { USER_IDS } from '../../mock/seed/ids'
import { createSession, useSessionStore } from '../../mock/session'

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
  useSessionStore.getState().setSession(createSession(USER_IDS.ADMIN, 'PLATFORM_ADMIN'))
})

function renderAdmin(initialEntry = '/admin/usuarios') {
  const router = createMemoryRouter(
    [
      {
        element: <RequireRole roles={['PLATFORM_ADMIN']} />,
        children: [
          { path: '/admin/usuarios', element: <UsersListScreen /> },
          { path: '/admin/usuarios/:userId', element: <UserDetailScreen /> },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  )
  render(<RouterProvider router={router} />)
}

describe('UsersListScreen + UserDetailScreen', () => {
  it('suspender no detalhe reflete na lista sem recarregar', async () => {
    const user = userEvent.setup()
    renderAdmin()

    const row = (await screen.findByText('João Pereira')).closest('tr')!
    await user.click(within(row).getByRole('button', { name: 'Ver' }))

    expect(await screen.findByRole('heading', { name: 'João Pereira' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Suspender' }))
    await user.type(screen.getByPlaceholderText(/uso indevido/i), 'Reclamações de outros clientes')
    const suspendButtons = screen.getAllByRole('button', { name: 'Suspender' })
    await user.click(suspendButtons[suspendButtons.length - 1])

    expect(await screen.findByText('Suspenso')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    const updatedRow = (await screen.findByText('João Pereira')).closest('tr')!
    expect(within(updatedRow).getByText('Suspenso')).toBeInTheDocument()
  })

  it('Mariana aparece como Inativa na listagem', async () => {
    renderAdmin()
    const row = (await screen.findByText('Mariana Costa')).closest('tr')!
    expect(within(row).getByText('Inativo')).toBeInTheDocument()
  })
})
