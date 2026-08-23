import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages project-page deploys serve from /<repo-name>/,
  // so the base path needs to match the repo name.
  base: '/loggr/',
})
