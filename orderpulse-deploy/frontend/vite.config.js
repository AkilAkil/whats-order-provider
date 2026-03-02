import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      // Proxy API calls to the Go backend running on 8080
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/webhook': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
