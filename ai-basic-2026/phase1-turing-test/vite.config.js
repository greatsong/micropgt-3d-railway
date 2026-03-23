import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/turing-test/',
  server: {
    port: 3000,
    proxy: {
      '/turing-test/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/turing-test/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
