import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { App } from './app/App'
import { parseDevParams } from './app/devParams'
import { registerSW } from 'virtual:pwa-register'
import { applyDevSeed } from './app/seedDemo'
import { updateSettings } from './storage/storage'

if (import.meta.env.PROD) registerSW({ immediate: true })

const dev = parseDevParams(window.location.search)
applyDevSeed(dev.seed)
// Dev only: ?muted=1 / ?muted=0 sets the cue mute toggle (screenshots).
const muted = dev.raw.get('muted')
if (muted === '1' || muted === '0') updateSettings({ cuesMuted: muted === '1' })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App dev={dev} />
  </StrictMode>,
)
