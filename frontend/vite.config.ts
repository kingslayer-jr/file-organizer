import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Read PORT from environment, default to 8001
const BACKEND_PORT = process.env.PORT || '8001'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
