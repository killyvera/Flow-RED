import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/api': path.resolve(__dirname, './src/api'),
      '@/canvas': path.resolve(__dirname, './src/canvas'),
      '@/state': path.resolve(__dirname, './src/state'),
      '@/theme': path.resolve(__dirname, './src/theme'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/components': path.resolve(__dirname, './src/components'),
    },
  },
  server: {
    // Proxy opcional para desarrollo, útil si Node-RED tiene CORS restringido
    proxy: {
      '/api': {
        target: process.env.VITE_NODE_RED_URL || 'http://localhost:1880',
        changeOrigin: true,
      },
    },
  },
})

