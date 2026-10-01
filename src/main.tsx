import '@fontsource/fira-sans/400.css'
import '@fontsource/fira-sans/600.css'
import '@fontsource/share-tech-mono/400.css'
import '@fontsource/syncopate/400.css'
import '@fontsource/syncopate/700.css'
import '@fontsource/cormorant-sc/500.css'
import '@fontsource/cormorant-sc/700.css'
import '@fontsource/josefin-sans/400.css'
import '@fontsource/josefin-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/600.css'
import '@fontsource/michroma/400.css'
import '@fontsource/oxanium/400.css'
import '@fontsource/oxanium/500.css'
import '@fontsource/oxanium/600.css'
import '@fontsource/oxanium/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/600.css'
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
