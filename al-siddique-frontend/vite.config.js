import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: ['es2020', 'safari13'],
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react'
            }
            if (id.includes('@tiptap')) {
              return 'vendor-editor'
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion'
            }
            if (id.includes('lucide-react') || id.includes('react-icons')) {
              return 'vendor-icons'
            }
            if (id.includes('qrcode') || id.includes('jsqr')) {
              return 'vendor-scanner'
            }
            if (id.includes('@google/generative-ai')) {
              return 'vendor-ai'
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
  server: {
    // SaaS frontend runs on 5173; super app uses a separate setup.
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['app.assps.edu.pk', 'localhost', '127.0.0.1', '72.61.228.88'],
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || process.env.BACKEND_URL || `http://localhost:${process.env.BACKEND_PORT || '5000'}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4178,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || process.env.BACKEND_URL || `http://localhost:${process.env.BACKEND_PORT || '5000'}`,
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
