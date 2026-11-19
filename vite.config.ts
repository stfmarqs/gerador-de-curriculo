import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { siteMetadata } from './src/site/metadata'
import { publicPages } from './src/site/pages'

export default defineConfig(({ mode }) => {
  const { SITE_URL } = loadEnv(mode, process.cwd(), 'SITE_')
  const publicEntries = Object.fromEntries(publicPages.map(({ id, file }) => [id, resolve(file)]))
  return {
    plugins: [react(), siteMetadata(SITE_URL)],
    build: {
      rollupOptions: {
        input: { ...publicEntries, editor: resolve('editor/index.html') },
      },
    },
  }
})
