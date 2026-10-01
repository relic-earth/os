import { networkInterfaces } from 'node:os'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** First LAN IPv4 of this machine — lets the "Open on iPhone" QR point a phone at the dev server. */
function lanAddress() {
  for (const list of Object.values(networkInterfaces())) {
    for (const i of list ?? []) if (i.family === 'IPv4' && !i.internal) return i.address
  }
  return ''
}

const PORT = 5173

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // listen on the LAN so a phone on the same Wi-Fi can open the dev server
  server: { host: true, port: PORT },
  define: {
    __LAN_URL__: JSON.stringify(lanAddress() ? `http://${lanAddress()}:${PORT}/` : ''),
    // a hosted build can name its public address for the iPhone QR (RELIC_SHARE_URL=https://… npm run build)
    __SHARE_URL__: JSON.stringify(process.env.RELIC_SHARE_URL ?? ''),
  },
  build: { chunkSizeWarningLimit: 1000 },
})
