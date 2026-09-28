// Teste de UI da história 12: dados batem com o cadastro do gestor, e
// estabelecimento inativo dá "não encontrado" (404) em vez de quebrar a tela.
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RestaurantDetailScreen } from './RestaurantDetailScreen'
import { resetMockData } from '../../mock/reset'
import { ESTABLISHMENT_IDS } from '../../mock/seed/ids'

beforeEach(() => {
  window.localStorage.clear()
  resetMockData()
})

function renderScreen(establishmentId: string) {
  render(
    <MemoryRouter initialEntries={[`/app/r/${establishmentId}`]}>
      <Routes>
        <Route path="/app/r/:establishmentId" element={<RestaurantDetailScreen />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RestaurantDetailScreen', () => {
  it('mostra nota, endereço e tags do estabelecimento cadastrado', async () => {
    renderScreen(ESTABLISHMENT_IDS.BAR_DO_MESTRE)
    expect(await screen.findByRole('heading', { name: 'Bar do Mestre' })).toBeInTheDocument()
    expect(screen.getByText('4.7 (312)')).toBeInTheDocument()
    expect(screen.getByText('Rua das Flores, 148 · Centro')).toBeInTheDocument()
    expect(screen.getByText('Cervejas artesanais')).toBeInTheDocument()
  })

  it('estabelecimento suspenso mostra "não encontrado" em vez de quebrar', async () => {
    renderScreen(ESTABLISHMENT_IDS.RESTAURANTE_SP)
    expect(await screen.findByText('Restaurante não encontrado')).toBeInTheDocument()
  })
})
