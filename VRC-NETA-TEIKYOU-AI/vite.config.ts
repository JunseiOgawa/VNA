import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest })
  ],
  server: {
    port: 5173,
    strictPort: true,
    cors: {
      origin: ['chrome-extension://*'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'X-Requested-With,content-type'
    },
    hmr: {
      clientPort: 5173,
      host: 'localhost'
    }
  }
})
