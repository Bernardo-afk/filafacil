import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { resetMockData } from '../mock/reset'

// localStorage limpo a cada teste (spec §9 "Estratégia · Integração").
afterEach(() => {
  window.localStorage.clear()
})

// alguns testes chamam resetMockData() explicitamente; exportado aqui para
// centralizar o import em um só lugar caso o pacote mude no futuro.
export { resetMockData }
