import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Base path = nom du dépôt GitHub pour que GitHub Pages serve correctement les assets
export default defineConfig({
  plugins: [vue()],
  base: '/outils-bateau/'
})
