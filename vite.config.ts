import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// GitHub Pages de projeto serve em usuario.github.io/NOME-DO-REPOSITORIO/
// Troque para o nome real do repositório antes de publicar (spec §13.1).
export default defineConfig({
  base: '/filazero/',
  plugins: [react(), tailwindcss()],
})
