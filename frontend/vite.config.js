import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En Docker el proxy debe apuntar al servicio backend; en local a localhost
const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
})
