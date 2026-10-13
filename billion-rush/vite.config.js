import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// Explicit multi-page build: each HTML entry is emitted to dist.
export default defineConfig({
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        multiplayer: resolve(__dirname, 'multiplayer.html'),
        studio: resolve(__dirname, 'studio.html'),
        result: resolve(__dirname, 'result.html'),
      },
    },
  },
})
