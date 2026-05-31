import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Serve graduation-cap SVG when the browser requests /favicon.ico (avoids Vite/cached tab icon). */
function mathupFaviconPlugin() {
  return {
    name: 'mathup-favicon',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url?.split('?')[0] === '/favicon.ico') {
          req.url = '/mathup.svg'
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), mathupFaviconPlugin()],
  server: {
    host: true,
    port: 5173,
    // Bind mounts on Windows need polling for reliable HMR inside Docker.
    watch: process.env.DOCKER === '1' ? { usePolling: true } : undefined,
  },
})