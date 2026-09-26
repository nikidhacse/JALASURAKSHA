import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/simulate': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/impact': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/evacuate': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
