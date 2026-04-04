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
        target: 'https://8kpro-iptv.netlify.app',
        changeOrigin: true,
        secure: true,
      },
      '/api/activate': {
        target: 'https://8kpro-iptv.netlify.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom') || id.includes('node_modules/react/')) {
            return 'vendor';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'ui';
          }
        },
      },
    },
  },
})
