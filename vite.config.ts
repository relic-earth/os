import { networkInterfaces } from 'node:os'
import { existsSync, readdirSync } from 'node:fs'
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

/**
 * Licensed faces you own (FF Meta, OCR A, Sackers Gothic, Gill Sans…) can be
 * dropped into public/fonts — git-ignored, never redistributed. The build
 * registers whichever are present; the rest fall back to open fonts.
 */
function licensedFonts() {
  const dir = 'public/fonts'
  if (!existsSync(dir)) return []
  const families: [RegExp, string][] = [
    [/meta/i, 'Relic Meta'],
    [/ocr/i, 'Relic OCR'],
    [/sackers/i, 'Relic Sackers'],
    [/gill/i, 'Relic Gill'],
  ]
  return readdirSync(dir)
    .filter((f) => /\.(otf|ttf|woff2?)$/i.test(f))
    .flatMap((file) => {
      const fam = families.find(([re]) => re.test(file))
      if (!fam) return []
      const weight = /black|heavy|extrabold/i.test(file) ? 800 : /bold/i.test(file) ? 700 : /semi|demi|medium/i.test(file) ? 600 : /light/i.test(file) ? 300 : 400
      return [{ family: fam[1], file: `fonts/${file}`, weight, italic: /italic/i.test(file) }]
    })
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // listen on the LAN so a phone on the same Wi-Fi can open the dev server
  server: { host: true, port: PORT },
  define: {
    __LAN_URL__: JSON.stringify(lanAddress() ? `http://${lanAddress()}:${PORT}/` : ''),
    // a hosted build can name its public address for the iPhone QR (RELIC_SHARE_URL=https://… npm run build)
    __SHARE_URL__: JSON.stringify(process.env.RELIC_SHARE_URL ?? ''),
    __LICENSED_FONTS__: JSON.stringify(licensedFonts()),
  },
  build: { chunkSizeWarningLimit: 1000 },
})
