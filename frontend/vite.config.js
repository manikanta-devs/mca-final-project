import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-router-dom') || id.includes('react-dom') || id.includes('scheduler') || id.includes('zustand')) {
              return 'react-vendor'
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'charts-vendor'
            }
            if (id.includes('lucide-react') || id.includes('framer-motion')) {
              return 'ui-vendor'
            }
          }
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      ignored: ['**/playwright-report/**', '**/test-results/**']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
