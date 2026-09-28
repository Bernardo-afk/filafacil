import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// GitHub Pages de projeto serve em usuario.github.io/NOME-DO-REPOSITORIO/
// (repositório: github.com/Bernardo-afk/filafacil, spec §13.1).
export default defineConfig({
  base: '/filafacil/',
  plugins: [react(), tailwindcss()],
})
