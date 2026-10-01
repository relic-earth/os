import '@fontsource/cinzel/500.css'
import '@fontsource/cinzel/700.css'
import '@fontsource/exo-2/400.css'
import '@fontsource/exo-2/600.css'
import '@fontsource/vt323/400.css'
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
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
