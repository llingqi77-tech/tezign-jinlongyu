import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 项目站：https://llingqi77-tech.github.io/tezign-jinlongyu/
const pagesBase = process.env.GITHUB_PAGES === 'true' ? '/tezign-jinlongyu/' : '/'

export default defineConfig({
  base: pagesBase,
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
})
