import { defineConfig } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = dirname(fileURLToPath(import.meta.url))

// Explicit multi-page build: each HTML entry is emitted to dist.
export default defineConfig({
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        home: resolve(appDir, 'index.html'),
        login: resolve(appDir, 'login.html'),
        multiplayer: resolve(appDir, 'multiplayer.html'),
        studio: resolve(appDir, 'studio.html'),
        result: resolve(appDir, 'result.html'),
      },
    },
  },
})
