// Testes de UI da história 34 (Admin · Estabelecimentos): guard de papel +
// fluxo de suspensão refletido na hora na lista.
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { EstablishmentsListScreen } from './EstablishmentsListScreen'
import { EstablishmentDetailScreen } from './EstablishmentDetailScreen'
import { RequireRole } from '../auth/RequireRole'
import { resetMockData } from '../../mock/reset'
import { USER_IDS } from '../../mock/seed/ids'
import { createSession, useSessionStore } from '../../mock/session'

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
  useSessionStore.getState().clearSession()
})

function renderAdmin(initialEntry = '/admin/estabelecimentos') {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <div>Tela de login</div> },
      { path: '/', element: <div>Boas-vindas</div> },
      {
        element: <RequireRole roles={['PLATFORM_ADMIN']} />,
        children: [
          { path: '/admin/estabelecimentos', element: <EstablishmentsListScreen /> },
          { path: '/admin/estabelecimentos/:establishmentId', element: <EstablishmentDetailScreen /> },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  )
  render(<RouterProvider router={router} />)
}

describe('RequireRole — apenas admin acessa', () => {
  it('sem sessão, redireciona pro login', async () => {
    renderAdmin()
    expect(await screen.findByText('Tela de login')).toBeInTheDocument()
  })

  it('STAFF é mandado pro início, não vê a tela de admin', async () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF'))
    renderAdmin()
    expect(await screen.findByText('Boas-vindas')).toBeInTheDocument()
  })
})

describe('EstablishmentsListScreen + EstablishmentDetailScreen', () => {
  it('suspender no detalhe reflete na lista sem recarregar', async () => {
    useSessionStore.getState().setSession(createSession(USER_IDS.ADMIN, 'PLATFORM_ADMIN'))
    const user = userEvent.setup()
    renderAdmin()

    const row = (await screen.findByText('Bar do Mestre')).closest('tr')!
    await user.click(within(row).getByRole('button', { name: 'Ver' }))

    expect(await screen.findByRole('heading', { name: 'Bar do Mestre' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Suspender' }))
    await user.type(screen.getByPlaceholderText(/violação/i), 'Reclamações de clientes')
    const suspendButtons = screen.getAllByRole('button', { name: 'Suspender' })
    await user.click(suspendButtons[suspendButtons.length - 1])

    expect(await screen.findByText('Motivo da suspensão: Reclamações de clientes')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    const updatedRow = (await screen.findByText('Bar do Mestre')).closest('tr')!
    expect(within(updatedRow).getByText('Suspenso')).toBeInTheDocument()
  })
})
