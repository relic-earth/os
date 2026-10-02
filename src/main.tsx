// Type is drawn only from the Vignelli Canon. Apple devices ship the real
// Helvetica Neue, Futura, Optima, Bodoni 72 and Didot; these open-licensed
// cuts fill in elsewhere: Bodoni Moda (Bodoni, with optical sizes, so the
// same face works for hairline display caps and 13px text) and Jost (a Futura
// revival, used only where Futura is absent; 200–300 for ORBIT's thin caps).
import '@fontsource-variable/bodoni-moda/opsz.css'
import '@fontsource-variable/bodoni-moda/opsz-italic.css'
import '@fontsource/jost/200.css'
import '@fontsource/jost/300.css'
import '@fontsource/jost/400.css'
import '@fontsource/jost/500.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// licensed faces found in public/fonts at build time (see vite.config.ts)
if (__LICENSED_FONTS__.length) {
  const css = __LICENSED_FONTS__.map((f) => `@font-face{font-family:"${f.family}";src:url("${f.file}");font-weight:${f.weight};font-style:${f.italic ? 'italic' : 'normal'};font-display:swap}`).join('')
  const el = document.createElement('style')
  el.textContent = css
  document.head.appendChild(el)
}
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
