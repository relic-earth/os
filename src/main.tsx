// Type is drawn only from the Vignelli Canon. Apple devices ship the real
// Helvetica Neue, Futura, Optima, Bodoni 72, Baskerville and Times; these
// open-licensed cuts fill in elsewhere: EB Garamond (Garamond), Bodoni Moda
// (Bodoni), Jost (a Futura revival, used only where Futura is absent).
import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/500.css'
import '@fontsource/eb-garamond/600.css'
import '@fontsource/eb-garamond/400-italic.css'
import '@fontsource/bodoni-moda/400.css'
import '@fontsource/bodoni-moda/700.css'
import '@fontsource/jost/400.css'
import '@fontsource/jost/500.css'
import '@fontsource/jost/600.css'
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
