import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Where the app is served from.
//   Vercel / Netlify / a custom domain -> '/' (the default)
//   GitHub Pages project site           -> '/<repo-name>/'
// Set VITE_BASE_PATH in the host's build environment to override.
// The router reads the same value via import.meta.env.BASE_URL, so the two
// cannot drift apart.
const base = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
