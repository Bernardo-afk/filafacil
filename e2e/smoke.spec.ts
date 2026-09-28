import { test, expect } from '@playwright/test'

// Fumaça da Fase 0: o app sobe e mostra a tela de boas-vindas (spec §9, fluxo 1
// completo entra história a história; isto só garante que o esqueleto funciona).
test('abre a tela de boas-vindas', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Peça. Acompanhe. Retire.')).toBeVisible()
})
