// Teste de UI da história 11: busca, chip "Aberto agora" e navegação pro
// detalhe do restaurante.
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { RestaurantsScreen } from './RestaurantsScreen'
import { resetMockData } from '../../mock/reset'

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
})

function renderScreen(initialEntry = '/app/restaurantes') {
  const router = createMemoryRouter(
    [
      { path: '/app/restaurantes', element: <RestaurantsScreen /> },
      { path: '/app/r/:establishmentId', element: <div>Detalhe do restaurante</div> },
    ],
    { initialEntries: [initialEntry] },
  )
  render(<RouterProvider router={router} />)
}

describe('RestaurantsScreen', () => {
  it('busca por texto filtra a lista', async () => {
    const user = userEvent.setup()
    renderScreen()

    expect(await screen.findByText(/estabelecimentos encontrados/)).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Buscar restaurante, tipo, prato…'), 'burger')

    expect(await screen.findByText('Bar do Mestre')).toBeInTheDocument()
    expect(screen.queryByText('Cantina Universitária')).not.toBeInTheDocument()
  })

  it('clicar num card navega pro detalhe do restaurante', async () => {
    const user = userEvent.setup()
    renderScreen()

    const card = await screen.findByText('Bar do Mestre')
    await user.click(card)

    expect(await screen.findByText('Detalhe do restaurante')).toBeInTheDocument()
  })

  it('inicia com a busca da query string (vinda da Home)', async () => {
    renderScreen('/app/restaurantes?q=burger')
    expect(await screen.findByDisplayValue('burger')).toBeInTheDocument()
    expect(await screen.findByText('Bar do Mestre')).toBeInTheDocument()
  })
})
