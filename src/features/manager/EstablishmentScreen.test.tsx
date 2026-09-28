// Teste de UI da história 12 (gestor): editar dados reflete no preview
// público, e pausar/retomar pedidos funciona pela tela.
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { EstablishmentScreen } from './EstablishmentScreen'
import { resetMockData } from '../../mock/reset'
import { USER_IDS, ESTABLISHMENT_IDS } from '../../mock/seed/ids'
import { createSession, useSessionStore } from '../../mock/session'

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
  useSessionStore.getState().setSession(createSession(USER_IDS.LUCAS, 'STAFF', ESTABLISHMENT_IDS.BAR_DO_MESTRE))
})

function renderScreen() {
  render(
    <MemoryRouter>
      <EstablishmentScreen />
    </MemoryRouter>,
  )
}

describe('EstablishmentScreen (gestor)', () => {
  it('pausar pedidos reflete no painel sem recarregar', async () => {
    const user = userEvent.setup()
    renderScreen()

    expect(await screen.findByLabelText('Nome do estabelecimento')).toHaveValue('Bar do Mestre')
    await user.click(screen.getByRole('button', { name: 'Pausar pedidos' }))
    await user.click(screen.getByRole('button', { name: '30 min' }))
    await user.click(screen.getByRole('button', { name: 'Pausar' }))

    expect(await screen.findByText('Pedidos pausados')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retomar pedidos agora' }))
    expect(screen.queryByText('Pedidos pausados')).not.toBeInTheDocument()
  })
})
