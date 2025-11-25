import pages from '@hono/vite-cloudflare-pages'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [pages()],
  build: {
    outDir: 'dist',
    minify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5173,
  },
})
