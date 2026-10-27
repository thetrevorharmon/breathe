import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { App } from './app/App'
import { parseDevParams } from './app/devParams'
import { registerSW } from 'virtual:pwa-register'

if (import.meta.env.PROD) registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App dev={parseDevParams(window.location.search)} />
  </StrictMode>,
)
