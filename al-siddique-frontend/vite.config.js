import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: ['es2020', 'safari13'],
  },
  server: {
    // SaaS frontend runs on 5173; super app uses a separate setup.
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['app.assps.edu.pk', 'localhost', '127.0.0.1', '72.61.228.88'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
