import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { App } from './app/App'
import { parseDevParams } from './app/devParams'
import { registerSW } from 'virtual:pwa-register'
import { applyDevSeed } from './app/seedDemo'

if (import.meta.env.PROD) registerSW({ immediate: true })

const dev = parseDevParams(window.location.search)
applyDevSeed(dev.seed)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App dev={dev} />
  </StrictMode>,
)
