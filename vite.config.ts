import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/proxy': {
        target: 'https://8kproultimate.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
