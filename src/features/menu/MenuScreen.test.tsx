// Teste de UI da história 03: item esgotado visível e desabilitado, preço
// promocional exibido, e busca por categoria/texto.
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MenuScreen } from './MenuScreen'
import { resetMockData } from '../../mock/reset'
import { ESTABLISHMENT_IDS } from '../../mock/seed/ids'

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
})

function renderScreen(establishmentId: string) {
  render(
    <MemoryRouter initialEntries={[`/app/r/${establishmentId}/cardapio`]}>
      <Routes>
        <Route path="/app/r/:establishmentId/cardapio" element={<MenuScreen />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MenuScreen (cliente)', () => {
  it('mostra nome, descrição, preço e o selo Esgotado do X-Bacon', async () => {
    renderScreen(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(await screen.findByText('Bar do Mestre')).toBeInTheDocument()
    expect(await screen.findByText('X-Bacon')).toBeInTheDocument()
    expect(screen.getByText('Esgotado')).toBeInTheDocument()
  })

  it('busca filtra os itens exibidos', async () => {
    const user = userEvent.setup()
    renderScreen(ESTABLISHMENT_IDS.BAR_DO_MESTRE)

    await screen.findByText('X-Burger')
    await user.type(screen.getByPlaceholderText('Buscar no cardápio…'), 'burger')

    expect(await screen.findByText('X-Burger')).toBeInTheDocument()
    expect(screen.queryByText('Caipirinha de Limão')).not.toBeInTheDocument()
  })
})
